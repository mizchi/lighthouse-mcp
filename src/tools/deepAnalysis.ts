/**
 * Deep Analysis Tool - Comprehensive Lighthouse report analysis
 */

import { runLighthouse } from '../core/lighthouse.js';
import { createDeepAnalysisTool } from '../mcp/deepAnalysisTool.js';
import type { LighthouseReport } from '../types/index.js';

export interface DeepAnalysisParams {
  url?: string;
  reportData?: LighthouseReport;
  includeChains?: boolean;
  includeUnusedCode?: boolean;
  maxRecommendations?: number;
}

export interface DeepAnalysisResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Tool definition for MCP
 */
export const deepAnalysisTool = {
  name: 'deep_analysis',
  description: 'Perform deep analysis on an existing Lighthouse report or URL',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to analyze (optional if reportData provided)',
      },
      includeChains: {
        type: 'boolean',
        default: true,
        description: 'Include critical chain analysis',
      },
      includeUnusedCode: {
        type: 'boolean',
        default: true,
        description: 'Include unused code analysis',
      },
      maxRecommendations: {
        type: 'number',
        default: 10,
        description: 'Maximum number of recommendations to return',
      },
    },
  },
};

/**
 * Execute the deep_analysis tool
 */
export async function executeDeepAnalysis(params: DeepAnalysisParams): Promise<DeepAnalysisResult> {
  const {
    url,
    reportData,
    includeChains = true,
    includeUnusedCode = true,
    maxRecommendations = 10,
  } = params;

  let report: LighthouseReport;

  if (reportData) {
    // Use provided report data
    report = reportData;
  } else if (url) {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL format: ${url}`);
    }

    // Run Lighthouse if URL provided
    const result = await runLighthouse(url, {
      categories: ['performance', 'accessibility', 'best-practices', 'seo'],
      device: 'mobile',
      timeout: 120000,
      userDataDir: '.lhdata/mcp',
    });

    if (!result.isOk()) {
      throw new Error(`Lighthouse failed: ${result.error.message}`);
    }

    report = result.value;
  } else {
    throw new Error('Either URL or reportData is required for analysis');
  }

  // Perform deep analysis
  const tool = await createDeepAnalysisTool();
  const analysisResult = await tool.execute({
    reportData: report,
    includeChains,
    includeUnusedCode,
    maxRecommendations,
  });

  return {
    content: analysisResult.content,
  };
}