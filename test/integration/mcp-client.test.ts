import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("MCP Server Integration Tests", () => {
  let client: Client;
  let transport: StdioClientTransport;
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    // Start the MCP server
    const cliPath = path.join(__dirname, "../../src/cli.ts");
    serverProcess = spawn("tsx", [cliPath, "--mcp"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    // Create MCP client
    transport = new StdioClientTransport({
      command: "tsx",
      args: [cliPath, "--mcp"],
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    client = new Client(
      {
        name: "test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    // Connect client to server
    await client.connect(transport);

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }, 10000);

  afterAll(async () => {
    // Close client connection
    if (client) {
      await client.close();
    }

    // Kill server process
    if (serverProcess) {
      serverProcess.kill();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });

  describe("Tool Discovery", () => {
    it("should list available tools", async () => {
      const response = await client.listTools();

      expect(response).toBeDefined();
      expect(response.tools).toBeDefined();
      expect(Array.isArray(response.tools)).toBe(true);
      expect(response.tools.length).toBeGreaterThan(0);

      // Check for expected tools
      const toolNames = response.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain("analyze_url");
      expect(toolNames).toContain("deep_analysis");
    });

    it("should provide correct tool schemas", async () => {
      const response = await client.listTools();

      const analyzeUrlTool = response.tools.find(
        (tool: any) => tool.name === "analyze_url"
      );

      expect(analyzeUrlTool).toBeDefined();
      expect(analyzeUrlTool?.description).toBeDefined();
      expect(analyzeUrlTool?.inputSchema).toBeDefined();
      expect(analyzeUrlTool?.inputSchema.type).toBe("object");
      expect(analyzeUrlTool?.inputSchema.properties?.url).toBeDefined();
      expect(analyzeUrlTool?.inputSchema.required).toContain("url");
    });
  });

  describe("analyze_url Tool", () => {
    it("should analyze a simple URL", async () => {
      // Create a simple test server
      const http = await import("http");
      const testServer = http.createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test Page</title>
          </head>
          <body>
            <h1>Test Page</h1>
          </body>
          </html>
        `);
      });

      await new Promise<void>((resolve) => {
        testServer.listen(9999, () => resolve());
      });

      try {
        const response = await client.callTool({
          name: "analyze_url",
          arguments: {
            url: "http://localhost:9999",
            device: "mobile",
            categories: ["performance"],
            includeChains: false,
            includeUnusedCode: false,
          },
        });

        expect(response).toBeDefined();
        expect(response.content).toBeDefined();
        expect(Array.isArray(response.content)).toBe(true);
        
        const content = response.content as any[];
        if (content.length > 0) {
          const textContent = content.find(
            (item: any) => item.type === "text"
          );
          expect(textContent).toBeDefined();
          expect(textContent.text).toContain("Deep Performance Analysis");
          expect(textContent.text).toContain("Performance Score");
        }
      } finally {
        await new Promise<void>((resolve) => {
          testServer.close(() => resolve());
        });
      }
    }, 60000); // 60 second timeout for Lighthouse

    it("should handle invalid URLs", async () => {
      const response = await client.callTool({
        name: "analyze_url",
        arguments: {
          url: "not-a-valid-url",
          device: "mobile",
          categories: ["performance"],
        },
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      
      const content = response.content as any[];
      const textContent = content.find(
        (item: any) => item.type === "text"
      );
      expect(textContent).toBeDefined();
      expect(textContent.text).toContain("Error");
    });

    it("should respect device parameter", async () => {
      const http = await import("http");
      const testServer = http.createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>Desktop Test</title>
          </head>
          <body>
            <h1>Desktop Test Page</h1>
          </body>
          </html>
        `);
      });

      await new Promise<void>((resolve) => {
        testServer.listen(9998, () => resolve());
      });

      try {
        const response = await client.callTool({
          name: "analyze_url",
          arguments: {
            url: "http://localhost:9998",
            device: "desktop",
            categories: ["performance"],
          },
        });

        expect(response).toBeDefined();
        expect(response.content).toBeDefined();
        // Desktop mode should still work
        expect(response.isError).not.toBe(true);
      } finally {
        await new Promise<void>((resolve) => {
          testServer.close(() => resolve());
        });
      }
    }, 60000);
  });

  describe("deep_analysis Tool", () => {
    it("should perform deep analysis with all features", async () => {
      const http = await import("http");
      const testServer = http.createServer((_req, res) => {
        if (_req.url === "/") {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Deep Analysis Test</title>
              <style>
                .unused-class { color: red; }
                body { margin: 0; }
              </style>
            </head>
            <body>
              <h1>Deep Analysis Test</h1>
              <script>
                console.log('Test script');
                // Some unused code
                function unusedFunction() {
                  return 'never called';
                }
              </script>
            </body>
            </html>
          `);
        } else {
          res.writeHead(404);
          res.end("Not found");
        }
      });

      await new Promise<void>((resolve) => {
        testServer.listen(9997, () => resolve());
      });

      try {
        const response = await client.callTool({
          name: "deep_analysis",
          arguments: {
            url: "http://localhost:9997",
            includeChains: true,
            includeUnusedCode: true,
            maxRecommendations: 5,
          },
        });

        expect(response).toBeDefined();
        expect(response.content).toBeDefined();
        
        const content = response.content as any[];
        const textContent = content.find(
          (item: any) => item.type === "text"
        );
        expect(textContent).toBeDefined();
        expect(textContent.text).toContain("Deep Performance Analysis");
        expect(textContent.text).toContain("Critical Request Chains");
        expect(textContent.text).toContain("Unused Code Analysis");
        expect(textContent.text).toContain("Prioritized Recommendations");
      } finally {
        await new Promise<void>((resolve) => {
          testServer.close(() => resolve());
        });
      }
    }, 60000);

    it("should handle missing URL parameter", async () => {
      const response = await client.callTool({
        name: "deep_analysis",
        arguments: {
          includeChains: true,
          includeUnusedCode: true,
        },
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      
      const content = response.content as any[];
      const textContent = content.find(
        (item: any) => item.type === "text"
      );
      expect(textContent).toBeDefined();
      expect(textContent.text).toContain("Error");
      expect(textContent.text.toLowerCase()).toContain("url");
    });
  });

  describe("Error Handling", () => {
    it("should handle unknown tool gracefully", async () => {
      const response = await client.callTool({
        name: "unknown_tool",
        arguments: {},
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      
      const content = response.content as any[];
      const textContent = content.find(
        (item: any) => item.type === "text"
      );
      expect(textContent).toBeDefined();
      expect(textContent.text).toContain("Error");
      expect(textContent.text).toContain("Unknown tool");
    });

    it("should handle network errors", async () => {
      const response = await client.callTool({
        name: "analyze_url",
        arguments: {
          url: "http://localhost:99999", // Invalid port
          device: "mobile",
          categories: ["performance"],
        },
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.isError).toBe(true);
    });
  });
});