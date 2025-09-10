#!/usr/bin/env node

import { parseArgs } from "node:util";
import { runLighthouse } from "./core/lighthouse.js";
import { performDeepAnalysis } from "./analyzers/deepAnalysis.js";
import { createDeepAnalysisTool } from "./mcp/deep-analysis-tool.js";

const helpText = `
Lighthouse MCP

Usage: lhmcp <url> [options]
       lhmcp --mcp              Start MCP server

Options:
  -d, --device <device>     Device type: mobile (default) or desktop
  -c, --categories <list>   Categories to test (comma-separated)
                            Default: performance,accessibility,best-practices,seo
  --chains                  Include critical chain analysis
  --unused                  Include unused code analysis
  --json                    Output raw JSON instead of formatted text
  --mcp                     Start as MCP server
  -h, --help               Show this help message

Examples:
  lhmcp https://example.com
  lhmcp https://example.com --device desktop
  lhmcp https://example.com --chains --unused
  lhmcp https://example.com --json > report.json
  lhmcp --mcp              Start MCP server
`;

interface AnalysisOptions {
  format?: 'json' | 'text';
  output?: string;
  deep?: boolean;
  device?: string;
  categories?: string[];
  json?: boolean;
  chains?: boolean;
  unused?: boolean;
}

async function runAnalysis(url: string, options: AnalysisOptions) {
  console.log(`\n🔍 Analyzing ${url}...`);
  console.log(`   Device: ${options.device || 'mobile'}`);
  console.log(`   Categories: ${options.categories?.join(", ") || 'performance'}\n`);

  try {
    // Run Lighthouse
    const startTime = Date.now();
    const result = await runLighthouse(url, {
      device: options.device as "mobile" | "desktop",
      categories: options.categories,
      userDataDir: ".lhdata/cli",
      timeout: 120000, // 2 minutes timeout for heavy sites
    });

    if (!result.isOk()) {
      console.error(`❌ Error: ${result.error.message}`);
      process.exit(1);
    }

    const report = result.value;
    const duration = Date.now() - startTime;
    console.log(`✅ Analysis completed in ${(duration / 1000).toFixed(1)}s\n`);

    if (options.json) {
      // Output raw JSON
      const analysis = performDeepAnalysis(report);
      console.log(JSON.stringify(analysis, null, 2));
    } else {
      // Use the deep analysis tool for formatted output
      const tool = await createDeepAnalysisTool();
      const analysisResult = await tool.execute({
        reportData: report,
        includeChains: options.chains,
        includeUnusedCode: options.unused,
        maxRecommendations: 10,
      });

      // Extract text from the result
      let output = "";
      if (Array.isArray(analysisResult.content)) {
        output = analysisResult.content
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("\n");
      } else if (typeof analysisResult.content === "string") {
        output = analysisResult.content;
      }

      console.log(output);
    }

    // Summary
    if (!options.json) {
      console.log("\n" + "=".repeat(60));
      console.log("📊 Summary:");
      console.log(`   URL: ${report.finalUrl || report.requestedUrl}`);
      console.log(
        `   Performance Score: ${Math.round(
          (report.categories?.performance?.score || 0) * 100
        )}/100`
      );

      const audits = report.audits || {};
      if (audits["largest-contentful-paint"]?.numericValue) {
        console.log(
          `   LCP: ${Math.round(
            audits["largest-contentful-paint"].numericValue
          )}ms`
        );
      }
      if (audits["first-contentful-paint"]?.numericValue) {
        console.log(
          `   FCP: ${Math.round(
            audits["first-contentful-paint"].numericValue
          )}ms`
        );
      }
      if (audits["cumulative-layout-shift"]?.numericValue !== undefined) {
        console.log(
          `   CLS: ${audits["cumulative-layout-shift"].numericValue.toFixed(
            3
          )}`
        );
      }
      if (audits["total-blocking-time"]?.numericValue) {
        console.log(
          `   TBT: ${Math.round(
            audits["total-blocking-time"].numericValue
          )}ms`
        );
      }
    }
  } catch (error) {
    console.error(`\n❌ Unexpected error: ${error}`);
    process.exit(1);
  }
}

async function startMCPServer() {
  const { createMCPServer } = await import("./mcp/server.js");
  console.log("🚀 Starting MCP server...");
  await createMCPServer();
}

async function main() {
  // Parse command line arguments
  const { values, positionals } = parseArgs({
    options: {
      device: {
        type: "string",
        short: "d",
        default: "mobile",
      },
      categories: {
        type: "string",
        short: "c",
        default: "performance,accessibility,best-practices,seo",
      },
      chains: {
        type: "boolean",
        default: false,
      },
      unused: {
        type: "boolean",
        default: false,
      },
      json: {
        type: "boolean",
        default: false,
      },
      mcp: {
        type: "boolean",
        default: false,
      },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
    },
    allowPositionals: true,
  });

  // Show help
  if (values.help || (positionals.length === 0 && !values.mcp)) {
    console.log(helpText);
    process.exit(0);
  }

  // Start MCP server if requested
  if (values.mcp) {
    await startMCPServer();
    return;
  }

  // Get URL from positional argument
  const url = positionals[0];
  if (!url) {
    console.error("Error: URL is required");
    console.log(helpText);
    process.exit(1);
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    console.error("Error: URL must start with http:// or https://");
    process.exit(1);
  }

  // Process categories
  const categories = typeof values.categories === 'string' 
    ? values.categories.split(",").filter(Boolean)
    : ["performance", "accessibility", "best-practices", "seo"];

  // Run analysis
  await runAnalysis(url, {
    device: values.device || "mobile",
    categories,
    chains: values.chains,
    unused: values.unused,
    json: values.json,
  });
}

// Run the CLI
main().catch((error) => {
  console.error(error);
  process.exit(1);
});