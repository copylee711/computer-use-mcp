import { describe, expect, it } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createServer } from '../src/server.js';
import { jsonSchema } from '../src/tool-definition.js';
import type { HelperLike } from '../src/helper-client.js';
import { setTimeout as sleep } from 'node:timers/promises';

describe('MCP boundary', () => {
  it('converts nested required properties into standard JSON Schema', () => {
    expect(jsonSchema({ type: 'object', properties: { actions: { type: 'array', required: true, items: { type: 'object', properties: { action: { type: 'string', required: true } } } } } })).toEqual({ type: 'object', required: ['actions'], properties: { actions: { type: 'array', items: { type: 'object', required: ['action'], properties: { action: { type: 'string' } } } } } });
  });
  it('validates before touching the desktop and exposes portable skill content', async () => {
    const commands: string[] = [];
    const helper: HelperLike = { onEvent: () => () => {}, dispose: () => {}, async call<T>(cmd: string) { commands.push(cmd); return null as T; } };
    const runtime = createServer(helper);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '1.0' });
    await runtime.server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      const listed = await client.listTools();
      expect(listed.tools.some(tool => tool.name === 'request_access')).toBe(false);
      const result = await client.callTool({ name: 'computer_batch', arguments: { actions: [{ text: 'missing action' }] } });
      expect(result.isError).toBe(true);
      expect(commands).toEqual([]);
      expect((await client.callTool({ name: 'computer', arguments: { action: 'left_click', coordinate: [1] } })).isError).toBe(true);
      expect(commands).toEqual([]);
      expect((await client.getPrompt({ name: 'computer_use' })).messages.length).toBe(1);
      expect((await client.readResource({ uri: 'computer-use://skill' })).contents.length).toBe(1);
    } finally { await runtime.dispose(); await client.close(); }
  });
  it('serializes desktop calls and latches user stop across requests', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const listeners = new Set<(event: { event: string }) => void>();
    const helper: HelperLike = {
      onEvent: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
      dispose: () => {},
      async call<T>(cmd: string) {
        if (cmd === 'ui') {
          maxInFlight = Math.max(maxInFlight, ++inFlight);
          await sleep(25);
          inFlight--;
          return { exe: 'notepad.exe', title: 'QA', elements: [] } as T;
        }
        if (cmd === 'windows' || cmd === 'background') return [] as T;
        if (cmd === 'displays') return [{ x: 0, y: 0, width: 100, height: 100, primary: true, dpi: 96 }] as T;
        if (cmd === 'screenshot') return { data: 'anBlZw==', width: 100, height: 100 } as T;
        return null as T;
      },
    };
    const runtime = createServer(helper);
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '1.0' });
    await runtime.server.connect(st);
    await client.connect(ct);
    try {
      const results = await Promise.all([1, 2, 3].map(() => client.callTool({ name: 'ui_elements', arguments: {} })));
      expect(results.every(result => !result.isError)).toBe(true);
      expect(maxInFlight).toBe(1);
      await client.callTool({ name: 'computer', arguments: { action: 'screenshot' } });
      for (const listener of listeners) listener({ event: 'stop' });
      expect((await client.callTool({ name: 'ui_elements', arguments: {} })).isError).toBe(true);
      await client.callTool({ name: 'control', arguments: { action: 'resume' } });
      expect((await client.callTool({ name: 'ui_elements', arguments: {} })).isError).not.toBe(true);
    } finally { await runtime.dispose(); await client.close(); }
  });
});
