/** Host-independent tool contract; MCP schemas are derived at the boundary. */
export interface ImageAttachmentRef {
  attachmentId: string; mediaType: string; bytes: number; width: number; height: number;
  name?: string; originalDimensions?: { width: number; height: number };
}
export interface ToolCallView { card: string; title: string; kind: string }
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  output: unknown;
  timeoutMs?: number;
  isConcurrencySafe?: () => boolean;
  execute(args: unknown, context?: unknown): Promise<{ text: string; image?: ImageAttachmentRef }>;
  presentCall?: (args: unknown) => ToolCallView;
}
export function defineTool(tool: ToolDefinition): ToolDefinition { return tool }

/** Convert per-property required flags, including nested batch actions, to JSON Schema. */
export function jsonSchema(value: unknown): any {
  if (Array.isArray(value)) return value.map(jsonSchema);
  if (!value || typeof value !== 'object') return value;
  const row = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(row)) {
    if (key === 'required' && typeof item === 'boolean') continue;
    out[key] = jsonSchema(item);
  }
  if (row.properties && typeof row.properties === 'object') {
    out.required = Object.entries(row.properties).filter(([, prop]) => (prop as any).required === true).map(([name]) => name);
  }
  return out;
}
