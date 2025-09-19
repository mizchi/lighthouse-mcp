import { analyzeCriticalChains } from "../analyzers/criticalChain.js";
import { getDefaultStorage } from "../core/reportStorage.js";
import type { StoredReport } from "../core/reportStorage.js";
import type { LighthouseReport } from "../types/index.js";

export interface CriticalChainSummary {
  url: string;
  reportId: string;
  timestamp: number;
  device: "mobile" | "desktop";
  performanceScore: number;
  lcpMs: number | null;
  chainDurationMs: number | null;
  chainRequestCount: number | null;
  chainTransferKb: number | null;
  bottleneck?: {
    url: string;
    durationMs: number;
    contributionPct: number;
    impact: string;
    description: string;
  };
}

export interface GenerateCriticalChainReportParams {
  urls?: string[];
  limit?: number;
  device?: "mobile" | "desktop";
  includeDuplicates?: boolean;
  format?: "markdown" | "json";
}

export interface CriticalChainReportResult {
  summaries: CriticalChainSummary[];
  markdown?: string;
}

export async function generateCriticalChainReport(
  params: GenerateCriticalChainReportParams = {},
): Promise<CriticalChainReportResult> {
  const {
    urls,
    limit = 10,
    device,
    includeDuplicates = false,
    format = "json",
  } = params;

  const storage = getDefaultStorage();
  const storedReportsResult = storage.getAllReports();
  if (storedReportsResult.isErr()) {
    throw new Error(`Failed to load report index: ${storedReportsResult.error.message}`);
  }

  let reports = storedReportsResult.value.slice();

  if (device) {
    reports = reports.filter(report => report.device === device);
  }

  if (urls?.length) {
    const urlSet = new Set(urls.map(url => url.toLowerCase()));
    reports = reports.filter(report => urlSet.has(report.url.toLowerCase()));
  }

  reports.sort((a, b) => b.timestamp - a.timestamp);

  if (!includeDuplicates) {
    const deduped = new Map<string, StoredReport>();
    for (const report of reports) {
      if (!deduped.has(report.url)) {
        deduped.set(report.url, report);
      }
    }
    reports = Array.from(deduped.values());
  }

  reports = reports.slice(0, limit);

  const summaries: CriticalChainSummary[] = [];

  for (const storedReport of reports) {
    const reportResult = storage.loadReport(storedReport);
    if (reportResult.isErr()) {
      continue;
    }

    const report = reportResult.value as LighthouseReport;
    summaries.push(buildSummary(storedReport, report));
  }

  const markdown = format === "markdown" ? renderMarkdown(summaries) : undefined;

  return { summaries, markdown };
}

function buildSummary(storedReport: StoredReport, report: LighthouseReport): CriticalChainSummary {
  const performanceScore = Math.round((report.categories?.performance?.score ?? 0) * 100);
  const lcpValue = report.audits?.["largest-contentful-paint"]?.numericValue ?? null;
  const analysis = analyzeCriticalChains(report);

  if (!analysis) {
    return {
      url: storedReport.url,
      reportId: storedReport.id,
      timestamp: storedReport.timestamp,
      device: storedReport.device,
      performanceScore,
      lcpMs: lcpValue ? Math.round(lcpValue) : null,
      chainDurationMs: null,
      chainRequestCount: null,
      chainTransferKb: null,
    };
  }

  const bottleneck = analysis.lcp?.bottleneck ?? analysis.bottleneck;

  return {
    url: storedReport.url,
    reportId: storedReport.id,
    timestamp: storedReport.timestamp,
    device: storedReport.device,
    performanceScore,
    lcpMs: lcpValue ? Math.round(lcpValue) : null,
    chainDurationMs: Math.round(analysis.totalDuration),
    chainRequestCount: analysis.longestChain.nodes.length,
    chainTransferKb: Math.round(analysis.totalTransferSize / 1024),
    bottleneck: bottleneck
      ? {
          url: bottleneck.url,
          durationMs: Math.round(bottleneck.duration),
          contributionPct: Math.round(bottleneck.contribution * 100),
          impact: bottleneck.impact,
          description: bottleneck.reason,
        }
      : undefined,
  };
}

function renderMarkdown(summaries: CriticalChainSummary[]): string {
  if (summaries.length === 0) {
    return "# Critical Chain Report\n\n_No reports available._";
  }

  const rows = summaries
    .map(summary => {
      const bottleneck = summary.bottleneck
        ? `${summary.bottleneck.impact}: ${summary.bottleneck.url} (${summary.bottleneck.durationMs}ms · ${summary.bottleneck.contributionPct}% of chain)`
        : "N/A";

      return `| ${summary.url} | ${summary.performanceScore} | ${summary.lcpMs ?? "N/A"} | ${summary.chainDurationMs ?? "N/A"} | ${summary.chainRequestCount ?? "N/A"} | ${bottleneck} |`;
    })
    .join("\n");

  return `# Critical Chain Report\n\n| URL | Perf Score | LCP (ms) | Chain Duration (ms) | Requests | Top Bottleneck |\n| --- | --- | --- | --- | --- | --- |\n${rows}`;
}

export default generateCriticalChainReport;

import type { MCPTool } from '../types/mcp-types.js';

export const l2CriticalChainReportTool: MCPTool = {
  name: 'l2_critical_chain_report',
  description: 'Layer 2 - Analyze critical request chains and identify bottlenecks',
  inputSchema: {
    type: 'object',
    properties: {
      reportIds: {
        type: 'array',
        description: 'Array of report IDs to analyze',
        items: { type: 'string' }
      },
      urls: {
        type: 'array',
        description: 'URLs to analyze (will run new Lighthouse tests)',
        items: { type: 'string' }
      }
    }
  },
  execute: async (params: any) => {
    const report = await generateCriticalChainReport(params);
    return {
      type: 'text',
      text: JSON.stringify(report, null, 2)
    };
  }
};
