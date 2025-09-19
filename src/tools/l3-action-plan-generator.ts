/**
 * L3 Action Plan Generator
 * Aggregates issues from multiple L2 tools and generates prioritized action plans
 */

import type { LighthouseReport } from '../types';
import { executeL2WeightedIssues, type WeightedIssue } from './l2-weighted-issues';
import { executeL2UnusedCode } from './l2-unused-code';

export interface ActionPlanGeneratorParams {
  reportId?: string;
  report?: LighthouseReport;
  includeTools?: Array<'weighted' | 'deep' | 'unused'>;
  verbosity?: 'summary' | 'detailed' | 'full';
}

export interface AggregatedIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  impact: {
    score?: number;
    weight?: number;
    weightedImpact?: number;
    timeImpact?: number;
    sizeImpact?: number;
  };
  sources: string[]; // Which tools detected this issue
  solutions: {
    quick?: string;
    longTerm?: string;
    effort: 'low' | 'medium' | 'high';
  };
  metrics?: {
    current?: number;
    target?: number;
    savings?: number;
    unit?: string;
  };
}

export interface ActionItem {
  priority: number;
  title: string;
  description: string;
  estimatedImpact: {
    scoreImprovement: number;
    loadTimeReduction: number;
    sizeReduction?: number;
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    timeEstimate: string;
    resources: string[];
  };
}

export interface ActionPlanResult {
  performanceScore: number;
  summary: {
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    totalIssues: number;
  };
  aggregatedIssues: AggregatedIssue[];
  actionPlan: ActionItem[];
  estimatedImpact: {
    scoreImprovement: number;
    loadTimeReduction: number;
    sizeReduction: number;
  };
  toolCoverage: {
    weighted: boolean;
    deep: boolean;
    unused: boolean;
  };
}


/**
 * Map weighted issue to unified issue
 */
function mapWeightedIssue(issue: WeightedIssue): Partial<AggregatedIssue> {
  return {
    id: issue.auditId,
    title: issue.title,
    description: issue.description,
    severity: issue.weightedImpact > 15 ? 'critical' :
             issue.weightedImpact > 10 ? 'high' :
             issue.weightedImpact > 5 ? 'medium' : 'low',
    category: issue.category,
    impact: {
      score: issue.score,
      weight: issue.weight,
      weightedImpact: issue.weightedImpact
    },
    metrics: issue.metrics ? {
      current: issue.metrics.value,
      savings: issue.metrics.savings,
      unit: issue.metrics.unit || issue.metrics.savingsUnit
    } : undefined
  };
}


/**
 * Deduplicate issues from multiple sources
 */
function deduplicateIssues(issues: Partial<AggregatedIssue>[]): AggregatedIssue[] {
  const issueMap = new Map<string, AggregatedIssue>();

  for (const issue of issues) {
    // Generate a key based on title similarity
    const key = issue.id || issue.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

    if (issueMap.has(key)) {
      // Merge with existing issue
      const existing = issueMap.get(key)!;
      existing.sources.push(...(issue.sources || []));

      // Merge impact metrics (take max values)
      if (issue.impact) {
        existing.impact = {
          ...existing.impact,
          score: Math.min(existing.impact.score || 1, issue.impact.score || 1),
          weight: Math.max(existing.impact.weight || 0, issue.impact.weight || 0),
          weightedImpact: Math.max(existing.impact.weightedImpact || 0, issue.impact.weightedImpact || 0),
          timeImpact: Math.max(existing.impact.timeImpact || 0, issue.impact.timeImpact || 0),
          sizeImpact: Math.max(existing.impact.sizeImpact || 0, issue.impact.sizeImpact || 0)
        };
      }

      // Merge solutions (prefer more detailed ones)
      if (issue.solutions) {
        existing.solutions = {
          quick: existing.solutions.quick || issue.solutions.quick,
          longTerm: existing.solutions.longTerm || issue.solutions.longTerm,
          effort: existing.solutions.effort
        };
      }
    } else {
      // Create new unified issue
      issueMap.set(key, {
        id: key,
        title: issue.title || 'Unknown Issue',
        description: issue.description || '',
        severity: issue.severity || 'medium',
        category: issue.category || 'performance',
        impact: issue.impact || {},
        sources: issue.sources || [],
        solutions: issue.solutions || { effort: 'medium' },
        metrics: issue.metrics
      });
    }
  }

  return Array.from(issueMap.values());
}

/**
 * Generate action items from aggregated issues
 */
function generateActionItems(issues: AggregatedIssue[]): ActionItem[] {
  const actionItems: ActionItem[] = [];

  // Sort issues by weighted impact and severity
  const sortedIssues = [...issues].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return (b.impact.weightedImpact || 0) - (a.impact.weightedImpact || 0);
  });

  // Generate action items for top issues
  for (const issue of sortedIssues.slice(0, 10)) {
    const priority = issue.severity === 'critical' ? 1 :
                    issue.severity === 'high' ? 2 :
                    issue.severity === 'medium' ? 3 : 4;

    const timeEstimate = issue.solutions.effort === 'low' ? '1-2 hours' :
                        issue.solutions.effort === 'medium' ? '2-4 hours' : '4+ hours';

    actionItems.push({
      priority,
      title: `Fix: ${issue.title}`,
      description: issue.solutions.quick || issue.solutions.longTerm || issue.description,
      estimatedImpact: {
        scoreImprovement: (issue.impact.weightedImpact || 0) / 100,
        loadTimeReduction: issue.impact.timeImpact || 0,
        sizeReduction: issue.impact.sizeImpact || 0
      },
      implementation: {
        effort: issue.solutions.effort,
        timeEstimate,
        resources: issue.sources
      }
    });
  }

  return actionItems;
}

/**
 * Perform unified analysis
 */
export async function performActionPlanGeneration(
  params: ActionPlanGeneratorParams
): Promise<ActionPlanResult> {
  const includeTools = params.includeTools || ['weighted', 'cpu', 'comprehensive', 'unused'];
  const allIssues: Array<Partial<AggregatedIssue> & { sources: string[] }> = [];

  // Get the report
  let report: LighthouseReport | undefined;
  if (params.report) {
    report = params.report;
  }

  // Run selected L2 tools in parallel
  const toolPromises = [];

  if (includeTools.includes('weighted')) {
    toolPromises.push(
      executeL2WeightedIssues({
        reportId: params.reportId,
        report,
        topN: 20,
        verbosity: 'summary'
      }).then(result => {
        result.topIssues.forEach(issue => {
          allIssues.push({
            ...mapWeightedIssue(issue),
            sources: ['weighted']
          });
        });
        return { tool: 'weighted', success: true };
      }).catch(err => ({ tool: 'weighted', success: false, error: err }))
    );
  }

  if (includeTools.includes('cpu')) {
    toolPromises.push(
      executeL2CPUAnalysis({
        reportId: params.reportId,
        report
      }).then(result => {
        result.bottlenecks.forEach(bottleneck => {
          allIssues.push({
            ...mapCPUBottleneck(bottleneck),
            sources: ['cpu']
          });
        });
        return { tool: 'cpu', success: true };
      }).catch(err => ({ tool: 'cpu', success: false, error: err }))
    );
  }

  if (includeTools.includes('comprehensive')) {
    toolPromises.push(
      executeL2ComprehensiveIssues({
        reportId: params.reportId,
        report
      }).then(result => {
        result.issues.forEach(issue => {
          allIssues.push({
            ...mapComprehensiveIssue(issue),
            sources: ['comprehensive']
          });
        });
        return { tool: 'comprehensive', success: true };
      }).catch(err => ({ tool: 'comprehensive', success: false, error: err }))
    );
  }

  if (includeTools.includes('unused')) {
    toolPromises.push(
      executeL2UnusedCode({
        reportId: params.reportId,
        report
      }).then(result => {
        if (result.analysis.totalWastedBytes > 50000) {
          allIssues.push({
            title: 'Excessive Unused Code',
            description: `${(result.analysis.totalWastedBytes / 1024).toFixed(1)}KB of unused code detected`,
            severity: result.analysis.totalWastedBytes > 500000 ? 'critical' : 'high',
            category: 'performance',
            impact: {
              sizeImpact: result.analysis.totalWastedBytes
            },
            sources: ['unused'],
            solutions: {
              quick: 'Remove unused CSS and JavaScript',
              effort: 'medium'
            },
            metrics: {
              current: result.analysis.totalWastedBytes,
              target: 0,
              savings: result.analysis.totalWastedBytes,
              unit: 'bytes'
            }
          });
        }
        return { tool: 'unused', success: true };
      }).catch(err => ({ tool: 'unused', success: false, error: err }))
    );
  }

  // Wait for all tools to complete
  const toolResults = await Promise.all(toolPromises);

  // Deduplicate and unify issues
  const unifiedIssues = deduplicateIssues(allIssues);

  // Generate action plan
  const actionPlan = generateActionItems(unifiedIssues);

  // Calculate summary
  const summary = {
    criticalIssues: unifiedIssues.filter(i => i.severity === 'critical').length,
    highIssues: unifiedIssues.filter(i => i.severity === 'high').length,
    mediumIssues: unifiedIssues.filter(i => i.severity === 'medium').length,
    lowIssues: unifiedIssues.filter(i => i.severity === 'low').length,
    totalIssues: unifiedIssues.length
  };

  // Calculate estimated impact
  const estimatedImpact = {
    scoreImprovement: actionPlan.reduce((sum, item) => sum + item.estimatedImpact.scoreImprovement, 0),
    loadTimeReduction: actionPlan.reduce((sum, item) => sum + item.estimatedImpact.loadTimeReduction, 0),
    sizeReduction: actionPlan.reduce((sum, item) => sum + item.estimatedImpact.sizeReduction || 0, 0)
  };

  // Track tool coverage
  const toolCoverage = {
    weighted: toolResults.some(r => r.tool === 'weighted' && r.success),
    deep: toolResults.some(r => r.tool === 'deep' && r.success),
    unused: toolResults.some(r => r.tool === 'unused' && r.success)
  };

  return {
    performanceScore: report?.categories?.performance?.score || 0,
    summary,
    aggregatedIssues: unifiedIssues,
    actionPlan,
    estimatedImpact,
    toolCoverage
  };
}

/**
 * Execute action plan generator (MCP wrapper)
 */
export async function executeL3ActionPlanGenerator(
  params: ActionPlanGeneratorParams
): Promise<ActionPlanResult> {
  return performActionPlanGeneration(params);
}

// MCP Tool definition
export const l3ActionPlanGeneratorTool = {
  name: 'l3_action_plan_generator',
  description: 'Generate prioritized action plans by aggregating issues from multiple L2 analysis tools (Layer 3)',
  inputSchema: {
    type: 'object',
    properties: {
      reportId: {
        type: 'string',
        description: 'ID of the report to analyze'
      },
      includeTools: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['weighted', 'deep', 'unused']
        },
        description: 'Which L2 tools to include in analysis'
      },
      verbosity: {
        type: 'string',
        enum: ['summary', 'detailed', 'full'],
        description: 'Output verbosity level'
      }
    }
  },
  execute: async (params: ActionPlanGeneratorParams) => {
    const result = await executeL3ActionPlanGenerator(params);
    const verbosity = params.verbosity || 'detailed';

    // Format output for MCP
    let output = `# 🎯 Performance Action Plan\n\n`;

    output += `## Performance Score: ${(result.performanceScore * 100).toFixed(0)}/100\n\n`;

    output += `## 📊 Issue Summary\n`;
    output += `- **Critical**: ${result.summary.criticalIssues} issues\n`;
    output += `- **High**: ${result.summary.highIssues} issues\n`;
    output += `- **Medium**: ${result.summary.mediumIssues} issues\n`;
    output += `- **Low**: ${result.summary.lowIssues} issues\n`;
    output += `- **Total**: ${result.summary.totalIssues} issues\n\n`;

    if (verbosity === 'summary') {
      output += `## 🚀 Top 3 Actions\n`;
      result.actionPlan.slice(0, 3).forEach((action, index) => {
        output += `${index + 1}. **${action.title}**\n`;
        output += `   - Impact: ${(action.estimatedImpact.scoreImprovement * 100).toFixed(1)} point improvement\n`;
        output += `   - Effort: ${action.implementation.effort}\n\n`;
      });
    } else {
      output += `## 🚀 Action Plan\n`;
      output += `| Priority | Action | Est. Impact | Effort | Time |\n`;
      output += `|----------|--------|-------------|--------|------|\n`;

      const actionsToShow = verbosity === 'full' ? result.actionPlan : result.actionPlan.slice(0, 5);
      actionsToShow.forEach(action => {
        const impact = `+${(action.estimatedImpact.scoreImprovement * 100).toFixed(1)} pts`;
        output += `| ${action.priority} | ${action.title.substring(0, 40)} | ${impact} | ${action.implementation.effort} | ${action.implementation.timeEstimate} |\n`;
      });
      output += `\n`;

      if (verbosity === 'full') {
        output += `## 🔍 Detailed Issues\n`;
        result.unifiedIssues.slice(0, 10).forEach((issue, index) => {
          output += `\n### ${index + 1}. ${issue.title}\n`;
          output += `- **Severity**: ${issue.severity}\n`;
          output += `- **Category**: ${issue.category}\n`;
          output += `- **Detected by**: ${issue.sources.join(', ')}\n`;
          if (issue.description) {
            output += `- **Description**: ${issue.description}\n`;
          }
          if (issue.metrics?.savings) {
            output += `- **Potential Savings**: ${issue.metrics.savings} ${issue.metrics.unit}\n`;
          }
          if (issue.solutions.quick) {
            output += `- **Quick Fix**: ${issue.solutions.quick}\n`;
          }
        });
      }
    }

    output += `\n## 💰 Estimated Total Impact\n`;
    output += `- **Score Improvement**: +${(result.estimatedImpact.scoreImprovement * 100).toFixed(1)} points\n`;
    output += `- **Load Time Reduction**: ${(result.estimatedImpact.loadTimeReduction / 1000).toFixed(1)}s\n`;
    if (result.estimatedImpact.sizeReduction > 0) {
      output += `- **Size Reduction**: ${(result.estimatedImpact.sizeReduction / 1024).toFixed(1)}KB\n`;
    }

    output += `\n## 📈 Analysis Coverage\n`;
    output += `- Weighted Issues: ${result.toolCoverage.weighted ? '✅' : '❌'}\n`;
    output += `- CPU Analysis: ${result.toolCoverage.cpu ? '✅' : '❌'}\n`;
    output += `- Comprehensive Issues: ${result.toolCoverage.comprehensive ? '✅' : '❌'}\n`;
    output += `- Unused Code: ${result.toolCoverage.unused ? '✅' : '❌'}\n`;

    return {
      success: true,
      result,
      output
    };
  }
};