/**
 * Batch Analyze Tool - Analyze multiple URLs in parallel
 */

import { runLighthouseBatch } from '../core/lighthouse.js';
import { performDeepAnalysis } from '../analyzers/deepAnalysis.js';
import type { LighthouseConfig } from '../types/index.js';

export interface BatchAnalyzeParams {
  urls: string[];
  device?: 'mobile' | 'desktop';
  categories?: string[];
  maxBrowsers?: number;
  includeDeepAnalysis?: boolean;
}

export interface BatchAnalyzeResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Tool definition for MCP
 */
export const batchAnalyzeTool = {
  name: 'batch_analyze',
  description: 'Analyze multiple URLs with Lighthouse in parallel',
  inputSchema: {
    type: 'object',
    properties: {
      urls: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'List of URLs to analyze',
      },
      device: {
        type: 'string',
        enum: ['mobile', 'desktop'],
        default: 'mobile',
        description: 'Device type for analysis',
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
      maxBrowsers: {
        type: 'number',
        default: 3,
        minimum: 1,
        maximum: 10,
        description: 'Maximum number of parallel browsers',
      },
      includeDeepAnalysis: {
        type: 'boolean',
        default: false,
        description: 'Include deep analysis for each URL',
      },
    },
    required: ['urls'],
  },
};

/**
 * Execute the batch_analyze tool
 */
export async function executeBatchAnalyze(params: BatchAnalyzeParams): Promise<BatchAnalyzeResult> {
  const {
    urls,
    device = 'mobile',
    categories = ['performance'],
    maxBrowsers = 3,
    includeDeepAnalysis = false,
  } = params;

  if (!urls || urls.length === 0) {
    throw new Error('At least one URL is required');
  }

  // Validate all URLs
  for (const url of urls) {
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL format: ${url}`);
    }
  }

  // Configure Lighthouse
  const config: LighthouseConfig = {
    device,
    categories,
    maxBrowsers,
    timeout: 120000,
    userDataDir: '.lhdata/batch',
  };

  // Run Lighthouse batch
  const result = await runLighthouseBatch(urls, config);

  if (!result.isOk()) {
    const errors = result.error.map(e => e.message).join(', ');
    throw new Error(`Batch analysis failed: ${errors}`);
  }

  const reports = result.value;
  const results: string[] = [];

  // Process each report
  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    const url = urls[i];
    
    results.push(`## Analysis for ${url}\n`);
    
    // Basic metrics
    const performanceScore = report.categories?.performance?.score;
    if (performanceScore !== undefined && performanceScore !== null) {
      results.push(`Performance Score: ${Math.round(performanceScore * 100)}/100\n`);
    }

    // Core Web Vitals
    const lcp = report.audits?.['largest-contentful-paint']?.numericValue;
    const fcp = report.audits?.['first-contentful-paint']?.numericValue;
    const cls = report.audits?.['cumulative-layout-shift']?.numericValue;
    const tbt = report.audits?.['total-blocking-time']?.numericValue;

    if (lcp) results.push(`- LCP: ${(lcp / 1000).toFixed(2)}s`);
    if (fcp) results.push(`- FCP: ${(fcp / 1000).toFixed(2)}s`);
    if (cls !== undefined) results.push(`- CLS: ${cls.toFixed(3)}`);
    if (tbt) results.push(`- TBT: ${tbt.toFixed(0)}ms`);

    // Deep analysis if requested
    if (includeDeepAnalysis) {
      const analysis = performDeepAnalysis(report);
      results.push('\n### Deep Analysis Summary');
      results.push(`- ${analysis.problems.length} problems detected`);
      results.push(`- ${analysis.patterns.length} patterns identified`);
      
      if (analysis.recommendations.length > 0) {
        results.push('\n### Top Recommendations:');
        analysis.recommendations.slice(0, 3).forEach(rec => {
          results.push(`- ${rec.description} (Priority: ${rec.priority})`);
        });
      }
    }

    results.push('\n---\n');
  }

  return {
    content: [
      {
        type: 'text',
        text: results.join('\n'),
      },
    ],
  };
}