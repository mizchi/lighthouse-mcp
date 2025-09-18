/**
 * MCP Tools Export
 */

// Layer 1 - Collection Tools
export {
  l1CollectTool,
  executeL1Collect,
} from './l1-collect-single.js';
export type {
  L1CollectParams,
  L1CollectResult,
} from './l1-collect-single.js';

export {
  l1BatchCollectTool,
  executeL1BatchCollect,
} from './l1-collect-batch.js';
export type {
  L1BatchCollectParams,
  L1BatchCollectResult,
} from './l1-collect-batch.js';

export {
  l1ListReportsTool,
  executeL1ListReports,
} from './l1-list-reports.js';
export type {
  L1ListReportsParams,
  L1ListReportsResult,
} from './l1-list-reports.js';

export {
  l1GetReportTool,
  executeL1GetReport,
} from './l1-get-report.js';
export type {
  L1GetReportParams,
  L1GetReportResult,
} from './l1-get-report.js';

// Layer 2 - Analysis Tools
export {
  l2PerformanceAnalysisTool,
  executeL2PerformanceAnalysis,
} from './l2-performance-analysis.js';
export type {
  L2PerformanceAnalysisParams,
  L2PerformanceAnalysisResult,
} from './l2-performance-analysis.js';

export {
  l2CriticalChainTool,
  executeL2CriticalChain,
} from './l2-critical-chain.js';
export type {
  L2CriticalChainParams,
  L2CriticalChainResult,
} from './l2-critical-chain.js';

export {
  l2UnusedCodeTool,
  executeL2UnusedCode,
} from './l2-unused-code.js';
export type {
  L2UnusedCodeParams,
  L2UnusedCodeResult,
} from './l2-unused-code.js';

export {
  l2DeepAnalysisTool,
  executeL2DeepAnalysis,
} from './l2-deep-analysis.js';
export type {
  L2DeepAnalysisParams,
  L2DeepAnalysisResult,
} from './l2-deep-analysis.js';

export {
  l2ScoreAnalysisTool,
  executeL2ScoreAnalysis,
} from './l2-score-analysis.js';
export type {
  L2ScoreAnalysisParams,
  L2ScoreAnalysisResult,
} from './l2-score-analysis.js';

export {
  l2ThirdPartyImpactTool,
  l2ProgressiveThirdPartyTool,
  executeL2ThirdPartyImpact,
  executeL2ProgressiveThirdParty,
} from './l2-third-party-impact.js';
export type {
  L2ThirdPartyImpactParams,
  L2ThirdPartyImpactResult,
  L2ProgressiveThirdPartyParams,
  L2ProgressiveThirdPartyResult,
} from './l2-third-party-impact.js';

export {
  executeL2LCPChainAnalysis,
} from './l2-lcp-chain-analysis.js';
export type {
  L2LCPChainAnalysisParams,
  L2LCPChainAnalysisResult,
  LCPChainNode,
  LCPChainAnalysis,
} from './l2-lcp-chain-analysis.js';

export {
  l2SiteComparisonTool,
  executeL2SiteComparison,
} from './l2-site-comparison.js';
export type {
  SiteComparisonParams,
  SiteComparisonResult,
  SiteMetrics,
} from './l2-site-comparison.js';

export {
  l3PatternInsightsTool,
  executeL3PatternInsights,
} from './l3-pattern-insights.js';
export type {
  PatternInsightsParams,
  PatternInsightsResult,
  PerformancePattern,
  CategoryInsight,
} from './l3-pattern-insights.js';

export {
  l2ComprehensiveIssuesTool,
  executeL2ComprehensiveIssues,
} from './l2-comprehensive-issues.js';
export type {
  ComprehensiveIssuesParams,
  ComprehensiveIssuesResult,
  Issue,
} from './l2-comprehensive-issues.js';

export {
  l2CPUAnalysisTool,
  executeL2CPUAnalysis,
} from './l2-cpu-analysis.js';
export type {
  CPUAnalysisParams,
  CPUAnalysisResult,
  CPUBottleneck,
} from './l2-cpu-analysis.js';

export {
  l2WeightedIssuesTool,
  executeL2WeightedIssues,
} from './l2-weighted-issues.js';
export type {
  WeightedIssuesParams,
  WeightedIssuesResult,
  WeightedIssue,
} from './l2-weighted-issues.js';

// Layer 3 - Interpretation Tools
export {
  l3PerformanceBudgetTool,
  executeL3PerformanceBudget,
} from './l3-performance-budget.js';

export {
  l3UnifiedAnalysisTool,
  executeL3UnifiedAnalysis,
} from './l3-unified-analysis.js';
export type {
  UnifiedAnalysisParams,
  UnifiedAnalysisResult,
  UnifiedIssue,
  ActionItem,
} from './l3-unified-analysis.js';
export type {
  L3PerformanceBudgetParams,
  BudgetAnalysisResult,
  PerformanceBudget,
  BudgetViolation,
} from './l3-performance-budget.js';
export {
  l3DatabaseQueryTool,
  executeL3DatabaseQuery,
} from './l3-database-query.js';
export type {
  L3DatabaseQueryParams,
  L3DatabaseQueryResult,
  TrendAnalysis,
  ComparisonResult,
  DatabaseStatistics,
} from './l3-database-query.js';

/**
 * All available MCP tools
 */
export const allTools = async () => {
  // Layer 1 tools
  const { l1CollectTool } = await import('./l1-collect-single.js');
  const { l1BatchCollectTool } = await import('./l1-collect-batch.js');
  const { l1ListReportsTool } = await import('./l1-list-reports.js');
  const { l1GetReportTool } = await import('./l1-get-report.js');

  // Layer 2 tools
  const { l2PerformanceAnalysisTool } = await import('./l2-performance-analysis.js');
  const { l2CriticalChainTool } = await import('./l2-critical-chain.js');
  const { l2UnusedCodeTool } = await import('./l2-unused-code.js');
  const { l2DeepAnalysisTool } = await import('./l2-deep-analysis.js');
  const { l2ScoreAnalysisTool } = await import('./l2-score-analysis.js');
  const { l2ThirdPartyImpactTool, l2ProgressiveThirdPartyTool } = await import('./l2-third-party-impact.js');
  const { l2LCPChainAnalysisTool } = await import('./l2-lcp-chain-analysis.js');
  const { l2SiteComparisonTool } = await import('./l2-site-comparison.js');
  const { l2ComprehensiveIssuesTool } = await import('./l2-comprehensive-issues.js');
  const { l2CPUAnalysisTool } = await import('./l2-cpu-analysis.js');
  const { l2WeightedIssuesTool } = await import('./l2-weighted-issues.js');
  const { l3PatternInsightsTool } = await import('./l3-pattern-insights.js');

  // Layer 3 tools
  const { l3DatabaseQueryTool } = await import('./l3-database-query.js');
  const { l3PerformanceBudgetTool } = await import('./l3-performance-budget.js');

  return [
    // Layer 1 - Collection
    l1CollectTool,
    l1BatchCollectTool,
    l1ListReportsTool,
    l1GetReportTool,
    // Layer 2 - Analysis
    l2PerformanceAnalysisTool,
    l2CriticalChainTool,
    l2UnusedCodeTool,
    l2DeepAnalysisTool,
    l2ScoreAnalysisTool,
    l2ThirdPartyImpactTool,
    l2ProgressiveThirdPartyTool,
    l2LCPChainAnalysisTool,
    l2SiteComparisonTool,
    l2ComprehensiveIssuesTool,
    l2CPUAnalysisTool,
    l2WeightedIssuesTool,
    // Layer 3 - Interpretation
    l3DatabaseQueryTool,
    l3PatternInsightsTool,
    l3PerformanceBudgetTool,
  ];
};

/**
 * Execute a tool by name
 */
export async function executeTool(name: string, params: any): Promise<any> {
  switch (name) {
    // Layer 1 tools
    case 'l1_collect': {
      const { executeL1Collect } = await import('./l1-collect-single.js');
      return executeL1Collect(params);
    }
    case 'l1_batch_collect': {
      const { executeL1BatchCollect } = await import('./l1-collect-batch.js');
      return executeL1BatchCollect(params);
    }
    case 'l1_list_reports': {
      const { executeL1ListReports } = await import('./l1-list-reports.js');
      return executeL1ListReports(params);
    }
    case 'l1_get_report': {
      const { executeL1GetReport } = await import('./l1-get-report.js');
      return executeL1GetReport(params);
    }
    // Layer 2 tools
    case 'l2_performance_analysis': {
      const { executeL2PerformanceAnalysis } = await import('./l2-performance-analysis.js');
      return executeL2PerformanceAnalysis(params);
    }
    case 'l2_critical_chain': {
      const { executeL2CriticalChain } = await import('./l2-critical-chain.js');
      return executeL2CriticalChain(params);
    }
    case 'l2_unused_code': {
      const { executeL2UnusedCode } = await import('./l2-unused-code.js');
      return executeL2UnusedCode(params);
    }
    case 'l2_deep_analysis': {
      const { executeL2DeepAnalysis } = await import('./l2-deep-analysis.js');
      return executeL2DeepAnalysis(params);
    }
    case 'l2_score_analysis': {
      const { executeL2ScoreAnalysis } = await import('./l2-score-analysis.js');
      return executeL2ScoreAnalysis(params);
    }
    case 'l2_third_party_impact': {
      const { executeL2ThirdPartyImpact } = await import('./l2-third-party-impact.js');
      return executeL2ThirdPartyImpact(params);
    }
    case 'l2_progressive_third_party': {
      const { executeL2ProgressiveThirdParty } = await import('./l2-third-party-impact.js');
      return executeL2ProgressiveThirdParty(params);
    }
    case 'l2_lcp_chain_analysis': {
      const { executeL2LCPChainAnalysis } = await import('./l2-lcp-chain-analysis.js');
      return executeL2LCPChainAnalysis(params);
    }
    case 'l2_site_comparison': {
      const { executeL2SiteComparison } = await import('./l2-site-comparison.js');
      return executeL2SiteComparison(params);
    }
    case 'l2_comprehensive_issues': {
      const { executeL2ComprehensiveIssues } = await import('./l2-comprehensive-issues.js');
      return executeL2ComprehensiveIssues(params);
    }
    case 'l2_cpu_analysis': {
      const { executeL2CPUAnalysis } = await import('./l2-cpu-analysis.js');
      return executeL2CPUAnalysis(params);
    }
    case 'l2_weighted_issues': {
      const { executeL2WeightedIssues } = await import('./l2-weighted-issues.js');
      return executeL2WeightedIssues(params);
    }
    // Layer 3 tools
    case 'l3_performance_budget': {
      const { executeL3PerformanceBudget } = await import('./l3-performance-budget.js');
      return executeL3PerformanceBudget(params);
    }
    case 'l3_database_query': {
      const { executeL3DatabaseQuery } = await import('./l3-database-query.js');
      return executeL3DatabaseQuery(params);
    }
    case 'l3_pattern_insights': {
      const { executeL3PatternInsights } = await import('./l3-pattern-insights.js');
      return executeL3PatternInsights(params);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}