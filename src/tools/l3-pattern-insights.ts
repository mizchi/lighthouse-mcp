import { LighthouseDatabase } from '../core/database';
import type { CrawlResult } from '../core/database';

export interface PatternInsightsParams {
  minSamples?: number;
  categories?: string[];
  timeRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface PerformancePattern {
  pattern: string;
  description: string;
  affectedSites: string[];
  impact: 'critical' | 'high' | 'medium' | 'low';
  frequency: number;
  recommendation: string;
}

export interface CategoryInsight {
  category: string;
  averageScore: number;
  commonIssues: Array<{
    issue: string;
    frequency: number;
    avgImpact: number;
  }>;
  trends: {
    improving: boolean;
    rateOfChange: number;
  };
}

export interface PatternInsightsResult {
  patterns: PerformancePattern[];
  categoryInsights: CategoryInsight[];
  globalTrends: {
    avgPerformanceScore: number;
    avgLCP: number;
    avgFCP: number;
    avgCLS: number;
    avgTBT: number;
    mostCommonIssues: Array<{
      issue: string;
      percentage: number;
    }>;
  };
  recommendations: {
    immediate: string[];
    strategic: string[];
  };
  summary: string;
}

function analyzePatterns(results: CrawlResult[]): PerformancePattern[] {
  const patterns: PerformancePattern[] = [];
  const issueFrequency = new Map<string, Set<string>>();

  // Analyze common issues
  results.forEach(result => {
    // Check for slow LCP pattern
    if (result.lcp && result.lcp > 4000) {
      const key = 'slow-lcp';
      if (!issueFrequency.has(key)) {
        issueFrequency.set(key, new Set());
      }
      issueFrequency.get(key)!.add(result.url);
    }

    // Check for high CLS pattern
    if (result.cls && result.cls > 0.25) {
      const key = 'high-cls';
      if (!issueFrequency.has(key)) {
        issueFrequency.set(key, new Set());
      }
      issueFrequency.get(key)!.add(result.url);
    }

    // Check for high TBT pattern
    if (result.tbt && result.tbt > 600) {
      const key = 'high-tbt';
      if (!issueFrequency.has(key)) {
        issueFrequency.set(key, new Set());
      }
      issueFrequency.get(key)!.add(result.url);
    }

    // Check for render-blocking resources pattern
    // renderBlockingMs is not available in CrawlResult type
    // Skip this check for now
    if (false) {
      const key = 'render-blocking';
      if (!issueFrequency.has(key)) {
        issueFrequency.set(key, new Set());
      }
      issueFrequency.get(key)!.add(result.url);
    }

    // Check for unused code pattern
    // unusedJsBytes is not available in CrawlResult type
    if (false) {
      const key = 'unused-code';
      if (!issueFrequency.has(key)) {
        issueFrequency.set(key, new Set());
      }
      issueFrequency.get(key)!.add(result.url);
    }

    // Check for third-party impact pattern
    // thirdPartyBlockingMs is not available in CrawlResult type
    if (false) {
      const key = 'third-party-impact';
      if (!issueFrequency.has(key)) {
        issueFrequency.set(key, new Set());
      }
      issueFrequency.get(key)!.add(result.url);
    }
  });

  // Convert to patterns
  const patternDefinitions = {
    'slow-lcp': {
      pattern: 'Slow Largest Contentful Paint',
      description: 'LCP exceeds 4 seconds, indicating poor loading performance',
      impact: 'critical' as const,
      recommendation: 'Optimize critical rendering path, preload LCP resources, and reduce server response times'
    },
    'high-cls': {
      pattern: 'High Cumulative Layout Shift',
      description: 'CLS exceeds 0.25, causing poor visual stability',
      impact: 'high' as const,
      recommendation: 'Set explicit dimensions for images/videos, avoid inserting content above existing content'
    },
    'high-tbt': {
      pattern: 'High Total Blocking Time',
      description: 'TBT exceeds 600ms, indicating poor interactivity',
      impact: 'high' as const,
      recommendation: 'Break up long tasks, defer non-critical JavaScript, optimize third-party scripts'
    },
    'render-blocking': {
      pattern: 'Render-Blocking Resources',
      description: 'Significant render-blocking resources delay initial paint',
      impact: 'high' as const,
      recommendation: 'Inline critical CSS, defer non-critical CSS/JS, use resource hints'
    },
    'unused-code': {
      pattern: 'Excessive Unused Code',
      description: 'Over 200KB of unused JavaScript detected',
      impact: 'medium' as const,
      recommendation: 'Implement code splitting, tree shaking, and remove dead code'
    },
    'third-party-impact': {
      pattern: 'Heavy Third-Party Impact',
      description: 'Third-party scripts block main thread for over 1 second',
      impact: 'high' as const,
      recommendation: 'Lazy-load third-party scripts, use facades, consider self-hosting critical resources'
    }
  };

  for (const [key, sites] of issueFrequency.entries()) {
    const definition = patternDefinitions[key as keyof typeof patternDefinitions];
    if (definition && sites.size > 0) {
      patterns.push({
        ...definition,
        affectedSites: Array.from(sites),
        frequency: (sites.size / results.length) * 100
      });
    }
  }

  // Sort by frequency and impact
  patterns.sort((a, b) => {
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (a.impact !== b.impact) {
      return impactOrder[a.impact] - impactOrder[b.impact];
    }
    return b.frequency - a.frequency;
  });

  return patterns;
}

function analyzeCategoryInsights(results: CrawlResult[]): CategoryInsight[] {
  const categoryGroups = new Map<string, CrawlResult[]>();

  // Group by category
  results.forEach(result => {
    const category = 'Other'; // category not available in CrawlResult
    if (!categoryGroups.has(category)) {
      categoryGroups.set(category, []);
    }
    categoryGroups.get(category)!.push(result);
  });

  const insights: CategoryInsight[] = [];

  for (const [category, categoryResults] of categoryGroups.entries()) {
    const scores = categoryResults
      .map(r => r.performance_score)
      .filter((s): s is number => s !== null);

    if (scores.length === 0) continue;

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Analyze common issues in this category
    const issueCount = new Map<string, { count: number; totalImpact: number }>();

    categoryResults.forEach(result => {
      if (result.lcp && result.lcp > 2500) {
        const key = 'Slow LCP';
        if (!issueCount.has(key)) {
          issueCount.set(key, { count: 0, totalImpact: 0 });
        }
        const data = issueCount.get(key)!;
        data.count++;
        data.totalImpact += result.lcp - 2500;
      }

      if (result.tbt && result.tbt > 300) {
        const key = 'High TBT';
        if (!issueCount.has(key)) {
          issueCount.set(key, { count: 0, totalImpact: 0 });
        }
        const data = issueCount.get(key)!;
        data.count++;
        data.totalImpact += result.tbt - 300;
      }

      if (result.cls && result.cls > 0.1) {
        const key = 'Layout Shifts';
        if (!issueCount.has(key)) {
          issueCount.set(key, { count: 0, totalImpact: 0 });
        }
        const data = issueCount.get(key)!;
        data.count++;
        data.totalImpact += (result.cls - 0.1) * 10000; // Scale for comparison
      }
    });

    const commonIssues = Array.from(issueCount.entries())
      .map(([issue, data]) => ({
        issue,
        frequency: (data.count / categoryResults.length) * 100,
        avgImpact: data.totalImpact / data.count
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    // Simple trend analysis (would need historical data in real implementation)
    const recentScores = scores.slice(-Math.min(5, scores.length));
    const olderScores = scores.slice(0, Math.min(5, scores.length));
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
    const rateOfChange = recentAvg - olderAvg;

    insights.push({
      category,
      averageScore: avgScore,
      commonIssues,
      trends: {
        improving: rateOfChange > 0,
        rateOfChange
      }
    });
  }

  return insights.sort((a, b) => a.averageScore - b.averageScore);
}

function generateRecommendations(
  patterns: PerformancePattern[],
  insights: CategoryInsight[]
): { immediate: string[]; strategic: string[] } {
  const immediate: string[] = [];
  const strategic: string[] = [];

  // Critical patterns need immediate attention
  const criticalPatterns = patterns.filter(p => p.impact === 'critical');
  criticalPatterns.forEach(pattern => {
    if (pattern.frequency > 50) {
      immediate.push(`URGENT: ${pattern.pattern} affects ${pattern.frequency.toFixed(0)}% of sites`);
    }
  });

  // High frequency patterns
  const highFreqPatterns = patterns.filter(p => p.frequency > 30);
  highFreqPatterns.forEach(pattern => {
    immediate.push(pattern.recommendation);
  });

  // Category-specific recommendations
  const poorCategories = insights.filter(i => i.averageScore < 50);
  poorCategories.forEach(category => {
    if (category.commonIssues[0]?.frequency > 60) {
      strategic.push(`Focus on ${category.commonIssues[0].issue} in ${category.category} sites`);
    }
  });

  // Global strategic recommendations
  if (patterns.some(p => p.pattern.includes('Third-Party'))) {
    strategic.push('Implement a third-party script governance policy');
  }

  if (patterns.some(p => p.pattern.includes('Unused Code'))) {
    strategic.push('Establish code review process focusing on bundle size optimization');
  }

  if (insights.some(i => !i.trends.improving)) {
    strategic.push('Set up continuous performance monitoring and budgets');
  }

  // Remove duplicates
  return {
    immediate: [...new Set(immediate)].slice(0, 5),
    strategic: [...new Set(strategic)].slice(0, 5)
  };
}

export async function executeL3PatternInsights(
  params: PatternInsightsParams
): Promise<PatternInsightsResult> {
  const {
    minSamples = 10,
    categories = [],
    timeRange
  } = params;

  const db = new LighthouseDatabase();

  try {
    // Get crawl results from database
    let results = db.getAllCrawlResults();

    // Filter by time range if specified
    if (timeRange) {
      results = results.filter(r => {
        const timestamp = new Date(r.timestamp);
        if (timeRange.start && timestamp < timeRange.start) return false;
        if (timeRange.end && timestamp > timeRange.end) return false;
        return true;
      });
    }

    // Filter by categories if specified
    if (categories.length > 0) {
      results = results.filter(() =>
        categories.includes('Other') // category not available in CrawlResult
      );
    }

    if (results.length < minSamples) {
      throw new Error(`Insufficient data: ${results.length} samples (minimum: ${minSamples})`);
    }

    // Analyze patterns
    const patterns = analyzePatterns(results);
    const categoryInsights = analyzeCategoryInsights(results);

    // Calculate global trends
    const validScores = results
      .map(r => r.performance_score)
      .filter((s): s is number => s !== null);
    const avgPerformanceScore = validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length;

    const validLCP = results.map(r => r.lcp).filter((v): v is number => v !== null);
    const avgLCP = validLCP.reduce((a: number, b: number) => a + b, 0) / validLCP.length;

    const validFCP = results.map(r => r.fcp).filter((v): v is number => v !== null);
    const avgFCP = validFCP.reduce((a: number, b: number) => a + b, 0) / validFCP.length;

    const validCLS = results.map(r => r.cls).filter((v): v is number => v !== null);
    const avgCLS = validCLS.reduce((a: number, b: number) => a + b, 0) / validCLS.length;

    const validTBT = results.map(r => r.tbt).filter((v): v is number => v !== null);
    const avgTBT = validTBT.reduce((a: number, b: number) => a + b, 0) / validTBT.length;

    // Most common issues
    const mostCommonIssues = patterns
      .slice(0, 3)
      .map(p => ({
        issue: p.pattern,
        percentage: p.frequency
      }));

    // Generate recommendations
    const recommendations = generateRecommendations(patterns, categoryInsights);

    // Generate summary
    const summary = `Analyzed ${results.length} sites across ${categoryInsights.length} categories. ` +
      `Average performance score: ${avgPerformanceScore.toFixed(0)}. ` +
      `${patterns.filter(p => p.impact === 'critical').length} critical patterns detected. ` +
      `${patterns[0]?.pattern || 'No major issues'} is the most common issue (${patterns[0]?.frequency.toFixed(0) || 0}%).`;

    return {
      patterns,
      categoryInsights,
      globalTrends: {
        avgPerformanceScore,
        avgLCP,
        avgFCP,
        avgCLS,
        avgTBT,
        mostCommonIssues
      },
      recommendations,
      summary
    };
  } finally {
    db.close();
  }
}

// MCP Tool definition
export const l3PatternInsightsTool = {
  name: 'l3_pattern_insights',
  description: 'Analyze performance patterns and generate strategic insights across sites (Layer 3)',
  inputSchema: {
    type: 'object',
    properties: {
      minSamples: {
        type: 'number',
        description: 'Minimum number of samples required for analysis'
      },
      categories: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by site categories'
      },
      timeRange: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' }
        },
        description: 'Time range for analysis'
      }
    }
  },
  execute: async (params: PatternInsightsParams) => {
    const result = await executeL3PatternInsights(params);

    // Format output for MCP
    let output = `# Performance Pattern Analysis\n\n`;
    output += `## Executive Summary\n${result.summary}\n\n`;

    output += `## Global Performance Metrics\n`;
    output += `- Average Score: ${result.globalTrends.avgPerformanceScore.toFixed(0)}\n`;
    output += `- Average LCP: ${(result.globalTrends.avgLCP / 1000).toFixed(1)}s\n`;
    output += `- Average FCP: ${(result.globalTrends.avgFCP / 1000).toFixed(1)}s\n`;
    output += `- Average CLS: ${result.globalTrends.avgCLS.toFixed(3)}\n`;
    output += `- Average TBT: ${result.globalTrends.avgTBT.toFixed(0)}ms\n\n`;

    if (result.patterns.length > 0) {
      output += `## Critical Performance Patterns\n`;
      result.patterns.slice(0, 5).forEach(pattern => {
        const emoji = pattern.impact === 'critical' ? '🔴' :
                     pattern.impact === 'high' ? '🟠' :
                     pattern.impact === 'medium' ? '🟡' : '⚪';
        output += `\n### ${emoji} ${pattern.pattern}\n`;
        output += `- **Impact**: ${pattern.impact}\n`;
        output += `- **Frequency**: ${pattern.frequency.toFixed(0)}% of sites\n`;
        output += `- **Description**: ${pattern.description}\n`;
        output += `- **Recommendation**: ${pattern.recommendation}\n`;
        if (pattern.affectedSites.length <= 5) {
          output += `- **Affected Sites**: ${pattern.affectedSites.join(', ')}\n`;
        } else {
          output += `- **Affected Sites**: ${pattern.affectedSites.length} sites\n`;
        }
      });
    }

    if (result.categoryInsights.length > 0) {
      output += `\n## Category Performance Analysis\n`;
      result.categoryInsights.forEach(insight => {
        const trend = insight.trends.improving ? '📈' : '📉';
        output += `\n### ${insight.category} ${trend}\n`;
        output += `- **Average Score**: ${insight.averageScore.toFixed(0)}\n`;
        output += `- **Trend**: ${insight.trends.improving ? 'Improving' : 'Declining'} (${insight.trends.rateOfChange > 0 ? '+' : ''}${insight.trends.rateOfChange.toFixed(1)})\n`;
        if (insight.commonIssues.length > 0) {
          output += `- **Common Issues**:\n`;
          insight.commonIssues.forEach(issue => {
            output += `  - ${issue.issue}: ${issue.frequency.toFixed(0)}% frequency\n`;
          });
        }
      });
    }

    output += `\n## Strategic Recommendations\n`;
    output += `\n### Immediate Actions\n`;
    result.recommendations.immediate.forEach(rec => {
      output += `- ${rec}\n`;
    });

    output += `\n### Long-term Strategy\n`;
    result.recommendations.strategic.forEach(rec => {
      output += `- ${rec}\n`;
    });

    return {
      type: 'text',
      text: output
    };
  }
};