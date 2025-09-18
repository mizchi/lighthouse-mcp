/**
 * L2 CPU Performance Analysis Tool
 * Detects high CPU usage, main thread blocking, and script evaluation issues
 */

import type { LighthouseReport } from '../types';
import { executeL1GetReport } from './l1-get-report';

export interface CPUAnalysisParams {
  reportId?: string;
  url?: string;
}

export interface CPUBottleneck {
  type: 'script-evaluation' | 'main-thread-blocking' | 'long-task' | 'third-party-script' | 'layout-thrashing' | 'forced-reflow';
  resource?: string;
  duration: number;
  impact: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  solution: string;
}

export interface CPUAnalysisResult {
  summary: {
    totalBlockingTime: number;
    mainThreadBusyTime: number;
    scriptEvaluationTime: number;
    layoutTime: number;
    cpuScore: number; // 0-100, lower is worse
    severity: 'critical' | 'high' | 'medium' | 'low';
  };
  bottlenecks: CPUBottleneck[];
  metrics: {
    tbt: number;
    tti: number;
    fid?: number;
    maxPotentialFid?: number;
    bootupTime: number;
    mainThreadWorkBreakdown: Record<string, number>;
  };
  recommendations: string[];
  topOffenders: Array<{
    url: string;
    totalTime: number;
    scriptTime: number;
    blockingTime: number;
  }>;
}

/**
 * Analyze CPU performance from a Lighthouse report
 */
export function analyzeCPUPerformance(report: LighthouseReport): CPUAnalysisResult {
  const bottlenecks: CPUBottleneck[] = [];
  const recommendations: string[] = [];

  // Get main metrics
  const tbt = report.audits?.['total-blocking-time']?.numericValue || 0;
  const tti = report.audits?.['interactive']?.numericValue || 0;
  const maxFid = report.audits?.['max-potential-fid']?.numericValue || 0;
  const bootupTime = report.audits?.['bootup-time'];
  const mainThreadWork = report.audits?.['mainthread-work-breakdown'];

  // Analyze Total Blocking Time
  if (tbt > 600) {
    bottlenecks.push({
      type: 'main-thread-blocking',
      duration: tbt,
      impact: 'critical',
      description: `Main thread is blocked for ${tbt}ms, severely impacting interactivity`,
      solution: 'Break up long tasks, defer non-critical JavaScript, and use Web Workers'
    });
    recommendations.push('🚨 CRITICAL: Reduce Total Blocking Time by splitting long-running tasks');
  } else if (tbt > 200) {
    bottlenecks.push({
      type: 'main-thread-blocking',
      duration: tbt,
      impact: 'high',
      description: `Main thread is blocked for ${tbt}ms, affecting user interactions`,
      solution: 'Optimize JavaScript execution and consider code splitting'
    });
  }

  // Analyze script bootup time
  const topOffenders: Array<{
    url: string;
    totalTime: number;
    scriptTime: number;
    blockingTime: number;
  }> = [];

  if (bootupTime?.details?.items) {
    const items = bootupTime.details.items as any[];

    for (const item of items) {
      if (item.total > 100) {
        topOffenders.push({
          url: item.url,
          totalTime: item.total,
          scriptTime: item.scripting || 0,
          blockingTime: 0 // Will be updated from other audits
        });

        if (item.scripting > 500) {
          bottlenecks.push({
            type: 'script-evaluation',
            resource: item.url,
            duration: item.scripting,
            impact: item.scripting > 1000 ? 'critical' : 'high',
            description: `Script ${item.url} takes ${item.scripting}ms to evaluate`,
            solution: 'Minimize script size, remove unused code, and consider lazy loading'
          });
        }
      }
    }
  }

  // Analyze main thread work breakdown
  let mainThreadBusyTime = 0;
  let scriptEvaluationTime = 0;
  let layoutTime = 0;
  const workBreakdown: Record<string, number> = {};

  if (mainThreadWork?.details?.items) {
    const items = mainThreadWork.details.items as any[];

    for (const item of items) {
      workBreakdown[item.group] = item.duration;
      mainThreadBusyTime += item.duration;

      if (item.group === 'scriptEvaluation') {
        scriptEvaluationTime = item.duration;
        if (item.duration > 2000) {
          bottlenecks.push({
            type: 'script-evaluation',
            duration: item.duration,
            impact: 'critical',
            description: `Script evaluation consuming ${(item.duration / 1000).toFixed(1)}s of CPU time`,
            solution: 'Reduce JavaScript payload and complexity'
          });
        }
      } else if (item.group === 'styleLayout') {
        layoutTime = item.duration;
        if (item.duration > 500) {
          bottlenecks.push({
            type: 'layout-thrashing',
            duration: item.duration,
            impact: 'high',
            description: `Layout recalculations taking ${item.duration}ms`,
            solution: 'Batch DOM reads/writes and avoid forced synchronous layouts'
          });
        }
      }
    }
  }

  // Analyze third-party scripts
  const thirdPartySummary = report.audits?.['third-party-summary'];
  if (thirdPartySummary?.details?.items) {
    const items = thirdPartySummary.details.items as any[];

    for (const item of items) {
      if (item.blockingTime > 250) {
        bottlenecks.push({
          type: 'third-party-script',
          resource: item.entity.text || item.entity,
          duration: item.blockingTime,
          impact: item.blockingTime > 500 ? 'critical' : 'high',
          description: `Third-party script ${item.entity.text || item.entity} blocks for ${item.blockingTime}ms`,
          solution: 'Load third-party scripts asynchronously or defer them'
        });

        // Update top offenders with blocking time
        const offender = topOffenders.find(o => o.url.includes(item.entity.text || item.entity));
        if (offender) {
          offender.blockingTime = item.blockingTime;
        }
      }
    }
  }

  // Detect long tasks
  const longTasks = report.audits?.['long-tasks'];
  if (longTasks?.details?.items) {
    const items = longTasks.details.items as any[];
    for (const item of items) {
      if (item.duration > 50) {
        bottlenecks.push({
          type: 'long-task',
          duration: item.duration,
          impact: item.duration > 250 ? 'high' : 'medium',
          description: `Long task detected: ${item.duration}ms`,
          solution: 'Break this task into smaller chunks using requestIdleCallback or setTimeout'
        });
      }
    }
  }

  // Calculate CPU score (0-100)
  let cpuScore = 100;
  cpuScore -= Math.min(50, (tbt / 600) * 50); // TBT impact
  cpuScore -= Math.min(30, (scriptEvaluationTime / 4000) * 30); // Script evaluation impact
  cpuScore -= Math.min(20, (mainThreadBusyTime / 10000) * 20); // Main thread busy time impact
  cpuScore = Math.max(0, Math.round(cpuScore));

  // Determine severity
  let severity: 'critical' | 'high' | 'medium' | 'low';
  if (cpuScore < 25) severity = 'critical';
  else if (cpuScore < 50) severity = 'high';
  else if (cpuScore < 75) severity = 'medium';
  else severity = 'low';

  // Generate recommendations based on findings
  if (scriptEvaluationTime > 2000) {
    recommendations.push('📦 Implement code splitting to reduce initial JavaScript payload');
    recommendations.push('🔧 Use tree shaking to eliminate dead code');
  } else if (tbt > 200) {
    recommendations.push('⚙️ Optimize JavaScript execution for better interactivity');
  }

  if (tbt > 600) {
    recommendations.push('⚡ Use Web Workers for CPU-intensive operations');
    recommendations.push('🔄 Implement progressive enhancement to improve initial load');
  } else if (tbt > 200) {
    recommendations.push('🎯 Consider deferring non-critical JavaScript');
  }

  if (layoutTime > 500) {
    recommendations.push('📐 Optimize CSS to reduce layout recalculations');
    recommendations.push('🎯 Use CSS containment to limit layout scope');
  }

  const hasThirdPartyIssues = bottlenecks.some(b => b.type === 'third-party-script' && b.impact === 'critical');
  if (hasThirdPartyIssues) {
    recommendations.push('🌐 Audit third-party scripts and remove unnecessary ones');
    recommendations.push('⏳ Load third-party scripts with async or defer attributes');
    recommendations.push('🔗 Self-host critical third-party resources when possible');
  }

  if (topOffenders.length > 5) {
    recommendations.push('📊 Too many JavaScript files - consider bundling and minification');
  }

  // Sort bottlenecks by impact and duration
  bottlenecks.sort((a, b) => {
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (impactOrder[a.impact] !== impactOrder[b.impact]) {
      return impactOrder[a.impact] - impactOrder[b.impact];
    }
    return b.duration - a.duration;
  });

  // Sort top offenders by total time
  topOffenders.sort((a, b) => b.totalTime - a.totalTime);

  return {
    summary: {
      totalBlockingTime: tbt,
      mainThreadBusyTime,
      scriptEvaluationTime,
      layoutTime,
      cpuScore,
      severity
    },
    bottlenecks: bottlenecks.slice(0, 10), // Top 10 bottlenecks
    metrics: {
      tbt,
      tti,
      fid: report.audits?.['first-input-delay']?.numericValue,
      maxPotentialFid: maxFid,
      bootupTime: bootupTime?.numericValue || 0,
      mainThreadWorkBreakdown: workBreakdown
    },
    recommendations: [...new Set(recommendations)], // Remove duplicates
    topOffenders: topOffenders.slice(0, 10) // Top 10 offenders
  };
}

/**
 * Execute CPU analysis (MCP wrapper)
 */
export async function executeL2CPUAnalysis(
  params: CPUAnalysisParams
): Promise<CPUAnalysisResult> {
  let report: LighthouseReport;

  if (params.reportId) {
    const result = await executeL1GetReport({ reportId: params.reportId });
    report = result.data;
  } else if (params.url) {
    throw new Error('Direct URL analysis not implemented. Use reportId instead.');
  } else {
    throw new Error('Either reportId or url is required');
  }

  return analyzeCPUPerformance(report);
}

// MCP Tool definition
export const l2CPUAnalysisTool = {
  name: 'l2_cpu_analysis',
  description: 'Analyze CPU performance and main thread blocking (Layer 2)',
  inputSchema: {
    type: 'object',
    properties: {
      reportId: {
        type: 'string',
        description: 'ID of the report to analyze'
      },
      url: {
        type: 'string',
        description: 'URL to analyze (for testing)'
      }
    },
    oneOf: [
      { required: ['reportId'] },
      { required: ['url'] }
    ]
  },
  execute: async (params: CPUAnalysisParams) => {
    const result = await executeL2CPUAnalysis(params);

    // Format output for MCP
    let output = `# CPU Performance Analysis\n\n`;

    output += `## Summary\n`;
    output += `- **CPU Score**: ${result.summary.cpuScore}/100 (${result.summary.severity})\n`;
    output += `- **Total Blocking Time**: ${result.summary.totalBlockingTime}ms\n`;
    output += `- **Main Thread Busy**: ${(result.summary.mainThreadBusyTime / 1000).toFixed(1)}s\n`;
    output += `- **Script Evaluation**: ${(result.summary.scriptEvaluationTime / 1000).toFixed(1)}s\n`;
    output += `- **Layout Time**: ${result.summary.layoutTime}ms\n\n`;

    if (result.bottlenecks.length > 0) {
      output += `## 🚨 CPU Bottlenecks\n`;
      for (const bottleneck of result.bottlenecks.slice(0, 5)) {
        output += `\n### ${bottleneck.impact === 'critical' ? '🔴' : bottleneck.impact === 'high' ? '🟠' : '🟡'} ${bottleneck.type}\n`;
        output += `- **Duration**: ${bottleneck.duration}ms\n`;
        if (bottleneck.resource) {
          output += `- **Resource**: ${bottleneck.resource}\n`;
        }
        output += `- **Description**: ${bottleneck.description}\n`;
        output += `- **Solution**: ${bottleneck.solution}\n`;
      }
    }

    if (result.topOffenders.length > 0) {
      output += `\n## 📊 Top CPU Consumers\n`;
      output += `| Resource | Total Time | Script Time | Blocking Time |\n`;
      output += `|----------|------------|-------------|---------------|\n`;
      for (const offender of result.topOffenders.slice(0, 5)) {
        const url = offender.url.length > 50 ? offender.url.substring(0, 50) + '...' : offender.url;
        output += `| ${url} | ${offender.totalTime}ms | ${offender.scriptTime}ms | ${offender.blockingTime}ms |\n`;
      }
    }

    output += `\n## 💡 Recommendations\n`;
    for (const rec of result.recommendations) {
      output += `- ${rec}\n`;
    }

    return {
      success: true,
      result,
      output
    };
  }
};