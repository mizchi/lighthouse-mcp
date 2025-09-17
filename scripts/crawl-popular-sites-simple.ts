#!/usr/bin/env tsx

/**
 * 有名サイトの簡易クロール（少数のサイトでテスト）
 *
 * 使用方法:
 * pnpm tsx scripts/crawl-popular-sites-simple.ts
 */

import { executeL1Collect } from "../src/tools/l1-collect-single.js";
import { resetBrowserPool } from "../src/core/browserPool.js";
import { LighthouseDatabase } from "../src/core/database.js";
import type { CrawlResult } from "../src/core/database.js";

// テスト用に少数のサイトを選定
const TEST_SITES = [
  // 各カテゴリから1-2サイトずつ
  "https://www.cnn.com",
  // 'https://www.amazon.com',
  // 'https://www.youtube.com',
  // 'https://www.github.com',
  // 'https://www.airbnb.com',
  // 'https://www.wikipedia.org',
  // 'https://www.reddit.com',
  // 'https://www.medium.com',
];

async function testCrawl() {
  console.log("🚀 Starting test crawl of popular sites...\n");

  const targetUrl = TEST_SITES[0];
  if (!targetUrl) {
    console.log("⚠️ No URLs configured for the simple crawl script.");
    return;
  }

  console.log(`📋 Site to analyze: ${targetUrl}\n`);

  // シングルURLのクロールを実行
  console.log("🔍 Running Lighthouse analysis...\n");

  let resolvedUrl = targetUrl;

  try {
    const result = await executeL1Collect({
      url: targetUrl,
      device: "mobile",
      categories: ["performance"],
      gather: true, // 明示的に新しいデータを取得
    });

    resolvedUrl = result.url;
    console.log(`✅ Crawl successful for ${resolvedUrl}${result.cached ? " (cached)" : ""}\n`);
  } catch (error) {
    console.error(
      `❌ Failed to crawl ${targetUrl}:`,
      error instanceof Error ? error.message : error,
    );
    return;
  }

  // データベースから結果を取得
  const db = new LighthouseDatabase('.lhdata/mcp/results.db');

  console.log("📊 Performance Results:");
  console.log("=======================\n");

  const results: Array<{
    url: string;
    score: number | null;
    fcp: number | null;
    lcp: number | null;
    cls: number | null;
    tbt: number | null;
  }> = [];

  try {
    const crawl = findLatestCrawl(db, resolvedUrl, "mobile");

    if (!crawl) {
      console.log(`❌ ${resolvedUrl}: No data`);
    } else {
      const score =
        crawl.performance_score !== null
          ? (crawl.performance_score * 100).toFixed(0)
          : "N/A";

      const emoji = getScoreEmoji(crawl.performance_score);

      results.push({
        url: crawl.url,
        score: crawl.performance_score,
        fcp: crawl.fcp,
        lcp: crawl.lcp,
        cls: crawl.cls,
        tbt: crawl.tbt,
      });

      console.log(`${emoji} ${crawl.url}`);
      console.log(`   Score: ${score}/100`);
      console.log(`   FCP: ${crawl.fcp ? Math.round(crawl.fcp) + "ms" : "N/A"}`);
      console.log(`   LCP: ${crawl.lcp ? Math.round(crawl.lcp) + "ms" : "N/A"}`);
      console.log(`   CLS: ${crawl.cls ? crawl.cls.toFixed(3) : "N/A"}`);
      console.log(`   TBT: ${crawl.tbt ? Math.round(crawl.tbt) + "ms" : "N/A"}`);
      console.log();
    }

    // ワーストパフォーマー
    const worst = results
      .filter((r) => r.score !== null)
      .sort((a, b) => (a.score || 0) - (b.score || 0));

    if (worst.length > 0) {
      console.log("💔 Worst Performers:");
      console.log("--------------------");
      worst.slice(0, 3).forEach((site, i) => {
        const score = site.score !== null ? (site.score * 100).toFixed(0) : "N/A";
        console.log(`${i + 1}. ${site.url}: ${score}/100`);
      });
      console.log();
    }

    // ベストパフォーマー
    const best = results
      .filter((r) => r.score !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    if (best.length > 0) {
      console.log("🏆 Best Performers:");
      console.log("-------------------");
      best.slice(0, 3).forEach((site, i) => {
        const score = site.score !== null ? (site.score * 100).toFixed(0) : "N/A";
        console.log(`${i + 1}. ${site.url}: ${score}/100`);
      });
      console.log();
    }

    // 統計情報
    const stats = db.getStatistics();
    console.log("📈 Database Statistics:");
    console.log("-----------------------");
    console.log(`Total crawls: ${stats.totalCrawls}`);
    console.log(`Unique URLs: ${stats.uniqueUrls}`);
    console.log(
      `Average performance: ${(stats.avgPerformanceScore * 100).toFixed(1)}/100`,
    );
  } finally {
    db.close();
  }

  console.log("\n✨ Test crawl complete!\n");
  console.log(
    '💡 Run "npx tsx crawl-popular-sites.ts" for full analysis of 50+ sites'
  );
}

function findLatestCrawl(
  db: LighthouseDatabase,
  url: string,
  device: 'mobile' | 'desktop',
): CrawlResult | null {
  const direct = db.getLatestCrawl(url, device);
  if (direct) return direct;

  // 末尾スラッシュなどの差異を吸収
  const sanitized = url.endsWith('/') ? url.replace(/\/+$/, '') : `${url}/`;
  if (sanitized !== url) {
    const alternate = db.getLatestCrawl(sanitized, device);
    if (alternate) {
      return alternate;
    }
  }

  try {
    const { hostname } = new URL(url);
    const hostnameWithoutPrefix = hostname.replace(/^www\./, '');
    const rows = db.query(
      `SELECT * FROM crawl_results WHERE url LIKE ? AND device = ? ORDER BY timestamp DESC LIMIT 1`,
      [`%${hostnameWithoutPrefix}%`, device],
    ) as CrawlResult[];
    if (rows.length > 0) {
      return rows[0];
    }
  } catch (error) {
    // URL 解析やクエリで失敗した場合は無視してnullを返す
  }

  return null;
}

function getScoreEmoji(score: number | null): string {
  if (score === null) return "⚫";
  if (score >= 0.9) return "🟢";
  if (score >= 0.5) return "🟡";
  return "🔴";
}

// 実行
testCrawl()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await resetBrowserPool();
  });
