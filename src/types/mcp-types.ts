/**
 * MCP Tool Types
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;  // Allow any string, not just 'object'
    properties?: Record<string, any>;
    required?: string[];
    oneOf?: Array<{ required: string[] }>;
    items?: any;
  };
  execute: (params: any) => Promise<MCPToolResult>;
}

export interface MCPToolResult {
  type: string;  // Allow any string, not just 'text'
  text: string;
}