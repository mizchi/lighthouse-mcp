/**
 * L1: Single URL Collection Tool
 */

import { runLighthouse } from '../core/lighthouse.js';
import { getDefaultStorage } from '../core/reportStorage.js';
import type { LighthouseConfig } from '../types/index.js';

export interface L1CollectParams {
  url: string;
  device?: 'mobile' | 'desktop';
  categories?: string[];
  gather?: boolean;
  timeout?: number;
}

export interface L1CollectResult {
  reportId: string;
  url: string;
  device: string;
  categories: string[];
  timestamp: number;
  cached: boolean;
}

export const l1CollectTool = {
  name: 'l1_collect',
  description: 'Collect raw Lighthouse data for a URL (Layer 1)',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to analyze',
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
      timeout: {
        type: 'number',
        default: 120000,
        description: 'Timeout in milliseconds',
      },
    },
    required: ['url'],
  },
};

export async function executeL1Collect(params: L1CollectParams): Promise<L1CollectResult> {
  const {
    url,
    device = 'mobile',
    categories = ['performance'],
    gather = false,
    timeout = 120000,
  } = params;

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL format: ${url}`);
  }

  const storage = getDefaultStorage();

  // Check for existing report if not gathering
  if (!gather) {
    const existing = storage.findReport(url, device, categories, 1);
    if (existing.isOk() && existing.value) {
      return {
        reportId: existing.value.id,
        url: existing.value.url,
        device: existing.value.device,
        categories: existing.value.categories,
        timestamp: existing.value.timestamp,
        cached: true,
      };
    }
  }

  // Run Lighthouse
  const config: LighthouseConfig & { gather?: boolean } = {
    device,
    categories,
    timeout,
    gather: true, // Always gather for new collection
    userDataDir: '.lhdata/mcp',
  };

  const result = await runLighthouse(url, config);
  if (!result.isOk()) {
    throw new Error(`Lighthouse failed: ${result.error.message}`);
  }

  // Get the saved report info
  const allReports = storage.getAllReports();
  if (allReports.isErr()) {
    throw new Error('Failed to get report info');
  }

  // Find the most recent report for this URL
  const latestReport = allReports.value
    .filter(r => r.url === url && r.device === device)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (!latestReport) {
    throw new Error('Report was not saved properly');
  }

  return {
    reportId: latestReport.id,
    url: latestReport.url,
    device: latestReport.device,
    categories: latestReport.categories,
    timestamp: latestReport.timestamp,
    cached: false,
  };
}