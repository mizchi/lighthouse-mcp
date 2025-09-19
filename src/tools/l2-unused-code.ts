/**
 * L2 Unused Code Analysis Tool
 * Analyzes unused CSS and JavaScript
 */

import { analyzeUnusedCode } from '../analyzers/unusedCode.js';
import { loadReport } from './utils/report-loader.js';
import type { LighthouseReport } from '../types/index.js';

export interface L2UnusedCodeParams {
  reportId?: string;
  url?: string;
  report?: LighthouseReport; // Direct report input
  device?: 'mobile' | 'desktop';
  threshold?: number;
}

export interface L2UnusedCodeResult {
  reportId: string;
  unusedCode: {
    totalWastedBytes: number;
    totalWastedMs: number;
    files: Array<{
      url: string;
      wastedBytes: number;
      wastedPercent: number;
      totalBytes: number;
      type: 'css' | 'js';
    }>;
    recommendations: string[];
  };
}

export const l2UnusedCodeTool = {
  name: 'l2_unused_code',
  description: 'Analyze unused CSS and JavaScript (Layer 2)',
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
      threshold: {
        type: 'number',
        default: 1024,
        description: 'Minimum wasted bytes to report',
      },
    },
  },
  execute: async (params: any) => {
    const result = await executeL2UnusedCode(params);
    return {
      type: 'text',
      text: JSON.stringify(result, null, 2)
    };
  }
};

export async function executeL2UnusedCode(params: L2UnusedCodeParams): Promise<L2UnusedCodeResult> {
  // Load report using common utility
  const { report, reportId } = await loadReport({
    reportId: params.reportId,
    url: params.url,
    report: params.report,
    device: params.device,
    categories: ['performance'],
    gather: false,
  });

  // Analyze unused code
  const unusedCodeAnalysis = analyzeUnusedCode(report);

  if (!unusedCodeAnalysis) {
    return {
      reportId,
      unusedCode: {
        totalWastedBytes: 0,
        totalWastedMs: 0,
        files: [],
        recommendations: ['No significant unused code detected'],
      },
    };
  }

  return {
    reportId,
    unusedCode: {
      totalWastedBytes: unusedCodeAnalysis.totalWastedBytes,
      totalWastedMs: 0, // Not available in current analysis
      files: unusedCodeAnalysis.items.map((item: any) => ({
        url: item.url,
        wastedBytes: item.unusedBytes,
        wastedPercent: item.unusedPercent,
        totalBytes: item.totalBytes,
        type: item.type,
      })),
      recommendations: unusedCodeAnalysis.recommendations,
    },
  };
}