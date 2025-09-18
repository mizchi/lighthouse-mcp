/**
 * Lighthouse MCP - Main Export
 *
 * Performance analysis tools for web applications
 */

// Re-export all tools
export * from './tools/index.js';

// Re-export types
export * from './types/index.js';

// Re-export database
export { LighthouseDatabase } from './core/database.js';

// Re-export core functionality
export * from './core/runner.js';
export * from './core/lighthouse.js';

// Re-export analyzers
export * from './analyzers/index.js';

// Re-export metrics
export { getMetrics } from './metrics.js';

// Import for re-export with aliases
import {
  executeL1Collect,
  executeL1BatchCollect,
  executeL1ListReports,
  executeL1GetReport,
  executeL2PerformanceAnalysis,
  executeL2UnusedCode,
  executeL2CriticalChain,
  executeL2ComprehensiveIssues,
  executeL2ThirdPartyImpact,
  executeL3PerformanceBudget,
  executeL3PatternInsights,
  executeL3DatabaseQuery,
} from './tools/index.js';

// Quick access to commonly used tools
export {
  // Layer 1 - Collection
  executeL1Collect as collectLighthouse,
  executeL1BatchCollect as batchCollect,
  executeL1ListReports as listReports,
  executeL1GetReport as getReport,

  // Layer 2 - Analysis
  executeL2PerformanceAnalysis as analyzePerformance,
  executeL2UnusedCode as analyzeUnusedCode,
  executeL2CriticalChain as analyzeCriticalChain,
  executeL2ComprehensiveIssues as detectIssues,
  executeL2ThirdPartyImpact as analyzeThirdParty,

  // Layer 3 - Intelligence
  executeL3PerformanceBudget as analyzeBudget,
  executeL3PatternInsights as analyzePatterns,
  executeL3DatabaseQuery as queryDatabase,
};

// Default export for convenience
export default {
  collect: executeL1Collect,
  analyze: executeL2PerformanceAnalysis,
  detectIssues: executeL2ComprehensiveIssues,
  analyzeBudget: executeL3PerformanceBudget,
};