#!/usr/bin/env tsx

/**
 * 有名サイトの簡易クロール（少数のサイトでテスト）
 * 
 * 使用方法:
 * npx tsx crawl-popular-sites-simple.ts
 */

import { executeL1BatchCollect } from './dist/tools/l1-collect-batch.js';
import { LighthouseDatabase } from './dist/core/database.js';

// テスト用に少数のサイトを選定
const TEST_SITES = [
  // 各カテゴリから1-2サイトずつ
  'https://www.cnn.com',
  'https://www.amazon.com',
  'https://www.youtube.com',
  'https://www.github.com',
  'https://www.airbnb.com',
  'https://www.wikipedia.org',
  'https://www.reddit.com',
  'https://www.medium.com',
];

async function testCrawl() {
  console.log('🚀 Starting test crawl of popular sites...\n');
  console.log(`📋 Sites to analyze: ${TEST_SITES.length}\n`);

  // バッチクロール実行
  console.log('🔍 Running Lighthouse analysis...\n');
  
  const batchResult = await executeL1BatchCollect({
    urls: TEST_SITES,
    device: 'mobile',
    categories: ['performance'],
    maxBrowsers: 2, // 2つまで並列
  });

  const successful = batchResult.reports.length;
  const total = TEST_SITES.length;
  
  console.log(`\n✅ Crawl completed: ${successful}/${total} successful\n`);
  
  if (batchResult.failed.length > 0) {
    console.log('❌ Failed URLs:');
    batchResult.failed.forEach(f => {
      console.log(`  - ${f.url}: ${f.error}`);
    });
    console.log();
  }

  // データベースから結果を取得
  const db = new LighthouseDatabase();
  
  console.log('📊 Performance Results:');
  console.log('=======================\n');
  
  const results = [];
  
  for (const url of TEST_SITES) {
    const crawl = db.getLatestCrawl(url, 'mobile');
    if (!crawl) {
      console.log(`❌ ${url}: No data`);
      continue;
    }
    
    const score = crawl.performance_score !== null 
      ? (crawl.performance_score * 100).toFixed(0)
      : 'N/A';
    
    const emoji = getScoreEmoji(crawl.performance_score);
    
    results.push({
      url,
      score: crawl.performance_score,
      fcp: crawl.fcp,
      lcp: crawl.lcp,
      cls: crawl.cls,
      tbt: crawl.tbt,
    });
    
    console.log(`${emoji} ${url}`);
    console.log(`   Score: ${score}/100`);
    console.log(`   FCP: ${crawl.fcp ? Math.round(crawl.fcp) + 'ms' : 'N/A'}`);
    console.log(`   LCP: ${crawl.lcp ? Math.round(crawl.lcp) + 'ms' : 'N/A'}`);
    console.log(`   CLS: ${crawl.cls ? crawl.cls.toFixed(3) : 'N/A'}`);
    console.log(`   TBT: ${crawl.tbt ? Math.round(crawl.tbt) + 'ms' : 'N/A'}`);
    console.log();
  }
  
  // ワーストパフォーマー
  const worst = results
    .filter(r => r.score !== null)
    .sort((a, b) => (a.score || 0) - (b.score || 0));
  
  if (worst.length > 0) {
    console.log('💔 Worst Performers:');
    console.log('--------------------');
    worst.slice(0, 3).forEach((site, i) => {
      const score = site.score !== null ? (site.score * 100).toFixed(0) : 'N/A';
      console.log(`${i + 1}. ${site.url}: ${score}/100`);
    });
    console.log();
  }
  
  // ベストパフォーマー  
  const best = results
    .filter(r => r.score !== null)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  
  if (best.length > 0) {
    console.log('🏆 Best Performers:');
    console.log('-------------------');
    best.slice(0, 3).forEach((site, i) => {
      const score = site.score !== null ? (site.score * 100).toFixed(0) : 'N/A';
      console.log(`${i + 1}. ${site.url}: ${score}/100`);
    });
    console.log();
  }
  
  // 統計情報
  const stats = db.getStatistics();
  console.log('📈 Database Statistics:');
  console.log('-----------------------');
  console.log(`Total crawls: ${stats.totalCrawls}`);
  console.log(`Unique URLs: ${stats.uniqueUrls}`);
  console.log(`Average performance: ${(stats.avgPerformanceScore * 100).toFixed(1)}/100`);
  
  db.close();
  
  console.log('\n✨ Test crawl complete!\n');
  console.log('💡 Run "npx tsx crawl-popular-sites.ts" for full analysis of 50+ sites');
}

function getScoreEmoji(score: number | null): string {
  if (score === null) return '⚫';
  if (score >= 0.9) return '🟢';
  if (score >= 0.5) return '🟡';
  return '🔴';
}

// 実行
testCrawl().catch(console.error);