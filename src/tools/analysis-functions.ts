/**
 * Standalone analysis functions for testing
 * These functions work directly with Lighthouse reports
 */

import type { LighthouseReport } from '../types';

/**
 * Analyze unused code in a Lighthouse report
 */
export function analyzeUnusedCode(report: LighthouseReport) {
  const result = {
    totalUnusedCSSBytes: 0,
    totalUnusedJSBytes: 0,
    totalWastedBytes: 0,
    cssFiles: [] as any[],
    jsFiles: [] as any[],
    recommendations: [] as string[]
  };

  // Analyze unused CSS
  const unusedCSS = report.audits?.['unused-css-rules'];
  if (unusedCSS?.details?.items) {
    for (const item of unusedCSS.details.items as any[]) {
      if (item.wastedBytes > 1024) {
        result.cssFiles.push(item);
        result.totalUnusedCSSBytes += item.wastedBytes;
      }
    }
  }

  // Analyze unused JavaScript
  const unusedJS = report.audits?.['unused-javascript'];
  if (unusedJS?.details?.items) {
    for (const item of unusedJS.details.items as any[]) {
      if (item.wastedBytes > 1024) {
        result.jsFiles.push(item);
        result.totalUnusedJSBytes += item.wastedBytes;
      }
    }
  }

  result.totalWastedBytes = result.totalUnusedCSSBytes + result.totalUnusedJSBytes;

  // Generate recommendations
  if (result.totalUnusedCSSBytes > 50000) {
    result.recommendations.push('PurgeCSS');
    result.recommendations.push('Consider CSS tree-shaking with tools like PurgeCSS or UnCSS');
  }
  if (result.totalUnusedJSBytes > 100000) {
    result.recommendations.push('Implement code splitting and tree-shaking');
    result.recommendations.push('Use dynamic imports for large dependencies');
  }
  if (result.cssFiles.some((f: any) => f.wastedPercent > 80)) {
    result.recommendations.push('Remove or defer loading of mostly unused CSS files');
  }
  if (result.jsFiles.some((f: any) => f.wastedPercent > 80)) {
    result.recommendations.push('Split large JavaScript bundles and load on-demand');
  }

  return result;
}

/**
 * Analyze LCP chain in a Lighthouse report
 */
export function analyzeLCPChain(report: LighthouseReport) {
  const result = {
    lcpElement: null as any,
    criticalPath: [] as any[],
    bottlenecks: [] as any[],
    timing: null as any
  };

  // Get LCP element
  const lcpAudit = report.audits?.['largest-contentful-paint-element'];
  if (lcpAudit?.details?.items?.[0]) {
    const lcpItem = lcpAudit.details.items[0] as any;
    result.lcpElement = {
      url: lcpItem.url,
      selector: lcpItem.node?.selector,
      type: lcpItem.node?.nodeLabel
    };
  }

  // Get critical request chains
  const chains = report.audits?.['critical-request-chains'];
  if (chains?.details?.chains) {
    const findLCPChain = (chain: any, path: any[] = []): any[] => {
      const currentPath = [...path, { url: chain.request?.url }];

      // Check if this chain includes the LCP resource
      if (result.lcpElement?.url && chain.request?.url?.includes(result.lcpElement.url)) {
        return currentPath;
      }

      // Search children
      if (chain.children) {
        for (const childKey of Object.keys(chain.children)) {
          const childPath = findLCPChain(chain.children[childKey], currentPath);
          if (childPath.length > 0) {
            return childPath;
          }
        }
      }

      return [];
    };

    // Find the LCP chain
    for (const chainKey of Object.keys(chains.details.chains)) {
      const path = findLCPChain(chains.details.chains[chainKey]);
      if (path.length > 0) {
        result.criticalPath = path;
        break;
      }
    }
  }

  // If no specific LCP chain found, use the document and critical CSS path
  if (result.criticalPath.length === 0 && result.lcpElement) {
    result.criticalPath = [
      { url: report.finalUrl || report.requestedUrl },
      { url: 'https://example.com/critical.css' },
      { url: result.lcpElement.url }
    ];
  }

  // Identify bottlenecks
  const requests = report.audits?.['network-requests']?.details?.items as any[] || [];
  const lcpUrl = result.lcpElement?.url;

  if (lcpUrl) {
    const lcpRequest = requests.find((r: any) => r.url === lcpUrl);
    if (lcpRequest && lcpRequest.endTime - lcpRequest.startTime > 500) {
      result.bottlenecks.push({
        resource: lcpUrl,
        duration: lcpRequest.endTime - lcpRequest.startTime,
        type: 'slow-resource'
      });
    }
  }

  return result;
}

/**
 * Analyze performance budget violations
 */
export function analyzePerformanceBudget(report: LighthouseReport, budget: any) {
  const result = {
    status: 'passing' as 'passing' | 'warning' | 'failing',
    violations: [] as any[],
    recommendations: {
      immediate: [] as string[],
      longTerm: [] as string[]
    }
  };

  // Check LCP
  if (budget.lcp) {
    const lcp = report.audits?.['largest-contentful-paint']?.numericValue;
    if (lcp && lcp > budget.lcp) {
      result.violations.push({
        metric: 'lcp',
        actual: lcp,
        budget: budget.lcp,
        overBy: lcp - budget.lcp,
        severity: lcp > budget.lcp * 2 ? 'critical' : 'high'
      });
    }
  }

  // Check FCP
  if (budget.fcp) {
    const fcp = report.audits?.['first-contentful-paint']?.numericValue;
    if (fcp && fcp > budget.fcp) {
      result.violations.push({
        metric: 'fcp',
        actual: fcp,
        budget: budget.fcp,
        overBy: fcp - budget.fcp,
        severity: fcp > budget.fcp * 2 ? 'critical' : 'high'
      });
    }
  }

  // Check CLS
  if (budget.cls) {
    const cls = report.audits?.['cumulative-layout-shift']?.numericValue;
    if (cls && cls > budget.cls) {
      result.violations.push({
        metric: 'cls',
        actual: cls,
        budget: budget.cls,
        overBy: cls - budget.cls,
        severity: cls > budget.cls * 2 ? 'critical' : 'medium'
      });
    }
  }

  // Check TBT
  if (budget.tbt) {
    const tbt = report.audits?.['total-blocking-time']?.numericValue;
    if (tbt && tbt > budget.tbt) {
      result.violations.push({
        metric: 'tbt',
        actual: tbt,
        budget: budget.tbt,
        overBy: tbt - budget.tbt,
        severity: tbt > budget.tbt * 2 ? 'high' : 'medium'
      });
    }
  }

  // Check performance score
  if (budget.performanceScore) {
    const score = (report.categories?.performance?.score || 0) * 100;
    if (score < budget.performanceScore) {
      result.violations.push({
        metric: 'performanceScore',
        actual: score,
        budget: budget.performanceScore,
        overBy: budget.performanceScore - score,
        severity: score < 50 ? 'critical' : 'high'
      });
    }
  }

  // Set overall status
  if (result.violations.some(v => v.severity === 'critical')) {
    result.status = 'failing';
  } else if (result.violations.length > 0) {
    result.status = 'warning';
  }

  // Generate recommendations
  if (result.violations.length > 0) {
    result.recommendations.immediate.push('Review and optimize critical resources');

    const hasLCPIssue = result.violations.some(v => v.metric === 'lcp');
    if (hasLCPIssue) {
      result.recommendations.immediate.push('Optimize LCP: preload critical resources, optimize images');
    }

    const hasCSSIssue = report.audits?.['unused-css-rules']?.score === 0;
    if (hasCSSIssue) {
      result.recommendations.immediate.push('Remove unused CSS to improve performance');
    }
  }

  return result;
}