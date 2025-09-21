/**
 * L2 Advanced Analysis Tool
 * Provides comprehensive performance analysis with Web Vitals, Resource, Network, and UX metrics
 */

import { loadReport } from './utils/report-loader.js';
import { analyzeWebVitals } from '../analyzers/webVitalsAnalysis.js';
import { analyzeResourcePerformance } from '../analyzers/resourcePerformance.js';
import { analyzeNetworkPerformance } from '../analyzers/networkPerformance.js';
import { analyzeUserExperience } from '../analyzers/userExperienceMetrics.js';
import type { MCPTool } from '../types/mcp-types.js';

export interface L2AdvancedAnalysisParams {
  reportId?: string;
  url?: string;
  device?: 'mobile' | 'desktop';
  categories?: string[];
  includeWebVitals?: boolean;
  includeResourceAnalysis?: boolean;
  includeNetworkAnalysis?: boolean;
  includeUXMetrics?: boolean;
}

export interface L2AdvancedAnalysisResult {
  reportId: string;
  url: string;
  timestamp: Date;
  webVitals?: ReturnType<typeof analyzeWebVitals>;
  resourcePerformance?: ReturnType<typeof analyzeResourcePerformance>;
  networkPerformance?: ReturnType<typeof analyzeNetworkPerformance>;
  userExperience?: ReturnType<typeof analyzeUserExperience>;
  summary: {
    criticalIssues: string[];
    recommendations: string[];
    overallHealth: {
      score: number;
      rating: string;
    };
  };
}

export const l2AdvancedAnalysisTool: MCPTool = {
  name: 'l2_advanced_analysis',
  description: 'Advanced performance analysis with Web Vitals, Resource, Network, and UX metrics (Layer 2)',
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
      includeWebVitals: {
        type: 'boolean',
        default: true,
        description: 'Include Web Vitals detailed analysis',
      },
      includeResourceAnalysis: {
        type: 'boolean',
        default: true,
        description: 'Include resource performance analysis',
      },
      includeNetworkAnalysis: {
        type: 'boolean',
        default: true,
        description: 'Include network performance analysis',
      },
      includeUXMetrics: {
        type: 'boolean',
        default: true,
        description: 'Include user experience metrics',
      },
    },
  },
  execute: async (params) => {
    const result = await executeL2AdvancedAnalysis(params);

    // Format output as markdown
    let output = `# Advanced Performance Analysis Report\n\n`;
    output += `**URL:** ${result.url}\n`;
    output += `**Overall Health:** ${result.summary.overallHealth.rating} (${result.summary.overallHealth.score}/100)\n\n`;

    if (result.summary.criticalIssues.length > 0) {
      output += `## 🚨 Critical Issues\n`;
      result.summary.criticalIssues.forEach(issue => {
        output += `- ${issue}\n`;
      });
      output += '\n';
    }

    if (result.webVitals) {
      output += `## 📊 Web Vitals Analysis\n`;
      if (result.webVitals.lcp) {
        output += `- **LCP:** ${result.webVitals.lcp.value}ms (${result.webVitals.lcp.rating})\n`;
      }
      if (result.webVitals.inp) {
        output += `- **INP:** ${result.webVitals.inp.value}ms (${result.webVitals.inp.rating})\n`;
      }
      if (result.webVitals.cls) {
        output += `- **CLS:** ${result.webVitals.cls.value} (${result.webVitals.cls.rating})\n`;
      }
      if (result.webVitals.ttfb) {
        output += `- **TTFB:** ${result.webVitals.ttfb.value}ms (${result.webVitals.ttfb.rating})\n`;
      }
      output += '\n';
    }

    if (result.resourcePerformance) {
      output += `## 💾 Resource Performance\n`;
      if (result.resourcePerformance.javascript) {
        output += `- **JavaScript Execution:** ${result.resourcePerformance.javascript.totalExecutionTime}ms\n`;
      }
      if (result.resourcePerformance.css) {
        output += `- **CSS Processing:** ${result.resourcePerformance.css.processingTime}ms\n`;
      }
      if (result.resourcePerformance.images) {
        output += `- **Image Optimization Potential:** ${(result.resourcePerformance.images.totalSavingsBytes / 1024).toFixed(1)}KB\n`;
      }
      output += '\n';
    }

    if (result.networkPerformance) {
      output += `## 🌐 Network Performance\n`;
      if (result.networkPerformance.protocols) {
        if (result.networkPerformance.protocols.http2) {
          output += `- **HTTP/2 Usage:** ${result.networkPerformance.protocols.http2.usage.toFixed(1)}%\n`;
        }
        if (result.networkPerformance.protocols.http3) {
          output += `- **HTTP/3 Usage:** ${result.networkPerformance.protocols.http3.usage.toFixed(1)}%\n`;
        }
      }
      if (result.networkPerformance.cdn) {
        output += `- **CDN Usage:** ${result.networkPerformance.cdn.usage.toFixed(1)}%\n`;
      }
      if (result.networkPerformance.caching) {
        output += `- **Cache Efficiency:** ${result.networkPerformance.caching.efficiency.toFixed(1)}%\n`;
      }
      output += '\n';
    }

    if (result.userExperience) {
      output += `## 👤 User Experience Metrics\n`;
      if (result.userExperience.frustrationIndex) {
        output += `- **Frustration Index:** ${result.userExperience.frustrationIndex.score} (${result.userExperience.frustrationIndex.level})\n`;
      }
      if (result.userExperience.engagementQuality) {
        output += `- **Engagement Quality:** ${result.userExperience.engagementQuality.score} (${result.userExperience.engagementQuality.rating})\n`;
      }
      if (result.userExperience.errorRate) {
        output += `- **Error Rate:** ${result.userExperience.errorRate.totalErrors} errors (${result.userExperience.errorRate.severity} severity)\n`;
      }
      output += '\n';
    }

    if (result.summary.recommendations.length > 0) {
      output += `## 💡 Recommendations\n`;
      result.summary.recommendations.forEach(rec => {
        output += `- ${rec}\n`;
      });
    }

    return {
      type: 'text',
      text: output
    };
  }
};

export async function executeL2AdvancedAnalysis(params: L2AdvancedAnalysisParams): Promise<L2AdvancedAnalysisResult> {
  // Load report using common utility
  const { report, reportId } = await loadReport({
    reportId: params.reportId,
    url: params.url,
    device: params.device,
    categories: params.categories || ['performance', 'accessibility'],
    gather: false,
  });

  const url = report.finalUrl || report.requestedUrl || 'Unknown';
  const criticalIssues: string[] = [];
  const recommendations: string[] = [];
  const scores: number[] = [];

  // Perform Web Vitals analysis
  let webVitalsResult;
  if (params.includeWebVitals !== false) {
    webVitalsResult = analyzeWebVitals(report);

    if (webVitalsResult.criticalIssues) {
      webVitalsResult.criticalIssues.forEach(issue => {
        criticalIssues.push(`${issue.metric}: ${issue.value}ms exceeds threshold (${issue.threshold}ms)`);
      });
    }

    if (webVitalsResult.overallHealth) {
      scores.push(webVitalsResult.overallHealth.score);
    }

    // Add Web Vitals recommendations
    if (webVitalsResult.inp?.insights) {
      recommendations.push(...webVitalsResult.inp.insights);
    }
    if (webVitalsResult.ttfb?.recommendations) {
      recommendations.push(...webVitalsResult.ttfb.recommendations);
    }
  }

  // Perform Resource Performance analysis
  let resourceResult;
  if (params.includeResourceAnalysis !== false) {
    resourceResult = analyzeResourcePerformance(report);

    if (resourceResult.bottlenecks) {
      resourceResult.bottlenecks.forEach(bottleneck => {
        criticalIssues.push(`Resource bottleneck: ${bottleneck}`);
      });
    }

    if (resourceResult.overallScore !== undefined) {
      scores.push(resourceResult.overallScore);
    }

    // Add resource recommendations
    if (resourceResult.javascript?.recommendations) {
      recommendations.push(...resourceResult.javascript.recommendations);
    }
    if (resourceResult.css?.recommendations) {
      recommendations.push(...resourceResult.css.recommendations);
    }
    if (resourceResult.images?.recommendations) {
      recommendations.push(...resourceResult.images.recommendations);
    }
  }

  // Perform Network Performance analysis
  let networkResult;
  if (params.includeNetworkAnalysis !== false) {
    networkResult = analyzeNetworkPerformance(report);

    if (networkResult.overallHealth) {
      scores.push(networkResult.overallHealth.score);

      if (networkResult.overallHealth.weaknesses) {
        networkResult.overallHealth.weaknesses.forEach(weakness => {
          criticalIssues.push(`Network issue: ${weakness}`);
        });
      }
    }

    // Add network recommendations
    if (networkResult.protocols?.recommendations) {
      recommendations.push(...networkResult.protocols.recommendations);
    }
    if (networkResult.cdn?.recommendations) {
      recommendations.push(...networkResult.cdn.recommendations);
    }
    if (networkResult.caching?.recommendations) {
      recommendations.push(...networkResult.caching.recommendations);
    }
  }

  // Perform User Experience analysis
  let uxResult;
  if (params.includeUXMetrics !== false) {
    uxResult = analyzeUserExperience(report);

    if (uxResult.frustrationIndex && uxResult.frustrationIndex.level === 'critical') {
      criticalIssues.push('Critical user frustration detected');
    }

    if (uxResult.errorRate && uxResult.errorRate.severity === 'high') {
      criticalIssues.push(`High error rate: ${uxResult.errorRate.totalErrors} errors detected`);
    }

    if (uxResult.engagementQuality) {
      scores.push(uxResult.engagementQuality.score);
    }

    // Add UX recommendations
    if (uxResult.rageClicks?.recommendations) {
      recommendations.push(...uxResult.rageClicks.recommendations);
    }
    if (uxResult.deadClicks?.recommendations) {
      recommendations.push(...uxResult.deadClicks.recommendations);
    }
    if (uxResult.errorRate?.recommendations) {
      recommendations.push(...uxResult.errorRate.recommendations);
    }
  }

  // Calculate overall health
  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 0;

  const overallRating = overallScore >= 90 ? 'Excellent' :
                        overallScore >= 75 ? 'Good' :
                        overallScore >= 50 ? 'Needs Improvement' :
                        'Poor';

  // Remove duplicates from recommendations
  const uniqueRecommendations = Array.from(new Set(recommendations));

  return {
    reportId: reportId!,
    url,
    timestamp: new Date(),
    webVitals: webVitalsResult,
    resourcePerformance: resourceResult,
    networkPerformance: networkResult,
    userExperience: uxResult,
    summary: {
      criticalIssues: criticalIssues.slice(0, 5), // Top 5 critical issues
      recommendations: uniqueRecommendations.slice(0, 10), // Top 10 recommendations
      overallHealth: {
        score: overallScore,
        rating: overallRating
      }
    }
  };
}