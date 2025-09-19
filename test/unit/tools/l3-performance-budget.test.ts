import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeL3PerformanceBudget,
  l3PerformanceBudgetTool,
  type BudgetViolation,
  type PerformanceBudget
} from '../../../src/tools/l3-performance-budget';
import * as l1GetReport from '../../../src/tools/l1-get-report';
import { LighthouseDatabase } from '../../../src/core/database';

vi.mock('../../../src/tools/l1-get-report');
vi.mock('../../../src/core/database');

describe('L3 Performance Budget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockReport = {
    requestedUrl: 'https://example.com',
    finalUrl: 'https://example.com',
    configSettings: {
      formFactor: 'mobile'
    },
    categories: {
      performance: { score: 0.45 }
    },
    audits: {
      'largest-contentful-paint': {
        numericValue: 4500
      },
      'first-contentful-paint': {
        numericValue: 2500
      },
      'cumulative-layout-shift': {
        numericValue: 0.25
      },
      'total-blocking-time': {
        numericValue: 800
      },
      'interactive': {
        numericValue: 5500
      },
      'speed-index': {
        numericValue: 4200
      },
      'total-byte-weight': {
        numericValue: 2500000
      },
      'network-requests': {
        details: {
          items: [
            { resourceType: 'Script', transferSize: 500000 },
            { resourceType: 'Script', transferSize: 300000 },
            { resourceType: 'Stylesheet', transferSize: 150000 },
            { resourceType: 'Image', transferSize: 800000 },
            { resourceType: 'Image', transferSize: 400000 },
            { resourceType: 'Font', transferSize: 200000 },
            { resourceType: 'Document', transferSize: 150000 }
          ]
        }
      },
      'third-party-summary': {
        details: {
          items: [
            { entity: 'Google Analytics', transferSize: 50000 },
            { entity: 'Facebook', transferSize: 80000 }
          ]
        }
      }
    }
  } as any;

  describe('executeL3PerformanceBudget', () => {
    it('should detect budget violations', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const budget: PerformanceBudget = {
        lcp: 2500,
        fcp: 1800,
        cls: 0.1,
        tbt: 200,
        performanceScore: 90
      };

      const result = await executeL3PerformanceBudget({
        reportId: 'test-report',
        budget
      });

      expect(result.violations.length).toBeGreaterThan(0);

      // Check LCP violation
      const lcpViolation = result.violations.find(v => v.metric === 'lcp');
      expect(lcpViolation).toBeDefined();
      expect(lcpViolation?.actual).toBe(4500);
      expect(lcpViolation?.budget).toBe(2500);
      expect(lcpViolation?.overBy).toBe(2000);
      expect(lcpViolation?.overByPercent).toBe(80);
      expect(lcpViolation?.severity).toBe('high');

      // Check CLS violation
      const clsViolation = result.violations.find(v => v.metric === 'cls');
      expect(clsViolation).toBeDefined();
      expect(clsViolation?.actual).toBe(0.25);
      expect(clsViolation?.budget).toBe(0.1);
      expect(clsViolation?.severity).toBe('critical');

      // Check TBT violation
      const tbtViolation = result.violations.find(v => v.metric === 'tbt');
      expect(tbtViolation).toBeDefined();
      expect(tbtViolation?.actual).toBe(800);
      expect(tbtViolation?.budget).toBe(200);
      expect(tbtViolation?.severity).toBe('critical');
    });

    it('should calculate budget score correctly', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const budget: PerformanceBudget = {
        lcp: 2500,
        fcp: 1800,
        cls: 0.1,
        tbt: 200,
        performanceScore: 90
      };

      const result = await executeL3PerformanceBudget({
        reportId: 'test-report',
        budget
      });

      // 5 budget items, multiple violations
      expect(result.budgetScore).toBeLessThan(100);
      expect(result.budgetScore).toBeGreaterThanOrEqual(0);
    });

    it('should determine status correctly', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const budget: PerformanceBudget = {
        lcp: 2500,
        cls: 0.1,
        tbt: 200
      };

      const result = await executeL3PerformanceBudget({
        reportId: 'test-report',
        budget
      });

      // With critical violations, status should be failing
      expect(result.status).toBe('failing');
      expect(result.criticalViolations).toBeGreaterThan(0);
    });

    it('should generate recommendations', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL3PerformanceBudget({
        reportId: 'test-report',
        useDefaultBudget: true
      });

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.immediate).toBeDefined();
      expect(result.recommendations.shortTerm).toBeDefined();
      expect(result.recommendations.longTerm).toBeDefined();

      // Should have immediate recommendations for critical violations
      expect(result.recommendations.immediate.length).toBeGreaterThan(0);
    });

    it('should use default budget when not specified', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL3PerformanceBudget({
        reportId: 'test-report',
        useDefaultBudget: true
      });

      expect(result.budget).toBeDefined();
      expect(result.budget.lcp).toBe(2500); // Mobile default
      expect(result.budget.fcp).toBe(1800);
    });

    it('should handle desktop budget', async () => {
      const desktopReport = {
        ...mockReport,
        configSettings: {
          formFactor: 'desktop'
        }
      };

      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: desktopReport
      } as any);

      const result = await executeL3PerformanceBudget({
        reportId: 'test-report',
        useDefaultBudget: true
      });

      expect(result.budget.lcp).toBe(2000); // Desktop default
      expect(result.budget.fcp).toBe(1500);
    });

    it('should analyze resource budgets', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const budget: PerformanceBudget = {
        jsBytes: 350000,
        cssBytes: 60000,
        imageBytes: 750000
      };

      const result = await executeL3PerformanceBudget({
        reportId: 'test-report',
        budget
      });

      // Check JS bytes violation
      const jsViolation = result.violations.find(v => v.metric === 'jsBytes');
      expect(jsViolation).toBeDefined();
      expect(jsViolation?.actual).toBe(800000); // 500k + 300k from mock data

      // Check image bytes violation
      const imageViolation = result.violations.find(v => v.metric === 'imageBytes');
      expect(imageViolation).toBeDefined();
      expect(imageViolation?.actual).toBe(1200000); // 800k + 400k from mock data
    });

    it('should handle passing budgets', async () => {
      const goodReport = {
        ...mockReport,
        categories: {
          performance: { score: 0.95 }
        },
        audits: {
          ...mockReport.audits,
          'largest-contentful-paint': { numericValue: 2000 },
          'first-contentful-paint': { numericValue: 1500 },
          'cumulative-layout-shift': { numericValue: 0.05 },
          'total-blocking-time': { numericValue: 100 }
        }
      };

      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: goodReport
      } as any);

      const budget: PerformanceBudget = {
        lcp: 2500,
        fcp: 1800,
        cls: 0.1,
        tbt: 200
      };

      const result = await executeL3PerformanceBudget({
        reportId: 'test-report',
        budget
      });

      expect(result.violations.length).toBe(0);
      expect(result.status).toBe('passing');
      expect(result.budgetScore).toBe(100);
    });

    it('should sort violations by severity', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const budget: PerformanceBudget = {
        lcp: 2500,
        fcp: 2400,
        cls: 0.1,
        tbt: 700,
        performanceScore: 44
      };

      const result = await executeL3PerformanceBudget({
        reportId: 'test-report',
        budget
      });

      // Violations should be sorted by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < result.violations.length; i++) {
        const prevSeverity = severityOrder[result.violations[i - 1].severity];
        const currSeverity = severityOrder[result.violations[i].severity];
        expect(prevSeverity).toBeLessThanOrEqual(currSeverity);
      }
    });

    it('should include historical trend when requested', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const mockDb = {
        getReports: vi.fn(() => [
          { id: 1, data: JSON.stringify(mockReport) },
          { id: 2, data: JSON.stringify({ ...mockReport, categories: { performance: { score: 0.5 } } }) },
          { id: 3, data: JSON.stringify({ ...mockReport, categories: { performance: { score: 0.4 } } }) }
        ]),
        close: vi.fn()
      };

      vi.mocked(LighthouseDatabase).mockImplementation(() => mockDb as any);

      const result = await executeL3PerformanceBudget({
        reportId: 'test-report',
        includeHistoricalTrend: true
      });

      expect(result.historicalTrend).toBeDefined();
      expect(result.historicalTrend?.averageScore).toBeDefined();
      expect(result.historicalTrend?.improving).toBeDefined();
      expect(result.historicalTrend?.worstMetrics).toBeDefined();
    });

    it('should include competitive analysis when requested', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL3PerformanceBudget({
        reportId: 'test-report',
        compareToIndustry: true
      });

      expect(result.competitiveAnalysis).toBeDefined();
      expect(result.competitiveAnalysis?.industryAverage).toBeDefined();
      expect(result.competitiveAnalysis?.percentile).toBeDefined();
      expect(result.competitiveAnalysis?.betterThan).toBeDefined();
    });

    it('should throw error without reportId or url', async () => {
      await expect(
        executeL3PerformanceBudget({})
      ).rejects.toThrow('Either reportId or url is required');
    });

    it('should throw error when report retrieval fails', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: undefined
      } as any);

      await expect(
        executeL3PerformanceBudget({ reportId: 'test' })
      ).rejects.toThrow('Failed to retrieve report data');
    });

    it('should throw error when no budget and useDefaultBudget is false', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      await expect(
        executeL3PerformanceBudget({
          reportId: 'test',
          useDefaultBudget: false
        })
      ).rejects.toThrow('No budget specified and useDefaultBudget is false');
    });
  });

  describe('MCP Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l3PerformanceBudgetTool.name).toBe('l3_performance_budget');
      expect(l3PerformanceBudgetTool.description).toContain('Layer 3');
      expect(l3PerformanceBudgetTool.description).toContain('performance');
      expect(l3PerformanceBudgetTool.description).toContain('budget');
    });

    it('should have valid input schema', () => {
      const schema = l3PerformanceBudgetTool.inputSchema;

      expect(schema.type).toBe('object');
      expect(schema.properties.reportId).toBeDefined();
      expect(schema.properties.url).toBeDefined();
      expect(schema.properties.budget).toBeDefined();
      expect(schema.properties.useDefaultBudget).toBeDefined();
      expect(schema.properties.compareToIndustry).toBeDefined();
      expect(schema.properties.includeHistoricalTrend).toBeDefined();
      expect(schema.oneOf).toHaveLength(2);
    });

    it('should execute and format output correctly', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await l3PerformanceBudgetTool.execute({
        reportId: 'test-report'
      });

      expect(result.type).toBe('text');
      expect(result.text).toContain('# Performance Budget Analysis');
      expect(result.text).toContain('## Status:');
      expect(result.text).toContain('Total Violations:');
      expect(result.text).toContain('## 📊 Budget Violations');
      expect(result.text).toContain('## 💡 Recommendations');
    });

    it('should format passing status correctly', async () => {
      const goodReport = {
        ...mockReport,
        categories: {
          performance: { score: 0.95 }
        },
        audits: {
          ...mockReport.audits,
          'largest-contentful-paint': { numericValue: 2000 },
          'first-contentful-paint': { numericValue: 1500 },
          'cumulative-layout-shift': { numericValue: 0.05 },
          'total-blocking-time': { numericValue: 100 }
        }
      };

      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: goodReport
      } as any);

      const result = await l3PerformanceBudgetTool.execute({
        reportId: 'test-report',
        budget: {
          lcp: 2500,
          fcp: 1800,
          cls: 0.1,
          tbt: 200
        }
      });

      expect(result.text).toContain('## ✅ All Budgets Met!');
      expect(result.text).toContain('Great Job:');
    });
  });
});