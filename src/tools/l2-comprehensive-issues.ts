import type { LighthouseReport } from '../types';
import { executeL1GetReport } from './l1-get-report';

export interface Issue {
  category: 'performance' | 'accessibility' | 'seo' | 'best-practices' | 'pwa';
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: {
    metric?: string;
    value?: number;
    unit?: string;
  };
  solution: {
    quick?: string;
    longTerm?: string;
    effort: 'low' | 'medium' | 'high';
  };
  resources?: string[];
}

export interface ComprehensiveIssuesParams {
  reportId?: string;
  url?: string;
  report?: LighthouseReport; // Direct report input
  thresholds?: {
    critical?: number;
    high?: number;
    medium?: number;
  };
}

export interface ComprehensiveIssuesResult {
  issues: Issue[];
  summary: {
    totalIssues: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    estimatedImpact: {
      performance: number;
      size: number;
      time: number;
    };
  };
  categories: {
    cssIssues: Issue[];
    jsIssues: Issue[];
    imageIssues: Issue[];
    fontIssues: Issue[];
    networkIssues: Issue[];
    renderingIssues: Issue[];
    cacheIssues: Issue[];
  };
  quickWins: Issue[];
  recommendations: string[];
}

function detectCSSIssues(report: LighthouseReport): Issue[] {
  const issues: Issue[] = [];

  // Unused CSS
  const unusedCSS = report.audits?.['unused-css-rules'];
  if (unusedCSS && unusedCSS.score !== null && unusedCSS.score !== undefined && unusedCSS.score < 0.9) {
    const items = (unusedCSS.details as any)?.items || [];
    const totalWasted = (unusedCSS.details as any)?.overallSavingsBytes || 0;

    if (totalWasted > 50000) {
      issues.push({
        category: 'performance',
        type: 'unused-css',
        severity: totalWasted > 200000 ? 'critical' : totalWasted > 100000 ? 'high' : 'medium',
        title: 'Excessive Unused CSS',
        description: `${(totalWasted / 1024).toFixed(0)}KB of CSS is not used (${items[0]?.wastedPercent?.toFixed(0) || 0}% waste)`,
        impact: {
          metric: 'Transfer Size',
          value: totalWasted,
          unit: 'bytes'
        },
        solution: {
          quick: 'Use PurgeCSS or UnCSS to remove unused rules',
          longTerm: 'Implement CSS-in-JS or CSS Modules for better tree-shaking',
          effort: 'medium'
        },
        resources: ['https://purgecss.com/', 'https://github.com/uncss/uncss']
      });
    }
  }

  // CSS-in-JS detection
  const mainThread = report.audits?.['mainthread-work-breakdown'];
  const styleWork = (mainThread?.details as any)?.items?.find((i: any) => i.group === 'styleLayout');
  if (styleWork?.duration > 1000) {
    issues.push({
      category: 'performance',
      type: 'style-recalculation',
      severity: styleWork.duration > 2000 ? 'high' : 'medium',
      title: 'Excessive Style & Layout Work',
      description: `Browser spends ${(styleWork.duration / 1000).toFixed(1)}s on style calculations`,
      impact: {
        metric: 'Main Thread Blocking',
        value: styleWork.duration,
        unit: 'ms'
      },
      solution: {
        quick: 'Use CSS containment and will-change sparingly',
        longTerm: 'Optimize CSS selectors and reduce complexity',
        effort: 'high'
      }
    });
  }

  // Non-composited animations
  const nonCompositedAnimations = report.audits?.['non-composited-animations'];
  if (nonCompositedAnimations?.score === 0) {
    issues.push({
      category: 'performance',
      type: 'non-composited-animations',
      severity: 'medium',
      title: 'Non-composited CSS Animations',
      description: 'Animations not running on compositor thread cause janky scrolling',
      impact: {
        metric: 'Frame Rate',
        value: 60,
        unit: 'fps'
      },
      solution: {
        quick: 'Use transform and opacity for animations',
        longTerm: 'Refactor animations to use GPU-accelerated properties',
        effort: 'low'
      }
    });
  }

  return issues;
}

function detectJavaScriptIssues(report: LighthouseReport): Issue[] {
  const issues: Issue[] = [];

  // Unused JavaScript
  const unusedJS = report.audits?.['unused-javascript'];
  if (unusedJS && unusedJS.score !== null && unusedJS.score !== undefined && unusedJS.score < 0.9) {
    const totalWasted = (unusedJS.details as any)?.overallSavingsBytes || 0;

    if (totalWasted > 50000) {
      issues.push({
        category: 'performance',
        type: 'unused-javascript',
        severity: totalWasted > 200000 ? 'critical' : totalWasted > 100000 ? 'high' : 'medium',
        title: 'Excessive Unused JavaScript',
        description: `${(totalWasted / 1024).toFixed(0)}KB of JavaScript is not executed`,
        impact: {
          metric: 'Transfer Size',
          value: totalWasted,
          unit: 'bytes'
        },
        solution: {
          quick: 'Enable code splitting and tree shaking',
          longTerm: 'Implement dynamic imports and lazy loading',
          effort: 'medium'
        }
      });
    }
  }

  // Long tasks
  const longTasks = report.audits?.['long-tasks'];
  if (longTasks?.details) {
    const items = (longTasks.details as any)?.items || [];
    const longTaskCount = items.filter((t: any) => t.duration > 50).length;

    if (longTaskCount > 5) {
      issues.push({
        category: 'performance',
        type: 'long-tasks',
        severity: 'high',
        title: 'Multiple Long JavaScript Tasks',
        description: `${longTaskCount} tasks block the main thread for >50ms`,
        impact: {
          metric: 'Total Blocking Time',
          value: report.audits?.['total-blocking-time']?.numericValue,
          unit: 'ms'
        },
        solution: {
          quick: 'Break up long tasks with setTimeout or requestIdleCallback',
          longTerm: 'Use Web Workers for heavy computations',
          effort: 'high'
        }
      });
    }
  }

  // Third-party impact
  const thirdParty = report.audits?.['third-party-summary'];
  if (thirdParty && thirdParty.score !== null && thirdParty.score !== undefined && thirdParty.score < 0.9) {
    const items = (thirdParty.details as any)?.items || [];
    const highImpact = items.filter((i: any) => i.blockingTime > 250);

    if (highImpact.length > 0) {
      issues.push({
        category: 'performance',
        type: 'third-party-blocking',
        severity: 'high',
        title: 'Third-party Scripts Blocking Main Thread',
        description: `${highImpact.length} third-party scripts cause significant blocking`,
        impact: {
          metric: 'Main Thread Blocking',
          value: highImpact.reduce((sum: number, i: any) => sum + i.blockingTime, 0),
          unit: 'ms'
        },
        solution: {
          quick: 'Load third-party scripts with async or defer',
          longTerm: 'Use facades or lazy-load third-party resources',
          effort: 'medium'
        }
      });
    }
  }

  return issues;
}

function detectImageIssues(report: LighthouseReport): Issue[] {
  const issues: Issue[] = [];

  // Unoptimized images
  const responsiveImages = report.audits?.['uses-responsive-images'];
  if (responsiveImages && responsiveImages.score !== null && responsiveImages.score !== undefined && responsiveImages.score < 0.9) {
    const savings = (responsiveImages.details as any)?.overallSavingsBytes || 0;

    if (savings > 100000) {
      issues.push({
        category: 'performance',
        type: 'oversized-images',
        severity: savings > 500000 ? 'high' : 'medium',
        title: 'Images Not Properly Sized',
        description: `Save ${(savings / 1024).toFixed(0)}KB by serving responsive images`,
        impact: {
          metric: 'Transfer Size',
          value: savings,
          unit: 'bytes'
        },
        solution: {
          quick: 'Implement srcset and sizes attributes',
          longTerm: 'Use an image CDN with automatic optimization',
          effort: 'low'
        }
      });
    }
  }

  // Modern formats
  const modernFormats = report.audits?.['uses-webp-images'];
  if (modernFormats && modernFormats.score !== null && modernFormats.score !== undefined && modernFormats.score < 0.9) {
    const savings = (modernFormats.details as any)?.overallSavingsBytes || 0;

    if (savings > 100000) {
      issues.push({
        category: 'performance',
        type: 'legacy-image-formats',
        severity: 'medium',
        title: 'Not Using Modern Image Formats',
        description: `Save ${(savings / 1024).toFixed(0)}KB by using WebP or AVIF`,
        impact: {
          metric: 'Transfer Size',
          value: savings,
          unit: 'bytes'
        },
        solution: {
          quick: 'Convert images to WebP format',
          longTerm: 'Implement automatic format selection based on browser support',
          effort: 'low'
        }
      });
    }
  }

  // Lazy loading
  const lazyLoad = report.audits?.['offscreen-images'];
  if (lazyLoad && lazyLoad.score !== null && lazyLoad.score !== undefined && lazyLoad.score < 0.9) {
    const savings = (lazyLoad.details as any)?.overallSavingsBytes || 0;

    if (savings > 50000) {
      issues.push({
        category: 'performance',
        type: 'eager-loading-images',
        severity: 'medium',
        title: 'Offscreen Images Not Lazy Loaded',
        description: `${(savings / 1024).toFixed(0)}KB loaded unnecessarily on initial page load`,
        impact: {
          metric: 'Initial Load',
          value: savings,
          unit: 'bytes'
        },
        solution: {
          quick: 'Add loading="lazy" to offscreen images',
          longTerm: 'Implement Intersection Observer for progressive loading',
          effort: 'low'
        }
      });
    }
  }

  return issues;
}

function detectFontIssues(report: LighthouseReport): Issue[] {
  const issues: Issue[] = [];

  // Font display
  const fontDisplay = report.audits?.['font-display'];
  if (fontDisplay?.score === 0) {
    issues.push({
      category: 'performance',
      type: 'font-display',
      severity: 'medium',
      title: 'Fonts Block Text Rendering',
      description: 'Web fonts cause invisible text during load',
      impact: {
        metric: 'First Contentful Paint',
        value: 100,
        unit: 'ms'
      },
      solution: {
        quick: 'Add font-display: swap to @font-face rules',
        longTerm: 'Implement font loading strategy with preload',
        effort: 'low'
      }
    });
  }

  // Preconnect
  const preconnect = report.audits?.['uses-rel-preconnect'];
  if (preconnect?.details) {
    const items = (preconnect.details as any)?.items || [];
    const fontOrigins = items.filter((i: any) =>
      i.url.includes('fonts.googleapis.com') ||
      i.url.includes('fonts.gstatic.com')
    );

    if (fontOrigins.length > 0) {
      issues.push({
        category: 'performance',
        type: 'missing-preconnect',
        severity: 'low',
        title: 'Missing Preconnect for Font Origins',
        description: 'Font loading can be accelerated with preconnect hints',
        impact: {
          metric: 'Connection Time',
          value: 300,
          unit: 'ms'
        },
        solution: {
          quick: 'Add <link rel="preconnect"> for font origins',
          longTerm: 'Self-host critical fonts',
          effort: 'low'
        }
      });
    }
  }

  return issues;
}

function detectNetworkIssues(report: LighthouseReport): Issue[] {
  const issues: Issue[] = [];

  // HTTP/2
  const http2 = report.audits?.['uses-http2'];
  if (http2?.score === 0) {
    const items = (http2.details as any)?.items || [];
    if (items.length > 5) {
      issues.push({
        category: 'performance',
        type: 'http1-resources',
        severity: 'medium',
        title: 'Resources Not Served Over HTTP/2',
        description: `${items.length} resources use HTTP/1.1, causing slower loads`,
        impact: {
          metric: 'Request Latency',
          value: items.length * 50,
          unit: 'ms'
        },
        solution: {
          quick: 'Enable HTTP/2 on your server',
          longTerm: 'Consider HTTP/3 for further improvements',
          effort: 'low'
        }
      });
    }
  }

  // Text compression
  const compression = report.audits?.['uses-text-compression'];
  if (compression && compression.score !== null && compression.score !== undefined && compression.score < 1) {
    const savings = (compression.details as any)?.overallSavingsBytes || 0;

    if (savings > 50000) {
      issues.push({
        category: 'performance',
        type: 'uncompressed-text',
        severity: 'high',
        title: 'Text Assets Not Compressed',
        description: `Save ${(savings / 1024).toFixed(0)}KB with text compression`,
        impact: {
          metric: 'Transfer Size',
          value: savings,
          unit: 'bytes'
        },
        solution: {
          quick: 'Enable gzip or brotli compression',
          longTerm: 'Configure optimal compression levels',
          effort: 'low'
        }
      });
    }
  }

  // Cache headers
  const cacheHeaders = report.audits?.['uses-long-cache-ttl'];
  if (cacheHeaders && cacheHeaders.score !== null && cacheHeaders.score !== undefined && cacheHeaders.score < 0.9) {
    const items = (cacheHeaders.details as any)?.items || [];
    const uncached = items.filter((i: any) => i.cacheLifetimeMs < 86400000);

    if (uncached.length > 10) {
      issues.push({
        category: 'performance',
        type: 'short-cache-ttl',
        severity: 'medium',
        title: 'Inefficient Cache Policy',
        description: `${uncached.length} resources have suboptimal cache headers`,
        impact: {
          metric: 'Repeat Visit Performance',
          value: uncached.length * 100,
          unit: 'ms'
        },
        solution: {
          quick: 'Set longer cache TTL for static assets',
          longTerm: 'Implement cache busting with versioned URLs',
          effort: 'low'
        }
      });
    }
  }

  return issues;
}

function detectRenderingIssues(report: LighthouseReport): Issue[] {
  const issues: Issue[] = [];

  // Render-blocking resources
  const renderBlocking = report.audits?.['render-blocking-resources'];
  if (renderBlocking && renderBlocking.score !== null && renderBlocking.score !== undefined && renderBlocking.score < 0.9) {
    const savings = (renderBlocking.details as any)?.overallSavingsMs || 0;

    if (savings > 500) {
      issues.push({
        category: 'performance',
        type: 'render-blocking',
        severity: savings > 2000 ? 'critical' : savings > 1000 ? 'high' : 'medium',
        title: 'Render-Blocking Resources',
        description: `Eliminate ${(savings / 1000).toFixed(1)}s of render-blocking time`,
        impact: {
          metric: 'First Paint',
          value: savings,
          unit: 'ms'
        },
        solution: {
          quick: 'Inline critical CSS and defer non-critical',
          longTerm: 'Implement Critical CSS extraction pipeline',
          effort: 'medium'
        }
      });
    }
  }

  // DOM size
  const domSize = report.audits?.['dom-size'];
  if (domSize && domSize.score !== null && domSize.score !== undefined && domSize.score < 0.5) {
    const items = (domSize.details as any)?.items || [];
    const totalElements = items[0]?.value?.value || 0;

    if (totalElements > 1500) {
      issues.push({
        category: 'performance',
        type: 'excessive-dom',
        severity: totalElements > 3000 ? 'high' : 'medium',
        title: 'Excessive DOM Size',
        description: `DOM has ${totalElements} elements, impacting performance`,
        impact: {
          metric: 'Memory Usage',
          value: totalElements * 0.5,
          unit: 'KB'
        },
        solution: {
          quick: 'Implement virtual scrolling for long lists',
          longTerm: 'Refactor to reduce DOM complexity',
          effort: 'high'
        }
      });
    }
  }

  // Layout shifts
  const cls = report.audits?.['cumulative-layout-shift'];
  if (cls?.numericValue && cls.numericValue > 0.1) {
    issues.push({
      category: 'performance',
      type: 'layout-shift',
      severity: cls.numericValue > 0.25 ? 'high' : 'medium',
      title: 'Poor Visual Stability',
      description: `CLS score of ${cls.numericValue.toFixed(3)} indicates layout instability`,
      impact: {
        metric: 'CLS Score',
        value: cls.numericValue,
        unit: ''
      },
      solution: {
        quick: 'Set explicit dimensions on images and embeds',
        longTerm: 'Reserve space for dynamic content',
        effort: 'medium'
      }
    });
  }

  return issues;
}

function detectCacheIssues(report: LighthouseReport): Issue[] {
  const issues: Issue[] = [];

  // Service worker
  const noSW = !report.audits?.['service-worker'];
  if (noSW) {
    issues.push({
      category: 'pwa',
      type: 'no-service-worker',
      severity: 'low',
      title: 'No Service Worker for Offline Support',
      description: 'Site cannot work offline or leverage advanced caching',
      impact: {
        metric: 'Offline Support',
        value: 0,
        unit: '%'
      },
      solution: {
        quick: 'Implement basic service worker with cache-first strategy',
        longTerm: 'Build complete offline experience',
        effort: 'high'
      }
    });
  }

  return issues;
}

function categorizeIssues(issues: Issue[]): ComprehensiveIssuesResult['categories'] {
  return {
    cssIssues: issues.filter(i =>
      i.type.includes('css') ||
      i.type.includes('style') ||
      i.type === 'render-blocking'
    ),
    jsIssues: issues.filter(i =>
      i.type.includes('javascript') ||
      i.type.includes('script') ||
      i.type === 'long-tasks' ||
      i.type === 'third-party-blocking'
    ),
    imageIssues: issues.filter(i =>
      i.type.includes('image') ||
      i.type.includes('responsive') ||
      i.type.includes('webp')
    ),
    fontIssues: issues.filter(i =>
      i.type.includes('font')
    ),
    networkIssues: issues.filter(i =>
      i.type.includes('http') ||
      i.type.includes('compression') ||
      i.type.includes('cache') ||
      i.type.includes('preconnect')
    ),
    renderingIssues: issues.filter(i =>
      i.type.includes('render') ||
      i.type.includes('dom') ||
      i.type.includes('layout') ||
      i.type === 'non-composited-animations'
    ),
    cacheIssues: issues.filter(i =>
      i.type.includes('cache') ||
      i.type.includes('service-worker')
    )
  };
}

function identifyQuickWins(issues: Issue[]): Issue[] {
  return issues
    .filter(i => i.solution.effort === 'low' && i.severity !== 'low')
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 5);
}

function generateRecommendations(issues: Issue[], categories: ComprehensiveIssuesResult['categories']): string[] {
  const recommendations: string[] = [];

  // Critical issues first
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    recommendations.push(`🚨 Address ${criticalIssues.length} critical issues immediately for maximum impact`);
  }

  // CSS-heavy sites
  if (categories.cssIssues.length > 3) {
    recommendations.push('📦 Implement CSS optimization strategy: splitting, tree-shaking, and critical CSS');
  }

  // JavaScript performance
  if (categories.jsIssues.length > 3) {
    recommendations.push('⚡ Optimize JavaScript delivery: code splitting, lazy loading, and Web Workers');
  }

  // Image optimization
  if (categories.imageIssues.length > 2) {
    recommendations.push('🖼️ Set up automated image optimization pipeline with modern formats');
  }

  // Network optimization
  if (categories.networkIssues.length > 2) {
    recommendations.push('🌐 Improve network performance: HTTP/2, compression, and caching strategies');
  }

  // Quick wins available
  const quickWins = identifyQuickWins(issues);
  if (quickWins.length > 3) {
    recommendations.push(`✅ Start with ${quickWins.length} quick wins for immediate improvements`);
  }

  return recommendations;
}

/**
 * Analyze comprehensive issues from a Lighthouse report
 * This is the core analysis function that can be used directly in tests
 */
// Add Core Web Vitals detection function
function detectCoreWebVitalsIssues(report: LighthouseReport): Issue[] {
  const issues: Issue[] = [];

  // LCP
  const lcp = report.audits?.['largest-contentful-paint'];
  if (lcp?.numericValue && lcp.numericValue > 2500) {
    issues.push({
      category: 'performance',
      type: 'slow-lcp',
      severity: lcp.numericValue > 4000 ? 'critical' : 'high',
      title: 'Slow Largest Contentful Paint',
      description: `LCP is ${(lcp.numericValue / 1000).toFixed(1)}s (target: <2.5s)`,
      impact: {
        metric: 'LCP',
        value: lcp.numericValue,
        unit: 'ms'
      },
      solution: {
        quick: 'Preload critical resources and optimize images',
        longTerm: 'Implement progressive enhancement strategy',
        effort: 'medium'
      }
    });
  }

  return issues;
}

export function analyzeComprehensiveIssues(report: LighthouseReport): ComprehensiveIssuesResult {
  // Detect all issues
  const allIssues: Issue[] = [
    ...detectCoreWebVitalsIssues(report),
    ...detectCSSIssues(report),
    ...detectJavaScriptIssues(report),
    ...detectImageIssues(report),
    ...detectFontIssues(report),
    ...detectNetworkIssues(report),
    ...detectRenderingIssues(report),
    ...detectCacheIssues(report)
  ];

  // Sort by severity
  allIssues.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // Categorize issues
  const categories = categorizeIssues(allIssues);

  // Identify quick wins
  const quickWins = identifyQuickWins(allIssues);

  // Generate recommendations
  const recommendations = generateRecommendations(allIssues, categories);

  // Calculate summary
  const summary = {
    totalIssues: allIssues.length,
    criticalCount: allIssues.filter(i => i.severity === 'critical').length,
    highCount: allIssues.filter(i => i.severity === 'high').length,
    mediumCount: allIssues.filter(i => i.severity === 'medium').length,
    lowCount: allIssues.filter(i => i.severity === 'low').length,
    estimatedImpact: {
      performance: Math.round(
        allIssues.reduce((sum, issue) => {
          if (issue.impact.metric === 'First Paint' ||
              issue.impact.metric === 'First Contentful Paint') {
            return sum + (issue.impact.value || 0) / 1000;
          }
          return sum;
        }, 0)
      ),
      size: Math.round(
        allIssues.reduce((sum, issue) => {
          if (issue.impact.unit === 'bytes') {
            return sum + (issue.impact.value || 0);
          }
          return sum;
        }, 0) / 1024
      ),
      time: Math.round(
        allIssues.reduce((sum, issue) => {
          if (issue.impact.unit === 'ms') {
            return sum + (issue.impact.value || 0);
          }
          return sum;
        }, 0)
      )
    }
  };

  return {
    issues: allIssues,
    summary,
    categories,
    quickWins,
    recommendations
  };
}

/**
 * Execute comprehensive issues analysis (MCP wrapper)
 */
export async function executeL2ComprehensiveIssues(
  params: ComprehensiveIssuesParams
): Promise<ComprehensiveIssuesResult> {
  let report: LighthouseReport;

  // Direct report input support
  if (params.report) {
    report = params.report;
  } else if (params.reportId) {
    const result = await executeL1GetReport({ reportId: params.reportId });
    report = result.data;
  } else if (params.url) {
    throw new Error('Direct URL analysis not implemented. Use reportId or provide report directly.');
  } else {
    throw new Error('Either reportId, url, or report is required');
  }

  return analyzeComprehensiveIssues(report);
}

// MCP Tool definition
export const l2ComprehensiveIssuesTool = {
  name: 'l2_comprehensive_issues',
  description: 'Detect all performance issues comprehensively (Layer 2)',
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
      },
      thresholds: {
        type: 'object',
        properties: {
          critical: { type: 'number' },
          high: { type: 'number' },
          medium: { type: 'number' }
        },
        description: 'Custom severity thresholds'
      }
    },
    oneOf: [
      { required: ['reportId'] },
      { required: ['url'] }
    ]
  },
  execute: async (params: ComprehensiveIssuesParams) => {
    const result = await executeL2ComprehensiveIssues(params);

    // Format output for MCP
    let output = `# Comprehensive Performance Issues Analysis\n\n`;

    output += `## Summary\n`;
    output += `- Total Issues: ${result.summary.totalIssues}\n`;
    output += `- Critical: ${result.summary.criticalCount} | High: ${result.summary.highCount} | Medium: ${result.summary.mediumCount} | Low: ${result.summary.lowCount}\n`;
    output += `- Estimated Impact: ${result.summary.estimatedImpact.performance}s faster, ${result.summary.estimatedImpact.size}KB smaller\n\n`;

    if (result.issues.filter(i => i.severity === 'critical').length > 0) {
      output += `## 🚨 Critical Issues\n`;
      result.issues.filter(i => i.severity === 'critical').forEach(issue => {
        output += `\n### ${issue.title}\n`;
        output += `- **Description**: ${issue.description}\n`;
        output += `- **Impact**: ${issue.impact.value}${issue.impact.unit} (${issue.impact.metric})\n`;
        output += `- **Quick Fix**: ${issue.solution.quick}\n`;
      });
    }

    if (result.quickWins.length > 0) {
      output += `\n## ✅ Quick Wins\n`;
      result.quickWins.forEach(issue => {
        output += `\n### ${issue.title}\n`;
        output += `- **Severity**: ${issue.severity}\n`;
        output += `- **Solution**: ${issue.solution.quick}\n`;
        output += `- **Effort**: ${issue.solution.effort}\n`;
      });
    }

    output += `\n## 📊 Issues by Category\n`;
    if (result.categories.cssIssues.length > 0) {
      output += `\n### CSS (${result.categories.cssIssues.length} issues)\n`;
      result.categories.cssIssues.slice(0, 3).forEach(i => {
        output += `- ${i.title}: ${i.description}\n`;
      });
    }

    if (result.categories.jsIssues.length > 0) {
      output += `\n### JavaScript (${result.categories.jsIssues.length} issues)\n`;
      result.categories.jsIssues.slice(0, 3).forEach(i => {
        output += `- ${i.title}: ${i.description}\n`;
      });
    }

    if (result.categories.imageIssues.length > 0) {
      output += `\n### Images (${result.categories.imageIssues.length} issues)\n`;
      result.categories.imageIssues.slice(0, 3).forEach(i => {
        output += `- ${i.title}: ${i.description}\n`;
      });
    }

    if (result.recommendations.length > 0) {
      output += `\n## 💡 Recommendations\n`;
      result.recommendations.forEach(rec => {
        output += `- ${rec}\n`;
      });
    }

    return {
      type: 'text',
      text: output
    };
  }
};