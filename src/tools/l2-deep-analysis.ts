/**
 * L2 Deep Analysis Tool
 * Comprehensive deep analysis of Lighthouse report
 */

import { executeL1GetReport } from './l1-get-report.js';
import { executeL1Collect } from './l1-collect-single.js';
import { performDeepAnalysis } from '../analyzers/deepAnalysis.js';
import { analyzeCriticalChains } from '../analyzers/criticalChain.js';
import { analyzeUnusedCode } from '../analyzers/unusedCode.js';
import type { LighthouseReport } from '../types/index.js';

export interface L2DeepAnalysisParams {
  reportId?: string;
  url?: string;
  device?: 'mobile' | 'desktop';
  categories?: string[];
  includeChains?: boolean;
  includeUnusedCode?: boolean;
  maxRecommendations?: number;
}

export interface L2DeepAnalysisResult {
  reportId: string;
  analysis: {
    score: number;
    metrics: any;
    problems: any[];
    patterns: any[];
    recommendations: string[];
    criticalChain?: any;
    unusedCode?: any;
  };
}

export const l2DeepAnalysisTool = {
  name: 'l2_deep_analysis',
  description: 'Comprehensive deep analysis of Lighthouse report (Layer 2)',
  inputSchema: {
    type: 'object',
    properties: {
      reportId: {
        type: 'string',
        description: 'Report ID to analyze',
      },
      url: {
        type: 'string',
        description: 'URL to analyze (if no reportId)',
      },
      device: {
        type: 'string',
        enum: ['mobile', 'desktop'],
        default: 'mobile',
        description: 'Device type',
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
      maxRecommendations: {
        type: 'number',
        default: 10,
        description: 'Maximum number of recommendations',
      },
    },
  },
};

export async function executeL2DeepAnalysis(params: L2DeepAnalysisParams): Promise<L2DeepAnalysisResult> {
  let reportId = params.reportId;
  let report: LighthouseReport;

  // Get report data
  if (reportId) {
    const result = await executeL1GetReport({ reportId });
    report = result.data;
  } else if (params.url) {
    const collectResult = await executeL1Collect({
      url: params.url,
      device: params.device || 'mobile',
      categories: params.categories || ['performance'],
      gather: false,
    });
    reportId = collectResult.reportId;
    
    const result = await executeL1GetReport({ reportId });
    report = result.data;
  } else {
    throw new Error('Either reportId or url is required');
  }

  // Perform deep analysis
  const analysis = performDeepAnalysis(report);
  
  // Add optional analyses
  if (params.includeChains) {
    analysis.criticalChains = analyzeCriticalChains(report);
  }
  
  if (params.includeUnusedCode) {
    analysis.unusedCode = analyzeUnusedCode(report);
  }

  // Limit recommendations
  if (params.maxRecommendations && analysis.recommendations) {
    analysis.recommendations = analysis.recommendations.slice(0, params.maxRecommendations);
  }

  return {
    reportId: reportId!,
    analysis: {
      score: analysis.scoreAnalysis?.categoryScores?.performance?.score || 0,
      metrics: analysis.metrics,
      problems: analysis.problems,
      patterns: analysis.patterns,
      recommendations: analysis.recommendations.map((r: any) => 
        typeof r === 'string' ? r : `${r.category}: ${r.description}`
      ),
      criticalChain: analysis.criticalChains || null,
      unusedCode: analysis.unusedCode || null,
    },
  };
}