import type { LighthouseReport } from '../types';

export interface UnusedCodeItem {
  url: string;
  totalBytes: number;
  unusedBytes: number;
  unusedPercent: number;
  type: 'js' | 'css';
}

export interface UnusedCodeAnalysis {
  totalWastedBytes: number;  // テストとの互換性のため
  totalUnusedBytes: number;
  totalBytes: number;
  unusedPercent: number;
  unusedJavaScript: UnusedCodeItem[];
  unusedCSS: UnusedCodeItem[];
  items: UnusedCodeItem[];
  recommendations: string[];
  summary: {
    js: {
      totalBytes: number;
      unusedBytes: number;
      unusedPercent: number;
    };
    css: {
      totalBytes: number;
      unusedBytes: number;
      unusedPercent: number;
    };
  };
}

/**
 * Analyze unused JavaScript and CSS in a Lighthouse report
 */
export function analyzeUnusedCode(report: LighthouseReport): UnusedCodeAnalysis {
  const items: UnusedCodeItem[] = [];
  let totalUnusedBytes = 0;
  let totalBytes = 0;
  
  const jsSummary = { totalBytes: 0, unusedBytes: 0, unusedPercent: 0 };
  const cssSummary = { totalBytes: 0, unusedBytes: 0, unusedPercent: 0 };
  
  // Analyze unused JavaScript
  const unusedJsAudit = report.audits?.['unused-javascript'];
  if (unusedJsAudit?.details?.items) {
    for (const item of unusedJsAudit.details.items) {
      const unusedItem: UnusedCodeItem = {
        url: item.url || '',
        totalBytes: item.totalBytes || 0,
        unusedBytes: item.wastedBytes || 0,
        unusedPercent: item.wastedPercent || 0,
        type: 'js'
      };
      
      items.push(unusedItem);
      totalBytes += unusedItem.totalBytes;
      totalUnusedBytes += unusedItem.unusedBytes;
      jsSummary.totalBytes += unusedItem.totalBytes;
      jsSummary.unusedBytes += unusedItem.unusedBytes;
    }
  }
  
  // Analyze unused CSS
  const unusedCssAudit = report.audits?.['unused-css-rules'];
  if (unusedCssAudit?.details?.items) {
    for (const item of unusedCssAudit.details.items) {
      const unusedItem: UnusedCodeItem = {
        url: item.url || '',
        totalBytes: item.totalBytes || 0,
        unusedBytes: item.wastedBytes || 0,
        unusedPercent: item.wastedPercent || 0,
        type: 'css'
      };
      
      items.push(unusedItem);
      totalBytes += unusedItem.totalBytes;
      totalUnusedBytes += unusedItem.unusedBytes;
      cssSummary.totalBytes += unusedItem.totalBytes;
      cssSummary.unusedBytes += unusedItem.unusedBytes;
    }
  }
  
  // Calculate percentages
  const unusedPercent = totalBytes > 0 ? (totalUnusedBytes / totalBytes) * 100 : 0;
  jsSummary.unusedPercent = jsSummary.totalBytes > 0 
    ? (jsSummary.unusedBytes / jsSummary.totalBytes) * 100 
    : 0;
  cssSummary.unusedPercent = cssSummary.totalBytes > 0 
    ? (cssSummary.unusedBytes / cssSummary.totalBytes) * 100 
    : 0;
  
  // Sort items by unused bytes (largest first)
  items.sort((a, b) => b.unusedBytes - a.unusedBytes);
  
  const jsItems = items.filter(item => item.type === 'js');
  const cssItems = items.filter(item => item.type === 'css');
  
  const result: UnusedCodeAnalysis = {
    totalWastedBytes: totalUnusedBytes,
    totalUnusedBytes,
    totalBytes,
    unusedPercent,
    unusedJavaScript: jsItems,
    unusedCSS: cssItems,
    items,
    recommendations: [] as string[],
    summary: {
      js: jsSummary,
      css: cssSummary
    }
  };
  
  // Add recommendations
  result.recommendations = getUnusedCodeRecommendations(result);
  
  return result;
}

/**
 * Get recommendations for reducing unused code
 */
function getUnusedCodeRecommendations(analysis: UnusedCodeAnalysis): string[] {
  const recommendations: string[] = [];
  
  if (analysis.unusedPercent > 50) {
    recommendations.push('Critical: Over 50% of your code is unused. Consider aggressive code splitting.');
  }
  
  if (analysis.summary.js.unusedPercent > 40) {
    recommendations.push('Implement dynamic imports for JavaScript modules');
    recommendations.push('Use tree-shaking to eliminate dead code');
    recommendations.push('Split vendor bundles from application code');
  }
  
  if (analysis.summary.css.unusedPercent > 40) {
    recommendations.push('Use CSS-in-JS or CSS modules for component-scoped styles');
    recommendations.push('Implement critical CSS inlining');
    recommendations.push('Remove unused CSS rules with PurgeCSS or similar tools');
  }
  
  // Specific file recommendations
  const topUnused = analysis.items.slice(0, 3);
  for (const item of topUnused) {
    if (item.unusedPercent > 60) {
      const filename = item.url.split('/').pop() || item.url;
      recommendations.push(`Review ${filename}: ${Math.round(item.unusedPercent)}% unused`);
    }
  }
  
  return recommendations;
}