import type { LighthouseReport, CriticalChainDetails, ChainNode } from '../types';
import { executeL1GetReport } from './l1-get-report';

export interface LCPChainNode {
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
  transferSize: number;
  depth: number;
  resourceType?: string;
  isOnLCPPath: boolean;
}

export interface LCPChainAnalysis {
  lcpElement?: {
    selector: string;
    url?: string;
    nodeLabel?: string;
  };
  lcpTime: number;
  criticalPath: LCPChainNode[];
  chainDepth: number;
  totalDuration: number;
  totalTransferSize: number;
  bottlenecks: {
    url: string;
    duration: number;
    impact: 'critical' | 'high' | 'medium' | 'low';
    reason: string;
  }[];
  optimizationOpportunities: {
    type: 'preload' | 'prefetch' | 'inline' | 'defer' | 'async' | 'remove';
    resource: string;
    potentialSaving: number;
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
  }[];
}

export interface L2LCPChainAnalysisParams {
  reportId?: string;
  url?: string;
}

export interface L2LCPChainAnalysisResult {
  analysis: LCPChainAnalysis;
  summary: string;
  criticalFindings: string[];
  recommendations: string[];
}

function findLCPResource(report: LighthouseReport): string | undefined {
  const lcpElement = report.audits?.['largest-contentful-paint-element'];
  const items = (lcpElement?.details as any)?.items || [];

  if (items.length > 0) {
    // First check if URL is directly provided
    if (items[0].url) {
      return items[0].url;
    }
    // Otherwise try to extract from snippet
    if (items[0].node?.snippet) {
      const snippet = items[0].node.snippet;
      // Extract src or background-image URL from the element
      const srcMatch = snippet.match(/src=["']([^"']+)["']/);
      const bgMatch = snippet.match(/url\(["']?([^"')]+)["']?\)/);

      if (srcMatch?.[1]) {
        // Convert relative path to full URL if needed
        const url = srcMatch[1];
        if (url.startsWith('/')) {
          // Get base URL from the report
          const baseUrl = report.finalUrl || report.requestedUrl;
          if (baseUrl) {
            const urlObj = new URL(baseUrl);
            return `${urlObj.origin}${url}`;
          }
        }
        return url;
      }

      if (bgMatch?.[1]) {
        const url = bgMatch[1];
        if (url.startsWith('/')) {
          const baseUrl = report.finalUrl || report.requestedUrl;
          if (baseUrl) {
            const urlObj = new URL(baseUrl);
            return `${urlObj.origin}${url}`;
          }
        }
        return url;
      }
    }
  }

  return undefined;
}

function buildCriticalPath(
  chains: Record<string, ChainNode>,
  networkRequests: any[],
  lcpResourceUrl?: string
): LCPChainNode[] {
  const path: LCPChainNode[] = [];
  const visited = new Set<string>();

  // Build a map of URL to network request details
  const networkMap = new Map<string, any>();
  networkRequests.forEach(req => {
    networkMap.set(req.url, req);
  });

  function traverseChain(
    _chainId: string,
    node: ChainNode,
    depth: number = 0,
    isOnPath: boolean = false
  ): boolean {
    if (!node || !node.request) return false;
    if (visited.has(node.request.url)) return false;
    visited.add(node.request.url);

    const networkReq = networkMap.get(node.request.url);
    const duration = (node.request.endTime - node.request.startTime) * 1000;

    // Check if this node or its children lead to LCP resource
    let leadsToLCP = false;
    let childrenLeadToLCP = false;

    // First check children to determine if they lead to LCP
    if (node.children) {
      for (const childId in node.children) {
        if (traverseChain(childId, node.children[childId], depth + 1, isOnPath || leadsToLCP)) {
          childrenLeadToLCP = true;
        }
      }
    }

    if (lcpResourceUrl) {
      if (node.request.url === lcpResourceUrl) {
        leadsToLCP = true;
        isOnPath = true;
      } else if (childrenLeadToLCP) {
        leadsToLCP = true;
        isOnPath = true;
      }
    }

    // Add node to path if it's on the LCP path or if we're collecting all nodes
    if (isOnPath || !lcpResourceUrl) {
      path.push({
        url: node.request.url,
        startTime: node.request.startTime * 1000,
        endTime: node.request.endTime * 1000,
        duration,
        transferSize: node.request.transferSize || 0,
        depth,
        resourceType: networkReq?.resourceType,
        isOnLCPPath: isOnPath
      });
    }

    return leadsToLCP;
  }

  // Start traversal from root chains
  for (const chainId in chains) {
    traverseChain(chainId, chains[chainId], 0, false);
  }

  // Sort by start time
  return path.sort((a, b) => a.startTime - b.startTime);
}

function identifyBottlenecks(path: LCPChainNode[]): LCPChainAnalysis['bottlenecks'] {
  const bottlenecks: LCPChainAnalysis['bottlenecks'] = [];

  path.forEach(node => {
    let impact: 'critical' | 'high' | 'medium' | 'low' = 'low';
    let reason = '';

    // Check duration
    if (node.duration > 2000) {
      impact = 'critical';
      reason = 'Extremely long load time';
    } else if (node.duration > 1000) {
      impact = 'high';
      reason = 'Long load time';
    } else if (node.duration > 500) {
      impact = 'medium';
      reason = 'Moderate load time';
    }

    // Check transfer size
    if (node.transferSize > 500000) {
      impact = impact === 'critical' ? 'critical' : 'high';
      reason = reason ? `${reason}, Large resource size` : 'Large resource size';
    }

    // Check depth in chain
    if (node.depth > 5) {
      impact = impact === 'low' ? 'medium' : impact;
      reason = reason ? `${reason}, Deep in request chain` : 'Deep in request chain';
    }

    if (impact !== 'low') {
      bottlenecks.push({
        url: node.url,
        duration: node.duration,
        impact,
        reason
      });
    }
  });

  return bottlenecks.sort((a, b) => {
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });
}

function generateOptimizations(
  path: LCPChainNode[],
  lcpResourceUrl?: string
): LCPChainAnalysis['optimizationOpportunities'] {
  const opportunities: LCPChainAnalysis['optimizationOpportunities'] = [];

  // Check for LCP image preload opportunity
  if (lcpResourceUrl) {
    const lcpNode = path.find(n => n.url === lcpResourceUrl);
    if (lcpNode) {
      // Always recommend preloading the LCP image if it's loaded late
      if (lcpNode.startTime > 1000) {
        opportunities.push({
          type: 'preload',
          resource: lcpResourceUrl,
          potentialSaving: Math.max(lcpNode.startTime - 500, 1000),
          priority: 'high',
          recommendation: `Add <link rel="preload" as="image" href="${lcpResourceUrl}"> to document head`
        });
      }
    } else if (path.length > 0) {
      // If we couldn't find the exact LCP resource, but it exists, recommend preloading it
      opportunities.push({
        type: 'preload',
        resource: lcpResourceUrl,
        potentialSaving: 2000,
        priority: 'high',
        recommendation: `Add <link rel="preload" as="image" href="${lcpResourceUrl}"> to document head`
      });
    }
  }

  // Check for render-blocking resources
  path.forEach(node => {
    if (node.resourceType === 'Stylesheet' && node.depth <= 1) {
      opportunities.push({
        type: 'inline',
        resource: node.url,
        potentialSaving: node.duration * 0.5,
        priority: 'medium',
        recommendation: `Consider inlining critical CSS from ${node.url}`
      });
    }

    if (node.resourceType === 'Script' && node.depth < 3) {
      // Recommend deferring scripts that are not on the LCP path
      if (!node.isOnLCPPath || node.url.includes('config') || node.url.includes('loader')) {
        opportunities.push({
          type: 'defer',
          resource: node.url,
          potentialSaving: node.duration * 0.3,
          priority: 'medium',
          recommendation: `Add defer attribute to ${node.url} if not critical`
        });
      }
    }

    // Check for long chains
    if (node.depth > 4) {
      opportunities.push({
        type: 'prefetch',
        resource: node.url,
        potentialSaving: node.duration * 0.2,
        priority: 'low',
        recommendation: `Consider prefetching ${node.url} to reduce chain depth`
      });
    }
  });

  return opportunities.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function analyzeLCPChain(report: LighthouseReport): LCPChainAnalysis {
  const lcpAudit = report.audits?.['largest-contentful-paint'];
  const lcpElementAudit = report.audits?.['largest-contentful-paint-element'];
  const criticalChainAudit = report.audits?.['critical-request-chains'];
  const networkAudit = report.audits?.['network-requests'];

  const lcpTime = lcpAudit?.numericValue || 0;
  const lcpItems = (lcpElementAudit?.details as any)?.items || [];
  const lcpElement = lcpItems[0]?.node ? {
    selector: lcpItems[0].node.selector,
    url: lcpItems[0].url || findLCPResource(report),
    nodeLabel: lcpItems[0].node.nodeLabel
  } : undefined;

  const chains = (criticalChainAudit?.details as CriticalChainDetails)?.chains || {};
  const networkRequests = (networkAudit?.details as any)?.items || [];

  const lcpResourceUrl = findLCPResource(report);
  const criticalPath = buildCriticalPath(chains, networkRequests, lcpResourceUrl);

  const chainDepth = Math.max(...criticalPath.map(n => n.depth), 0);
  const totalDuration = criticalPath.reduce((sum, n) => Math.max(sum, n.endTime), 0);
  const totalTransferSize = criticalPath.reduce((sum, n) => sum + n.transferSize, 0);

  const bottlenecks = identifyBottlenecks(criticalPath);
  const optimizationOpportunities = generateOptimizations(criticalPath, lcpResourceUrl);

  return {
    lcpElement,
    lcpTime,
    criticalPath,
    chainDepth,
    totalDuration,
    totalTransferSize,
    bottlenecks,
    optimizationOpportunities
  };
}

export async function executeL2LCPChainAnalysis(
  params: L2LCPChainAnalysisParams
): Promise<L2LCPChainAnalysisResult> {
  let report: LighthouseReport;

  if (params.reportId) {
    const result = await executeL1GetReport({ reportId: params.reportId });
    report = result.data;
  } else if (params.url) {
    // For testing with mock data
    throw new Error('Direct URL analysis not implemented. Use reportId instead.');
  } else {
    throw new Error('Either reportId or url is required');
  }

  const analysis = analyzeLCPChain(report);

  // Generate summary
  const summary = `LCP: ${(analysis.lcpTime / 1000).toFixed(1)}s, Chain depth: ${analysis.chainDepth}, ` +
    `Critical path duration: ${(analysis.totalDuration / 1000).toFixed(1)}s, ` +
    `${analysis.bottlenecks.filter(b => b.impact === 'critical').length} critical bottlenecks`;

  // Generate critical findings
  const criticalFindings: string[] = [];

  if (analysis.lcpTime > 4000) {
    criticalFindings.push(`LCP is ${(analysis.lcpTime / 1000).toFixed(1)}s (should be < 2.5s)`);
  }

  if (analysis.chainDepth > 5) {
    criticalFindings.push(`Critical chain depth is ${analysis.chainDepth} (should be < 5)`);
  }

  analysis.bottlenecks
    .filter(b => b.impact === 'critical')
    .forEach(b => {
      criticalFindings.push(`${b.url}: ${b.reason} (${(b.duration / 1000).toFixed(1)}s)`);
    });

  // Generate recommendations
  const recommendations: string[] = [];

  analysis.optimizationOpportunities
    .filter(o => o.priority === 'high')
    .forEach(o => {
      recommendations.push(o.recommendation);
    });

  if (analysis.lcpElement?.url && !recommendations.some(r => r.includes('preload'))) {
    recommendations.push(`Consider preloading the LCP image: ${analysis.lcpElement.url}`);
  }

  if (analysis.chainDepth > 3) {
    recommendations.push('Reduce request chain depth by bundling or inlining critical resources');
  }

  return {
    analysis,
    summary,
    criticalFindings,
    recommendations
  };
}

// MCP Tool definition
export const l2LCPChainAnalysisTool = {
  name: 'l2_lcp_chain_analysis',
  description: 'Analyze LCP critical request chains and identify bottlenecks (Layer 2)',
  inputSchema: {
    type: 'object',
    properties: {
      reportId: {
        type: 'string',
        description: 'ID of the report to analyze'
      },
      url: {
        type: 'string',
        description: 'URL (for testing with mock data)'
      }
    },
    oneOf: [
      { required: ['reportId'] },
      { required: ['url'] }
    ]
  },
  execute: async (params: L2LCPChainAnalysisParams) => {
    const result = await executeL2LCPChainAnalysis(params);

    // Format output for MCP
    let output = `# LCP Critical Chain Analysis\n\n`;
    output += `## Summary\n${result.summary}\n\n`;

    if (result.criticalFindings.length > 0) {
      output += `## 🔴 Critical Findings\n`;
      result.criticalFindings.forEach(finding => {
        output += `- ${finding}\n`;
      });
      output += `\n`;
    }

    const analysis = result.analysis;

    output += `## LCP Element\n`;
    if (analysis.lcpElement) {
      output += `- Selector: ${analysis.lcpElement.selector}\n`;
      if (analysis.lcpElement.url) {
        output += `- Resource URL: ${analysis.lcpElement.url}\n`;
      }
      output += `- LCP Time: ${(analysis.lcpTime / 1000).toFixed(1)}s\n`;
    } else {
      output += `No LCP element identified\n`;
    }
    output += `\n`;

    output += `## Critical Path Metrics\n`;
    output += `- Chain Depth: ${analysis.chainDepth}\n`;
    output += `- Total Duration: ${(analysis.totalDuration / 1000).toFixed(1)}s\n`;
    output += `- Total Transfer Size: ${(analysis.totalTransferSize / 1024).toFixed(0)}KB\n\n`;

    if (analysis.bottlenecks.length > 0) {
      output += `## Bottlenecks\n`;
      analysis.bottlenecks.forEach(bottleneck => {
        const emoji = bottleneck.impact === 'critical' ? '🔴' :
                      bottleneck.impact === 'high' ? '🟠' :
                      bottleneck.impact === 'medium' ? '🟡' : '⚪';
        output += `${emoji} **${bottleneck.url}**\n`;
        output += `  - Duration: ${(bottleneck.duration / 1000).toFixed(1)}s\n`;
        output += `  - Impact: ${bottleneck.impact}\n`;
        output += `  - Reason: ${bottleneck.reason}\n`;
      });
      output += `\n`;
    }

    if (analysis.optimizationOpportunities.length > 0) {
      output += `## Optimization Opportunities\n`;
      const highPriority = analysis.optimizationOpportunities.filter(o => o.priority === 'high');
      const mediumPriority = analysis.optimizationOpportunities.filter(o => o.priority === 'medium');
      const lowPriority = analysis.optimizationOpportunities.filter(o => o.priority === 'low');

      if (highPriority.length > 0) {
        output += `### High Priority\n`;
        highPriority.forEach(opt => {
          output += `- **${opt.type.toUpperCase()}**: ${opt.recommendation}\n`;
          output += `  - Potential saving: ${(opt.potentialSaving / 1000).toFixed(1)}s\n`;
        });
      }

      if (mediumPriority.length > 0) {
        output += `### Medium Priority\n`;
        mediumPriority.forEach(opt => {
          output += `- **${opt.type.toUpperCase()}**: ${opt.recommendation}\n`;
        });
      }

      if (lowPriority.length > 0) {
        output += `### Low Priority\n`;
        lowPriority.forEach(opt => {
          output += `- **${opt.type.toUpperCase()}**: ${opt.recommendation}\n`;
        });
      }
      output += `\n`;
    }

    if (result.recommendations.length > 0) {
      output += `## Recommendations\n`;
      result.recommendations.forEach((rec, i) => {
        output += `${i + 1}. ${rec}\n`;
      });
    }

    return {
      type: 'text',
      text: output
    };
  }
};

// Export for testing
export { analyzeLCPChain };