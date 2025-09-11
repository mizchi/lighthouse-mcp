/**
 * L2 Score Analysis Tool
 * Analyzes score breakdown and opportunities
 */

import { executeL1GetReport } from './l1-get-report.js';
import { executeL1Collect } from './l1-collect-single.js';
import { analyzeReport } from '../analyzers/scores.js';
import type { LighthouseReport } from '../types/index.js';

export interface L2ScoreAnalysisParams {
  reportId?: string;
  url?: string;
  device?: 'mobile' | 'desktop';
  category?: string;
}

export interface L2ScoreAnalysisResult {
  reportId: string;
  scoreAnalysis: {
    category: string;
    score: number;
    weightedMetrics: Array<{
      id: string;
      title: string;
      score: number;
      weight: number;
      contribution: number;
      displayValue?: string;
    }>;
    opportunities: Array<{
      id: string;
      title: string;
      score: number;
      impact: string;
      savingsMs?: number;
      savingsBytes?: number;
    }>;
    diagnostics: Array<{
      id: string;
      title: string;
      score: number;
      displayValue?: string;
    }>;
  };
}

export const l2ScoreAnalysisTool = {
  name: 'l2_score_analysis',
  description: 'Analyze score breakdown and opportunities (Layer 2)',
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
      category: {
        type: 'string',
        enum: ['performance', 'accessibility', 'best-practices', 'seo'],
        default: 'performance',
        description: 'Category to analyze',
      },
    },
  },
};

export async function executeL2ScoreAnalysis(params: L2ScoreAnalysisParams): Promise<L2ScoreAnalysisResult> {
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
      categories: [params.category || 'performance'],
      gather: false,
    });
    reportId = collectResult.reportId;
    
    const result = await executeL1GetReport({ reportId });
    report = result.data;
  } else {
    throw new Error('Either reportId or url is required');
  }

  // Analyze score
  const category = params.category || 'performance';
  const scoreAnalysis = analyzeReport(report);
  const categoryScore = scoreAnalysis.categories?.[category];

  if (!categoryScore) {
    throw new Error(`Category ${category} not found in report`);
  }

  // Format the result
  const formattedResult: L2ScoreAnalysisResult = {
    reportId: reportId!,
    scoreAnalysis: {
      category,
      score: categoryScore.score || 0,
      weightedMetrics: categoryScore.audits.map(a => ({
        id: a.id,
        title: a.title,
        score: a.score || 0,
        weight: a.weight,
        contribution: a.weightedScore,
        displayValue: a.displayValue,
      })),
      opportunities: categoryScore.audits
        .filter(a => a.score !== null && a.score < 1)
        .map(a => ({
          id: a.id,
          title: a.title,
          score: a.score || 0,
          impact: a.weight > 0.1 ? 'high' : a.weight > 0.05 ? 'medium' : 'low',
        })),
      diagnostics: categoryScore.audits.map(a => ({
        id: a.id,
        title: a.title,
        score: a.score || 0,
        displayValue: a.displayValue,
      })),
    },
  };

  return formattedResult;
}