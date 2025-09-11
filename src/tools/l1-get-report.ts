/**
 * L1: Get Report Tool
 */

import { getDefaultStorage } from '../core/reportStorage.js';

export interface L1GetReportParams {
  reportId: string;
}

export interface L1GetReportResult {
  reportId: string;
  data: any; // Raw Lighthouse report data
  metadata: {
    url: string;
    device: string;
    categories: string[];
    timestamp: number;
  };
}

export const l1GetReportTool = {
  name: 'l1_get_report',
  description: 'Get raw Lighthouse report data by ID (Layer 1)',
  inputSchema: {
    type: 'object',
    properties: {
      reportId: {
        type: 'string',
        description: 'Report ID',
      },
    },
    required: ['reportId'],
  },
};

export async function executeL1GetReport(params: L1GetReportParams): Promise<L1GetReportResult> {
  const { reportId } = params;

  const storage = getDefaultStorage();
  const allReports = storage.getAllReports();
  
  if (allReports.isErr()) {
    throw new Error(`Failed to get reports: ${allReports.error.message}`);
  }

  const reportMeta = allReports.value.find(r => r.id === reportId);
  if (!reportMeta) {
    throw new Error(`Report not found: ${reportId}`);
  }

  const report = storage.loadReport(reportMeta);
  if (report.isErr()) {
    throw new Error(`Failed to load report: ${report.error.message}`);
  }

  return {
    reportId,
    data: report.value,
    metadata: {
      url: reportMeta.url,
      device: reportMeta.device,
      categories: reportMeta.categories,
      timestamp: reportMeta.timestamp,
    },
  };
}