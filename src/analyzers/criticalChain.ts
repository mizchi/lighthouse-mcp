import type {
  LighthouseReport,
  CriticalChainDetails,
  ChainNode,
  AuditDetailsItem,
  AuditDetailsWithItems,
} from "../types";

export interface CriticalChainItem {
  url: string;
  transferSize: number;
  startTime: number;
  endTime: number;
  duration: number;
  resourceType: string;
  latency: number;
  downloadTime: number;
  startOffset: number;
  depth: number;
  contribution: number;
}

export interface CriticalChainPath {
  id: string;
  nodes: CriticalChainItem[];
  startTime: number;
  endTime: number;
  totalDuration: number;
  totalTransferSize: number;
}

export interface ChainBottleneck {
  url: string;
  duration: number;
  contribution: number;
  impact: "Critical" | "High" | "Medium" | "Low";
  startTime: number;
  endTime: number;
  reason: string;
}

export interface LcpInsight {
  timestamp: number;
  candidateUrl?: string;
  chainId?: string;
  durationToLcp: number;
  nodes: CriticalChainItem[];
  bottleneck?: ChainBottleneck;
}

export interface CriticalChainAnalysis {
  chains: CriticalChainPath[];
  longestChain: CriticalChainPath;
  totalDuration: number;
  totalTransferSize: number;
  bottleneck?: ChainBottleneck;
  lcp?: LcpInsight;
}

/**
 * Analyze critical request chains in a Lighthouse report. The analysis builds every
 * critical request path, evaluates contribution of each request, and highlights
 * network bottlenecks that delay Largest Contentful Paint.
 */
export function analyzeCriticalChains(report: LighthouseReport): CriticalChainAnalysis | null {
  const criticalChainAudit = report.audits?.["critical-request-chains"];
  const networkAudit = report.audits?.["network-requests"];
  const networkDetails = networkAudit?.details as AuditDetailsWithItems | undefined;
  const networkRecords = networkDetails?.items || [];

  const criticalDetails = criticalChainAudit?.details as CriticalChainDetails | undefined;
  if (!criticalDetails?.chains || Object.keys(criticalDetails.chains).length === 0) {
    return null;
  }

  const paths: CriticalChainPath[] = [];

  for (const [chainId, rootNode] of Object.entries(criticalDetails.chains)) {
    const rootPaths = buildPaths(chainId, rootNode, networkRecords);
    paths.push(...rootPaths);
  }

  if (paths.length === 0) {
    return null;
  }

  const longestChain = paths.reduce((best, current) => {
    if (!best) return current;
    if (current.totalDuration > best.totalDuration) {
      return current;
    }
    if (current.totalDuration === best.totalDuration && current.nodes.length > best.nodes.length) {
      return current;
    }
    return best;
  }, paths[0]);

  const totalDuration = longestChain.totalDuration;
  const totalTransferSize = longestChain.totalTransferSize;

  const lcpInsight = computeLcpInsight(report, paths);

  const generalBottleneck = identifyBottleneck(longestChain.nodes, longestChain.totalDuration);

  return {
    chains: paths,
    longestChain,
    totalDuration,
    totalTransferSize,
    bottleneck: lcpInsight?.bottleneck || generalBottleneck,
    lcp: lcpInsight || undefined,
  };
}

function buildPaths(
  chainId: string,
  node: ChainNode,
  networkRecords: AuditDetailsItem[],
): CriticalChainPath[] {
  const rawPaths = collectPaths(node, networkRecords, 0, []);
  return rawPaths.map(items => finalizePath(chainId, items));
}

interface RawChainItem {
  url: string;
  transferSize: number;
  startTime: number;
  endTime: number;
  responseReceivedTime: number;
  resourceType: string;
  depth: number;
}

function collectPaths(
  node: ChainNode,
  networkRecords: AuditDetailsItem[],
  depth: number,
  current: RawChainItem[],
): RawChainItem[][] {
  if (!node?.request) {
    return current.length > 0 ? [current] : [];
  }

  const request = node.request;
  const networkRecord = networkRecords.find(r => r.url === request.url);

  const rawItem: RawChainItem = {
    url: request.url,
    transferSize: numberOrZero(request.transferSize ?? networkRecord?.transferSize),
    startTime: toMilliseconds(request.startTime),
    endTime: toMilliseconds(request.endTime),
    responseReceivedTime: toMilliseconds(request.responseReceivedTime ?? request.endTime),
    resourceType: (networkRecord?.["resourceType"] as string) || guessResourceType(request.url, depth),
    depth,
  };

  const nextPath = [...current, rawItem];

  if (!node.children || Object.keys(node.children).length === 0) {
    return [nextPath];
  }

  const childPaths: RawChainItem[][] = [];
  for (const child of Object.values(node.children)) {
    childPaths.push(...collectPaths(child, networkRecords, depth + 1, nextPath));
  }
  return childPaths;
}

function finalizePath(chainId: string, items: RawChainItem[]): CriticalChainPath {
  if (items.length === 0) {
    return {
      id: chainId,
      nodes: [],
      startTime: 0,
      endTime: 0,
      totalDuration: 0,
      totalTransferSize: 0,
    };
  }

  const startTime = items[0].startTime;
  const endTime = items[items.length - 1].endTime;
  const totalDuration = Math.max(0, endTime - startTime);
  const totalTransferSize = items.reduce((sum, item) => sum + item.transferSize, 0);

  const nodes: CriticalChainItem[] = items.map((item, index) => {
    const latency = Math.max(0, item.responseReceivedTime - item.startTime);
    const downloadTime = Math.max(0, item.endTime - item.responseReceivedTime);
    const duration = Math.max(0, item.endTime - item.startTime);
    const contribution = totalDuration > 0 ? duration / totalDuration : 0;

    return {
      url: item.url,
      transferSize: item.transferSize,
      startTime: item.startTime,
      endTime: item.endTime,
      duration,
      resourceType: normalizeResourceType(item.resourceType, index),
      latency,
      downloadTime,
      startOffset: item.startTime - startTime,
      depth: item.depth,
      contribution,
    };
  });

  return {
    id: chainId,
    nodes,
    startTime,
    endTime,
    totalDuration,
    totalTransferSize,
  };
}

function computeLcpInsight(report: LighthouseReport, paths: CriticalChainPath[]): LcpInsight | null {
  const lcpAudit = report.audits?.["largest-contentful-paint"];
  const lcpTimestamp = typeof lcpAudit?.numericValue === "number" ? lcpAudit.numericValue : null;
  if (!lcpTimestamp) {
    return null;
  }

  type Match = { path: CriticalChainPath; node: CriticalChainItem; delta: number };
  let bestMatch: Match | null = null;

  for (const path of paths) {
    for (const node of path.nodes) {
      const delta = lcpTimestamp - node.endTime;
      if (delta >= 0) {
        if (!bestMatch || delta < bestMatch.delta) {
          bestMatch = { path, node, delta };
        }
      }
    }
  }

  if (!bestMatch) {
    // Fall back to the request finishing closest after the LCP timestamp
    for (const path of paths) {
      for (const node of path.nodes) {
        const delta = node.endTime - lcpTimestamp;
        if (delta >= 0) {
          if (!bestMatch || delta < bestMatch.delta) {
            bestMatch = { path, node, delta };
          }
        }
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  const nodesUpToLcp = bestMatch.path.nodes.filter(node => node.startTime <= bestMatch.node.endTime);
  if (nodesUpToLcp.length === 0) {
    return null;
  }

  const prefixStart = nodesUpToLcp[0].startTime;
  const prefixEnd = bestMatch.node.endTime;
  const durationToLcp = Math.max(0, prefixEnd - prefixStart);

  const nodesForLcp: CriticalChainItem[] = nodesUpToLcp.map(node => ({
    ...node,
    startOffset: node.startTime - prefixStart,
    contribution: durationToLcp > 0 ? node.duration / durationToLcp : 0,
  }));

  const bottleneck = identifyBottleneck(nodesForLcp, durationToLcp);

  return {
    timestamp: lcpTimestamp,
    candidateUrl: bestMatch.node.url,
    chainId: bestMatch.path.id,
    durationToLcp,
    nodes: nodesForLcp,
    bottleneck: bottleneck || undefined,
  };
}

function identifyBottleneck(nodes: CriticalChainItem[], totalDuration: number): ChainBottleneck | undefined {
  if (!nodes.length || totalDuration <= 0) {
    return undefined;
  }

  let bestNode = nodes[0];
  let bestContribution = nodes[0].duration / totalDuration;

  for (let i = 1; i < nodes.length; i++) {
    const contribution = nodes[i].duration / totalDuration;
    if (contribution > bestContribution) {
      bestNode = nodes[i];
      bestContribution = contribution;
    }
  }

  const impact = classifyImpact(bestContribution);
  const reason = formatBottleneckReason(bestNode, bestContribution, totalDuration);

  return {
    url: bestNode.url,
    duration: bestNode.duration,
    contribution: bestContribution,
    impact,
    startTime: bestNode.startTime,
    endTime: bestNode.endTime,
    reason,
  };
}

function classifyImpact(contribution: number): ChainBottleneck["impact"] {
  const percentage = contribution * 100;
  if (percentage >= 50) return "Critical";
  if (percentage >= 30) return "High";
  if (percentage >= 15) return "Medium";
  return "Low";
}

function formatBottleneckReason(node: CriticalChainItem, contribution: number, totalDuration: number): string {
  const pct = (contribution * 100).toFixed(1);
  const latency = Math.round(node.latency);
  const download = Math.round(node.downloadTime);
  const duration = Math.round(node.duration);
  const total = Math.round(totalDuration);
  return `Consumes ${pct}% of the ${total}ms chain (latency ${latency}ms, download ${download}ms, total ${duration}ms)`;
}

function guessResourceType(url: string, depth: number): string {
  if (depth === 0) {
    return "document";
  }
  const normalized = url.split("?")[0].toLowerCase();
  if (/\.css$/i.test(normalized)) return "stylesheet";
  if (/\.js$/i.test(normalized)) return "script";
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(normalized)) return "image";
  if (/\.(woff2?|ttf|otf)$/i.test(normalized)) return "font";
  return "other";
}

function normalizeResourceType(resourceType: string, index: number): string {
  if (index === 0) {
    return "document";
  }
  const normalized = resourceType?.toLowerCase();
  if (!normalized || normalized === "other") {
    return "other";
  }
  return normalized;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toMilliseconds(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return value * 1000;
}
