/**
 * Common utility for loading Lighthouse reports
 */

import type { LighthouseReport } from '../../types/index.js';
import { executeL1GetReport } from '../l1-get-report.js';
import { executeL1Collect } from '../l1-collect-single.js';

export interface ReportLoaderParams {
  reportId?: string;
  url?: string;
  report?: LighthouseReport;
  device?: 'mobile' | 'desktop';
  categories?: string[];
  gather?: boolean;
}

export interface LoadedReport {
  report: LighthouseReport;
  reportId: string;
}

/**
 * Load a Lighthouse report from various sources
 * Priority: direct report > reportId > url
 */
export async function loadReport(params: ReportLoaderParams): Promise<LoadedReport> {
  // Direct report input
  if (params.report) {
    return {
      report: params.report,
      reportId: 'direct-input'
    };
  }

  // Load by reportId
  if (params.reportId) {
    const result = await executeL1GetReport({ reportId: params.reportId });
    return {
      report: result.data,
      reportId: params.reportId
    };
  }

  // Collect new report from URL
  if (params.url) {
    const collectResult = await executeL1Collect({
      url: params.url,
      device: params.device || 'mobile',
      categories: params.categories || ['performance'],
      gather: params.gather !== undefined ? params.gather : false,
    });

    const result = await executeL1GetReport({ reportId: collectResult.reportId });
    return {
      report: result.data,
      reportId: collectResult.reportId
    };
  }

  throw new Error('Either reportId, url, or report is required');
}