/**
 * L1: Batch Collection Tool
 */

import { executeL1Collect } from './l1-collect-single.js';

export interface L1BatchCollectParams {
  urls: string[];
  device?: 'mobile' | 'desktop';
  categories?: string[];
  gather?: boolean;
  maxBrowsers?: number;
}

export interface L1BatchCollectResult {
  reports: Array<{
    reportId: string;
    url: string;
    device: string;
    categories: string[];
    timestamp: number;
    cached: boolean;
  }>;
  failed: Array<{ url: string; error: string }>;
}

export const l1BatchCollectTool = {
  name: 'l1_batch_collect',
  description: 'Batch collect raw Lighthouse data for multiple URLs (Layer 1)',
  inputSchema: {
    type: 'object',
    properties: {
      urls: {
        type: 'array',
        items: { type: 'string' },
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
      gather: {
        type: 'boolean',
        default: false,
        description: 'Force fresh data collection (ignore cache)',
      },
      maxBrowsers: {
        type: 'number',
        default: 5,
        description: 'Maximum number of concurrent browsers',
      },
    },
    required: ['urls'],
  },
  execute: async (params: any) => {
    const result = await executeL1BatchCollect(params);
    return {
      type: 'text',
      text: JSON.stringify(result, null, 2)
    };
  }
};

export async function executeL1BatchCollect(params: L1BatchCollectParams): Promise<L1BatchCollectResult> {
  const {
    urls,
    device = 'mobile',
    categories = ['performance'],
    gather = false,
  } = params;

  const reports: L1BatchCollectResult['reports'] = [];
  const failed: L1BatchCollectResult['failed'] = [];

  for (const url of urls) {
    try {
      const result = await executeL1Collect({
        url,
        device,
        categories,
        gather,
      });
      reports.push(result);
    } catch (error) {
      failed.push({
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { reports, failed };
}