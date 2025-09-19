import type { LighthouseReport } from '../types';
import { executeL1BatchCollect } from './l1-collect-batch';
import { extractMetrics } from '../core/metrics';
import { getDefaultStorage } from '../core/reportStorage';

export interface SiteComparisonParams {
  urls: string[];
  device?: 'mobile' | 'desktop';
  categories?: string[];
  useCache?: boolean;
}

export interface SiteMetrics {
  url: string;
  performanceScore: number;
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  si?: number;
  tti?: number;
  category?: string;
  issues: string[];
}

export interface SiteComparisonResult {
  sites: SiteMetrics[];
  summary: {
    averageScore: number;
    bestPerformer: SiteMetrics;
    worstPerformer: SiteMetrics;
    medianLCP: number;
    medianFCP: number;
    medianCLS: number;
    medianTBT: number;
  };
  byCategory?: Record<string, {
    sites: SiteMetrics[];
    averageScore: number;
    bestPerformer: SiteMetrics;
    worstPerformer: SiteMetrics;
  }>;
  recommendations: string[];
}

function categorizeUrl(url: string): string {
  if (url.includes('news') || url.includes('cnn') || url.includes('bbc') || url.includes('nytimes') || url.includes('guardian') || url.includes('reuters') || url.includes('yahoo') || url.includes('huffpost') || url.includes('wsj')) {
    return 'News & Media';
  }
  if (url.includes('amazon') || url.includes('ebay') || url.includes('walmart') || url.includes('alibaba') || url.includes('etsy') || url.includes('target') || url.includes('bestbuy') || url.includes('shop')) {
    return 'E-commerce';
  }
  if (url.includes('facebook') || url.includes('instagram') || url.includes('twitter') || url.includes('linkedin') || url.includes('reddit') || url.includes('pinterest') || url.includes('tumblr') || url.includes('social')) {
    return 'Social Media';
  }
  if (url.includes('youtube') || url.includes('netflix') || url.includes('twitch') || url.includes('hulu') || url.includes('spotify') || url.includes('soundcloud') || url.includes('video') || url.includes('music')) {
    return 'Entertainment';
  }
  if (url.includes('google') || url.includes('microsoft') || url.includes('apple') || url.includes('github') || url.includes('stackoverflow') || url.includes('tech')) {
    return 'Technology';
  }
  if (url.includes('edu') || url.includes('university') || url.includes('college') || url.includes('school') || url.includes('learn')) {
    return 'Education';
  }
  if (url.includes('gov')) {
    return 'Government';
  }
  return 'Other';
}

function identifyIssues(report: LighthouseReport): string[] {
  const issues: string[] = [];

  // Check Core Web Vitals
  const lcp = report.audits?.['largest-contentful-paint']?.numericValue || 0;
  const fcp = report.audits?.['first-contentful-paint']?.numericValue || 0;
  const cls = report.audits?.['cumulative-layout-shift']?.numericValue || 0;
  const tbt = report.audits?.['total-blocking-time']?.numericValue || 0;

  if (lcp > 4000) issues.push(`Poor LCP: ${(lcp / 1000).toFixed(1)}s`);
  if (fcp > 3000) issues.push(`Slow FCP: ${(fcp / 1000).toFixed(1)}s`);
  if (cls > 0.25) issues.push(`High CLS: ${cls.toFixed(2)}`);
  if (tbt > 600) issues.push(`High TBT: ${tbt.toFixed(0)}ms`);

  // Check for render-blocking resources
  const renderBlocking = report.audits?.['render-blocking-resources'];
  if (renderBlocking?.score !== null && renderBlocking?.score < 0.5) {
    const savings = (renderBlocking.details as any)?.overallSavingsMs || 0;
    if (savings > 1000) {
      issues.push(`Render-blocking: ${(savings / 1000).toFixed(1)}s`);
    }
  }

  // Check for unused code
  const unusedJS = report.audits?.['unused-javascript'];
  if (unusedJS?.score !== null && unusedJS?.score < 0.5) {
    const waste = (unusedJS.details as any)?.overallSavingsBytes || 0;
    if (waste > 100000) {
      issues.push(`Unused JS: ${(waste / 1024).toFixed(0)}KB`);
    }
  }

  const unusedCSS = report.audits?.['unused-css-rules'];
  if (unusedCSS?.score !== null && unusedCSS?.score < 0.5) {
    const waste = (unusedCSS.details as any)?.overallSavingsBytes || 0;
    if (waste > 50000) {
      issues.push(`Unused CSS: ${(waste / 1024).toFixed(0)}KB`);
    }
  }

  // Check for third-party impact
  const thirdParty = report.audits?.['third-party-summary'];
  if (thirdParty?.details) {
    const items = (thirdParty.details as any)?.items || [];
    const totalBlockingTime = items.reduce((sum: number, item: any) =>
      sum + (item.blockingTime || 0), 0
    );
    if (totalBlockingTime > 1000) {
      issues.push(`Third-party blocking: ${totalBlockingTime.toFixed(0)}ms`);
    }
  }

  return issues;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function executeL2SiteComparison(
  params: SiteComparisonParams
): Promise<SiteComparisonResult> {
  const {
    urls,
    device = 'mobile',
    categories = ['performance']
  } = params;

  // Collect data for all sites
  const batchResult = await executeL1BatchCollect({
    urls,
    device,
    categories
  });

  if (!batchResult.reports || batchResult.reports.length === 0) {
    throw new Error('Failed to collect site data');
  }

  // Process each site's metrics
  const sites: SiteMetrics[] = [];

  for (const result of batchResult.reports) {
    // Load the full report using the report ID
    const storage = getDefaultStorage();
    const reportsResult = storage.getAllReports();
    if (!reportsResult.isOk()) continue;
    const storedReport = reportsResult.value.find(r => r.id === result.reportId);
    if (!storedReport) continue;

    const loadResult = storage.loadReport(storedReport);
    if (!loadResult.isOk()) continue;

    const report = loadResult.value;

    if (report) {
      const metrics = extractMetrics(report);
      const performanceScore = Math.round(
        (report.categories?.performance?.score || 0) * 100
      );

      sites.push({
        url: result.url,
        performanceScore,
        fcp: metrics.fcp || 0,
        lcp: metrics.lcp || 0,
        cls: metrics.cls || 0,
        tbt: metrics.tbt || 0,
        si: metrics.si,
        tti: metrics.tti,
        category: categorizeUrl(result.url),
        issues: identifyIssues(report)
      });
    }
  }

  // Sort by performance score
  sites.sort((a, b) => b.performanceScore - a.performanceScore);

  // Calculate summary statistics
  const scores = sites.map(s => s.performanceScore);
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const bestPerformer = sites[0];
  const worstPerformer = sites[sites.length - 1];

  const medianLCP = calculateMedian(sites.map(s => s.lcp));
  const medianFCP = calculateMedian(sites.map(s => s.fcp));
  const medianCLS = calculateMedian(sites.map(s => s.cls));
  const medianTBT = calculateMedian(sites.map(s => s.tbt));

  // Group by category
  const byCategory: Record<string, any> = {};
  const categories_found = [...new Set(sites.map(s => s.category || 'Other'))];

  for (const category of categories_found) {
    const categorySites = sites.filter(s => s.category === category);
    if (categorySites.length > 0) {
      const categoryScores = categorySites.map(s => s.performanceScore);
      byCategory[category] = {
        sites: categorySites,
        averageScore: categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length,
        bestPerformer: categorySites[0],
        worstPerformer: categorySites[categorySites.length - 1]
      };
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (averageScore < 50) {
    recommendations.push('Overall performance is poor. Consider implementing performance budgets.');
  }

  if (medianLCP > 2500) {
    recommendations.push(`Median LCP is ${(medianLCP / 1000).toFixed(1)}s. Focus on optimizing largest contentful paint.`);
  }

  if (medianTBT > 300) {
    recommendations.push(`Median TBT is ${medianTBT.toFixed(0)}ms. Reduce JavaScript execution time.`);
  }

  const sitesWith3pIssues = sites.filter(s =>
    s.issues.some(i => i.includes('Third-party'))
  );
  if (sitesWith3pIssues.length > sites.length * 0.5) {
    recommendations.push('More than 50% of sites have third-party performance issues.');
  }

  const sitesWithUnusedCode = sites.filter(s =>
    s.issues.some(i => i.includes('Unused'))
  );
  if (sitesWithUnusedCode.length > sites.length * 0.5) {
    recommendations.push('More than 50% of sites have significant unused code.');
  }

  // Find category-specific issues
  for (const [category, data] of Object.entries(byCategory)) {
    if (data.averageScore < 40) {
      recommendations.push(`${category} sites have particularly poor performance (avg: ${data.averageScore.toFixed(0)}).`);
    }
  }

  return {
    sites,
    summary: {
      averageScore,
      bestPerformer,
      worstPerformer,
      medianLCP,
      medianFCP,
      medianCLS,
      medianTBT
    },
    byCategory,
    recommendations
  };
}

// MCP Tool definition
export const l2SiteComparisonTool = {
  name: 'l2_site_comparison',
  description: 'Compare performance metrics across multiple sites (Layer 2)',
  inputSchema: {
    type: 'object',
    properties: {
      urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of URLs to compare'
      },
      device: {
        type: 'string',
        enum: ['mobile', 'desktop'],
        description: 'Device type for testing'
      },
      categories: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lighthouse categories to test'
      },
      useCache: {
        type: 'boolean',
        description: 'Use cached results if available'
      }
    },
    required: ['urls']
  },
  execute: async (params: SiteComparisonParams) => {
    const result = await executeL2SiteComparison(params);

    // Format output for MCP
    let output = `# Site Performance Comparison\n\n`;
    output += `## Summary\n`;
    output += `- Sites analyzed: ${result.sites.length}\n`;
    output += `- Average score: ${result.summary.averageScore.toFixed(0)}\n`;
    output += `- Best performer: ${result.summary.bestPerformer.url} (${result.summary.bestPerformer.performanceScore})\n`;
    output += `- Worst performer: ${result.summary.worstPerformer.url} (${result.summary.worstPerformer.performanceScore})\n\n`;

    output += `## Median Metrics\n`;
    output += `- LCP: ${(result.summary.medianLCP / 1000).toFixed(1)}s\n`;
    output += `- FCP: ${(result.summary.medianFCP / 1000).toFixed(1)}s\n`;
    output += `- CLS: ${result.summary.medianCLS.toFixed(3)}\n`;
    output += `- TBT: ${result.summary.medianTBT.toFixed(0)}ms\n\n`;

    output += `## Sites Ranked by Performance\n`;
    output += `| Rank | URL | Score | LCP | Issues |\n`;
    output += `| --- | --- | --- | --- | --- |\n`;

    result.sites.forEach((site, i) => {
      const issuesSummary = site.issues.slice(0, 2).join(', ') || 'None';
      output += `| ${i + 1} | ${site.url} | ${site.performanceScore} | ${(site.lcp / 1000).toFixed(1)}s | ${issuesSummary} |\n`;
    });

    if (result.byCategory && Object.keys(result.byCategory).length > 0) {
      output += `\n## Performance by Category\n`;
      for (const [category, data] of Object.entries(result.byCategory)) {
        output += `\n### ${category}\n`;
        output += `- Average score: ${data.averageScore.toFixed(0)}\n`;
        output += `- Best: ${data.bestPerformer.url} (${data.bestPerformer.performanceScore})\n`;
        output += `- Worst: ${data.worstPerformer.url} (${data.worstPerformer.performanceScore})\n`;
      }
    }

    if (result.recommendations.length > 0) {
      output += `\n## Recommendations\n`;
      result.recommendations.forEach(rec => {
        output += `- ${rec}\n`;
      });
    }

    return {
      type: 'text',
      text: output
    };
  }
};