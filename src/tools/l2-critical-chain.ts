/**
 * L2 Critical Chain Analysis Tool
 * Analyzes critical request chains
 */

import { loadReport } from './utils/report-loader.js';
import { analyzeCriticalChains } from '../analyzers/criticalChain.js';
import type { ChainBottleneck, LcpInsight } from '../analyzers/criticalChain.js';

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
      latency: number;
      downloadTime: number;
      contribution: number;
      startOffset: number;
    }>;
    bottleneck?: ChainBottleneck;
    lcp?: Pick<LcpInsight, 'timestamp' | 'candidateUrl' | 'durationToLcp' | 'bottleneck'> & {
      chainLength: number;
    };
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
  execute: async (params: any) => {
    const result = await executeL2CriticalChain(params);
    return {
      type: 'text',
      text: JSON.stringify(result, null, 2)
    };
  }
};

export async function executeL2CriticalChain(params: L2CriticalChainParams): Promise<L2CriticalChainResult> {
  // Load report using common utility
  const { report, reportId } = await loadReport({
    reportId: params.reportId,
    url: params.url,
    device: params.device,
    categories: ['performance'],
    gather: false,
  });

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

  const longestChainNodes = chainAnalysis.longestChain.nodes;

  const formattedResult: L2CriticalChainResult = {
    reportId: reportId!,
    criticalChain: {
      longestChain: {
        duration: Math.round(chainAnalysis.totalDuration),
        length: longestChainNodes.length,
        transferSize: chainAnalysis.totalTransferSize,
      },
      chains: longestChainNodes.map((node, index) => ({
        url: node.url,
        duration: node.duration,
        depth: index,
        transferSize: node.transferSize,
        isRenderBlocking: node.resourceType === 'document' || node.resourceType === 'stylesheet',
        latency: node.latency,
        downloadTime: node.downloadTime,
        contribution: node.contribution,
        startOffset: node.startOffset,
      })),
      bottleneck: chainAnalysis.bottleneck,
      lcp: chainAnalysis.lcp
        ? {
            timestamp: chainAnalysis.lcp.timestamp,
            candidateUrl: chainAnalysis.lcp.candidateUrl,
            durationToLcp: chainAnalysis.lcp.durationToLcp,
            bottleneck: chainAnalysis.lcp.bottleneck,
            chainLength: chainAnalysis.lcp.nodes.length,
          }
        : undefined,
      recommendations: buildRecommendations(chainAnalysis),
    },
  };

  return formattedResult;
}

function buildRecommendations(analysis: NonNullable<ReturnType<typeof analyzeCriticalChains>>): string[] {
  const recommendations: string[] = [];

  if (analysis.lcp?.bottleneck) {
    const pct = (analysis.lcp.bottleneck.contribution * 100).toFixed(1);
    recommendations.push(
      `Investigate ${analysis.lcp.bottleneck.url}: responsible for ${pct}% of time to LCP`
    );
  } else if (analysis.bottleneck) {
    const pct = (analysis.bottleneck.contribution * 100).toFixed(1);
    recommendations.push(
      `Optimize ${analysis.bottleneck.url}: controls ${pct}% of critical chain time`
    );
  }

  if (analysis.totalDuration > 1500) {
    recommendations.push(
      `Reduce critical chain duration (current ${Math.round(analysis.totalDuration)}ms)`
    );
  }

  if (analysis.longestChain.nodes.length > 3) {
    recommendations.push(
      `Reduce chain depth (currently ${analysis.longestChain.nodes.length} requests)`
    );
  }

  if (analysis.totalTransferSize > 200 * 1024) {
    recommendations.push(
      `Trim critical payload (~${Math.round(analysis.totalTransferSize / 1024)}KB before render)`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Critical request chain is within healthy thresholds');
  }

  return recommendations;
}
