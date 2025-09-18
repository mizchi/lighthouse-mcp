/**
 * L2 Weighted Issues Analysis Tool
 * Analyzes and prioritizes issues based on Lighthouse audit weights
 */

import type { LighthouseReport } from '../types';
import { loadReport } from './utils/report-loader.js';

export interface WeightedIssuesParams {
  reportId?: string;
  url?: string;
  report?: LighthouseReport; // Direct report input
  topN?: number; // Number of top issues to return
  minWeight?: number; // Minimum weight threshold
  verbosity?: 'summary' | 'detailed' | 'full'; // Output verbosity level
}

export interface WeightedIssue {
  auditId: string;
  title: string;
  description: string;
  score: number;
  weight: number;
  weightedImpact: number; // (1 - score) * weight
  category: string;
  metrics?: {
    value?: number;
    unit?: string;
    savings?: number;
    savingsUnit?: string;
  };
  details?: any;
}

export interface WeightedIssuesResult {
  totalWeightedImpact: number;
  maxPossibleImpact: number;
  impactPercentage: number;
  topIssues: WeightedIssue[];
  categorySummary: Record<string, {
    totalWeight: number;
    totalImpact: number;
    issueCount: number;
  }>;
  recommendations: string[];
}

/**
 * Get audit weight from Lighthouse categories
 */
function getAuditWeight(report: LighthouseReport, auditId: string): number {
  // Check each category for this audit's weight
  for (const [categoryId, category] of Object.entries(report.categories || {})) {
    const auditRef = category.auditRefs?.find(ref => ref.id === auditId);
    if (auditRef?.weight) {
      return auditRef.weight;
    }
  }
  return 0;
}

/**
 * Get category for an audit
 */
function getAuditCategory(report: LighthouseReport, auditId: string): string {
  for (const [categoryId, category] of Object.entries(report.categories || {})) {
    const hasAudit = category.auditRefs?.some(ref => ref.id === auditId);
    if (hasAudit) {
      return categoryId;
    }
  }
  return 'unknown';
}

/**
 * Analyze weighted issues from a Lighthouse report
 */
export function analyzeWeightedIssues(
  report: LighthouseReport,
  options: Partial<WeightedIssuesParams> = {}
): WeightedIssuesResult {
  const { topN = 10, minWeight = 0 } = options;
  const weightedIssues: WeightedIssue[] = [];
  const categorySummary: Record<string, {
    totalWeight: number;
    totalImpact: number;
    issueCount: number;
  }> = {};

  // Process all audits
  for (const [auditId, audit] of Object.entries(report.audits || {})) {
    // Skip informative audits (no score) or perfect scores
    if (audit.score === null || audit.score === undefined || audit.score === 1) {
      continue;
    }

    const weight = getAuditWeight(report, auditId);

    // Skip if below weight threshold
    if (weight < minWeight) {
      continue;
    }

    const category = getAuditCategory(report, auditId);
    const weightedImpact = (1 - audit.score) * weight;

    // Extract metrics from audit
    const metrics: WeightedIssue['metrics'] = {};
    if (audit.numericValue !== undefined) {
      metrics.value = audit.numericValue;
      metrics.unit = audit.numericUnit || 'ms';
    }
    // Prefer time savings over byte savings for display
    if ((audit.details as any)?.overallSavingsMs) {
      metrics.savings = (audit.details as any).overallSavingsMs;
      metrics.savingsUnit = 'ms';
    } else if ((audit.details as any)?.overallSavingsBytes) {
      metrics.savings = (audit.details as any).overallSavingsBytes;
      metrics.savingsUnit = 'bytes';
    }

    weightedIssues.push({
      auditId,
      title: audit.title || auditId,
      description: audit.description || '',
      score: audit.score,
      weight,
      weightedImpact,
      category,
      metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
      details: audit.details
    });

    // Update category summary
    if (!categorySummary[category]) {
      categorySummary[category] = {
        totalWeight: 0,
        totalImpact: 0,
        issueCount: 0
      };
    }
    categorySummary[category].totalWeight += weight;
    categorySummary[category].totalImpact += weightedImpact;
    categorySummary[category].issueCount += 1;
  }

  // Sort by weighted impact
  weightedIssues.sort((a, b) => b.weightedImpact - a.weightedImpact);

  // Calculate totals
  const totalWeightedImpact = weightedIssues.reduce((sum, issue) => sum + issue.weightedImpact, 0);
  const maxPossibleImpact = weightedIssues.reduce((sum, issue) => sum + issue.weight, 0);

  // Generate recommendations based on top issues
  const recommendations = generateRecommendations(weightedIssues.slice(0, topN), categorySummary);

  return {
    totalWeightedImpact,
    maxPossibleImpact,
    impactPercentage: maxPossibleImpact > 0 ? (totalWeightedImpact / maxPossibleImpact) * 100 : 0,
    topIssues: weightedIssues.slice(0, topN),
    categorySummary,
    recommendations
  };
}

/**
 * Generate recommendations based on weighted issues
 */
function generateRecommendations(
  topIssues: WeightedIssue[],
  categorySummary: Record<string, any>
): string[] {
  const recommendations: string[] = [];

  // Check for critical performance issues
  const perfIssues = topIssues.filter(i => i.category === 'performance');
  if (perfIssues.length > 0 && perfIssues[0].weightedImpact > 5) {
    recommendations.push('🚨 CRITICAL: Address high-weight performance issues first for maximum impact');
  }

  // Check for specific high-impact patterns
  const hasLCPIssue = topIssues.some(i => i.auditId.includes('largest-contentful-paint'));
  const hasCLSIssue = topIssues.some(i => i.auditId.includes('cumulative-layout-shift'));
  const hasTBTIssue = topIssues.some(i => i.auditId.includes('total-blocking-time'));
  const hasUnusedCode = topIssues.some(i => i.auditId.includes('unused'));

  if (hasLCPIssue) {
    recommendations.push('⚡ Optimize Largest Contentful Paint - this has high weight in performance scoring');
  }
  if (hasCLSIssue) {
    recommendations.push('📐 Fix layout stability issues - CLS significantly impacts user experience');
  }
  if (hasTBTIssue) {
    recommendations.push('🔄 Reduce Total Blocking Time - critical for interactivity');
  }
  if (hasUnusedCode) {
    recommendations.push('📦 Remove unused code - quick win with high impact');
  }

  // Category-specific recommendations
  const performanceImpact = categorySummary.performance?.totalImpact || 0;
  const accessibilityImpact = categorySummary.accessibility?.totalImpact || 0;
  const seoImpact = categorySummary.seo?.totalImpact || 0;

  if (performanceImpact > 20) {
    recommendations.push('🎯 Focus on performance category - it has the highest weighted impact');
  }
  if (accessibilityImpact > 10) {
    recommendations.push('♿ Don\'t neglect accessibility - multiple weighted issues detected');
  }
  if (seoImpact > 10) {
    recommendations.push('🔍 SEO issues are affecting your score - address for better visibility');
  }

  // Quick wins
  const quickWins = topIssues.filter(i =>
    i.metrics?.savings && i.metrics.savings > 1000 && i.weightedImpact > 2
  );
  if (quickWins.length > 0) {
    const totalSavings = quickWins.reduce((sum, i) => sum + (i.metrics?.savings || 0), 0);
    recommendations.push(`✅ Quick wins available: ${quickWins.length} issues could save ${(totalSavings / 1000).toFixed(1)}s`);
  }

  // Resource-specific issues
  const hasImageIssues = topIssues.some(i =>
    i.auditId.includes('image') || i.auditId.includes('webp') || i.auditId.includes('responsive')
  );
  const hasCSSIssues = topIssues.some(i =>
    i.auditId.includes('css') || i.auditId.includes('style')
  );
  const hasJSIssues = topIssues.some(i =>
    i.auditId.includes('javascript') || i.auditId.includes('script')
  );

  if (hasImageIssues) {
    recommendations.push('🖼️ Image optimization needed - multiple image-related issues with high weight');
  }
  if (hasCSSIssues) {
    recommendations.push('🎨 CSS optimization required - style-related issues impacting score');
  }
  if (hasJSIssues) {
    recommendations.push('📜 JavaScript optimization needed - script issues with significant weight');
  }

  return recommendations;
}

/**
 * Execute weighted issues analysis (MCP wrapper)
 */
export async function executeL2WeightedIssues(
  params: WeightedIssuesParams
): Promise<WeightedIssuesResult> {
  // Load report using common utility
  const { report } = await loadReport({
    reportId: params.reportId,
    url: params.url,
    report: params.report,
    device: 'mobile',
    categories: ['performance'],
    gather: false
  });

  return analyzeWeightedIssues(report, params);
}

// MCP Tool definition
export const l2WeightedIssuesTool = {
  name: 'l2_weighted_issues',
  description: 'Analyze issues prioritized by Lighthouse audit weights (Layer 2)',
  inputSchema: {
    type: 'object',
    properties: {
      reportId: {
        type: 'string',
        description: 'ID of the report to analyze'
      },
      url: {
        type: 'string',
        description: 'URL to analyze (for testing)'
      },
      topN: {
        type: 'number',
        default: 10,
        description: 'Number of top issues to return'
      },
      minWeight: {
        type: 'number',
        default: 0,
        description: 'Minimum weight threshold for issues'
      }
    },
    oneOf: [
      { required: ['reportId'] },
      { required: ['url'] }
    ]
  },
  execute: async (params: WeightedIssuesParams) => {
    const result = await executeL2WeightedIssues(params);
    const verbosity = params.verbosity || 'detailed';

    // Format output for MCP based on verbosity
    let output = `# Weighted Issues Analysis\n\n`;

    output += `## Impact Summary\n`;
    output += `- **Total Weighted Impact**: ${result.totalWeightedImpact.toFixed(2)}\n`;
    output += `- **Max Possible Impact**: ${result.maxPossibleImpact.toFixed(2)}\n`;
    output += `- **Impact Percentage**: ${result.impactPercentage.toFixed(1)}%\n\n`;

    if (verbosity === 'summary') {
      // Summary mode: Only show top 3 issues and key metrics
      if (result.topIssues.length > 0) {
        output += `## 🎯 Top 3 Critical Issues\n`;
        result.topIssues.slice(0, 3).forEach((issue, index) => {
          output += `${index + 1}. **${issue.title}** (Impact: ${issue.weightedImpact.toFixed(1)})\n`;
        });
        output += `\n`;
      }

      output += `## 💡 Key Recommendations\n`;
      result.recommendations.slice(0, 3).forEach(rec => {
        output += `- ${rec}\n`;
      });
    } else if (verbosity === 'detailed' || verbosity === 'full') {
      // Detailed mode: Show table and top issues
      if (result.topIssues.length > 0) {
        output += `## 🎯 Top Issues by Weight\n\n`;
        output += `| Rank | Issue | Score | Weight | Impact | Savings |\n`;
        output += `|------|-------|-------|--------|---------|----------|\n`;

        const issuesToShow = verbosity === 'full' ? result.topIssues : result.topIssues.slice(0, 10);
        issuesToShow.forEach((issue, index) => {
          const savings = issue.metrics?.savings
            ? `${issue.metrics.savings}${issue.metrics.savingsUnit === 'bytes' ? 'B' : 'ms'}`
            : '-';
          const title = issue.title.length > 40 ? issue.title.substring(0, 40) + '...' : issue.title;
          output += `| ${index + 1} | ${title} | ${issue.score.toFixed(2)} | ${issue.weight} | ${issue.weightedImpact.toFixed(2)} | ${savings} |\n`;
        });
        output += `\n`;

        if (verbosity === 'full') {
          // Full mode: Include detailed breakdown
          output += `## 📊 Detailed Issues Analysis\n`;
          result.topIssues.slice(0, 5).forEach((issue, index) => {
            output += `\n### ${index + 1}. ${issue.title}\n`;
            output += `- **Audit ID**: \`${issue.auditId}\`\n`;
            output += `- **Category**: ${issue.category}\n`;
            output += `- **Score**: ${issue.score.toFixed(2)} (weight: ${issue.weight})\n`;
            output += `- **Weighted Impact**: ${issue.weightedImpact.toFixed(2)}\n`;
            if (issue.description) {
              output += `- **Description**: ${issue.description}\n`;
            }
            if (issue.metrics?.value !== undefined) {
              output += `- **Current Value**: ${issue.metrics.value}${issue.metrics.unit}\n`;
            }
            if (issue.metrics?.savings) {
              output += `- **Potential Savings**: ${issue.metrics.savings}${issue.metrics.savingsUnit}\n`;
            }
          });
        }
      }
    }

    output += `\n## 📈 Category Breakdown\n`;
    output += `| Category | Total Weight | Total Impact | Issue Count |\n`;
    output += `|----------|-------------|--------------|-------------|\n`;

    for (const [category, summary] of Object.entries(result.categorySummary)) {
      output += `| ${category} | ${summary.totalWeight.toFixed(1)} | ${summary.totalImpact.toFixed(2)} | ${summary.issueCount} |\n`;
    }

    output += `\n## 💡 Recommendations\n`;
    for (const rec of result.recommendations) {
      output += `- ${rec}\n`;
    }

    return {
      success: true,
      result,
      output
    };
  }
};