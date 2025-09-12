/**
 * L2 Third-Party Impact Analysis Tool
 * Analyzes the impact of third-party scripts on performance
 */

import { executeL1GetReport } from './l1-get-report.js';
import { executeL1Collect } from './l1-collect-single.js';
import { 
  analyzeThirdPartyImpact, 
  compareThirdPartyImpact,
  getThirdPartyDomains,
  type ThirdPartyAnalysis,
  type ThirdPartyComparison 
} from '../analyzers/thirdParty.js';
import type { LighthouseReport } from '../types/index.js';

export interface L2ThirdPartyImpactParams {
  reportId?: string;
  url?: string;
  device?: 'mobile' | 'desktop';
  compareMode?: 'analyze' | 'compare' | 'domains';
  blockDomains?: string[];
  gather?: boolean;
}

export interface L2ThirdPartyImpactResult {
  mode: 'analyze' | 'compare' | 'domains';
  reportId?: string;
  analysis?: ThirdPartyAnalysis;
  comparison?: ThirdPartyComparison;
  domains?: string[];
  recommendations?: string[];
}

export const l2ThirdPartyImpactTool = {
  name: 'l2_third_party_impact',
  description: 'Analyze third-party script impact on performance (Layer 2)',
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
      compareMode: {
        type: 'string',
        enum: ['analyze', 'compare', 'domains'],
        default: 'analyze',
        description: 'Analysis mode: analyze (single), compare (with/without blocking), domains (list domains)',
      },
      blockDomains: {
        type: 'array',
        items: { type: 'string' },
        description: 'Domains to block for comparison mode',
      },
      gather: {
        type: 'boolean',
        default: false,
        description: 'Force fresh data collection',
      },
    },
  },
};

export async function executeL2ThirdPartyImpact(params: L2ThirdPartyImpactParams): Promise<L2ThirdPartyImpactResult> {
  const mode = params.compareMode || 'analyze';

  if (mode === 'analyze') {
    // Single report analysis
    let reportId = params.reportId;
    let report: LighthouseReport;

    if (reportId) {
      const result = await executeL1GetReport({ reportId });
      report = result.data;
    } else if (params.url) {
      const collectResult = await executeL1Collect({
        url: params.url,
        device: params.device || 'mobile',
        categories: ['performance'],
        gather: params.gather || false,
      });
      reportId = collectResult.reportId;
      
      const result = await executeL1GetReport({ reportId });
      report = result.data;
    } else {
      throw new Error('Either reportId or url is required');
    }

    const analysis = analyzeThirdPartyImpact(report);
    
    if (!analysis) {
      return {
        mode: 'analyze',
        reportId,
        recommendations: ['No third-party scripts detected'],
      };
    }

    return {
      mode: 'analyze',
      reportId,
      analysis,
      recommendations: analysis.recommendations,
    };

  } else if (mode === 'domains') {
    // Get list of third-party domains
    let report: LighthouseReport;

    if (params.reportId) {
      const result = await executeL1GetReport({ reportId: params.reportId });
      report = result.data;
    } else if (params.url) {
      const collectResult = await executeL1Collect({
        url: params.url,
        device: params.device || 'mobile',
        categories: ['performance'],
        gather: params.gather || false,
      });
      
      const result = await executeL1GetReport({ reportId: collectResult.reportId });
      report = result.data;
    } else {
      throw new Error('Either reportId or url is required');
    }

    const domains = getThirdPartyDomains(report);
    const analysis = analyzeThirdPartyImpact(report);

    const recommendations: string[] = [];
    if (domains.length > 0) {
      recommendations.push(`Found ${domains.length} third-party domains`);
      recommendations.push('Use these domains with blockDomains parameter to test impact');
      
      // Group domains by impact
      if (analysis?.entities) {
        const highImpactDomains = new Set<string>();
        for (const entity of analysis.entities.filter(e => e.blockingTime > 100)) {
          for (const subRequest of entity.subRequests) {
            try {
              const url = new URL(subRequest.url);
              highImpactDomains.add(url.hostname);
            } catch {
              // Invalid URL
            }
          }
        }
        
        if (highImpactDomains.size > 0) {
          recommendations.push(`High-impact domains (>100ms blocking): ${Array.from(highImpactDomains).slice(0, 5).join(', ')}`);
        }
      }
    }

    return {
      mode: 'domains',
      domains,
      analysis: analysis === null ? undefined : analysis,
      recommendations,
    };

  } else if (mode === 'compare') {
    // Compare with and without blocking third-party scripts
    if (!params.url) {
      throw new Error('URL is required for compare mode');
    }

    // First, collect without blocking (normal)
    const withThirdPartyResult = await executeL1Collect({
      url: params.url,
      device: params.device || 'mobile',
      categories: ['performance'],
      gather: true, // Always gather fresh for comparison
    });

    const withThirdPartyReport = await executeL1GetReport({ 
      reportId: withThirdPartyResult.reportId 
    });

    // Then collect with blocking
    let blockDomains = params.blockDomains;
    
    // If no domains specified, get all third-party domains
    if (!blockDomains || blockDomains.length === 0) {
      blockDomains = getThirdPartyDomains(withThirdPartyReport.data);
    }

    if (blockDomains.length === 0) {
      return {
        mode: 'compare',
        recommendations: ['No third-party domains found to block'],
      };
    }

    // Collect with blocked domains
    const baselineResult = await executeL1Collect({
      url: params.url,
      device: params.device || 'mobile',
      categories: ['performance'],
      gather: true,
      blockDomains,
    });

    const baselineReport = await executeL1GetReport({ 
      reportId: baselineResult.reportId 
    });

    // Compare the two reports
    const comparison = compareThirdPartyImpact(
      baselineReport.data,
      withThirdPartyReport.data
    );

    // Add additional recommendations
    const recommendations = [...comparison.recommendations];
    
    if (comparison.impact.scoreDelta > 0.05) {
      recommendations.push(`Consider lazy-loading or deferring ${blockDomains.length} third-party scripts`);
    }

    // Analyze which specific third parties have the most impact
    const thirdPartyAnalysis = analyzeThirdPartyImpact(withThirdPartyReport.data);
    if (thirdPartyAnalysis) {
      const topOffenders = thirdPartyAnalysis.entities
        .filter(e => e.blockingTime > 100)
        .slice(0, 3);
      
      if (topOffenders.length > 0) {
        recommendations.push('Top third-party performance impacts:');
        for (const entity of topOffenders) {
          recommendations.push(
            `- ${entity.entity}: ${Math.round(entity.blockingTime)}ms blocking, ${Math.round(entity.transferSize / 1024)}KB`
          );
        }
      }
    }

    return {
      mode: 'compare',
      comparison,
      analysis: thirdPartyAnalysis === null ? undefined : thirdPartyAnalysis,
      domains: blockDomains,
      recommendations,
    };
  }

  throw new Error(`Unknown mode: ${mode}`);
}

/**
 * Progressive third-party analysis
 * Analyzes impact by progressively blocking third-party scripts
 */
export interface L2ProgressiveThirdPartyParams {
  url: string;
  device?: 'mobile' | 'desktop';
  maxIterations?: number;
}

export interface L2ProgressiveThirdPartyResult {
  baseline: {
    score: number;
    metrics: any;
  };
  iterations: Array<{
    blockedDomains: string[];
    score: number;
    scoreDelta: number;
    metrics: any;
    recommendation: string;
  }>;
  optimalBlocking: string[];
  recommendations: string[];
}

export const l2ProgressiveThirdPartyTool = {
  name: 'l2_progressive_third_party',
  description: 'Progressive third-party impact analysis (Layer 2)',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to analyze',
      },
      device: {
        type: 'string',
        enum: ['mobile', 'desktop'],
        default: 'mobile',
        description: 'Device type',
      },
      maxIterations: {
        type: 'number',
        default: 5,
        description: 'Maximum number of progressive blocking iterations',
      },
    },
    required: ['url'],
  },
};

export async function executeL2ProgressiveThirdParty(
  params: L2ProgressiveThirdPartyParams
): Promise<L2ProgressiveThirdPartyResult> {
  const { url, device = 'mobile', maxIterations = 5 } = params;

  // Get baseline (all third-party allowed)
  const baselineResult = await executeL1Collect({
    url,
    device,
    categories: ['performance'],
    gather: true,
  });

  const baselineReport = await executeL1GetReport({ 
    reportId: baselineResult.reportId 
  });

  const baselineMetrics = {
    score: baselineReport.data.categories?.performance?.score || 0,
    fcp: baselineReport.data.audits?.['first-contentful-paint']?.numericValue || 0,
    lcp: baselineReport.data.audits?.['largest-contentful-paint']?.numericValue || 0,
    tbt: baselineReport.data.audits?.['total-blocking-time']?.numericValue || 0,
    cls: baselineReport.data.audits?.['cumulative-layout-shift']?.numericValue || 0,
  };

  // Get third-party analysis
  const thirdPartyAnalysis = analyzeThirdPartyImpact(baselineReport.data);
  
  if (!thirdPartyAnalysis || thirdPartyAnalysis.entities.length === 0) {
    return {
      baseline: {
        score: baselineMetrics.score,
        metrics: baselineMetrics,
      },
      iterations: [],
      optimalBlocking: [],
      recommendations: ['No third-party scripts detected'],
    };
  }

  // Sort entities by blocking time (most impactful first)
  const sortedEntities = [...thirdPartyAnalysis.entities]
    .sort((a, b) => b.blockingTime - a.blockingTime);

  const iterations = [];
  const blockedDomains: string[] = [];
  let bestScore = baselineMetrics.score;
  let optimalBlocking: string[] = [];

  // Progressive blocking
  for (let i = 0; i < Math.min(maxIterations, sortedEntities.length); i++) {
    const entity = sortedEntities[i];
    
    // Get domains for this entity
    const entityDomains = new Set<string>();
    for (const subRequest of entity.subRequests) {
      try {
        const url = new URL(subRequest.url);
        entityDomains.add(url.hostname);
      } catch {
        // Invalid URL
      }
    }

    // Add to blocked list
    blockedDomains.push(...Array.from(entityDomains));

    // Test with blocking
    const iterationResult = await executeL1Collect({
      url,
      device,
      categories: ['performance'],
      gather: true,
      blockDomains: [...blockedDomains],
    });

    const iterationReport = await executeL1GetReport({ 
      reportId: iterationResult.reportId 
    });

    const iterationMetrics = {
      score: iterationReport.data.categories?.performance?.score || 0,
      fcp: iterationReport.data.audits?.['first-contentful-paint']?.numericValue || 0,
      lcp: iterationReport.data.audits?.['largest-contentful-paint']?.numericValue || 0,
      tbt: iterationReport.data.audits?.['total-blocking-time']?.numericValue || 0,
      cls: iterationReport.data.audits?.['cumulative-layout-shift']?.numericValue || 0,
    };

    const scoreDelta = iterationMetrics.score - baselineMetrics.score;

    iterations.push({
      blockedDomains: [...blockedDomains],
      score: iterationMetrics.score,
      scoreDelta,
      metrics: iterationMetrics,
      recommendation: `Blocking ${entity.entity} improves score by ${Math.round(scoreDelta * 100)} points`,
    });

    // Track best configuration
    if (iterationMetrics.score > bestScore) {
      bestScore = iterationMetrics.score;
      optimalBlocking = [...blockedDomains];
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  const totalImprovement = bestScore - baselineMetrics.score;
  if (totalImprovement > 0.05) {
    recommendations.push(
      `Blocking ${optimalBlocking.length} domains can improve performance score by ${Math.round(totalImprovement * 100)} points`
    );
  }

  // Find the point of diminishing returns
  let significantIterations = 0;
  for (const iteration of iterations) {
    if (iteration.scoreDelta > 0.02) {
      significantIterations++;
    }
  }

  if (significantIterations > 0) {
    recommendations.push(
      `${significantIterations} third-party script(s) have significant performance impact (>2 points)`
    );
  }

  // Specific recommendations for high-impact scripts
  for (let i = 0; i < Math.min(3, iterations.length); i++) {
    const iteration = iterations[i];
    if (iteration.scoreDelta > 0.05) {
      const entity = sortedEntities[i];
      recommendations.push(
        `Critical: ${entity.entity} causes ${Math.round(entity.blockingTime)}ms blocking time`
      );
    }
  }

  return {
    baseline: {
      score: baselineMetrics.score,
      metrics: baselineMetrics,
    },
    iterations,
    optimalBlocking,
    recommendations,
  };
}