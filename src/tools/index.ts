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

// Layer 3 - Interpretation Tools
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
  
  // Layer 3 tools
  const { l3DatabaseQueryTool } = await import('./l3-database-query.js');

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
    // Layer 3 - Interpretation
    l3DatabaseQueryTool,
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
    // Layer 3 tools
    case 'l3_database_query': {
      const { executeL3DatabaseQuery } = await import('./l3-database-query.js');
      return executeL3DatabaseQuery(params);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}