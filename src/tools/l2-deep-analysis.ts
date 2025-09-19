/**
 * L2 Deep Analysis Tool
 * Comprehensive deep analysis of Lighthouse report
 */

import { loadReport } from './utils/report-loader.js';
import { performDeepAnalysis } from '../analyzers/deepAnalysis.js';
import { analyzeCriticalChains } from '../analyzers/criticalChain.js';
import { analyzeUnusedCode } from '../analyzers/unusedCode.js';

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

import type { MCPTool } from '../types/mcp-types.js';

export const l2DeepAnalysisTool: MCPTool = {
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
  execute: async (params) => {
    const result = await executeL2DeepAnalysis(params);

    // Format output as markdown
    let output = `# Deep Analysis Report\n\n`;
    output += `**URL:** ${result.reportId || 'Unknown'}\n`;
    output += `**Performance Score:** ${result.analysis.score}/100\n\n`;

    output += `## Key Metrics\n`;
    output += `- **LCP:** ${result.analysis.metrics.lcp}ms\n`;
    output += `- **FCP:** ${result.analysis.metrics.fcp}ms\n`;
    output += `- **CLS:** ${result.analysis.metrics.cls}\n`;
    output += `- **TBT:** ${result.analysis.metrics.tbt}ms\n\n`;

    if (result.analysis.problems.length > 0) {
      output += `## Problems Found\n`;
      result.analysis.problems.forEach(p => {
        output += `- **${p.title}** (Impact: ${p.impact}): ${p.savings || ''}\n`;
      });
      output += '\n';
    }

    if (result.analysis.recommendations.length > 0) {
      output += `## Recommendations\n`;
      result.analysis.recommendations.forEach(r => {
        output += `- ${r}\n`;
      });
    }

    return {
      type: 'text',
      text: output
    };
  }
};

export async function executeL2DeepAnalysis(params: L2DeepAnalysisParams): Promise<L2DeepAnalysisResult> {
  // Load report using common utility
  const { report, reportId } = await loadReport({
    reportId: params.reportId,
    url: params.url,
    report: params.report,
    device: params.device,
    categories: params.categories || ['performance'],
    gather: false,
  });

  // Perform deep analysis
  const analysis = performDeepAnalysis(report);
  
  // Add optional analyses
  if (params.includeChains) {
    const chainAnalysis = analyzeCriticalChains(report);
    if (chainAnalysis) {
      analysis.criticalChains = chainAnalysis;
    }
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