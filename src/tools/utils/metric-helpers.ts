/**
 * Common metric calculation helpers
 */

import type { LighthouseReport } from '../../types/index.js';

export interface CoreWebVitals {
  lcp: number;
  fcp: number;
  cls: number;
  tbt: number;
  ttfb?: number;
  fid?: number;
  inp?: number;
}

/**
 * Extract Core Web Vitals from a Lighthouse report
 */
export function extractCoreWebVitals(report: LighthouseReport): CoreWebVitals {
  const audits = report.audits;

  return {
    lcp: audits['largest-contentful-paint']?.numericValue || 0,
    fcp: audits['first-contentful-paint']?.numericValue || 0,
    cls: audits['cumulative-layout-shift']?.numericValue || 0,
    tbt: audits['total-blocking-time']?.numericValue || 0,
    ttfb: audits['time-to-first-byte']?.numericValue,
    fid: audits['max-potential-fid']?.numericValue,
    inp: audits['interaction-to-next-paint']?.numericValue,
  };
}

/**
 * Get audit weight from category configuration
 */
export function getAuditWeight(
  report: LighthouseReport,
  auditId: string,
  categoryId: string = 'performance'
): number {
  const category = report.categories?.[categoryId as keyof typeof report.categories];
  if (!category) return 0;

  const auditRef = category.auditRefs?.find((ref: any) => ref.id === auditId);
  return auditRef?.weight || 0;
}

/**
 * Calculate weighted score impact
 */
export function calculateWeightedImpact(score: number, weight: number): number {
  return (1 - score) * weight;
}

/**
 * Get performance score from report
 */
export function getPerformanceScore(report: LighthouseReport): number {
  return report.categories?.performance?.score || 0;
}

/**
 * Extract opportunities from report
 */
export interface Opportunity {
  id: string;
  title: string;
  score: number;
  savingsBytes?: number;
  savingsMs?: number;
}

export function extractOpportunities(report: LighthouseReport): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const [id, audit] of Object.entries(report.audits)) {
    if (audit && audit.details?.type === 'opportunity' && audit.score !== null && audit.score < 1) {
      opportunities.push({
        id,
        title: audit!.title,
        score: audit!.score,
        savingsBytes: (audit!.details as any).overallSavingsBytes,
        savingsMs: (audit!.details as any).overallSavingsMs,
      });
    }
  }

  return opportunities;
}

/**
 * Calculate total savings from opportunities
 */
export function calculateTotalSavings(opportunities: Opportunity[]): {
  bytes: number;
  ms: number;
} {
  return opportunities.reduce((acc, opp) => {
    acc.bytes += opp.savingsBytes || 0;
    acc.ms += opp.savingsMs || 0;
    return acc;
  }, { bytes: 0, ms: 0 });
}

/**
 * Check if metric passes threshold
 */
export function checkMetricThreshold(
  value: number,
  thresholds: { good: number; poor: number },
  lowerIsBetter: boolean = true
): 'good' | 'needs-improvement' | 'poor' {
  if (lowerIsBetter) {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  } else {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }
}

/**
 * Standard thresholds for Core Web Vitals
 */
export const CWV_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fcp: { good: 1800, poor: 3000 },
  cls: { good: 0.1, poor: 0.25 },
  tbt: { good: 200, poor: 600 },
  ttfb: { good: 800, poor: 1800 },
  inp: { good: 200, poor: 500 },
};