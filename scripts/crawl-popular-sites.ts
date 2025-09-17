#!/usr/bin/env tsx

/**
 * Crawl popular sites and inspect Lighthouse performance scores.
 *
 * Usage:
 *   pnpm tsx scripts/crawl-popular-sites.ts --mode simple
 *   pnpm tsx scripts/crawl-popular-sites.ts --mode full --limit 20 --fresh
 */

import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { executeL1Collect } from "../src/tools/l1-collect-single.js";
import { executeL1BatchCollect } from "../src/tools/l1-collect-batch.js";
import { LighthouseDatabase, type CrawlResult } from "../src/core/database.js";
import { resetBrowserPool } from "../src/core/browserPool.js";

type Mode = "simple" | "full";

type Device = "mobile" | "desktop";

interface RunOptions {
  device: Device;
  gather: boolean;
  limit?: number;
  outputPath?: string;
  dbPath: string;
}

interface CrawlSummary {
  url: string;
  performanceScore: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  category: string;
  issues: string[];
}

const HELP_TEXT = `
Crawl popular sites and generate Lighthouse summaries.

Options:
  --mode, -m <simple|full>   Choose quick (simple) or full crawl (default: full)
  --simple                   Shorthand for --mode simple
  --full                     Shorthand for --mode full
  --limit, -l <number>       Limit the number of sites to crawl
  --device, -d <mobile|desktop> Device to emulate (default: mobile)
  --fresh                    Force fresh Lighthouse runs (disable cache)
  --output, -o <path>        Destination markdown file for full mode report
  --db <path>                Path to SQLite database (default: .lhdata/mcp/results.db)
  --help, -h                 Show this message

Examples:
  pnpm tsx scripts/crawl-popular-sites.ts --mode simple
  pnpm tsx scripts/crawl-popular-sites.ts --mode full --limit 25 --output report.md
`;

const DEFAULT_DB_PATH = ".lhdata/mcp/results.db";

// Representative subsets for quick vs full crawls
const POPULAR_SITES = [
  // News & Media
  "https://www.cnn.com",
  "https://www.bbc.com",
  "https://www.nytimes.com",
  "https://www.theguardian.com",
  "https://www.wsj.com",
  "https://www.reuters.com",
  "https://news.yahoo.com",
  "https://www.huffpost.com",

  // E-commerce
  "https://www.amazon.com",
  "https://www.ebay.com",
  "https://www.walmart.com",
  "https://www.alibaba.com",
  "https://www.etsy.com",
  "https://www.target.com",
  "https://www.bestbuy.com",

  // Social media
  "https://www.facebook.com",
  "https://www.instagram.com",
  "https://www.twitter.com",
  "https://www.linkedin.com",
  "https://www.reddit.com",
  "https://www.pinterest.com",
  "https://www.tumblr.com",

  // Entertainment
  "https://www.youtube.com",
  "https://www.netflix.com",
  "https://www.twitch.tv",
  "https://www.hulu.com",
  "https://www.spotify.com",
  "https://www.soundcloud.com",

  // Technology
  "https://www.github.com",
  "https://stackoverflow.com",
  "https://www.medium.com",
  "https://www.techcrunch.com",
  "https://www.theverge.com",
  "https://www.wired.com",
  "https://arstechnica.com",

  // Travel & hospitality
  "https://www.airbnb.com",
  "https://www.booking.com",
  "https://www.expedia.com",
  "https://www.tripadvisor.com",
  "https://www.hotels.com",

  // Education
  "https://www.coursera.org",
  "https://www.udemy.com",
  "https://www.khanacademy.org",
  "https://www.edx.org",

  // Other popular destinations
  "https://www.wikipedia.org",
  "https://www.imdb.com",
  "https://www.yelp.com",
  "https://www.craigslist.org",
  "https://www.indeed.com",
  "https://www.zillow.com",
  "https://www.weather.com",
];

const QUICK_SITES = [
  "https://www.cnn.com",
  "https://www.github.com",
  "https://www.wikipedia.org",
  "https://www.airbnb.com",
  "https://www.spotify.com",
];

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      mode: { type: "string", short: "m" },
      simple: { type: "boolean" },
      full: { type: "boolean" },
      limit: { type: "string", short: "l" },
      device: { type: "string", short: "d", default: "mobile" },
      fresh: { type: "boolean" },
      gather: { type: "boolean" },
      output: { type: "string", short: "o" },
      db: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(HELP_TEXT);
    return;
  }

  let mode: Mode = "full";
  if (values.simple || values.mode === "simple") {
    mode = "simple";
  } else if (values.full || values.mode === "full") {
    mode = "full";
  }

  const device: Device = values.device === "desktop" ? "desktop" : "mobile";

  const limit = values.limit ? Math.max(1, Number.parseInt(values.limit, 10)) : undefined;

  const gatherFlag = values.fresh ?? values.gather;
  const gather = typeof gatherFlag === "boolean" ? gatherFlag : mode === "simple";

  const outputPath = typeof values.output === "string" ? values.output : undefined;
  const dbPath = typeof values.db === "string" && values.db.length > 0 ? values.db : DEFAULT_DB_PATH;

  const sitePool = mode === "simple" ? QUICK_SITES : POPULAR_SITES;
  const targetSites = typeof limit === "number" ? sitePool.slice(0, limit) : [...sitePool];

  if (targetSites.length === 0) {
    console.log("⚠️ No URLs configured for this crawl.");
    return;
  }

  const runOptions: RunOptions = {
    device,
    gather,
    limit,
    outputPath,
    dbPath,
  };

  try {
    if (mode === "simple") {
      await runSimpleCrawl(targetSites, runOptions);
    } else {
      await runFullCrawl(targetSites, runOptions);
    }
  } finally {
    await resetBrowserPool();
  }
}

async function runSimpleCrawl(urls: string[], options: RunOptions): Promise<void> {
  console.log("🚀 Starting quick crawl of popular sites...\n");
  console.log(`📋 Sites to analyze: ${urls.length}`);
  console.log(`📱 Device: ${options.device}`);
  console.log(`🆕 Fresh data: ${options.gather ? "yes" : "no (cache allowed)"}\n`);

  for (const url of urls) {
    console.log(`🔍 Analyzing ${url}...`);
    try {
      const result = await executeL1Collect({
        url,
        device: options.device,
        categories: ["performance"],
        gather: options.gather,
      });
      console.log(`   ✅ ${result.url}${result.cached ? " (cached)" : ""}\n`);
    } catch (error) {
      console.error(`   ❌ Failed:`, error instanceof Error ? error.message : error);
    }
  }

  const summaries = collectSummaries(urls, options.device, options.dbPath);

  if (summaries.length === 0) {
    console.log("⚠️ No crawl data available in the database.");
    return;
  }

  printConsoleSummary(summaries);
  printDatabaseStats(options.dbPath);

  console.log("\n✨ Quick crawl complete!\n");
  console.log("💡 Run with --mode full to analyze all tracked sites and generate a markdown report.\n");
}

async function runFullCrawl(urls: string[], options: RunOptions): Promise<void> {
  console.log("🚀 Starting crawl of popular sites...\n");
  console.log(`📋 Total sites to analyze: ${urls.length}`);
  console.log(`📱 Device: ${options.device}`);
  console.log(`🆕 Fresh data: ${options.gather ? "yes" : "no (cache allowed)"}\n`);
  console.log("🔍 Running Lighthouse analysis on all sites. This may take a while...\n");

  const batchResult = await executeL1BatchCollect({
    urls,
    device: options.device,
    categories: ["performance"],
    gather: options.gather,
  });

  const successful = batchResult.reports.length;
  const total = urls.length;
  console.log(`✅ Crawl completed: ${successful}/${total} successful\n`);

  if (batchResult.failed.length > 0) {
    console.log("❌ Failed URLs:");
    batchResult.failed.forEach((entry) => {
      console.log(`  - ${entry.url}: ${entry.error}`);
    });
    console.log();
  }

  const summaries = collectSummaries(urls, options.device, options.dbPath);
  if (summaries.length === 0) {
    console.log("⚠️ No crawl data available in the database.");
    return;
  }

  const reportPath = generateReport(summaries, options.outputPath);

  printConsoleSummary(summaries);
  printDatabaseStats(options.dbPath);

  console.log(`\n📄 Full report saved to: ${reportPath}\n`);
}

function collectSummaries(urls: string[], device: Device, dbPath: string): CrawlSummary[] {
  const db = new LighthouseDatabase(dbPath);
  try {
    const results: CrawlSummary[] = [];

    for (const url of urls) {
      const crawl = findLatestCrawl(db, url, device);
      if (!crawl) {
        continue;
      }

      const issues: string[] = [];
      if (crawl.performance_score !== null && crawl.performance_score < 0.5) {
        issues.push(`Low performance score: ${(crawl.performance_score * 100).toFixed(0)}`);
      }
      if (crawl.lcp !== null && crawl.lcp > 4000) {
        issues.push(`Poor LCP: ${Math.round(crawl.lcp)}ms (>4000ms)`);
      }
      if (crawl.fcp !== null && crawl.fcp > 3000) {
        issues.push(`Poor FCP: ${Math.round(crawl.fcp)}ms (>3000ms)`);
      }
      if (crawl.cls !== null && crawl.cls > 0.25) {
        issues.push(`Poor CLS: ${crawl.cls.toFixed(3)} (>0.25)`);
      }
      if (crawl.tbt !== null && crawl.tbt > 600) {
        issues.push(`High TBT: ${Math.round(crawl.tbt)}ms (>600ms)`);
      }

      results.push({
        url: crawl.url,
        performanceScore: crawl.performance_score,
        fcp: crawl.fcp,
        lcp: crawl.lcp,
        cls: crawl.cls,
        tbt: crawl.tbt,
        category: categorizeUrl(url),
        issues,
      });
    }

    return results.sort((a, b) => {
      const scoreA = a.performanceScore ?? 1;
      const scoreB = b.performanceScore ?? 1;
      return scoreA - scoreB;
    });
  } finally {
    db.close();
  }
}

function findLatestCrawl(
  db: LighthouseDatabase,
  url: string,
  device: Device,
): CrawlResult | null {
  const direct = db.getLatestCrawl(url, device);
  if (direct) return direct;

  const sanitized = url.endsWith("/") ? url.replace(/\/+$/, "") : `${url}/`;
  if (sanitized !== url) {
    const alternate = db.getLatestCrawl(sanitized, device);
    if (alternate) {
      return alternate;
    }
  }

  try {
    const { hostname } = new URL(url);
    const hostnameWithoutPrefix = hostname.replace(/^www\./, "");
    const rows = db.query(
      `SELECT * FROM crawl_results WHERE url LIKE ? AND device = ? ORDER BY timestamp DESC LIMIT 1`,
      [`%${hostnameWithoutPrefix}%`, device],
    ) as CrawlResult[];
    if (rows.length > 0) {
      return rows[0];
    }
  } catch {
    // Ignore URL parsing or query failures and fall through to null
  }

  return null;
}

function categorizeUrl(url: string): string {
  if (/(news|cnn|bbc|nytimes|guardian|wsj|reuters|yahoo|huffpost)/i.test(url)) {
    return "News & Media";
  }
  if (/(amazon|ebay|walmart|alibaba|etsy|target|bestbuy)/i.test(url)) {
    return "E-commerce";
  }
  if (/(facebook|instagram|twitter|linkedin|reddit|pinterest|tumblr)/i.test(url)) {
    return "Social Media";
  }
  if (/(youtube|netflix|twitch|hulu|spotify|soundcloud)/i.test(url)) {
    return "Entertainment";
  }
  if (/(github|stackoverflow|medium|techcrunch|theverge|wired|arstechnica)/i.test(url)) {
    return "Technology";
  }
  if (/(airbnb|booking|expedia|tripadvisor|hotels)/i.test(url)) {
    return "Travel";
  }
  if (/(coursera|udemy|khanacademy|edx)/i.test(url)) {
    return "Education";
  }
  return "Other";
}

function generateReport(results: CrawlSummary[], customPath?: string): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const reportPath = customPath && customPath.length > 0
    ? customPath
    : `popular-sites-performance-report-${timestamp}.md`;

  let markdown = `# Popular Sites Performance Report\nGenerated: ${new Date().toISOString()}\nTotal Sites Analyzed: ${results.length}\n\n## Executive Summary\n\n### Performance Distribution\n`;

  const excellent = results.filter((r) => r.performanceScore !== null && r.performanceScore >= 0.9).length;
  const good = results.filter((r) => r.performanceScore !== null && r.performanceScore >= 0.5 && r.performanceScore < 0.9).length;
  const poor = results.filter((r) => r.performanceScore !== null && r.performanceScore < 0.5).length;
  const failed = results.filter((r) => r.performanceScore === null).length;

  markdown += `- 🟢 Excellent (90-100): ${excellent} sites\n`;
  markdown += `- 🟡 Good (50-89): ${good} sites\n`;
  markdown += `- 🔴 Poor (0-49): ${poor} sites\n`;
  markdown += `- ⚫ Failed: ${failed} sites\n\n### Average Metrics\n`;

  const validScores = results.filter((r) => r.performanceScore !== null);
  const avgScore = validScores.length > 0
    ? validScores.reduce((sum, r) => sum + (r.performanceScore || 0), 0) / validScores.length
    : 0;

  const validFCP = results.filter((r) => r.fcp !== null);
  const avgFCP = validFCP.length > 0
    ? validFCP.reduce((sum, r) => sum + (r.fcp || 0), 0) / validFCP.length
    : 0;

  const validLCP = results.filter((r) => r.lcp !== null);
  const avgLCP = validLCP.length > 0
    ? validLCP.reduce((sum, r) => sum + (r.lcp || 0), 0) / validLCP.length
    : 0;

  markdown += `- Average Performance Score: ${(avgScore * 100).toFixed(1)}\n`;
  markdown += `- Average FCP: ${Math.round(avgFCP)}ms\n`;
  markdown += `- Average LCP: ${Math.round(avgLCP)}ms\n\n`;

  markdown += `## Worst Performing Sites\n\n`;
  markdown += `These sites have the lowest performance scores and need immediate attention:\n\n`;
  markdown += `| Rank | Site | Score | Category | Issues |\n`;
  markdown += `|------|------|-------|----------|--------|\n`;

  const worst20 = results.slice(0, 20);
  worst20.forEach((site, index) => {
    const score = site.performanceScore !== null ? (site.performanceScore * 100).toFixed(0) : "N/A";
    const issuesStr = site.issues.length > 0 ? site.issues.join(", ") : "No major issues";
    markdown += `| ${index + 1} | ${site.url} | ${score} | ${site.category} | ${issuesStr} |\n`;
  });

  markdown += `\n## Performance by Category\n\n`;

  const categories = Array.from(new Set(results.map((r) => r.category)));
  for (const category of categories) {
    const categoryResults = results.filter((r) => r.category === category);
    const categoryScores = categoryResults.filter((r) => r.performanceScore !== null);
    if (categoryScores.length === 0) continue;

    const avgCategoryScore = categoryScores.reduce((sum, r) => sum + (r.performanceScore || 0), 0) / categoryScores.length;
    const worstInCategory = categoryResults[0];

    markdown += `### ${category}\n`;
    markdown += `- Sites analyzed: ${categoryResults.length}\n`;
    markdown += `- Average score: ${(avgCategoryScore * 100).toFixed(1)}\n`;
    markdown += `- Worst performer: ${worstInCategory.url} (${worstInCategory.performanceScore !== null ? (worstInCategory.performanceScore * 100).toFixed(0) : "N/A"})\n\n`;
  }

  markdown += `## Core Web Vitals Violations\n\n`;

  const lcpViolations = results.filter((r) => r.lcp !== null && r.lcp > 2500);
  const fcpViolations = results.filter((r) => r.fcp !== null && r.fcp > 1800);
  const clsViolations = results.filter((r) => r.cls !== null && r.cls > 0.1);
  const tbtViolations = results.filter((r) => r.tbt !== null && r.tbt > 300);

  markdown += `### LCP Violations (>2500ms)\n`;
  markdown += `${lcpViolations.slice(0, 10).map((r) => `- ${r.url}: ${Math.round(r.lcp || 0)}ms`).join("\n")}\n\n`;

  markdown += `### FCP Violations (>1800ms)\n`;
  markdown += `${fcpViolations.slice(0, 10).map((r) => `- ${r.url}: ${Math.round(r.fcp || 0)}ms`).join("\n")}\n\n`;

  markdown += `### CLS Violations (>0.1)\n`;
  markdown += `${clsViolations.slice(0, 10).map((r) => `- ${r.url}: ${(r.cls || 0).toFixed(3)}`).join("\n")}\n\n`;

  markdown += `### TBT Violations (>300ms)\n`;
  markdown += `${tbtViolations.slice(0, 10).map((r) => `- ${r.url}: ${Math.round(r.tbt || 0)}ms`).join("\n")}\n\n`;

  markdown += `## Recommendations\n\n`;
  markdown += `### For Site Owners\n`;
  markdown += `1. **Immediate Action Required**: Sites with scores below 50 should prioritize performance optimization\n`;
  markdown += `2. **Image Optimization**: Adopt next-gen formats and lazy loading where possible\n`;
  markdown += `3. **JavaScript Optimization**: High TBT values indicate excessive JavaScript execution\n`;
  markdown += `4. **Server Response**: Slow FCP often suggests backend or CDN optimizations are needed\n\n`;

  markdown += `### Common Issues Found\n`;
  markdown += `1. Unoptimized images and media\n`;
  markdown += `2. Render-blocking resources\n`;
  markdown += `3. Excessive JavaScript execution\n`;
  markdown += `4. Slow server response times\n`;
  markdown += `5. Layout shifts from dynamic content\n\n`;

  markdown += `## Full Results\n\n`;
  markdown += `| Site | Score | FCP | LCP | CLS | TBT | Category |\n`;
  markdown += `|------|-------|-----|-----|-----|-----|----------|\n`;

  results.forEach((site) => {
    const score = site.performanceScore !== null ? (site.performanceScore * 100).toFixed(0) : "N/A";
    const fcp = site.fcp !== null ? `${Math.round(site.fcp)}ms` : "N/A";
    const lcp = site.lcp !== null ? `${Math.round(site.lcp)}ms` : "N/A";
    const cls = site.cls !== null ? site.cls.toFixed(3) : "N/A";
    const tbt = site.tbt !== null ? `${Math.round(site.tbt)}ms` : "N/A";
    markdown += `| ${site.url} | ${score} | ${fcp} | ${lcp} | ${cls} | ${tbt} | ${site.category} |\n`;
  });

  markdown += `\n---\n*Report generated using Lighthouse MCP*\n`;

  writeFileSync(reportPath, markdown);
  return reportPath;
}

function printConsoleSummary(results: CrawlSummary[]): void {
  console.log("📊 Performance Results:");
  console.log("=======================\n");

  results.forEach((site) => {
    const score = site.performanceScore !== null ? (site.performanceScore * 100).toFixed(0) : "N/A";
    console.log(`${getScoreEmoji(site.performanceScore)} ${site.url}`);
    console.log(`   Score: ${score}/100`);
    console.log(`   FCP: ${site.fcp !== null ? `${Math.round(site.fcp)}ms` : "N/A"}`);
    console.log(`   LCP: ${site.lcp !== null ? `${Math.round(site.lcp)}ms` : "N/A"}`);
    console.log(`   CLS: ${site.cls !== null ? site.cls.toFixed(3) : "N/A"}`);
    console.log(`   TBT: ${site.tbt !== null ? `${Math.round(site.tbt)}ms` : "N/A"}`);
    if (site.issues.length > 0) {
      console.log(`   Issues: ${site.issues.join(", ")}`);
    }
    console.log();
  });

  const withScores = results.filter((r) => r.performanceScore !== null);
  if (withScores.length > 0) {
    const sortedAscending = [...withScores].sort((a, b) => (a.performanceScore || 0) - (b.performanceScore || 0));
    const sortedDescending = [...withScores].sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));

    console.log("💔 Worst Performers:");
    console.log("--------------------");
    sortedAscending.slice(0, Math.min(3, sortedAscending.length)).forEach((site, index) => {
      const score = site.performanceScore !== null ? (site.performanceScore * 100).toFixed(0) : "N/A";
      console.log(`${index + 1}. ${site.url}: ${score}/100`);
    });
    console.log();

    console.log("🏆 Best Performers:");
    console.log("-------------------");
    sortedDescending.slice(0, Math.min(3, sortedDescending.length)).forEach((site, index) => {
      const score = site.performanceScore !== null ? (site.performanceScore * 100).toFixed(0) : "N/A";
      console.log(`${index + 1}. ${site.url}: ${score}/100`);
    });
    console.log();
  }
}

function printDatabaseStats(dbPath: string): void {
  const db = new LighthouseDatabase(dbPath);
  try {
    const stats = db.getStatistics();
    console.log("📈 Database Statistics:");
    console.log("-----------------------");
    console.log(`Total crawls: ${stats.totalCrawls}`);
    console.log(`Unique URLs: ${stats.uniqueUrls}`);
    console.log(`Average performance: ${(stats.avgPerformanceScore * 100).toFixed(1)}/100`);
  } finally {
    db.close();
  }
}

function getScoreEmoji(score: number | null): string {
  if (score === null) return "⚫";
  if (score >= 0.9) return "🟢";
  if (score >= 0.5) return "🟡";
  return "🔴";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
