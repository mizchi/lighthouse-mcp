/**
 * Third-Party Script Impact Analyzer
 * Analyzes the impact of third-party scripts on performance
 */

import type { LighthouseReport } from '../types/index.js';

export interface ThirdPartyEntity {
  entity: string;
  mainThreadTime: number;
  blockingTime: number;
  transferSize: number;
  subRequests: {
    url: string;
    mainThreadTime: number;
    blockingTime: number;
    transferSize: number;
  }[];
}

export interface ThirdPartyAnalysis {
  summary: {
    totalMainThreadTime: number;
    totalBlockingTime: number;
    totalTransferSize: number;
    entityCount: number;
  };
  entities: ThirdPartyEntity[];
  impact: {
    performanceScore: number;
    fcpImpact: number;
    lcpImpact: number;
    tbtImpact: number;
  };
  recommendations: string[];
}

/**
 * Analyze third-party script impact
 */
export function analyzeThirdPartyImpact(report: LighthouseReport): ThirdPartyAnalysis | null {
  const thirdPartySummary = report.audits?.['third-party-summary'];
  const thirdPartyFacades = report.audits?.['third-party-facades'];

  if (!thirdPartySummary?.details?.items) {
    return null;
  }

  const entities: ThirdPartyEntity[] = [];
  let totalMainThreadTime = 0;
  let totalBlockingTime = 0;
  let totalTransferSize = 0;

  // Process each third-party entity
  for (const item of thirdPartySummary.details.items) {
    const entity: ThirdPartyEntity = {
      entity: item.entity,
      mainThreadTime: item.mainThreadTime || 0,
      blockingTime: item.blockingTime || 0,
      transferSize: item.transferSize || 0,
      subRequests: [],
    };

    // Get sub-requests for this entity
    if (item.subItems?.items) {
      for (const subItem of item.subItems.items) {
        entity.subRequests.push({
          url: subItem.url,
          mainThreadTime: subItem.mainThreadTime || 0,
          blockingTime: subItem.blockingTime || 0,
          transferSize: subItem.transferSize || 0,
        });
      }
    }

    entities.push(entity);
    totalMainThreadTime += entity.mainThreadTime;
    totalBlockingTime += entity.blockingTime;
    totalTransferSize += entity.transferSize;
  }

  // Sort entities by blocking time (most impactful first)
  entities.sort((a, b) => b.blockingTime - a.blockingTime);

  // Calculate impact on metrics
  const metrics = report.audits;
  const fcpValue = metrics?.['first-contentful-paint']?.numericValue || 0;
  const lcpValue = metrics?.['largest-contentful-paint']?.numericValue || 0;
  const tbtValue = metrics?.['total-blocking-time']?.numericValue || 0;

  // Estimate impact (simplified calculation)
  const fcpImpact = totalMainThreadTime > 0 ? Math.min(totalMainThreadTime / fcpValue, 1) : 0;
  const lcpImpact = totalMainThreadTime > 0 ? Math.min(totalMainThreadTime / lcpValue, 1) : 0;
  const tbtImpact = totalBlockingTime > 0 ? Math.min(totalBlockingTime / tbtValue, 1) : 0;

  // Performance score impact estimation
  const performanceScore = report.categories?.performance?.score || 0;
  const estimatedImpact = (fcpImpact * 0.1 + lcpImpact * 0.25 + tbtImpact * 0.3) * performanceScore;

  // Generate recommendations
  const recommendations: string[] = [];

  // High-impact entities
  const highImpactEntities = entities.filter(e => e.blockingTime > 250);
  if (highImpactEntities.length > 0) {
    recommendations.push(
      `Critical: ${highImpactEntities.length} third-party scripts causing >250ms blocking time`
    );
    for (const entity of highImpactEntities.slice(0, 3)) {
      recommendations.push(
        `- ${entity.entity}: ${Math.round(entity.blockingTime)}ms blocking time`
      );
    }
  }

  // Large transfer size
  const largeEntities = entities.filter(e => e.transferSize > 100000);
  if (largeEntities.length > 0) {
    recommendations.push(
      `${largeEntities.length} third-party scripts >100KB, consider lazy loading`
    );
  }

  // Facade recommendations
  if (thirdPartyFacades?.details?.items && thirdPartyFacades.details.items.length > 0) {
    recommendations.push(
      'Consider using facades for embedded content (YouTube, social widgets)'
    );
  }

  // Too many third parties
  if (entities.length > 10) {
    recommendations.push(
      `Too many third-party origins (${entities.length}), consider consolidation`
    );
  }

  return {
    summary: {
      totalMainThreadTime,
      totalBlockingTime,
      totalTransferSize,
      entityCount: entities.length,
    },
    entities,
    impact: {
      performanceScore: estimatedImpact,
      fcpImpact,
      lcpImpact,
      tbtImpact,
    },
    recommendations,
  };
}

/**
 * Compare performance with and without third-party scripts
 */
export interface ThirdPartyComparison {
  baseline: {
    score: number;
    fcp: number;
    lcp: number;
    tbt: number;
    cls: number;
  };
  withThirdParty: {
    score: number;
    fcp: number;
    lcp: number;
    tbt: number;
    cls: number;
  };
  impact: {
    scoreDelta: number;
    fcpDelta: number;
    lcpDelta: number;
    tbtDelta: number;
    clsDelta: number;
  };
  recommendations: string[];
}

export function compareThirdPartyImpact(
  baselineReport: LighthouseReport,
  withThirdPartyReport: LighthouseReport
): ThirdPartyComparison {
  // Extract metrics from baseline (blocked third-party)
  const baselineMetrics = {
    score: baselineReport.categories?.performance?.score || 0,
    fcp: baselineReport.audits?.['first-contentful-paint']?.numericValue || 0,
    lcp: baselineReport.audits?.['largest-contentful-paint']?.numericValue || 0,
    tbt: baselineReport.audits?.['total-blocking-time']?.numericValue || 0,
    cls: baselineReport.audits?.['cumulative-layout-shift']?.numericValue || 0,
  };

  // Extract metrics from with third-party
  const withThirdPartyMetrics = {
    score: withThirdPartyReport.categories?.performance?.score || 0,
    fcp: withThirdPartyReport.audits?.['first-contentful-paint']?.numericValue || 0,
    lcp: withThirdPartyReport.audits?.['largest-contentful-paint']?.numericValue || 0,
    tbt: withThirdPartyReport.audits?.['total-blocking-time']?.numericValue || 0,
    cls: withThirdPartyReport.audits?.['cumulative-layout-shift']?.numericValue || 0,
  };

  // Calculate impact
  const impact = {
    scoreDelta: baselineMetrics.score - withThirdPartyMetrics.score,
    fcpDelta: baselineMetrics.fcp - withThirdPartyMetrics.fcp,
    lcpDelta: baselineMetrics.lcp - withThirdPartyMetrics.lcp,
    tbtDelta: baselineMetrics.tbt - withThirdPartyMetrics.tbt,
    clsDelta: baselineMetrics.cls - withThirdPartyMetrics.cls,
  };

  // Generate recommendations based on impact
  const recommendations: string[] = [];

  if (impact.scoreDelta > 0.1) {
    recommendations.push(
      `Third-party scripts reduce performance score by ${Math.round(impact.scoreDelta * 100)} points`
    );
  }

  if (impact.fcpDelta < -500) {
    recommendations.push(
      `FCP delayed by ${Math.round(Math.abs(impact.fcpDelta))}ms due to third-party scripts`
    );
  }

  if (impact.lcpDelta < -1000) {
    recommendations.push(
      `LCP delayed by ${Math.round(Math.abs(impact.lcpDelta))}ms due to third-party scripts`
    );
  }

  if (impact.tbtDelta < -300) {
    recommendations.push(
      `TBT increased by ${Math.round(Math.abs(impact.tbtDelta))}ms due to third-party scripts`
    );
  }

  if (impact.clsDelta < -0.05) {
    recommendations.push(
      `CLS increased by ${Math.abs(impact.clsDelta).toFixed(3)} due to third-party scripts`
    );
  }

  return {
    baseline: baselineMetrics,
    withThirdParty: withThirdPartyMetrics,
    impact,
    recommendations,
  };
}

/**
 * Get domains to block for testing
 */
export function getThirdPartyDomains(report: LighthouseReport): string[] {
  const thirdPartySummary = report.audits?.['third-party-summary'];
  if (!thirdPartySummary?.details?.items) {
    return [];
  }

  const domains = new Set<string>();
  
  for (const item of thirdPartySummary.details.items) {
    
    // Get URLs from sub-items
    if (item.subItems?.items) {
      for (const subItem of item.subItems.items) {
        try {
          const url = new URL(subItem.url);
          domains.add(url.hostname);
        } catch {
          // Invalid URL, skip
        }
      }
    }
  }

  return Array.from(domains);
}