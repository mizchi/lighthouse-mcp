#!/usr/bin/env tsx

import { parseArgs } from "node:util";
import { generateCriticalChainReport } from "../src/tools/l2-critical-chain-report.js";
import { writeFileSync } from "node:fs";

async function main() {
  const helpText = `
Usage: pnpm tsx scripts/generate-critical-chain-report.ts [options]

Options:
  --url <url>           Filter by URL (repeatable)
  --limit, -n <number>  Limit number of rows (default: 10)
  --device, -d <name>   Filter by device (mobile|desktop)
  --markdown, -m        Emit markdown table instead of JSON
  --output, -o <path>   Write report to file instead of stdout
  --duplicates          Include multiple reports per URL
  --help, -h            Show this message
`;

  const { values } = parseArgs({
    options: {
      url: { type: "string", multiple: true },
      limit: { type: "string", short: "n" },
      device: { type: "string", short: "d" },
      markdown: { type: "boolean", short: "m" },
      output: { type: "string", short: "o" },
      duplicates: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(helpText.trim());
    return;
  }

  const urls = Array.isArray(values.url)
    ? values.url
    : values.url
    ? [values.url]
    : undefined;

  const limit = values.limit ? Number.parseInt(values.limit, 10) : undefined;
  const device = values.device === "desktop" ? "desktop" : values.device === "mobile" ? "mobile" : undefined;
  const includeDuplicates = Boolean(values.duplicates);
  const format = values.markdown ? "markdown" : "json";

  const { summaries, markdown } = await generateCriticalChainReport({
    urls,
    limit,
    device,
    includeDuplicates,
    format,
  });

  if (values.output) {
    if (format === "markdown") {
      writeFileSync(values.output, markdown ?? "");
      console.log(`Report written to ${values.output}`);
    } else {
      writeFileSync(values.output, JSON.stringify(summaries, null, 2));
      console.log(`Report written to ${values.output}`);
    }
  } else {
    if (format === "markdown") {
      console.log(markdown);
    } else {
      console.log(JSON.stringify(summaries, null, 2));
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
