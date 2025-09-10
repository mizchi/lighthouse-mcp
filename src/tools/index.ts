/**
 * MCP Tools Export
 */

export { analyzeUrlTool, executeAnalyzeUrl } from './analyzeUrl.js';
export type { AnalyzeUrlParams, AnalyzeUrlResult } from './analyzeUrl.js';

export { deepAnalysisTool, executeDeepAnalysis } from './deepAnalysis.js';
export type { DeepAnalysisParams, DeepAnalysisResult } from './deepAnalysis.js';

export { generatePromptTool, executeGeneratePrompt } from './generatePrompt.js';
export type { GeneratePromptParams, GeneratePromptResult } from './generatePrompt.js';

export { batchAnalyzeTool, executeBatchAnalyze } from './batchAnalyze.js';
export type { BatchAnalyzeParams, BatchAnalyzeResult } from './batchAnalyze.js';

/**
 * All available MCP tools
 */
export const allTools = async () => {
  const { analyzeUrlTool } = await import('./analyzeUrl.js');
  const { deepAnalysisTool } = await import('./deepAnalysis.js');
  const { generatePromptTool } = await import('./generatePrompt.js');
  const { batchAnalyzeTool } = await import('./batchAnalyze.js');

  return [
    analyzeUrlTool,
    deepAnalysisTool,
    generatePromptTool,
    batchAnalyzeTool,
  ];
};

/**
 * Execute a tool by name
 */
export async function executeTool(name: string, params: any): Promise<any> {
  switch (name) {
    case 'analyze_url': {
      const { executeAnalyzeUrl } = await import('./analyzeUrl.js');
      return executeAnalyzeUrl(params);
    }
    case 'deep_analysis': {
      const { executeDeepAnalysis } = await import('./deepAnalysis.js');
      return executeDeepAnalysis(params);
    }
    case 'generate_prompt': {
      const { executeGeneratePrompt } = await import('./generatePrompt.js');
      return executeGeneratePrompt(params);
    }
    case 'batch_analyze': {
      const { executeBatchAnalyze } = await import('./batchAnalyze.js');
      return executeBatchAnalyze(params);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}