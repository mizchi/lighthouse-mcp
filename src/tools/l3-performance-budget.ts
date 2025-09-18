/**
 * Layer 3 - Performance Budget Analyzer
 *
 * Analyzes sites against performance budgets and provides strategic recommendations
 */

import { executeL1GetReport } from './l1-get-report.js';
import { LighthouseDatabase } from '../core/database.js';
import type { MCPTool } from '../types/mcp-types.js';

export interface PerformanceBudget {
  // Core Web Vitals
  lcp?: number;      // Largest Contentful Paint (ms)
  fcp?: number;      // First Contentful Paint (ms)
  cls?: number;      // Cumulative Layout Shift
  tbt?: number;      // Total Blocking Time (ms)
  tti?: number;      // Time to Interactive (ms)
  si?: number;       // Speed Index (ms)

  // Resource budgets
  totalBytes?: number;
  jsBytes?: number;
  cssBytes?: number;
  imageBytes?: number;
  fontBytes?: number;
  thirdPartyBytes?: number;

  // Score budgets
  performanceScore?: number;
  accessibilityScore?: number;
  seoScore?: number;
  bestPracticesScore?: number;

  // Request budgets
  totalRequests?: number;
  jsRequests?: number;
  cssRequests?: number;
  imageRequests?: number;
  thirdPartyRequests?: number;
}

export interface BudgetViolation {
  metric: string;
  budget: number;
  actual: number;
  overBy: number;
  overByPercent: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  recommendation: string;
}

export interface BudgetAnalysisResult {
  url: string;
  timestamp: Date;
  budget: PerformanceBudget;
  violations: BudgetViolation[];
  totalViolations: number;
  criticalViolations: number;
  budgetScore: number; // 0-100, how well the site meets its budget
  status: 'passing' | 'warning' | 'failing';
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  historicalTrend?: {
    improving: boolean;
    averageScore: number;
    worstMetrics: string[];
  };
  competitiveAnalysis?: {
    industryAverage: PerformanceBudget;
    percentile: number;
    betterThan: number;
  };
}

export interface L3PerformanceBudgetParams {
  reportId?: string;
  url?: string;
  budget?: PerformanceBudget;
  useDefaultBudget?: boolean;
  compareToIndustry?: boolean;
  includeHistoricalTrend?: boolean;
}

// Default performance budgets based on industry standards
const DEFAULT_BUDGETS: Record<string, PerformanceBudget> = {
  mobile: {
    lcp: 2500,
    fcp: 1800,
    cls: 0.1,
    tbt: 200,
    tti: 3800,
    si: 3400,
    totalBytes: 1500000,
    jsBytes: 350000,
    cssBytes: 60000,
    imageBytes: 750000,
    fontBytes: 100000,
    performanceScore: 90,
    totalRequests: 50,
    thirdPartyRequests: 10
  },
  desktop: {
    lcp: 2000,
    fcp: 1500,
    cls: 0.1,
    tbt: 150,
    tti: 3000,
    si: 2500,
    totalBytes: 2000000,
    jsBytes: 500000,
    cssBytes: 80000,
    imageBytes: 1000000,
    fontBytes: 150000,
    performanceScore: 90,
    totalRequests: 70,
    thirdPartyRequests: 15
  },
  strict: {
    lcp: 2000,
    fcp: 1500,
    cls: 0.05,
    tbt: 100,
    tti: 3000,
    si: 2500,
    totalBytes: 1000000,
    jsBytes: 250000,
    cssBytes: 40000,
    imageBytes: 500000,
    fontBytes: 75000,
    performanceScore: 95,
    totalRequests: 40,
    thirdPartyRequests: 5
  }
};

function determineSeverity(overByPercent: number, metric: string): 'critical' | 'high' | 'medium' | 'low' {
  // Core Web Vitals are more critical
  const isCoreWebVital = ['lcp', 'fcp', 'cls', 'tbt'].includes(metric);

  if (isCoreWebVital) {
    if (overByPercent > 100) return 'critical';
    if (overByPercent > 50) return 'high';
    if (overByPercent > 20) return 'medium';
    return 'low';
  }

  if (overByPercent > 200) return 'critical';
  if (overByPercent > 100) return 'high';
  if (overByPercent > 50) return 'medium';
  return 'low';
}

function getMetricImpact(metric: string): string {
  const impacts: Record<string, string> = {
    lcp: 'Directly affects user perception of loading speed and Core Web Vitals',
    fcp: 'First visual feedback to users - critical for perceived performance',
    cls: 'Visual stability issues frustrate users and hurt Core Web Vitals',
    tbt: 'Indicates main thread blocking, affecting interactivity',
    tti: 'Time before users can reliably interact with the page',
    si: 'How quickly content is visually populated',
    totalBytes: 'Overall page weight affects loading time and data costs',
    jsBytes: 'JavaScript parsing and execution blocks the main thread',
    cssBytes: 'CSS must be downloaded and parsed before rendering',
    imageBytes: 'Large images slow down page load and consume bandwidth',
    performanceScore: 'Overall performance health indicator',
    totalRequests: 'Each request adds latency and connection overhead'
  };
  return impacts[metric] || 'Affects overall performance';
}

function getMetricRecommendation(metric: string, overByPercent: number): string {
  const recommendations: Record<string, string> = {
    lcp: overByPercent > 50
      ? 'Implement lazy loading, optimize critical path, use CDN, and preload key resources'
      : 'Optimize largest element rendering, consider server-side rendering',
    fcp: overByPercent > 50
      ? 'Inline critical CSS, reduce render-blocking resources, optimize server response'
      : 'Minimize time to first byte, optimize font loading',
    cls: 'Reserve space for dynamic content, avoid inserting content above existing content, use CSS transforms',
    tbt: 'Split long JavaScript tasks, implement code splitting, defer non-critical scripts',
    tti: 'Reduce JavaScript execution time, implement progressive enhancement',
    si: 'Optimize content visibility, prioritize above-the-fold content',
    totalBytes: 'Implement compression, lazy loading, and remove unused resources',
    jsBytes: 'Code split, tree shake, minify, and lazy load non-critical JavaScript',
    cssBytes: 'Remove unused CSS, minify, use CSS-in-JS for better tree shaking',
    imageBytes: 'Use modern formats (WebP/AVIF), implement responsive images, lazy load',
    performanceScore: 'Focus on Core Web Vitals and resource optimization',
    totalRequests: 'Bundle resources, use HTTP/2 push, implement resource hints'
  };
  return recommendations[metric] || 'Optimize resource usage and loading strategy';
}

export async function executeL3PerformanceBudget(
  params: L3PerformanceBudgetParams
): Promise<BudgetAnalysisResult> {
  if (!params.reportId && !params.url) {
    throw new Error('Either reportId or url is required');
  }

  // Get the report
  let report;
  if (params.reportId) {
    report = await executeL1GetReport({ reportId: params.reportId });
  } else {
    // First collect the report, then get it
    const { executeL1Collect } = await import('./l1-collect-single.js');
    const collectResult = await executeL1Collect({ url: params.url! });
    if (!collectResult.reportId) {
      throw new Error('Failed to collect Lighthouse data');
    }
    report = await executeL1GetReport({ reportId: collectResult.reportId });
  }

  if (!report.data) {
    throw new Error('Failed to retrieve report data');
  }

  // Determine budget to use
  let budget: PerformanceBudget;
  if (params.budget) {
    budget = params.budget;
  } else if (params.useDefaultBudget !== false) {
    const device = report.data.configSettings?.formFactor || 'mobile';
    budget = DEFAULT_BUDGETS[device] || DEFAULT_BUDGETS.mobile;
  } else {
    throw new Error('No budget specified and useDefaultBudget is false');
  }

  // Extract metrics from report
  const audits = report.data.audits || {};
  const categories = report.data.categories || {};

  const actualMetrics: Record<string, number> = {
    lcp: audits['largest-contentful-paint']?.numericValue || 0,
    fcp: audits['first-contentful-paint']?.numericValue || 0,
    cls: audits['cumulative-layout-shift']?.numericValue || 0,
    tbt: audits['total-blocking-time']?.numericValue || 0,
    tti: audits['interactive']?.numericValue || 0,
    si: audits['speed-index']?.numericValue || 0,
    performanceScore: (categories.performance?.score || 0) * 100,
    totalBytes: audits['total-byte-weight']?.numericValue || 0,
    totalRequests: audits['network-requests']?.details?.items?.length || 0
  };

  // Extract resource-specific metrics
  const networkItems = audits['network-requests']?.details?.items || [];
  const thirdPartyItems = audits['third-party-summary']?.details?.items || [];

  let jsBytes = 0;
  let cssBytes = 0;
  let imageBytes = 0;
  let fontBytes = 0;
  let jsRequests = 0;
  let cssRequests = 0;
  let imageRequests = 0;

  networkItems.forEach((item: any) => {
    const resourceType = item.resourceType?.toLowerCase() || '';
    const transferSize = item.transferSize || 0;

    if (resourceType === 'script') {
      jsBytes += transferSize;
      jsRequests++;
    } else if (resourceType === 'stylesheet') {
      cssBytes += transferSize;
      cssRequests++;
    } else if (resourceType === 'image') {
      imageBytes += transferSize;
      imageRequests++;
    } else if (resourceType === 'font') {
      fontBytes += transferSize;
    }
  });

  actualMetrics.jsBytes = jsBytes;
  actualMetrics.cssBytes = cssBytes;
  actualMetrics.imageBytes = imageBytes;
  actualMetrics.fontBytes = fontBytes;
  actualMetrics.jsRequests = jsRequests;
  actualMetrics.cssRequests = cssRequests;
  actualMetrics.imageRequests = imageRequests;

  const thirdPartyBytes = thirdPartyItems.reduce((sum: number, item: any) =>
    sum + (item.transferSize || 0), 0
  );
  actualMetrics.thirdPartyBytes = thirdPartyBytes;
  actualMetrics.thirdPartyRequests = thirdPartyItems.length;

  // Check for violations
  const violations: BudgetViolation[] = [];

  Object.entries(budget).forEach(([metric, budgetValue]) => {
    const actualValue = actualMetrics[metric];
    if (actualValue !== undefined && budgetValue !== undefined) {
      if (actualValue > budgetValue) {
        const overBy = actualValue - budgetValue;
        const overByPercent = (overBy / budgetValue) * 100;

        violations.push({
          metric,
          budget: budgetValue,
          actual: actualValue,
          overBy,
          overByPercent,
          severity: determineSeverity(overByPercent, metric),
          impact: getMetricImpact(metric),
          recommendation: getMetricRecommendation(metric, overByPercent)
        });
      }
    }
  });

  // Sort violations by severity and impact
  violations.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.overByPercent - a.overByPercent;
  });

  // Calculate budget score
  const totalChecks = Object.keys(budget).length;
  const passingChecks = totalChecks - violations.length;
  const budgetScore = totalChecks > 0 ? (passingChecks / totalChecks) * 100 : 100;

  // Determine status
  const criticalViolations = violations.filter(v => v.severity === 'critical').length;
  const highViolations = violations.filter(v => v.severity === 'high').length;

  let status: 'passing' | 'warning' | 'failing';
  if (criticalViolations > 0 || highViolations > 2) {
    status = 'failing';
  } else if (violations.length > 0) {
    status = 'warning';
  } else {
    status = 'passing';
  }

  // Generate recommendations
  const recommendations = {
    immediate: [] as string[],
    shortTerm: [] as string[],
    longTerm: [] as string[]
  };

  // Immediate actions for critical violations
  violations
    .filter(v => v.severity === 'critical')
    .slice(0, 3)
    .forEach(v => {
      recommendations.immediate.push(
        `${v.metric.toUpperCase()}: ${v.recommendation} (currently ${v.overByPercent.toFixed(0)}% over budget)`
      );
    });

  // Short-term actions for high violations
  violations
    .filter(v => v.severity === 'high')
    .slice(0, 3)
    .forEach(v => {
      recommendations.shortTerm.push(
        `Optimize ${v.metric}: ${v.recommendation}`
      );
    });

  // Long-term strategic recommendations
  if (violations.some(v => v.metric.includes('Bytes'))) {
    recommendations.longTerm.push('Implement a comprehensive asset optimization pipeline');
  }
  if (violations.some(v => ['lcp', 'fcp', 'tti'].includes(v.metric))) {
    recommendations.longTerm.push('Consider server-side rendering or static generation');
  }
  if (violations.some(v => v.metric === 'thirdPartyBytes' || v.metric === 'thirdPartyRequests')) {
    recommendations.longTerm.push('Audit and reduce third-party dependencies');
  }

  // Historical trend analysis
  let historicalTrend;
  if (params.includeHistoricalTrend) {
    const db = new LighthouseDatabase();
    try {
      const allReports = db.getReports();
      const targetUrl = report.data.finalUrl || report.data.requestedUrl;
      const historicalReports = allReports.filter(r => {
        const reportData = JSON.parse(r.data);
        return reportData.requestedUrl === targetUrl || reportData.finalUrl === targetUrl;
      });

      if (historicalReports.length > 1) {
        const scores = historicalReports.map((r: any) => {
          const reportData = JSON.parse(r.data);
          return (reportData.categories?.performance?.score || 0) * 100;
        });

        const averageScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        const currentScore = actualMetrics.performanceScore;
        const improving = currentScore > averageScore;

        // Find consistently problematic metrics
        const metricViolationCounts: Record<string, number> = {};
        historicalReports.forEach((r: any) => {
          const reportData = JSON.parse(r.data);
          const reportAudits = reportData.audits || {};

          Object.entries(budget).forEach(([metric, budgetValue]) => {
            let actualValue: number | undefined;

            switch (metric) {
              case 'lcp':
                actualValue = reportAudits['largest-contentful-paint']?.numericValue;
                break;
              case 'fcp':
                actualValue = reportAudits['first-contentful-paint']?.numericValue;
                break;
              case 'cls':
                actualValue = reportAudits['cumulative-layout-shift']?.numericValue;
                break;
              case 'tbt':
                actualValue = reportAudits['total-blocking-time']?.numericValue;
                break;
            }

            if (actualValue && budgetValue && actualValue > budgetValue) {
              metricViolationCounts[metric] = (metricViolationCounts[metric] || 0) + 1;
            }
          });
        });

        const worstMetrics = Object.entries(metricViolationCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([metric]) => metric);

        historicalTrend = {
          improving,
          averageScore,
          worstMetrics
        };
      }
    } finally {
      db.close();
    }
  }

  // Competitive analysis
  let competitiveAnalysis;
  if (params.compareToIndustry) {
    // In a real implementation, this would compare against industry benchmarks
    // For now, we'll use simplified logic
    const industryAverage = DEFAULT_BUDGETS.mobile;
    const betterThanPercent = Math.max(
      0,
      Math.min(100, 100 - (violations.length / totalChecks) * 100)
    );

    competitiveAnalysis = {
      industryAverage,
      percentile: Math.round(betterThanPercent),
      betterThan: betterThanPercent
    };
  }

  return {
    url: report.data.finalUrl || report.data.requestedUrl,
    timestamp: new Date(),
    budget,
    violations,
    totalViolations: violations.length,
    criticalViolations,
    budgetScore: Math.round(budgetScore),
    status,
    recommendations,
    historicalTrend,
    competitiveAnalysis
  };
}

function formatViolation(violation: BudgetViolation): string {
  const formatValue = (value: number, metric: string): string => {
    if (metric.includes('Bytes')) return `${(value / 1024).toFixed(0)}KB`;
    if (metric.includes('Score')) return `${value.toFixed(0)}`;
    if (metric === 'cls') return value.toFixed(3);
    if (['lcp', 'fcp', 'tbt', 'tti', 'si'].includes(metric)) {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value.toFixed(0)}ms`;
    }
    return value.toFixed(0);
  };

  const severityEmoji = {
    critical: '🚨',
    high: '⚠️',
    medium: '⚡',
    low: '💡'
  };

  return `${severityEmoji[violation.severity]} **${violation.metric.toUpperCase()}**
   Budget: ${formatValue(violation.budget, violation.metric)}
   Actual: ${formatValue(violation.actual, violation.metric)}
   Over by: ${formatValue(violation.overBy, violation.metric)} (${violation.overByPercent.toFixed(0)}%)
   Impact: ${violation.impact}
   Fix: ${violation.recommendation}`;
}

export const l3PerformanceBudgetTool: MCPTool = {
  name: 'l3_performance_budget',
  description: 'Layer 3 - Analyze site performance against defined budgets and provide strategic recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      reportId: {
        type: 'string',
        description: 'ID of an existing Lighthouse report'
      },
      url: {
        type: 'string',
        description: 'URL to analyze (will run new Lighthouse test)'
      },
      budget: {
        type: 'object',
        description: 'Custom performance budget (uses defaults if not provided)',
        properties: {
          lcp: { type: 'number', description: 'LCP budget in ms' },
          fcp: { type: 'number', description: 'FCP budget in ms' },
          cls: { type: 'number', description: 'CLS budget' },
          tbt: { type: 'number', description: 'TBT budget in ms' },
          performanceScore: { type: 'number', description: 'Performance score budget (0-100)' },
          totalBytes: { type: 'number', description: 'Total page weight budget in bytes' },
          jsBytes: { type: 'number', description: 'JavaScript budget in bytes' }
        }
      },
      useDefaultBudget: {
        type: 'boolean',
        description: 'Use default budget if custom budget not provided (default: true)'
      },
      compareToIndustry: {
        type: 'boolean',
        description: 'Include competitive analysis'
      },
      includeHistoricalTrend: {
        type: 'boolean',
        description: 'Include historical trend analysis'
      }
    },
    oneOf: [
      { required: ['reportId'] },
      { required: ['url'] }
    ]
  },
  execute: async (params: L3PerformanceBudgetParams) => {
    const result = await executeL3PerformanceBudget(params);

    let output = `# Performance Budget Analysis

## Status: ${result.status.toUpperCase()} (Score: ${result.budgetScore}/100)

**URL:** ${result.url}
**Timestamp:** ${result.timestamp.toISOString()}
**Total Violations:** ${result.totalViolations} (${result.criticalViolations} critical)

`;

    if (result.violations.length > 0) {
      output += `## 📊 Budget Violations

`;
      result.violations.forEach(violation => {
        output += formatViolation(violation) + '\n\n';
      });
    } else {
      output += `## ✅ All Budgets Met!

Congratulations! Your site meets all performance budget requirements.

`;
    }

    if (result.historicalTrend) {
      output += `## 📈 Historical Trend

- **Trend:** ${result.historicalTrend.improving ? '📈 Improving' : '📉 Declining'}
- **Average Score:** ${result.historicalTrend.averageScore.toFixed(0)}
- **Consistently Problematic:** ${result.historicalTrend.worstMetrics.join(', ') || 'None'}

`;
    }

    if (result.competitiveAnalysis) {
      output += `## 🏆 Competitive Analysis

- **Industry Percentile:** ${result.competitiveAnalysis.percentile}th
- **Better Than:** ${result.competitiveAnalysis.betterThan.toFixed(0)}% of sites

`;
    }

    output += `## 💡 Recommendations

### Immediate Actions
${result.recommendations.immediate.map(r => `- ${r}`).join('\n') || '- No immediate actions needed'}

### Short-term Improvements
${result.recommendations.shortTerm.map(r => `- ${r}`).join('\n') || '- Continue monitoring performance'}

### Long-term Strategy
${result.recommendations.longTerm.map(r => `- ${r}`).join('\n') || '- Maintain current performance practices'}

## Summary

`;

    if (result.status === 'failing') {
      output += `⚠️ **Action Required:** Your site is significantly exceeding its performance budget. Focus on the critical violations first, particularly Core Web Vitals metrics that directly impact user experience and SEO.`;
    } else if (result.status === 'warning') {
      output += `⚡ **Attention Needed:** Your site has some budget violations that should be addressed to maintain optimal performance. These issues are not critical but could impact user experience if left unaddressed.`;
    } else {
      output += `✅ **Great Job:** Your site is meeting its performance budget! Continue monitoring to ensure performance doesn't regress over time.`;
    }

    return {
      type: 'text',
      text: output
    };
  }
};