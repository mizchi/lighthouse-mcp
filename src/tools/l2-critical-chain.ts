/**
 * L2 Critical Chain Analysis Tool
 * Analyzes critical request chains
 */

import { executeL1GetReport } from './l1-get-report.js';
import { executeL1Collect } from './l1-collect-single.js';
import { analyzeCriticalChains } from '../analyzers/criticalChain.js';
import type { LighthouseReport } from '../types/index.js';

export interface L2CriticalChainParams {
  reportId?: string;
  url?: string;
  device?: 'mobile' | 'desktop';
  maxDepth?: number;
}

export interface L2CriticalChainResult {
  reportId: string;
  criticalChain: {
    longestChain: {
      duration: number;
      length: number;
      transferSize: number;
    };
    chains: Array<{
      url: string;
      duration: number;
      depth: number;
      transferSize: number;
      isRenderBlocking: boolean;
    }>;
    recommendations: string[];
  };
}

export const l2CriticalChainTool = {
  name: 'l2_critical_chain',
  description: 'Analyze critical request chains (Layer 2)',
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
      maxDepth: {
        type: 'number',
        default: 10,
        description: 'Maximum chain depth to analyze',
      },
    },
  },
};

export async function executeL2CriticalChain(params: L2CriticalChainParams): Promise<L2CriticalChainResult> {
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
      categories: ['performance'],
      gather: false,
    });
    reportId = collectResult.reportId;
    
    const result = await executeL1GetReport({ reportId });
    report = result.data;
  } else {
    throw new Error('Either reportId or url is required');
  }

  // Analyze critical chains
  const chainAnalysis = analyzeCriticalChains(report);

  if (!chainAnalysis) {
    return {
      reportId: reportId!,
      criticalChain: {
        longestChain: {
          duration: 0,
          length: 0,
          transferSize: 0,
        },
        chains: [],
        recommendations: ['No critical chains detected'],
      },
    };
  }

  // Format the result to match expected interface
  const formattedResult: L2CriticalChainResult = {
    reportId: reportId!,
    criticalChain: {
      longestChain: {
        duration: chainAnalysis.totalDuration,
        length: chainAnalysis.longestChain.length,
        transferSize: chainAnalysis.totalTransferSize,
      },
      chains: chainAnalysis.longestChain.map((c, index) => ({
        url: c.url,
        duration: c.duration,
        depth: index,
        transferSize: c.transferSize,
        isRenderBlocking: c.resourceType === 'document' || c.resourceType === 'stylesheet',
      })),
      recommendations: [
        chainAnalysis.bottleneck ? `Optimize ${chainAnalysis.bottleneck.url}: ${chainAnalysis.bottleneck.impact}` : '',
        chainAnalysis.totalDuration > 1000 ? 'Reduce critical chain duration' : '',
        chainAnalysis.longestChain.length > 3 ? 'Reduce chain depth' : '',
      ].filter(Boolean),
    },
  };

  return formattedResult;
}