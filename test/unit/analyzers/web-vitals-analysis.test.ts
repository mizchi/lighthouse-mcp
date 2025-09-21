import { describe, it, expect } from 'vitest';
import { analyzeWebVitals, type WebVitalsAnalysis } from '../../../src/analyzers/webVitalsAnalysis';
import type { LighthouseReport } from '../../../src/types';

describe('Web Vitals Analysis', () => {
  describe('analyzeWebVitals', () => {
    it('should analyze INP (Interaction to Next Paint)', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'interaction-to-next-paint': {
            id: 'interaction-to-next-paint',
            title: 'Interaction to Next Paint',
            score: 0.5,
            numericValue: 300,
            displayValue: '300 ms'
          },
          'max-potential-fid': {
            id: 'max-potential-fid',
            title: 'Max Potential FID',
            score: 0.3,
            numericValue: 500,
            displayValue: '500 ms'
          }
        }
      };

      const result = analyzeWebVitals(report as LighthouseReport);

      expect(result.inp).toBeDefined();
      expect(result.inp?.value).toBe(300);
      expect(result.inp?.score).toBe(0.5);
      expect(result.inp?.rating).toBe('needs-improvement');
      expect(result.inp?.insights).toContain('INP is above 200ms threshold');
    });

    it('should provide TTFB detailed analysis', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'server-response-time': {
            id: 'server-response-time',
            title: 'Server Response Time',
            score: 0.2,
            numericValue: 1500,
            displayValue: '1.5 s',
            details: {
              type: 'opportunity',
              overallSavingsMs: 1200
            }
          },
          'time-to-first-byte': {
            id: 'time-to-first-byte',
            title: 'Time to First Byte',
            score: 0.3,
            numericValue: 1800,
            displayValue: '1.8 s'
          }
        }
      };

      const result = analyzeWebVitals(report as LighthouseReport);

      expect(result.ttfb).toBeDefined();
      expect(result.ttfb?.value).toBe(1800);
      expect(result.ttfb?.rating).toBe('poor');
      expect(result.ttfb?.breakdown).toBeDefined();
      expect(result.ttfb?.breakdown?.serverTime).toBe(1500);
      expect(result.ttfb?.recommendations).toContain('Consider using a CDN');
    });

    it('should analyze correlation between FCP, LCP, and CLS', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'first-contentful-paint': {
            id: 'first-contentful-paint',
            title: 'First Contentful Paint',
            score: 0.8,
            numericValue: 1500
          },
          'largest-contentful-paint': {
            id: 'largest-contentful-paint',
            title: 'Largest Contentful Paint',
            score: 0.6,
            numericValue: 3000
          },
          'cumulative-layout-shift': {
            id: 'cumulative-layout-shift',
            title: 'Cumulative Layout Shift',
            score: 0.9,
            numericValue: 0.05
          }
        }
      };

      const result = analyzeWebVitals(report as LighthouseReport);

      expect(result.correlations).toBeDefined();
      expect(result.correlations?.fcpToLcp).toBeDefined();
      expect(result.correlations?.fcpToLcp?.delta).toBe(1500);
      expect(result.correlations?.fcpToLcp?.ratio).toBe(2);
      expect(result.correlations?.layoutStability).toBeDefined();
      expect(result.correlations?.layoutStability?.clsImpactOnLcp).toBe('low');
    });

    it('should provide overall Web Vitals health score', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'largest-contentful-paint': {
            id: 'largest-contentful-paint',
            score: 0.9,
            numericValue: 2000
          },
          'first-input-delay': {
            id: 'first-input-delay',
            score: 0.95,
            numericValue: 50
          },
          'cumulative-layout-shift': {
            id: 'cumulative-layout-shift',
            score: 0.85,
            numericValue: 0.08
          },
          'interaction-to-next-paint': {
            id: 'interaction-to-next-paint',
            score: 0.7,
            numericValue: 250
          },
          'time-to-first-byte': {
            id: 'time-to-first-byte',
            score: 0.8,
            numericValue: 500
          },
          'first-contentful-paint': {
            id: 'first-contentful-paint',
            score: 0.85,
            numericValue: 1200
          }
        }
      };

      const result = analyzeWebVitals(report as LighthouseReport);

      expect(result.overallHealth).toBeDefined();
      expect(result.overallHealth?.score).toBeGreaterThan(0);
      expect(result.overallHealth?.score).toBeLessThanOrEqual(100);
      expect(result.overallHealth?.rating).toBe('good');
      expect(result.overallHealth?.passedMetrics).toContain('LCP');
      expect(result.overallHealth?.failedMetrics).toHaveLength(0);
    });

    it('should identify critical Web Vitals issues', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'largest-contentful-paint': {
            id: 'largest-contentful-paint',
            score: 0.2,
            numericValue: 6000
          },
          'cumulative-layout-shift': {
            id: 'cumulative-layout-shift',
            score: 0.3,
            numericValue: 0.3
          },
          'total-blocking-time': {
            id: 'total-blocking-time',
            score: 0.1,
            numericValue: 2000
          }
        }
      };

      const result = analyzeWebVitals(report as LighthouseReport);

      expect(result.criticalIssues).toBeDefined();
      expect(result.criticalIssues).toHaveLength(3);
      expect(result.criticalIssues?.[0]).toMatchObject({
        metric: 'LCP',
        severity: 'critical',
        impact: 'high',
        value: 6000,
        threshold: 4000
      });
    });
  });
});