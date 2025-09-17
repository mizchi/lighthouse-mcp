import type { LighthouseReport, Problem } from '../types';
import { analyzeReport, type ScoreAnalysis } from './scores';
import { detectProblems } from './problems';
import { detectPatterns } from './patterns';
import { analyzeCriticalChains, type CriticalChainAnalysis } from './criticalChain';
import { analyzeUnusedCode, type UnusedCodeAnalysis } from './unusedCode';
import { extractMetrics as getMetricsFromReport } from '../core/metrics';

export interface DeepAnalysisResult {
  url: string;
  timestamp: string;
  scoreAnalysis: ScoreAnalysis;
  problems: Problem[];
  patterns: ReturnType<typeof detectPatterns>;
  criticalChains: CriticalChainAnalysis;
  unusedCode: UnusedCodeAnalysis;
  metrics: {
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
    fcp?: number;
    tbt?: number;
    si?: number;
  };
  recommendations: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    description: string;
    impact: string;
  }[];
}

/**
 * Perform deep analysis of a Lighthouse report
 */
export function performDeepAnalysis(report: LighthouseReport): DeepAnalysisResult {
  const url = report.finalUrl || report.requestedUrl;
  const timestamp = report.fetchTime || new Date().toISOString();
  
  // Basic analyses
  const scoreAnalysis = analyzeReport(report);
  const problems = detectProblems(report);
  const patterns = detectPatterns(report);
  const criticalChains = analyzeCriticalChains(report) ?? createEmptyCriticalChainAnalysis();
  const unusedCode = analyzeUnusedCode(report);
  
  // Extract core web vitals and metrics
  const metrics = getMetricsFromReport(report);
  
  // Generate prioritized recommendations
  const recommendations = generateRecommendations(
    problems,
    patterns,
    criticalChains,
    unusedCode,
    metrics
  );
  
  return {
    url,
    timestamp,
    scoreAnalysis,
    problems,
    patterns,
    criticalChains,
    unusedCode,
    metrics,
    recommendations
  };
}


function generateRecommendations(
  _problems: Problem[],
  patterns: ReturnType<typeof detectPatterns>,
  criticalChains: CriticalChainAnalysis,
  unusedCode: UnusedCodeAnalysis,
  metrics: DeepAnalysisResult['metrics']
): DeepAnalysisResult['recommendations'] {
  const recommendations: DeepAnalysisResult['recommendations'] = [];
  
  // Critical performance issues
  if (metrics.lcp && metrics.lcp > 4000) {
    recommendations.push({
      priority: 'critical',
      category: 'Core Web Vitals',
      description: 'Largest Contentful Paint is failing (>4s)',
      impact: 'Users perceive your site as very slow. This directly impacts user experience and SEO rankings.'
    });
  }
  
  if (metrics.cls && metrics.cls > 0.25) {
    recommendations.push({
      priority: 'critical',
      category: 'Core Web Vitals',
      description: 'Cumulative Layout Shift is poor (>0.25)',
      impact: 'Visual instability frustrates users and leads to mis-clicks.'
    });
  }
  
  // Critical chain analysis
  if (criticalChains.bottleneck && criticalChains.bottleneck.impact === 'Critical') {
    recommendations.push({
      priority: 'high',
      category: 'Network',
      description: `Critical request chain bottleneck: ${criticalChains.bottleneck.url}`,
      impact: `This resource blocks rendering for ${Math.round(criticalChains.bottleneck.duration)}ms`
    });
  }
  
  // Unused code analysis
  if (unusedCode.unusedPercent > 50) {
    recommendations.push({
      priority: 'high',
      category: 'Bundle Size',
      description: `${Math.round(unusedCode.unusedPercent)}% of code is unused`,
      impact: `Removing unused code could save ${Math.round(unusedCode.totalUnusedBytes / 1024)}KB`
    });
  }
  
  // Add unused code specific recommendations
  const unusedCodeRecs = unusedCode.recommendations || [];
  for (const rec of unusedCodeRecs.slice(0, 3)) {
    recommendations.push({
      priority: 'medium',
      category: 'Code Optimization',
      description: rec,
      impact: 'Reduces download size and parse time'
    });
  }
  
  // Pattern-based recommendations
  for (const pattern of patterns.slice(0, 3)) {
    if (pattern.confidence > 0.7) {
      recommendations.push({
        priority: 'medium',
        category: 'Performance Pattern',
        description: pattern.name,
        impact: pattern.recommendations[0] || 'Optimization opportunity detected'
      });
    }
  }
  
  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return recommendations;
}

function createEmptyCriticalChainAnalysis(): CriticalChainAnalysis {
  return {
    chains: [],
    longestChain: {
      id: 'empty',
      nodes: [],
      startTime: 0,
      endTime: 0,
      totalDuration: 0,
      totalTransferSize: 0,
    },
    totalDuration: 0,
    totalTransferSize: 0,
    bottleneck: undefined,
    lcp: undefined,
  };
}
