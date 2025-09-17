/**
 * L2 Performance Analysis Tool
 * Analyzes performance patterns and problems
 */

import { executeL1GetReport } from './l1-get-report.js';
import { executeL1Collect } from './l1-collect-single.js';
import { detectPatterns } from '../analyzers/patterns.js';
import { detectProblems } from '../analyzers/problems.js';
import { extractMetrics } from '../core/metrics.js';
import type { LighthouseReport } from '../types/index.js';

export interface L2PerformanceAnalysisParams {
  reportId?: string;
  url?: string;
  device?: 'mobile' | 'desktop';
  categories?: string[];
  gather?: boolean;
}

export interface L2PerformanceAnalysisResult {
  reportId: string;
  metrics: {
    lcp?: number;
    fcp?: number;
    cls?: number;
    tbt?: number;
    ttfb?: number;
    tti?: number;
    si?: number;
  };
  score: number;
  problems: Array<{
    id: string;
    category: string;
    severity: string;
    impact: number;
    weightShare: number;
    scorePenalty: number;
    description: string;
  }>;
  patterns: Array<{
    id: string;
    name: string;
    confidence: number;
    indicators: string[];
    recommendations: string[];
  }>;
  recommendations: string[];
}

export const l2PerformanceAnalysisTool = {
  name: 'l2_performance_analysis',
  description: 'Analyze performance patterns and problems (Layer 2)',
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
      gather: {
        type: 'boolean',
        default: false,
        description: 'Force fresh data collection',
      },
    },
  },
};

export async function executeL2PerformanceAnalysis(params: L2PerformanceAnalysisParams): Promise<L2PerformanceAnalysisResult> {
  let reportId = params.reportId;
  let report: LighthouseReport;

  // Get report data
  if (reportId) {
    const result = await executeL1GetReport({ reportId });
    report = result.data;
  } else if (params.url) {
    // Collect data first
    const collectResult = await executeL1Collect({
      url: params.url,
      device: params.device || 'mobile',
      categories: params.categories || ['performance'],
      gather: params.gather || false,
    });
    reportId = collectResult.reportId;
    
    const result = await executeL1GetReport({ reportId });
    report = result.data;
  } else {
    throw new Error('Either reportId or url is required');
  }

  // Extract metrics
  const metrics = extractMetrics(report);

  // Detect problems
  const problems = detectProblems(report);
  const roundTo2 = (value: number) => Math.round(value * 100) / 100;

  // Detect patterns
  const patterns = detectPatterns(report);

  // Calculate score
  const score = report.categories?.performance?.score || 0;

  // Generate recommendations
  const recommendations: string[] = [];
  
  // High-impact problems
  const highImpactProblems = problems.filter(p => p.severity === 'critical' || p.severity === 'high');
  for (const problem of highImpactProblems.slice(0, 3)) {
    recommendations.push(`Fix ${problem.category}: ${problem.description}`);
  }

  // Pattern-based recommendations
  for (const pattern of patterns.slice(0, 2)) {
    if (pattern.confidence > 0.7) {
      recommendations.push(...pattern.recommendations.slice(0, 1));
    }
  }

  return {
    reportId: reportId!,
    metrics,
    score: Math.round(score * 100),
    problems: problems.map(p => ({
      id: p.id,
      category: p.category,
      severity: p.severity,
      impact: roundTo2(p.impact),
      weightShare: roundTo2((p.weight ?? 0) * 100),
      scorePenalty: roundTo2(p.weightedImpact ?? 0),
      description: p.description,
    })),
    patterns,
    recommendations: [...new Set(recommendations)].slice(0, 5),
  };
}