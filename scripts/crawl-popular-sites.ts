#!/usr/bin/env tsx

/**
 * 有名なサイトをクロールしてLighthouseスコアが悪いページを特定
 * 
 * 使用方法:
 * pnpm tsx scripts/crawl-popular-sites.ts
 */

import { executeL1BatchCollect } from '../dist/tools/l1-collect-batch.js';
import { LighthouseDatabase } from '../dist/core/database.js';
import { writeFileSync } from 'fs';

// 有名サイトのURL一覧（各カテゴリから選定）
const POPULAR_SITES = [
  // ニュースサイト
  'https://www.cnn.com',
  'https://www.bbc.com',
  'https://www.nytimes.com',
  'https://www.theguardian.com',
  'https://www.wsj.com',
  'https://www.reuters.com',
  'https://news.yahoo.com',
  'https://www.huffpost.com',
  
  // Eコマース
  'https://www.amazon.com',
  'https://www.ebay.com',
  'https://www.walmart.com',
  'https://www.alibaba.com',
  'https://www.etsy.com',
  'https://www.target.com',
  'https://www.bestbuy.com',
  
  // ソーシャルメディア
  'https://www.facebook.com',
  'https://www.instagram.com',
  'https://www.twitter.com',
  'https://www.linkedin.com',
  'https://www.reddit.com',
  'https://www.pinterest.com',
  'https://www.tumblr.com',
  
  // 動画・エンタメ
  'https://www.youtube.com',
  'https://www.netflix.com',
  'https://www.twitch.tv',
  'https://www.hulu.com',
  'https://www.spotify.com',
  'https://www.soundcloud.com',
  
  // テクノロジー
  'https://www.github.com',
  'https://stackoverflow.com',
  'https://www.medium.com',
  'https://www.techcrunch.com',
  'https://www.theverge.com',
  'https://www.wired.com',
  'https://arstechnica.com',
  
  // 旅行・ホスピタリティ
  'https://www.airbnb.com',
  'https://www.booking.com',
  'https://www.expedia.com',
  'https://www.tripadvisor.com',
  'https://www.hotels.com',
  
  // 教育・学習
  'https://www.coursera.org',
  'https://www.udemy.com',
  'https://www.khanacademy.org',
  'https://www.edx.org',
  
  // その他人気サイト
  'https://www.wikipedia.org',
  'https://www.imdb.com',
  'https://www.yelp.com',
  'https://www.craigslist.org',
  'https://www.indeed.com',
  'https://www.zillow.com',
  'https://www.weather.com',
];

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

async function crawlPopularSites() {
  console.log('🚀 Starting crawl of popular sites...\n');
  console.log(`📋 Total sites to analyze: ${POPULAR_SITES.length}\n`);

  // バッチクロールを実行（並列度を制御）
  console.log('🔍 Running Lighthouse analysis on all sites...');
  console.log('This may take 10-20 minutes...\n');

  const batchResult = await executeL1BatchCollect({
    urls: POPULAR_SITES,
    device: 'mobile',
    categories: ['performance'],
    maxBrowsers: 3, // 3つまで並列実行
  });

  const successful = batchResult.reports.length;
  const total = POPULAR_SITES.length;
  console.log(`\n✅ Crawl completed: ${successful}/${total} successful\n`);
  
  if (batchResult.failed.length > 0) {
    console.log('❌ Failed URLs:');
    batchResult.failed.forEach(f => {
      console.log(`  - ${f.url}: ${f.error}`);
    });
    console.log();
  }

  // データベースから結果を取得して分析
  const db = new LighthouseDatabase();
  const results: CrawlSummary[] = [];

  for (const url of POPULAR_SITES) {
    const crawl = db.getLatestCrawl(url, 'mobile');
    if (!crawl) continue;

    const category = categorizeUrl(url);
    const issues: string[] = [];

    // パフォーマンス問題を特定
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
      url,
      performanceScore: crawl.performance_score,
      fcp: crawl.fcp,
      lcp: crawl.lcp,
      cls: crawl.cls,
      tbt: crawl.tbt,
      category,
      issues,
    });
  }

  db.close();

  // スコアが悪い順にソート
  results.sort((a, b) => {
    const scoreA = a.performanceScore ?? 1;
    const scoreB = b.performanceScore ?? 1;
    return scoreA - scoreB;
  });

  // レポート生成
  generateReport(results);
}

function categorizeUrl(url: string): string {
  if (url.includes('news') || url.includes('cnn') || url.includes('bbc') || url.includes('nytimes') || url.includes('guardian') || url.includes('wsj') || url.includes('reuters') || url.includes('yahoo') || url.includes('huffpost')) {
    return 'News & Media';
  }
  if (url.includes('amazon') || url.includes('ebay') || url.includes('walmart') || url.includes('alibaba') || url.includes('etsy') || url.includes('target') || url.includes('bestbuy')) {
    return 'E-commerce';
  }
  if (url.includes('facebook') || url.includes('instagram') || url.includes('twitter') || url.includes('linkedin') || url.includes('reddit') || url.includes('pinterest') || url.includes('tumblr')) {
    return 'Social Media';
  }
  if (url.includes('youtube') || url.includes('netflix') || url.includes('twitch') || url.includes('hulu') || url.includes('spotify') || url.includes('soundcloud')) {
    return 'Entertainment';
  }
  if (url.includes('github') || url.includes('stackoverflow') || url.includes('medium') || url.includes('techcrunch') || url.includes('theverge') || url.includes('wired') || url.includes('arstechnica')) {
    return 'Technology';
  }
  if (url.includes('airbnb') || url.includes('booking') || url.includes('expedia') || url.includes('tripadvisor') || url.includes('hotels')) {
    return 'Travel';
  }
  if (url.includes('coursera') || url.includes('udemy') || url.includes('khanacademy') || url.includes('edx')) {
    return 'Education';
  }
  return 'Other';
}

function generateReport(results: CrawlSummary[]) {
  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = `popular-sites-performance-report-${timestamp}.md`;

  let markdown = `# Popular Sites Performance Report
Generated: ${new Date().toISOString()}
Total Sites Analyzed: ${results.length}

## Executive Summary

### Performance Distribution
`;

  // スコア分布
  const excellent = results.filter(r => r.performanceScore !== null && r.performanceScore >= 0.9).length;
  const good = results.filter(r => r.performanceScore !== null && r.performanceScore >= 0.5 && r.performanceScore < 0.9).length;
  const poor = results.filter(r => r.performanceScore !== null && r.performanceScore < 0.5).length;
  const failed = results.filter(r => r.performanceScore === null).length;

  markdown += `- 🟢 Excellent (90-100): ${excellent} sites
- 🟡 Good (50-89): ${good} sites
- 🔴 Poor (0-49): ${poor} sites
- ⚫ Failed: ${failed} sites

### Average Metrics
`;

  // 平均メトリクス計算
  const validScores = results.filter(r => r.performanceScore !== null);
  const avgScore = validScores.length > 0 
    ? validScores.reduce((sum, r) => sum + (r.performanceScore || 0), 0) / validScores.length
    : 0;
  
  const validFCP = results.filter(r => r.fcp !== null);
  const avgFCP = validFCP.length > 0
    ? validFCP.reduce((sum, r) => sum + (r.fcp || 0), 0) / validFCP.length
    : 0;
    
  const validLCP = results.filter(r => r.lcp !== null);
  const avgLCP = validLCP.length > 0
    ? validLCP.reduce((sum, r) => sum + (r.lcp || 0), 0) / validLCP.length
    : 0;

  markdown += `- Average Performance Score: ${(avgScore * 100).toFixed(1)}
- Average FCP: ${Math.round(avgFCP)}ms
- Average LCP: ${Math.round(avgLCP)}ms

## Worst Performing Sites

These sites have the lowest performance scores and need immediate attention:

| Rank | Site | Score | Category | Issues |
|------|------|-------|----------|--------|
`;

  // ワースト20サイト
  const worst20 = results.slice(0, 20);
  worst20.forEach((site, index) => {
    const score = site.performanceScore !== null ? (site.performanceScore * 100).toFixed(0) : 'N/A';
    const issuesStr = site.issues.length > 0 ? site.issues.join(', ') : 'No major issues';
    markdown += `| ${index + 1} | ${site.url} | ${score} | ${site.category} | ${issuesStr} |\n`;
  });

  // カテゴリ別分析
  markdown += `\n## Performance by Category\n\n`;

  const categories = Array.from(new Set(results.map(r => r.category)));
  
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const categoryAvg = categoryResults.filter(r => r.performanceScore !== null);
    
    if (categoryAvg.length === 0) continue;
    
    const avgCategoryScore = categoryAvg.reduce((sum, r) => sum + (r.performanceScore || 0), 0) / categoryAvg.length;
    
    markdown += `### ${category}
- Sites analyzed: ${categoryResults.length}
- Average score: ${(avgCategoryScore * 100).toFixed(1)}
- Worst performer: ${categoryResults[0].url} (${categoryResults[0].performanceScore !== null ? (categoryResults[0].performanceScore * 100).toFixed(0) : 'N/A'})

`;
  }

  // Core Web Vitals違反
  markdown += `## Core Web Vitals Violations\n\n`;
  
  const lcpViolations = results.filter(r => r.lcp !== null && r.lcp > 2500);
  const fcpViolations = results.filter(r => r.fcp !== null && r.fcp > 1800);
  const clsViolations = results.filter(r => r.cls !== null && r.cls > 0.1);
  const tbtViolations = results.filter(r => r.tbt !== null && r.tbt > 300);

  markdown += `### LCP Violations (>2500ms)
${lcpViolations.slice(0, 10).map(r => `- ${r.url}: ${Math.round(r.lcp || 0)}ms`).join('\n')}

### FCP Violations (>1800ms)
${fcpViolations.slice(0, 10).map(r => `- ${r.url}: ${Math.round(r.fcp || 0)}ms`).join('\n')}

### CLS Violations (>0.1)
${clsViolations.slice(0, 10).map(r => `- ${r.url}: ${(r.cls || 0).toFixed(3)}`).join('\n')}

### TBT Violations (>300ms)
${tbtViolations.slice(0, 10).map(r => `- ${r.url}: ${Math.round(r.tbt || 0)}ms`).join('\n')}

## Recommendations

### For Site Owners
1. **Immediate Action Required**: Sites with scores below 50 should prioritize performance optimization
2. **Image Optimization**: Many sites could benefit from next-gen image formats and lazy loading
3. **JavaScript Optimization**: High TBT values indicate excessive JavaScript execution
4. **Server Response**: Poor FCP often indicates slow server response times

### Common Issues Found
1. Unoptimized images and media
2. Render-blocking resources
3. Excessive JavaScript execution
4. Poor server response times
5. Layout shifts from dynamic content

## Full Results

| Site | Score | FCP | LCP | CLS | TBT | Category |
|------|-------|-----|-----|-----|-----|----------|
`;

  // 全結果をテーブルに
  results.forEach(site => {
    const score = site.performanceScore !== null ? (site.performanceScore * 100).toFixed(0) : 'N/A';
    const fcp = site.fcp !== null ? `${Math.round(site.fcp)}ms` : 'N/A';
    const lcp = site.lcp !== null ? `${Math.round(site.lcp)}ms` : 'N/A';
    const cls = site.cls !== null ? site.cls.toFixed(3) : 'N/A';
    const tbt = site.tbt !== null ? `${Math.round(site.tbt)}ms` : 'N/A';
    
    markdown += `| ${site.url} | ${score} | ${fcp} | ${lcp} | ${cls} | ${tbt} | ${site.category} |\n`;
  });

  markdown += `\n---
*Report generated using Lighthouse MCP*`;

  // ファイルに保存
  writeFileSync(reportPath, markdown);
  
  console.log('\n📊 Report Summary:');
  console.log('================\n');
  console.log(`Total sites analyzed: ${results.length}`);
  console.log(`- Excellent (90-100): ${excellent} sites`);
  console.log(`- Good (50-89): ${good} sites`);
  console.log(`- Poor (0-49): ${poor} sites`);
  console.log(`- Failed: ${failed} sites\n`);
  
  console.log('🏆 Best Performing Sites:');
  results.filter(r => r.performanceScore !== null)
    .sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))
    .slice(0, 5)
    .forEach((site, i) => {
      console.log(`  ${i + 1}. ${site.url} - Score: ${(site.performanceScore! * 100).toFixed(0)}`);
    });
  
  console.log('\n💔 Worst Performing Sites:');
  worst20.slice(0, 5).forEach((site, i) => {
    const score = site.performanceScore !== null ? (site.performanceScore * 100).toFixed(0) : 'N/A';
    console.log(`  ${i + 1}. ${site.url} - Score: ${score}`);
  });
  
  console.log(`\n📄 Full report saved to: ${reportPath}\n`);
}

// メイン実行
crawlPopularSites().catch(console.error);