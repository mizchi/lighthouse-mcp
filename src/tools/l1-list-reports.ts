/**
 * L1: List Reports Tool
 */

import { getDefaultStorage } from '../core/reportStorage.js';

export interface L1ListReportsParams {
  url?: string;
  device?: 'mobile' | 'desktop';
  limit?: number;
}

export interface L1ListReportsResult {
  reports: Array<{
    id: string;
    url: string;
    device: string;
    categories: string[];
    timestamp: number;
    age: string;
  }>;
  total: number;
}

export const l1ListReportsTool = {
  name: 'l1_list_reports',
  description: 'List stored Lighthouse reports (Layer 1)',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Filter by URL',
      },
      device: {
        type: 'string',
        enum: ['mobile', 'desktop'],
        description: 'Filter by device type',
      },
      limit: {
        type: 'number',
        default: 10,
        description: 'Maximum number of reports to return',
      },
    },
  },
};

export async function executeL1ListReports(params: L1ListReportsParams): Promise<L1ListReportsResult> {
  const { url, device, limit = 10 } = params;

  const storage = getDefaultStorage();
  const allReports = storage.getAllReports();
  
  if (allReports.isErr()) {
    throw new Error(`Failed to get reports: ${allReports.error.message}`);
  }

  let reports = allReports.value;

  // Apply filters
  if (url) {
    reports = reports.filter(r => r.url === url);
  }
  if (device) {
    reports = reports.filter(r => r.device === device);
  }

  // Sort by timestamp (newest first)
  reports.sort((a, b) => b.timestamp - a.timestamp);

  const total = reports.length;
  const limited = reports.slice(0, limit);

  // Format results
  const now = Date.now();
  const formatted = limited.map(r => {
    const ageMs = now - r.timestamp;
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageMinutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
    const age = ageHours > 0 ? `${ageHours}h ${ageMinutes}m` : `${ageMinutes}m`;

    return {
      id: r.id,
      url: r.url,
      device: r.device,
      categories: r.categories,
      timestamp: r.timestamp,
      age,
    };
  });

  return { reports: formatted, total };
}