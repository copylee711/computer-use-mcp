import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, instructions, metadata } from './server.js';
export async function main(args = process.argv.slice(2)) {
  if (args.includes('--version')) { console.log(metadata.version); return; }
  if (args.includes('--print-skill')) { console.log(instructions()); return; }
  if (args.includes('--help') || args.includes('-h')) {
    console.log('computer-use-mcp [--version | --print-skill | --help]\nDefault: local Windows MCP server over stdio. Requires an interactive Windows 10/11 desktop and Node >=22.19.');
    return;
  }
  if (args.length) throw new Error(`Unknown arguments: ${args.join(' ')}`);
  if (process.platform !== 'win32') throw new Error('Desktop control requires Windows 10/11. Run this MCP on the Windows computer you want to operate.');
  const runtime = createServer();
  const shutdown = async () => { await runtime.dispose(); await runtime.server.close(); };
  process.once('SIGINT', () => { void shutdown(); });
  process.once('SIGTERM', () => { void shutdown(); });
  await runtime.server.connect(new StdioServerTransport());
}
