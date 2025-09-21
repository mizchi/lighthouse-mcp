import type { LighthouseReport } from '../types';

export interface ProtocolAnalysis {
  http1?: {
    usage: number;
    transferSize: number;
    resources: number;
    domains: string[];
  };
  http2?: {
    usage: number;
    transferSize: number;
    resources: number;
  };
  http3?: {
    usage: number;
    transferSize: number;
    resources: number;
  };
  recommendations: string[];
}

export interface CDNAnalysis {
  usage: number;
  transferSize: number;
  avgLoadTime: number;
  nonCdnAvgLoadTime: number;
  speedImprovement: number;
  recommendations: string[];
}

export interface CachingAnalysis {
  efficiency: number;
  missedOpportunities: Array<{
    url: string;
    currentTTL: number;
    recommendedTTL: number;
    impact: 'low' | 'medium' | 'high';
  }>;
  potentialSavings: number;
  recommendations: string[];
}

export interface ConnectionAnalysis {
  rtt?: number;
  serverLatency?: number;
  preconnectOpportunities: Array<{
    url: string;
    timeSaved: number;
  }>;
  potentialSavings: number;
  recommendations: string[];
}

export interface NetworkHealth {
  score: number;
  rating: 'poor' | 'needs-improvement' | 'good' | 'excellent';
  strengths: string[];
  weaknesses: string[];
}

export interface NetworkPerformanceAnalysis {
  protocols?: ProtocolAnalysis;
  cdn?: CDNAnalysis;
  caching?: CachingAnalysis;
  connections?: ConnectionAnalysis;
  overallHealth?: NetworkHealth;
}

const CDN_PATTERNS = [
  'cdn',
  'cloudflare',
  'cloudfront',
  'akamai',
  'fastly',
  'jsdelivr',
  'unpkg',
  'cdnjs',
  'googleapis',
  'gstatic'
];

function isCDNUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return CDN_PATTERNS.some(pattern => lowerUrl.includes(pattern));
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

export function analyzeNetworkPerformance(report: LighthouseReport): NetworkPerformanceAnalysis {
  const result: NetworkPerformanceAnalysis = {};

  // Analyze HTTP protocols
  const networkRequestsAudit = report.audits?.['network-requests'];
  if (networkRequestsAudit?.details?.items) {
    const items = networkRequestsAudit.details.items as any[];
    const protocolStats = {
      'http/1.1': { count: 0, size: 0, domains: new Set<string>() },
      'h2': { count: 0, size: 0 },
      'h3': { count: 0, size: 0 }
    };

    items.forEach(item => {
      const protocol = item.protocol || 'http/1.1';
      const size = item.transferSize || 0;

      if (protocol === 'http/1.1') {
        protocolStats['http/1.1'].count++;
        protocolStats['http/1.1'].size += size;
        protocolStats['http/1.1'].domains.add(extractDomain(item.url));
      } else if (protocol === 'h2') {
        protocolStats.h2.count++;
        protocolStats.h2.size += size;
      } else if (protocol === 'h3') {
        protocolStats.h3.count++;
        protocolStats.h3.size += size;
      }
    });

    const totalRequests = items.length;
    const recommendations: string[] = [];

    if (protocolStats['http/1.1'].count > 0) {
      const domains = Array.from(protocolStats['http/1.1'].domains);
      domains.forEach(domain => {
        recommendations.push(`Upgrade ${domain} to HTTP/2`);
      });
    }

    result.protocols = {
      recommendations,
      ...(protocolStats['http/1.1'].count > 0 && {
        http1: {
          usage: (protocolStats['http/1.1'].count / totalRequests) * 100,
          transferSize: protocolStats['http/1.1'].size,
          resources: protocolStats['http/1.1'].count,
          domains: Array.from(protocolStats['http/1.1'].domains)
        }
      }),
      ...(protocolStats.h2.count > 0 && {
        http2: {
          usage: (protocolStats.h2.count / totalRequests) * 100,
          transferSize: protocolStats.h2.size,
          resources: protocolStats.h2.count
        }
      }),
      ...(protocolStats.h3.count > 0 && {
        http3: {
          usage: (protocolStats.h3.count / totalRequests) * 100,
          transferSize: protocolStats.h3.size,
          resources: protocolStats.h3.count
        }
      })
    };
  }

  // Analyze CDN usage
  if (networkRequestsAudit?.details?.items) {
    const items = networkRequestsAudit.details.items as any[];
    const cdnResources: any[] = [];
    const nonCdnResources: any[] = [];

    items.forEach(item => {
      if (isCDNUrl(item.url)) {
        cdnResources.push(item);
      } else {
        nonCdnResources.push(item);
      }
    });

    if (cdnResources.length > 0 || nonCdnResources.length > 0) {
      const cdnSize = cdnResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      const cdnAvgTime = cdnResources.length > 0
        ? cdnResources.reduce((sum, r) => sum + ((r.endTime || 0) - (r.startTime || 0)), 0) / cdnResources.length
        : 0;
      const nonCdnAvgTime = nonCdnResources.length > 0
        ? nonCdnResources.reduce((sum, r) => sum + ((r.endTime || 0) - (r.startTime || 0)), 0) / nonCdnResources.length
        : 0;

      const recommendations: string[] = [];
      nonCdnResources.forEach(resource => {
        if (resource.resourceType === 'Image' && resource.transferSize > 50000) {
          recommendations.push(`Move ${resource.url.split('/').pop()} to CDN`);
        }
      });

      result.cdn = {
        usage: (cdnResources.length / items.length) * 100,
        transferSize: cdnSize,
        avgLoadTime: cdnAvgTime,
        nonCdnAvgLoadTime: nonCdnAvgTime,
        speedImprovement: nonCdnAvgTime > 0 ? ((nonCdnAvgTime - cdnAvgTime) / nonCdnAvgTime) * 100 : 0,
        recommendations
      };
    }
  }

  // Analyze caching
  const cacheTTLAudit = report.audits?.['uses-long-cache-ttl'];
  const compressionAudit = report.audits?.['uses-text-compression'];

  if (cacheTTLAudit?.details?.items) {
    const items = cacheTTLAudit.details.items as any[];
    const missedOpportunities: any[] = [];
    let totalWasted = 0;

    items.forEach(item => {
      const currentTTL = item.cacheLifetimeMs || 0;
      const wastedBytes = item.wastedBytes || 0;
      totalWasted += wastedBytes;

      if (currentTTL < 31536000000 && wastedBytes > 0) { // Less than 1 year
        missedOpportunities.push({
          url: item.url,
          currentTTL,
          recommendedTTL: 31536000000,
          impact: wastedBytes >= 25000 ? 'high' : wastedBytes > 10000 ? 'medium' : 'low'
        });
      }
    });

    const potentialSavings = compressionAudit?.details?.overallSavingsBytes || 0;
    const efficiency = cacheTTLAudit.score ? cacheTTLAudit.score * 100 : 60;

    const recommendations: string[] = [];
    if (missedOpportunities.length > 0) {
      recommendations.push('Enable long-term caching for static assets');
    }
    if (potentialSavings > 0) {
      recommendations.push('Enable text compression');
    }

    result.caching = {
      efficiency,
      missedOpportunities,
      potentialSavings,
      recommendations
    };
  }

  // Analyze connections
  const rttAudit = report.audits?.['network-rtt'];
  const serverLatencyAudit = report.audits?.['network-server-latency'];
  const preconnectAudit = report.audits?.['uses-rel-preconnect'];

  const preconnectOpportunities: any[] = [];
  let potentialSavings = 0;

  if (preconnectAudit?.details?.items) {
    const items = preconnectAudit.details.items as any[];
    items.forEach(item => {
      preconnectOpportunities.push({
        url: item.url,
        timeSaved: item.wastedMs || 0
      });
      potentialSavings += item.wastedMs || 0;
    });
  }

  const recommendations: string[] = [];
  if (preconnectOpportunities.length > 0) {
    recommendations.push('Add preconnect hints');
  }

  result.connections = {
    rtt: rttAudit?.numericValue,
    serverLatency: serverLatencyAudit?.numericValue,
    preconnectOpportunities,
    potentialSavings,
    recommendations
  };

  // Calculate overall health
  const scores = [
    report.audits?.['uses-http2']?.score,
    cacheTTLAudit?.score,
    compressionAudit?.score,
    preconnectAudit?.score
  ].filter(s => s !== undefined) as number[];

  if (scores.length > 0) {
    const avgScore = (scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100;
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (report.audits?.['uses-http2']?.score && report.audits['uses-http2'].score >= 0.8) {
      strengths.push('HTTP/2 adoption');
    }
    if (cacheTTLAudit?.score && cacheTTLAudit.score >= 0.8) {
      strengths.push('Caching strategy');
    }
    if (preconnectAudit?.score && preconnectAudit.score < 0.8) {
      weaknesses.push('Connection optimization');
    }

    result.overallHealth = {
      score: avgScore,
      rating: avgScore >= 90 ? 'excellent' :
              avgScore >= 80 ? 'good' :
              avgScore >= 50 ? 'needs-improvement' :
              'poor',
      strengths,
      weaknesses
    };
  }

  return result;
}