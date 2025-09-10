/**
 * Lighthouseメトリクス解析 - 純粋関数
 */

import type { LighthouseReport, LighthouseAudits, PerformanceMetrics } from '../types/index.js';

/**
 * パフォーマンスメトリクスを抽出
 */
export function extractMetrics(report: LighthouseReport): PerformanceMetrics {
  const metrics: PerformanceMetrics = {
    lcp: undefined,
    fcp: undefined,
    cls: undefined,
    tbt: undefined,
    ttfb: undefined,
    tti: undefined,
    si: undefined,
    fid: undefined
  };
  
  if (!report.audits) {
    return metrics;
  }
  
  // LCP (Largest Contentful Paint)
  const lcp = report.audits['largest-contentful-paint'];
  if (lcp?.numericValue !== undefined) {
    metrics.lcp = lcp.numericValue;
  }
  
  // FCP (First Contentful Paint)
  const fcp = report.audits['first-contentful-paint'];
  if (fcp?.numericValue !== undefined) {
    metrics.fcp = fcp.numericValue;
  }
  
  // CLS (Cumulative Layout Shift)
  const cls = report.audits['cumulative-layout-shift'];
  if (cls?.numericValue !== undefined) {
    metrics.cls = cls.numericValue;
  }
  
  // TBT (Total Blocking Time)
  const tbt = report.audits['total-blocking-time'];
  if (tbt?.numericValue !== undefined) {
    metrics.tbt = tbt.numericValue;
  }
  
  // TTFB (Time to First Byte)
  const ttfb = report.audits['server-response-time'];
  if (ttfb?.numericValue !== undefined) {
    metrics.ttfb = ttfb.numericValue;
  }
  
  // TTI (Time to Interactive)
  const tti = report.audits['interactive'];
  if (tti?.numericValue !== undefined) {
    metrics.tti = tti.numericValue;
  }
  
  // Speed Index
  const si = report.audits['speed-index'];
  if (si?.numericValue !== undefined) {
    metrics.si = si.numericValue;
  }
  
  // FID (First Input Delay)
  const fid = report.audits['max-potential-fid'];
  if (fid?.numericValue !== undefined) {
    metrics.fid = fid.numericValue;
  }
  
  return metrics;
}

// 後方互換性のためのエイリアス
export const extractPerformanceMetrics = extractMetrics;

/**
 * パフォーマンススコアを計算
 */
export function calculatePerformanceScore(metrics: PerformanceMetrics): number {
  // Lighthouse v10のスコア計算ウェイト
  const weights = {
    fcp: 0.1,
    lcp: 0.25,
    tbt: 0.3,
    cls: 0.25,
    si: 0.1,
  };

  // 各メトリクスのスコアリング関数（簡略版）
  const scoringFunctions = {
    fcp: (value: number) => scoreMetric(value, 1800, 3000),
    lcp: (value: number) => scoreMetric(value, 2500, 4000),
    tbt: (value: number) => scoreMetric(value, 200, 600),
    cls: (value: number) => scoreMetric(value, 0.1, 0.25),
    si: (value: number) => scoreMetric(value, 3400, 5800),
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const [metric, weight] of Object.entries(weights)) {
    const value = metrics[metric as keyof typeof weights];
    if (value !== undefined) {
      const scoringFn = scoringFunctions[metric as keyof typeof scoringFunctions];
      if (scoringFn) {
        const score = scoringFn(value);
        totalScore += score * weight;
        totalWeight += weight;
      }
    }
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * メトリクス値をスコアに変換（0-1の範囲）
 */
function scoreMetric(value: number, p10: number, p90: number): number {
  // p10以下なら1点、p90以上なら0点
  if (value <= p10) return 1;
  if (value >= p90) return 0;

  // 線形補間
  return 1 - (value - p10) / (p90 - p10);
}

/**
 * メトリクスの改善提案を生成
 */
export interface MetricImprovement {
  metric: keyof PerformanceMetrics;
  currentValue: number;
  targetValue: number;
  impact: 'high' | 'medium' | 'low';
  improvementPercentage: number;
}

export function suggestMetricImprovements(metrics: PerformanceMetrics): MetricImprovement[] {
  const targets = {
    firstContentfulPaint: { good: 1800, poor: 3000 },
    largestContentfulPaint: { good: 2500, poor: 4000 },
    totalBlockingTime: { good: 200, poor: 600 },
    cumulativeLayoutShift: { good: 0.1, poor: 0.25 },
    speedIndex: { good: 3400, poor: 5800 },
    interactive: { good: 3800, poor: 7300 },
  };

  const improvements: MetricImprovement[] = [];

  for (const [metric, target] of Object.entries(targets)) {
    const currentValue = metrics[metric as keyof PerformanceMetrics];
    if (currentValue === undefined || currentValue <= target.good) {
      continue;
    }

    const improvementPercentage = ((currentValue - target.good) / currentValue) * 100;
    const impact = currentValue >= target.poor ? 'high' : 'medium';

    improvements.push({
      metric: metric as keyof PerformanceMetrics,
      currentValue,
      targetValue: target.good,
      impact,
      improvementPercentage: Math.round(improvementPercentage),
    });
  }

  // 影響度でソート
  return improvements.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });
}
