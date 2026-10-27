import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const desktop = process.argv.includes('--desktop');
const executable = process.env.COMPUTER_USE_TEST_ENTRY || fileURLToPath(new URL('../bin/computer-use-mcp.js', import.meta.url));
const transport = new StdioClientTransport({ command: process.execPath, args: [executable], stderr: 'pipe' });
let stderr = '';
transport.stderr?.on('data', data => { stderr += data.toString(); });
const client = new Client({ name: 'computer-use-integration', version: '1.0.0' });
let fixture;
const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
  assert.ok(!result.isError, `${name}: ${JSON.stringify(result.content)}`);
  return result;
};
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  for (const name of ['computer', 'computer_batch', 'windows', 'ui_elements', 'open_application', 'clipboard', 'switch_display', 'app_skill', 'control']) assert.ok(tools.some(t => t.name === name), name);
  assert.ok(!tools.some(t => t.name === 'request_access'));
  assert.ok((await client.getPrompt({ name: 'computer_use' })).messages[0].content.text.includes('Coordinates'));
  assert.ok((await client.readResource({ uri: 'computer-use://skill' })).contents[0].text.includes('Windows'));
  const invalid = await client.callTool({ name: 'computer', arguments: { action: 'invalid' } });
  assert.equal(invalid.isError, true);
  await call('control', { action: 'stop' });
  assert.equal((await client.callTool({ name: 'computer', arguments: { action: 'screenshot' } })).isError, true);
  await call('control', { action: 'resume' });
  if (desktop) {
    assert.equal(process.platform, 'win32');
    const title = `Computer Use MCP QA ${process.pid}`;
    fixture = spawn('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('./desktop-fixture.ps1', import.meta.url)), '-Title', title], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    fixture.stderr.on('data', data => { stderr += data.toString(); });
    let hwnd;
    let lastWindows;
    for (let i = 0; i < 25; i++) {
      const result = await call('windows', { action: 'list' });
      lastWindows = result.content[0].text;
      const line = result.content[0].text.split('\n').find(line => line.includes(title));
      if (line) { hwnd = Number(/hwnd=(\d+)/.exec(line)[1]); break; }
      await sleep(200);
    }
    assert.ok(hwnd, `Dedicated QA window appeared (fixture exit=${fixture.exitCode}): ${lastWindows}`);
    await call('windows', { action: 'focus', hwnd });
    const shot = await call('computer', { action: 'screenshot' });
    const image = shot.content.find(item => item.type === 'image');
    assert.ok(image && Buffer.from(image.data, 'base64').subarray(0, 2).equals(Buffer.from([0xff, 0xd8])), 'Real JPEG image block');
    await call('computer', { action: 'type', text: 'MCP smoke 你好 123' });
    const text = await call('ui_elements', { hwnd, text: true });
    assert.ok(text.content[0].text.includes('MCP smoke 你好 123'), 'Unicode input verified by UI Automation');
    await call('computer_batch', { actions: [{ action: 'key', text: 'ctrl+a' }, { action: 'type', text: 'Batch passed' }], finish: 'text' });
    const after = await call('ui_elements', { hwnd, text: true });
    assert.ok(after.content[0].text.includes('Batch passed'));
    const displays = await call('switch_display', {});
    assert.ok(displays.content[0].text.includes('primary'));
    await call('control', { action: 'finish' });
  }
  console.log(`PASS: stdio handshake, tools, prompt, resource, validation, stop/resume${desktop ? ', real JPEG screenshot, Unicode keyboard, batch and UI Automation' : ''}`);
} finally {
  fixture?.kill();
  await client.close();
  if (stderr.trim()) console.error(stderr.trim());
}
