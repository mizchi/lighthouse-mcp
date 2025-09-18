import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { LighthouseReport } from '../../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test suite for detecting heavy/problematic websites
 */
describe('Heavy Site Detection', () => {
  let heavyReport: LighthouseReport;

  beforeEach(() => {
    // Load the mock heavy site report
    const reportPath = join(__dirname, '../fixtures/heavy-sites/lighthouse-report-mock.json');
    const reportContent = readFileSync(reportPath, 'utf-8');
    heavyReport = JSON.parse(reportContent) as LighthouseReport;
  });

  describe('Performance Score Analysis', () => {
    it('should identify sites with poor performance scores', () => {
      const score = heavyReport.categories?.performance?.score || 0;
      const isPoorPerformance = score < 0.5;

      expect(isPoorPerformance).toBe(true);
      expect(score).toBeLessThan(0.3);
    });

    it('should categorize performance levels correctly', () => {
      const categorizePerformance = (score: number): string => {
        if (score >= 0.9) return 'excellent';
        if (score >= 0.75) return 'good';
        if (score >= 0.5) return 'needs-improvement';
        return 'poor';
      };

      const category = categorizePerformance(heavyReport.categories?.performance?.score || 0);
      expect(category).toBe('poor');
    });
  });

  describe('Core Web Vitals Detection', () => {
    it('should detect LCP violations (>2500ms)', () => {
      const lcp = heavyReport.audits?.['largest-contentful-paint']?.numericValue || 0;
      const isLCPViolation = lcp > 2500;

      expect(isLCPViolation).toBe(true);
      expect(lcp).toBeGreaterThan(8000);
    });

    it('should detect FCP violations (>1800ms)', () => {
      const fcp = heavyReport.audits?.['first-contentful-paint']?.numericValue || 0;
      const isFCPViolation = fcp > 1800;

      expect(isFCPViolation).toBe(true);
      expect(fcp).toBeGreaterThan(4000);
    });

    it('should detect CLS violations (>0.1)', () => {
      const cls = heavyReport.audits?.['cumulative-layout-shift']?.numericValue || 0;
      const isCLSViolation = cls > 0.1;

      expect(isCLSViolation).toBe(true);
      expect(cls).toBeGreaterThan(0.3);
    });

    it('should detect TBT violations (>300ms)', () => {
      const tbt = heavyReport.audits?.['total-blocking-time']?.numericValue || 0;
      const isTBTViolation = tbt > 300;

      expect(isTBTViolation).toBe(true);
      expect(tbt).toBeGreaterThan(2000);
    });
  });

  describe('Render-blocking Resources Detection', () => {
    it('should identify render-blocking CSS resources', () => {
      const renderBlocking = heavyReport.audits?.['render-blocking-resources'];
      const items = (renderBlocking?.details as any)?.items || [];

      const cssResources = items.filter((item: any) =>
        item.url.endsWith('.css') || item.url.includes('css')
      );

      expect(cssResources.length).toBeGreaterThan(0);
      expect(cssResources[0].wastedMs).toBeGreaterThan(1000);
    });

    it('should identify render-blocking JS resources', () => {
      const renderBlocking = heavyReport.audits?.['render-blocking-resources'];
      const items = (renderBlocking?.details as any)?.items || [];

      const jsResources = items.filter((item: any) =>
        item.url.endsWith('.js') || item.url.includes('.min.js')
      );

      expect(jsResources.length).toBeGreaterThan(0);
      expect(jsResources[0].wastedMs).toBeGreaterThan(700);
    });

    it('should calculate total render-blocking impact', () => {
      const renderBlocking = heavyReport.audits?.['render-blocking-resources'];
      const overallSavingsMs = (renderBlocking?.details as any)?.overallSavingsMs || 0;

      expect(overallSavingsMs).toBeGreaterThan(5000);
    });
  });

  describe('Unused Code Detection', () => {
    it('should detect significant unused CSS', () => {
      const unusedCSS = heavyReport.audits?.['unused-css-rules'];
      const items = (unusedCSS?.details as any)?.items || [];

      const significantWaste = items.filter((item: any) =>
        item.wastedBytes > 40000
      );

      expect(significantWaste.length).toBeGreaterThan(0);
      expect(items[0].wastedPercent).toBeGreaterThan(70);
    });

    it('should detect significant unused JavaScript', () => {
      const unusedJS = heavyReport.audits?.['unused-javascript'];
      const items = (unusedJS?.details as any)?.items || [];

      const significantWaste = items.filter((item: any) =>
        item.wastedBytes > 50000
      );

      expect(significantWaste.length).toBeGreaterThan(0);
      expect(items[0].wastedPercent).toBeGreaterThan(85);
    });

    it('should calculate total unused code impact', () => {
      const unusedCSS = heavyReport.audits?.['unused-css-rules'];
      const unusedJS = heavyReport.audits?.['unused-javascript'];

      const cssWaste = (unusedCSS?.details as any)?.overallSavingsBytes || 0;
      const jsWaste = (unusedJS?.details as any)?.overallSavingsBytes || 0;
      const totalWaste = cssWaste + jsWaste;

      expect(totalWaste).toBeGreaterThan(1000000); // Over 1MB of unused code
    });
  });

  describe('Third-party Impact Detection', () => {
    it('should identify heavy third-party scripts', () => {
      const thirdParty = heavyReport.audits?.['third-party-summary'];
      const items = (thirdParty?.details as any)?.items || [];

      const heavyThirdParties = items.filter((item: any) =>
        item.blockingTime > 200
      );

      expect(heavyThirdParties.length).toBeGreaterThan(0);
      expect(heavyThirdParties[0].entity).toBeDefined();
    });

    it('should calculate total third-party blocking time', () => {
      const thirdParty = heavyReport.audits?.['third-party-summary'];
      const items = (thirdParty?.details as any)?.items || [];

      const totalBlockingTime = items.reduce((sum: number, item: any) =>
        sum + (item.blockingTime || 0), 0
      );

      expect(totalBlockingTime).toBeGreaterThan(1000);
    });
  });

  describe('Advanced Heavy Site Detection', () => {
    it('should detect multiple fonts causing render blocking', () => {
      const audit = heavyReport.audits?.['render-blocking-resources'];
      const items = (audit?.details as any)?.items || [];

      const fontResources = items.filter((item: any) =>
        item.url.includes('font') || item.url.includes('woff')
      );

      if (fontResources.length > 0) {
        const totalFontBlockingTime = fontResources.reduce((sum: number, font: any) =>
          sum + font.wastedMs, 0
        );
        expect(totalFontBlockingTime).toBeGreaterThan(500);
      }
    });

    it('should detect JavaScript execution bottlenecks', () => {
      const tbt = heavyReport.audits?.['total-blocking-time']?.numericValue || 0;
      const mainThreadWork = heavyReport.audits?.['mainthread-work-breakdown'];

      if (mainThreadWork?.details) {
        const items = (mainThreadWork.details as any).items || [];
        const scriptEvaluation = items.find((item: any) =>
          item.group === 'scriptEvaluation'
        );

        if (scriptEvaluation) {
          expect(scriptEvaluation.duration).toBeGreaterThan(1000);
        }
      }

      // Heavy sites should have high TBT
      expect(tbt).toBeGreaterThan(2000);
    });

    it('should identify image optimization opportunities', () => {
      const modernFormats = heavyReport.audits?.['uses-webp-images'];
      const responsiveImages = heavyReport.audits?.['uses-responsive-images'];
      const optimizedImages = heavyReport.audits?.['uses-optimized-images'];

      let totalImageSavings = 0;

      if (modernFormats?.details) {
        totalImageSavings += (modernFormats.details as any).overallSavingsBytes || 0;
      }
      if (responsiveImages?.details) {
        totalImageSavings += (responsiveImages.details as any).overallSavingsBytes || 0;
      }
      if (optimizedImages?.details) {
        totalImageSavings += (optimizedImages.details as any).overallSavingsBytes || 0;
      }

      if (totalImageSavings > 0) {
        expect(totalImageSavings).toBeGreaterThan(100000); // > 100KB savings possible
      }
    });

    it('should detect duplicate JavaScript libraries', () => {
      const duplicates = heavyReport.audits?.['duplicated-javascript'];

      if (duplicates?.details) {
        const items = (duplicates.details as any).items || [];
        const wastedBytes = (duplicates.details as any).overallSavingsBytes || 0;

        if (items.length > 0) {
          expect(wastedBytes).toBeGreaterThan(50000); // > 50KB of duplicates
        }
      }
    });

    it('should identify legacy JavaScript patterns', () => {
      const legacyJS = heavyReport.audits?.['legacy-javascript'];

      if (legacyJS?.details) {
        const items = (legacyJS.details as any).items || [];
        const savings = (legacyJS.details as any).overallSavingsBytes || 0;

        if (items.length > 0) {
          expect(savings).toBeGreaterThan(20000); // > 20KB of legacy code

          // Check for specific legacy patterns
          const hasPolyfills = items.some((item: any) =>
            item.url.includes('polyfill')
          );
          if (hasPolyfills) {
            expect(hasPolyfills).toBe(true);
          }
        }
      }
    });
  });

  describe('Overall Site Health Assessment', () => {
    it('should generate comprehensive performance issues list', () => {
      const issues = [];

      // Check performance score
      const perfScore = heavyReport.categories?.performance?.score || 0;
      if (perfScore < 0.5) {
        issues.push({
          type: 'performance-score',
          severity: 'critical',
          message: `Performance score is critically low: ${(perfScore * 100).toFixed(0)}`
        });
      }

      // Check Core Web Vitals
      const lcp = heavyReport.audits?.['largest-contentful-paint']?.numericValue || 0;
      if (lcp > 4000) {
        issues.push({
          type: 'lcp',
          severity: 'critical',
          message: `LCP is ${(lcp / 1000).toFixed(1)}s (should be < 2.5s)`
        });
      }

      // Check unused code
      const unusedJS = heavyReport.audits?.['unused-javascript'];
      const jsWaste = (unusedJS?.details as any)?.overallSavingsBytes || 0;
      if (jsWaste > 500000) {
        issues.push({
          type: 'unused-code',
          severity: 'high',
          message: `${(jsWaste / 1024).toFixed(0)}KB of unused JavaScript`
        });
      }

      expect(issues.length).toBeGreaterThan(2);
      expect(issues.some(i => i.severity === 'critical')).toBe(true);
    });

    it('should recommend optimization priorities', () => {
      const priorities = [];

      // Priority 1: Render-blocking resources
      const renderBlocking = heavyReport.audits?.['render-blocking-resources'];
      const renderBlockingSavings = (renderBlocking?.details as any)?.overallSavingsMs || 0;
      if (renderBlockingSavings > 1000) {
        priorities.push({
          priority: 1,
          action: 'Eliminate render-blocking resources',
          impact: `Save ${(renderBlockingSavings / 1000).toFixed(1)}s`
        });
      }

      // Priority 2: Unused code
      const unusedJS = heavyReport.audits?.['unused-javascript'];
      const jsWaste = (unusedJS?.details as any)?.overallSavingsBytes || 0;
      if (jsWaste > 100000) {
        priorities.push({
          priority: 2,
          action: 'Remove unused JavaScript',
          impact: `Reduce ${(jsWaste / 1024).toFixed(0)}KB`
        });
      }

      // Priority 3: Image optimization
      const images = heavyReport.audits?.['uses-responsive-images'];
      const imageSavings = (images?.details as any)?.overallSavingsBytes || 0;
      if (imageSavings > 500000) {
        priorities.push({
          priority: 3,
          action: 'Optimize images',
          impact: `Reduce ${(imageSavings / 1024).toFixed(0)}KB`
        });
      }

      expect(priorities.length).toBeGreaterThan(0);
      expect(priorities[0].priority).toBe(1);
      expect(priorities[0].action).toContain('render-blocking');
    });

    it('should calculate performance budget violations', () => {
      const budgets = {
        lcp: 2500,
        fcp: 1800,
        cls: 0.1,
        tbt: 300,
        tti: 3800,
        speedIndex: 3400
      };

      const violations = [];

      const lcp = heavyReport.audits?.['largest-contentful-paint']?.numericValue || 0;
      if (lcp > budgets.lcp) {
        violations.push({
          metric: 'LCP',
          budget: budgets.lcp,
          actual: lcp,
          overBudget: ((lcp - budgets.lcp) / budgets.lcp * 100).toFixed(0) + '%'
        });
      }

      const fcp = heavyReport.audits?.['first-contentful-paint']?.numericValue || 0;
      if (fcp > budgets.fcp) {
        violations.push({
          metric: 'FCP',
          budget: budgets.fcp,
          actual: fcp,
          overBudget: ((fcp - budgets.fcp) / budgets.fcp * 100).toFixed(0) + '%'
        });
      }

      const cls = heavyReport.audits?.['cumulative-layout-shift']?.numericValue || 0;
      if (cls > budgets.cls) {
        violations.push({
          metric: 'CLS',
          budget: budgets.cls,
          actual: cls,
          overBudget: ((cls - budgets.cls) / budgets.cls * 100).toFixed(0) + '%'
        });
      }

      expect(violations.length).toBeGreaterThan(2); // Multiple violations
      expect(violations.some(v => parseInt(v.overBudget) > 200)).toBe(true); // Some are >200% over
    });

    it('should generate severity scores for issues', () => {
      const calculateSeverity = (metric: string, value: number): number => {
        const thresholds: Record<string, { good: number, poor: number }> = {
          lcp: { good: 2500, poor: 4000 },
          fcp: { good: 1800, poor: 3000 },
          cls: { good: 0.1, poor: 0.25 },
          tbt: { good: 300, poor: 600 }
        };

        const threshold = thresholds[metric];
        if (!threshold) return 0;

        if (value <= threshold.good) return 0;
        if (value >= threshold.poor) return 100;

        return ((value - threshold.good) / (threshold.poor - threshold.good)) * 100;
      };

      const lcpSeverity = calculateSeverity('lcp',
        heavyReport.audits?.['largest-contentful-paint']?.numericValue || 0
      );
      const fcpSeverity = calculateSeverity('fcp',
        heavyReport.audits?.['first-contentful-paint']?.numericValue || 0
      );
      const clsSeverity = calculateSeverity('cls',
        heavyReport.audits?.['cumulative-layout-shift']?.numericValue || 0
      );
      const tbtSeverity = calculateSeverity('tbt',
        heavyReport.audits?.['total-blocking-time']?.numericValue || 0
      );

      expect(lcpSeverity).toBe(100); // Maximum severity
      expect(fcpSeverity).toBe(100);
      expect(clsSeverity).toBe(100);
      expect(tbtSeverity).toBe(100);

      const avgSeverity = (lcpSeverity + fcpSeverity + clsSeverity + tbtSeverity) / 4;
      expect(avgSeverity).toBe(100); // Critical overall
    });
  });
});