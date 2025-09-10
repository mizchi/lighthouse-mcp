import type { LighthouseReport, CriticalChainDetails, ChainNode, AuditDetailsItem, AuditDetailsWithItems } from '../types';

export interface CriticalChainItem {
  url: string;
  transferSize: number;
  startTime: number;
  endTime: number;
  duration: number;
  resourceType: string;
}

export interface CriticalChainAnalysis {
  longestChain: CriticalChainItem[];
  totalDuration: number;
  totalTransferSize: number;
  bottleneck?: {
    url: string;
    duration: number;
    impact: string;
  };
}

/**
 * Analyze critical request chains in a Lighthouse report
 */
export function analyzeCriticalChains(report: LighthouseReport): CriticalChainAnalysis {
  const chains: CriticalChainItem[] = [];
  
  // Extract critical request chains from the report
  const criticalChainAudit = report.audits?.['critical-request-chains'];
  const networkAudit = report.audits?.['network-requests'];
  const networkDetails = networkAudit?.details as AuditDetailsWithItems | undefined;
  const networkRecords = networkDetails?.items || [];
  
  const criticalDetails = criticalChainAudit?.details as CriticalChainDetails | undefined;
  if (criticalDetails?.chains) {
    // Process the critical chains
    const chainsData = criticalDetails.chains;
    
    for (const [, chain] of Object.entries(chainsData)) {
      processChain(chain, chains, networkRecords);
    }
  }
  
  // Find the longest chain
  const longestChain = findLongestPath(chains);
  
  // Calculate totals
  const totalDuration = longestChain.reduce((sum, item) => sum + item.duration, 0);
  const totalTransferSize = longestChain.reduce((sum, item) => sum + item.transferSize, 0);
  
  // Identify bottleneck
  const bottleneck = longestChain.length > 0 
    ? {
        url: longestChain[0].url,
        duration: longestChain[0].duration,
        impact: calculateImpact(longestChain[0].duration, totalDuration)
      }
    : undefined;
  
  return {
    longestChain,
    totalDuration,
    totalTransferSize,
    bottleneck
  };
}

function processChain(chain: ChainNode, result: CriticalChainItem[], networkRecords: AuditDetailsItem[]): void {
  if (chain.request) {
    const networkRecord = networkRecords.find(r => r.url === chain.request.url);
    
    result.push({
      url: chain.request.url,
      transferSize: chain.request.transferSize || 0,
      startTime: chain.request.startTime || 0,
      endTime: chain.request.endTime || 0,
      duration: (chain.request.endTime || 0) - (chain.request.startTime || 0),
      resourceType: (networkRecord?.['resourceType'] as string) || 'Other'
    });
  }
  
  if (chain.children) {
    for (const child of Object.values(chain.children)) {
      processChain(child, result, networkRecords);
    }
  }
}

function findLongestPath(chains: CriticalChainItem[]): CriticalChainItem[] {
  // Simple heuristic: return chains sorted by duration
  return chains.sort((a, b) => b.duration - a.duration).slice(0, 5);
}

function calculateImpact(duration: number, total: number): string {
  const percentage = (duration / total) * 100;
  if (percentage > 50) return 'Critical';
  if (percentage > 30) return 'High';
  if (percentage > 10) return 'Medium';
  return 'Low';
}