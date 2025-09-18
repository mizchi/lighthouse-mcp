/**
 * Unit tests for L2 Score Analysis Tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeL2ScoreAnalysis, l2ScoreAnalysisTool } from '../../../src/tools/l2-score-analysis';
import * as l1GetReport from '../../../src/tools/l1-get-report';
import * as l1Collect from '../../../src/tools/l1-collect-single';
import * as scores from '../../../src/analyzers/scores';

vi.mock('../../../src/tools/l1-get-report');
vi.mock('../../../src/tools/l1-collect-single');
vi.mock('../../../src/analyzers/scores');

describe('L2 Score Analysis Tool', () => {
  const mockReport = {
    categories: {
      performance: {
        score: 0.85,
        auditRefs: [],
      },
    },
    audits: {},
  };

  const mockScoreAnalysis = {
    categories: {
      performance: {
        score: 0.85,
        audits: [
          {
            id: 'first-contentful-paint',
            title: 'First Contentful Paint',
            score: 0.9,
            weight: 0.1,
            weightedScore: 0.09,
            displayValue: '1.8 s',
          },
          {
            id: 'largest-contentful-paint',
            title: 'Largest Contentful Paint',
            score: 0.75,
            weight: 0.25,
            weightedScore: 0.1875,
            displayValue: '2.5 s',
          },
          {
            id: 'cumulative-layout-shift',
            title: 'Cumulative Layout Shift',
            score: 1,
            weight: 0.15,
            weightedScore: 0.15,
            displayValue: '0',
          },
          {
            id: 'total-blocking-time',
            title: 'Total Blocking Time',
            score: 0.85,
            weight: 0.3,
            weightedScore: 0.255,
            displayValue: '300 ms',
          },
          {
            id: 'speed-index',
            title: 'Speed Index',
            score: 0.88,
            weight: 0.1,
            weightedScore: 0.088,
            displayValue: '3.2 s',
          },
          {
            id: 'time-to-interactive',
            title: 'Time to Interactive',
            score: 0.82,
            weight: 0.1,
            weightedScore: 0.082,
            displayValue: '3.8 s',
          },
        ],
      },
      accessibility: {
        score: 0.92,
        audits: [
          {
            id: 'color-contrast',
            title: 'Color Contrast',
            score: 1,
            weight: 0.3,
            weightedScore: 0.3,
            displayValue: null,
          },
          {
            id: 'image-alt',
            title: 'Image Alt Text',
            score: 0.9,
            weight: 0.2,
            weightedScore: 0.18,
            displayValue: '2 images missing alt text',
          },
        ],
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(scores, 'analyzeReport').mockReturnValue(mockScoreAnalysis as any);
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l2ScoreAnalysisTool.name).toBe('l2_score_analysis');
      expect(l2ScoreAnalysisTool.description).toContain('score breakdown');
      expect(l2ScoreAnalysisTool.description).toContain('Layer 2');
    });

    it('should define proper schema', () => {
      const props = l2ScoreAnalysisTool.inputSchema.properties as any;
      expect(props.reportId.type).toBe('string');
      expect(props.url.type).toBe('string');
      expect(props.device.enum).toContain('mobile');
      expect(props.category.enum).toContain('performance');
      expect(props.category.enum).toContain('accessibility');
      expect(props.category.default).toBe('performance');
    });
  });

  describe('executeL2ScoreAnalysis', () => {
    it('should analyze score breakdown from report ID', async () => {
      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        reportId: 'test-report',
        data: mockReport as any,
        metadata: {
          url: 'https://example.com',
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now(),
        },
      });

      const result = await executeL2ScoreAnalysis({
        reportId: 'test-report',
        category: 'performance',
      });

      expect(result.reportId).toBe('test-report');
      expect(result.scoreAnalysis.category).toBe('performance');
      expect(result.scoreAnalysis.score).toBe(0.85);
      expect(result.scoreAnalysis.weightedMetrics).toHaveLength(6);
      
      const fcp = result.scoreAnalysis.weightedMetrics.find(m => m.id === 'first-contentful-paint');
      expect(fcp).toEqual({
        id: 'first-contentful-paint',
        title: 'First Contentful Paint',
        score: 0.9,
        weight: 0.1,
        contribution: 0.09,
        displayValue: '1.8 s',
      });

      expect(result.scoreAnalysis.opportunities).toHaveLength(5); // All metrics with score < 1 (except CLS which is 1)
      expect(result.scoreAnalysis.diagnostics).toHaveLength(6);
    });

    it('should collect and analyze by URL', async () => {
      vi.spyOn(l1Collect, 'executeL1Collect').mockResolvedValue({
        reportId: 'new-report',
        url: 'https://example.com',
        device: 'desktop',
        categories: ['accessibility'],
        timestamp: Date.now(),
        cached: false,
      });

      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        reportId: 'new-report',
        data: mockReport as any,
        metadata: {
          url: 'https://example.com',
          device: 'desktop',
          categories: ['accessibility'],
          timestamp: Date.now(),
        },
      });

      const result = await executeL2ScoreAnalysis({
        url: 'https://example.com',
        device: 'desktop',
        category: 'accessibility',
      });

      expect(l1Collect.executeL1Collect).toHaveBeenCalledWith({
        url: 'https://example.com',
        device: 'desktop',
        categories: ['accessibility'],
        gather: false,
      });
      expect(result.reportId).toBe('new-report');
      expect(result.scoreAnalysis.category).toBe('accessibility');
    });

    it('should use performance as default category', async () => {
      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        reportId: 'test-report',
        data: mockReport as any,
        metadata: {
          url: 'https://example.com',
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now(),
        },
      });

      const result = await executeL2ScoreAnalysis({
        reportId: 'test-report',
      });

      expect(result.scoreAnalysis.category).toBe('performance');
    });

    it('should throw error when neither reportId nor url provided', async () => {
      await expect(executeL2ScoreAnalysis({})).rejects.toThrow(
        'Either reportId, url, or report is required'
      );
    });

    it('should throw error when category not found in report', async () => {
      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        reportId: 'test-report',
        data: mockReport as any,
        metadata: {
          url: 'https://example.com',
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now(),
        },
      });

      vi.spyOn(scores, 'analyzeReport').mockReturnValue({
        categories: {},
      } as any);

      await expect(executeL2ScoreAnalysis({
        reportId: 'test-report',
        category: 'performance',
      })).rejects.toThrow('Category performance not found in report');
    });

    it('should correctly identify opportunities (scores < 1)', async () => {
      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        reportId: 'test-report',
        data: mockReport as any,
        metadata: {
          url: 'https://example.com',
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now(),
        },
      });

      const result = await executeL2ScoreAnalysis({
        reportId: 'test-report',
        category: 'performance',
      });

      const opportunities = result.scoreAnalysis.opportunities;
      
      // All opportunities should have score < 1
      opportunities.forEach(opp => {
        expect(opp.score).toBeLessThan(1);
      });

      // Check that perfect scores are not in opportunities
      const clsOpportunity = opportunities.find(o => o.id === 'cumulative-layout-shift');
      expect(clsOpportunity).toBeUndefined();
    });

    it('should assign impact levels based on weight', async () => {
      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        reportId: 'test-report',
        data: mockReport as any,
        metadata: {
          url: 'https://example.com',
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now(),
        },
      });

      const result = await executeL2ScoreAnalysis({
        reportId: 'test-report',
        category: 'performance',
      });

      const tbtOpp = result.scoreAnalysis.opportunities.find(o => o.id === 'total-blocking-time');
      expect(tbtOpp?.impact).toBe('high'); // weight 0.3 > 0.1

      const fcpOpp = result.scoreAnalysis.opportunities.find(o => o.id === 'first-contentful-paint');
      expect(fcpOpp?.impact).toBe('medium'); // weight 0.1 > 0.05

      // Add a low weight audit for testing
      const lowWeightAnalysis = {
        categories: {
          performance: {
            score: 0.85,
            audits: [
              {
                id: 'low-weight-audit',
                title: 'Low Weight Audit',
                score: 0.5,
                weight: 0.03,
                weightedScore: 0.015,
                displayValue: 'test',
              },
            ],
          },
        },
      };

      vi.spyOn(scores, 'analyzeReport').mockReturnValue(lowWeightAnalysis as any);

      const result2 = await executeL2ScoreAnalysis({
        reportId: 'test-report',
        category: 'performance',
      });

      const lowOpp = result2.scoreAnalysis.opportunities[0];
      expect(lowOpp.impact).toBe('low'); // weight 0.03 < 0.05
    });

    it('should handle null scores correctly', async () => {
      const analysisWithNullScores = {
        categories: {
          performance: {
            score: 0.85,
            audits: [
              {
                id: 'audit-with-score',
                title: 'Audit With Score',
                score: 0.8,
                weight: 0.5,
                weightedScore: 0.4,
                displayValue: 'test',
              },
              {
                id: 'audit-without-score',
                title: 'Audit Without Score',
                score: null,
                weight: 0.5,
                weightedScore: 0,
                displayValue: 'N/A',
              },
            ],
          },
        },
      };

      vi.spyOn(scores, 'analyzeReport').mockReturnValue(analysisWithNullScores as any);

      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        reportId: 'test-report',
        data: mockReport as any,
        metadata: {
          url: 'https://example.com',
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now(),
        },
      });

      const result = await executeL2ScoreAnalysis({
        reportId: 'test-report',
        category: 'performance',
      });

      // Null scores should be filtered out of opportunities
      expect(result.scoreAnalysis.opportunities).toHaveLength(1);
      expect(result.scoreAnalysis.opportunities[0].id).toBe('audit-with-score');

      // But should still appear in diagnostics with score 0
      const nullAudit = result.scoreAnalysis.diagnostics.find(d => d.id === 'audit-without-score');
      expect(nullAudit?.score).toBe(0);
    });

    it('should preserve displayValue in all sections', async () => {
      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        reportId: 'test-report',
        data: mockReport as any,
        metadata: {
          url: 'https://example.com',
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now(),
        },
      });

      const result = await executeL2ScoreAnalysis({
        reportId: 'test-report',
        category: 'performance',
      });

      const fcpMetric = result.scoreAnalysis.weightedMetrics.find(m => m.id === 'first-contentful-paint');
      expect(fcpMetric?.displayValue).toBe('1.8 s');

      const fcpDiagnostic = result.scoreAnalysis.diagnostics.find(d => d.id === 'first-contentful-paint');
      expect(fcpDiagnostic?.displayValue).toBe('1.8 s');
    });
  });
});