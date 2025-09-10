/**
 * Analyze URL Tool - Lighthouse analysis with performance insights
 */

import { runLighthouse } from '../core/lighthouse.js';
import { createDeepAnalysisTool } from '../mcp/deepAnalysisTool.js';
import type { LighthouseConfig } from '../types/index.js';

export interface AnalyzeUrlParams {
  url: string;
  device?: 'mobile' | 'desktop';
  categories?: string[];
  includeChains?: boolean;
  includeUnusedCode?: boolean;
}

export interface AnalyzeUrlResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Tool definition for MCP
 */
export const analyzeUrlTool = {
  name: 'analyze_url',
  description: 'Analyze a URL with Lighthouse and get performance insights',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to analyze',
      },
      device: {
        type: 'string',
        enum: ['mobile', 'desktop'],
        default: 'mobile',
        description: 'Device type for analysis',
      },
      categories: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
        default: ['performance'],
        description: 'Categories to analyze',
      },
      includeChains: {
        type: 'boolean',
        default: false,
        description: 'Include critical chain analysis',
      },
      includeUnusedCode: {
        type: 'boolean',
        default: false,
        description: 'Include unused code analysis',
      },
    },
    required: ['url'],
  },
};

/**
 * Execute the analyze_url tool
 */
export async function executeAnalyzeUrl(params: AnalyzeUrlParams): Promise<AnalyzeUrlResult> {
  const {
    url,
    device = 'mobile',
    categories = ['performance'],
    includeChains = false,
    includeUnusedCode = false,
  } = params;

  if (!url) {
    throw new Error('URL is required');
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL format: ${url}`);
  }

  // Configure Lighthouse
  const config: LighthouseConfig = {
    device,
    categories,
    timeout: 120000,
    userDataDir: '.lhdata/mcp',
  };

  // Run Lighthouse
  const result = await runLighthouse(url, config);

  if (!result.isOk()) {
    throw new Error(`Lighthouse failed: ${result.error.message}`);
  }

  const report = result.value;

  // Create deep analysis tool and execute
  const tool = await createDeepAnalysisTool();
  const analysisResult = await tool.execute({
    reportData: report,
    includeChains,
    includeUnusedCode,
    maxRecommendations: 10,
  });

  return {
    content: analysisResult.content,
  };
}