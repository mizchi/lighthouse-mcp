#!/usr/bin/env node

/**
 * Lighthouse MCP Server
 *
 * Provides Model Context Protocol tools for Lighthouse performance analysis
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  TextContent,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import {
  initializeRegistry,
  getTool,
  getAllToolNames,
  TOOL_CATEGORIES,
  getToolsByCategory
} from './tools/registry.js';

// Server metadata
const SERVER_NAME = 'lighthouse-mcp';
const SERVER_VERSION = '1.0.0';

async function main() {
  // Initialize tool registry
  await initializeRegistry();

  // Create MCP server
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = [];

    // Add all registered tools
    for (const toolName of getAllToolNames()) {
      const registeredTool = getTool(toolName);
      if (!registeredTool) continue;

      // Skip aliases to avoid duplicates
      if (registeredTool.aliases?.includes(toolName)) {
        continue;
      }

      const { tool } = registeredTool;
      tools.push({
        name: toolName,
        description: tool.description,
        inputSchema: tool.inputSchema as any,
      });
    }

    // Add special catalog tool
    tools.push({
      name: 'list_tool_categories',
      description: 'List all available tool categories and their descriptions',
      inputSchema: {
        type: 'object',
        properties: {
          detailed: {
            type: 'boolean',
            description: 'Include detailed tool listings for each category',
          },
        },
      },
    });

    return { tools };
  });

  // Execute tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      // Handle special catalog tool
      if (name === 'list_tool_categories') {
        let output = '# MCP Tool Categories\n\n';

        for (const [categoryId, category] of Object.entries(TOOL_CATEGORIES)) {
          output += `## ${category.emoji} ${category.name}\n`;
          output += `${category.description}\n\n`;

          if (args.detailed) {
            const tools = getToolsByCategory(categoryId);
            if (tools.length > 0) {
              output += '### Available Tools:\n';
              for (const tool of tools) {
                // Find the primary name (not an alias)
                let primaryName = '';
                for (const toolName of getAllToolNames()) {
                  const registeredTool = getTool(toolName);
                  if (registeredTool === tool && !registeredTool.aliases?.includes(toolName)) {
                    primaryName = toolName;
                    break;
                  }
                }
                output += `- **\`${primaryName}\`**: ${tool.tool.description}\n`;
              }
              output += '\n';
            }
          }
        }

        if (!args.detailed) {
          output += '\n💡 **Tip**: Use `detailed: true` to see available tools in each category.\n';
        }

        return {
          content: [
            {
              type: 'text',
              text: output,
            } as TextContent,
          ],
        };
      }

      // Look up and execute the tool
      const registeredTool = getTool(name);
      if (!registeredTool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}. Use 'list_tool_categories' to see available tools.`
        );
      }

      const result = await registeredTool.tool.execute(args);

      return {
        content: [
          {
            type: 'text',
            text: result.text,
          } as TextContent,
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log startup
  console.error(`${SERVER_NAME} v${SERVER_VERSION} started`);
  console.error(`Available categories: ${Object.keys(TOOL_CATEGORIES).join(', ')}`);
  console.error(`Total tools: ${getAllToolNames().length}`);
}

// Run server
main().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});