import type { LighthouseReport } from '../types';

export interface WebVitalsMetric {
  value: number;
  score: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  insights?: string[];
  recommendations?: string[];
}

export interface TTFBAnalysis extends WebVitalsMetric {
  breakdown?: {
    serverTime?: number;
    networkTime?: number;
    processingTime?: number;
  };
}

export interface WebVitalsCorrelation {
  fcpToLcp?: {
    delta: number;
    ratio: number;
    insight?: string;
  };
  layoutStability?: {
    clsImpactOnLcp: 'low' | 'medium' | 'high';
    clsImpactOnFid?: 'low' | 'medium' | 'high';
  };
}

export interface WebVitalsCriticalIssue {
  metric: string;
  severity: 'warning' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high';
  value: number;
  threshold: number;
  recommendation?: string;
}

export interface WebVitalsHealth {
  score: number;
  rating: 'poor' | 'needs-improvement' | 'good' | 'excellent';
  passedMetrics: string[];
  failedMetrics: string[];
}

export interface WebVitalsAnalysis {
  inp?: WebVitalsMetric;
  ttfb?: TTFBAnalysis;
  lcp?: WebVitalsMetric;
  fcp?: WebVitalsMetric;
  cls?: WebVitalsMetric;
  fid?: WebVitalsMetric;
  tbt?: WebVitalsMetric;
  correlations?: WebVitalsCorrelation;
  criticalIssues?: WebVitalsCriticalIssue[];
  overallHealth?: WebVitalsHealth;
}

function getMetricRating(value: number, thresholds: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

export function analyzeWebVitals(report: LighthouseReport): WebVitalsAnalysis {
  const result: WebVitalsAnalysis = {};
  const criticalIssues: WebVitalsCriticalIssue[] = [];
  const passedMetrics: string[] = [];
  const failedMetrics: string[] = [];

  // Analyze INP (Interaction to Next Paint)
  const inpAudit = report.audits?.['interaction-to-next-paint'];
  if (inpAudit?.numericValue !== undefined) {
    const value = inpAudit.numericValue;
    const score = inpAudit.score || 0;
    const rating = getMetricRating(value, { good: 200, poor: 500 });

    result.inp = {
      value,
      score,
      rating,
      insights: []
    };

    if (value > 200) {
      result.inp.insights?.push('INP is above 200ms threshold');

      if (value > 500) {
        criticalIssues.push({
          metric: 'INP',
          severity: 'critical',
          impact: 'high',
          value,
          threshold: 500,
          recommendation: 'Optimize JavaScript execution and reduce main thread blocking'
        });
        failedMetrics.push('INP');
      }
    } else {
      passedMetrics.push('INP');
    }
  }

  // Analyze TTFB (Time to First Byte)
  const ttfbAudit = report.audits?.['time-to-first-byte'];
  const serverTimeAudit = report.audits?.['server-response-time'];

  if (ttfbAudit?.numericValue !== undefined || serverTimeAudit?.numericValue !== undefined) {
    const value = ttfbAudit?.numericValue || serverTimeAudit?.numericValue || 0;
    const score = ttfbAudit?.score || serverTimeAudit?.score || 0;
    const rating = getMetricRating(value, { good: 800, poor: 1799 });

    result.ttfb = {
      value,
      score,
      rating,
      breakdown: {
        serverTime: serverTimeAudit?.numericValue
      },
      recommendations: []
    };

    if (value >= 1800) {
      result.ttfb.recommendations?.push('Consider using a CDN');
      result.ttfb.recommendations?.push('Optimize server response time');
      failedMetrics.push('TTFB');
    } else if (value > 800) {
      result.ttfb.recommendations?.push('Server response time could be improved');
    } else {
      passedMetrics.push('TTFB');
    }
  }

  // Analyze Core Web Vitals correlations
  const lcpAudit = report.audits?.['largest-contentful-paint'];
  const fcpAudit = report.audits?.['first-contentful-paint'];
  const clsAudit = report.audits?.['cumulative-layout-shift'];
  const fidAudit = report.audits?.['first-input-delay'];
  const tbtAudit = report.audits?.['total-blocking-time'];

  // Analyze LCP independently
  if (lcpAudit?.numericValue !== undefined) {
    const lcpValue = lcpAudit.numericValue;
    const lcpRating = getMetricRating(lcpValue, { good: 2500, poor: 4000 });
    result.lcp = {
      value: lcpValue,
      score: lcpAudit.score || 0,
      rating: lcpRating
    };

    if (lcpValue > 4000) {
      criticalIssues.push({
        metric: 'LCP',
        severity: 'critical',
        impact: 'high',
        value: lcpValue,
        threshold: 4000
      });
      failedMetrics.push('LCP');
    } else {
      passedMetrics.push('LCP');
    }
  }

  // Analyze FCP and correlations
  if (fcpAudit?.numericValue !== undefined) {
    const fcpValue = fcpAudit.numericValue;
    result.fcp = {
      value: fcpValue,
      score: fcpAudit.score || 0,
      rating: getMetricRating(fcpValue, { good: 1800, poor: 3000 })
    };

    if (fcpValue <= 1800) {
      passedMetrics.push('FCP');
    }

    // Calculate correlation if both FCP and LCP exist
    if (lcpAudit?.numericValue !== undefined) {
      const lcpValue = lcpAudit.numericValue;
      const delta = lcpValue - fcpValue;
      const ratio = lcpValue / fcpValue;

      result.correlations = {
        fcpToLcp: {
          delta,
          ratio,
          insight: ratio > 2 ? 'Large gap between FCP and LCP suggests render-blocking resources' : undefined
        }
      };
    }
  }

  // CLS analysis
  if (clsAudit?.numericValue !== undefined) {
    const clsValue = clsAudit.numericValue;
    const clsRating = getMetricRating(clsValue, { good: 0.1, poor: 0.25 });

    result.cls = {
      value: clsValue,
      score: clsAudit.score || 0,
      rating: clsRating
    };

    if (result.correlations) {
      result.correlations.layoutStability = {
        clsImpactOnLcp: clsValue > 0.25 ? 'high' : clsValue > 0.1 ? 'medium' : 'low'
      };
    }

    if (clsValue > 0.25) {
      criticalIssues.push({
        metric: 'CLS',
        severity: 'critical',
        impact: 'high',
        value: clsValue,
        threshold: 0.25
      });
      failedMetrics.push('CLS');
    } else if (clsValue <= 0.1) {
      passedMetrics.push('CLS');
    }
  }

  // FID analysis
  if (fidAudit?.numericValue !== undefined) {
    const fidValue = fidAudit.numericValue;
    result.fid = {
      value: fidValue,
      score: fidAudit.score || 0,
      rating: getMetricRating(fidValue, { good: 100, poor: 300 })
    };

    if (fidValue <= 100) {
      passedMetrics.push('FID');
    }
  }

  // TBT analysis
  if (tbtAudit?.numericValue !== undefined) {
    const tbtValue = tbtAudit.numericValue;
    result.tbt = {
      value: tbtValue,
      score: tbtAudit.score || 0,
      rating: getMetricRating(tbtValue, { good: 200, poor: 600 })
    };

    if (tbtValue > 600) {
      criticalIssues.push({
        metric: 'TBT',
        severity: 'critical',
        impact: 'high',
        value: tbtValue,
        threshold: 600
      });
      failedMetrics.push('TBT');
    } else if (tbtValue <= 200) {
      passedMetrics.push('TBT');
    }
  }

  // Set critical issues
  if (criticalIssues.length > 0) {
    result.criticalIssues = criticalIssues;
  }

  // Calculate overall health score
  const auditScores = [
    inpAudit?.score,
    ttfbAudit?.score || serverTimeAudit?.score,
    lcpAudit?.score,
    fcpAudit?.score,
    clsAudit?.score,
    fidAudit?.score
  ].filter(s => s !== undefined) as number[];

  if (auditScores.length > 0) {
    const avgScore = auditScores.reduce((sum, score) => sum + score, 0) / auditScores.length;

    result.overallHealth = {
      score: Math.round(avgScore * 100),
      rating: avgScore >= 0.9 ? 'excellent' : avgScore >= 0.8 ? 'good' : avgScore >= 0.5 ? 'needs-improvement' : 'poor',
      passedMetrics,
      failedMetrics
    };
  }

  return result;
}