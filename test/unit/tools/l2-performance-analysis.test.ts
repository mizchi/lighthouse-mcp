/**
 * Unit tests for L2 Performance Analysis Tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeL2PerformanceAnalysis, l2PerformanceAnalysisTool } from '../../../src/tools/l2-performance-analysis';
import * as l1GetReport from '../../../src/tools/l1-get-report';
import * as l1Collect from '../../../src/tools/l1-collect-single';
import * as patterns from '../../../src/analyzers/patterns';
import * as problems from '../../../src/analyzers/problems';
import * as metrics from '../../../src/core/metrics';

vi.mock('../../../src/tools/l1-get-report');
vi.mock('../../../src/tools/l1-collect-single');
vi.mock('../../../src/analyzers/patterns');
vi.mock('../../../src/analyzers/problems');
vi.mock('../../../src/core/metrics');

describe('L2 Performance Analysis Tool', () => {
  const mockReport = {
    categories: {
      performance: { score: 0.85 },
    },
    audits: {},
  };

  const mockMetrics = {
    lcp: 2500,
    fcp: 1800,
    cls: 0.1,
    tbt: 300,
    ttfb: 600,
    tti: 3500,
    si: 2000,
  };

  const mockProblems = [
    {
      id: 'prob-1',
      category: 'images',
      severity: 'critical' as const,
      impact: 0.8,
      description: 'Unoptimized images',
    },
    {
      id: 'prob-2',
      category: 'javascript',
      severity: 'high' as const,
      impact: 0.6,
      description: 'Render-blocking scripts',
    },
    {
      id: 'prob-3',
      category: 'css',
      severity: 'medium' as const,
      impact: 0.4,
      description: 'Unused CSS',
    },
  ];

  const mockPatterns = [
    {
      id: 'pattern-1',
      name: 'Heavy JavaScript',
      confidence: 0.85,
      indicators: ['Large JS bundles'],
      recommendations: ['Code splitting recommended'],
    },
    {
      id: 'pattern-2',
      name: 'Image Heavy',
      confidence: 0.72,
      indicators: ['Many images'],
      recommendations: ['Implement lazy loading'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(metrics, 'extractMetrics').mockReturnValue(mockMetrics);
    vi.spyOn(problems, 'detectProblems').mockReturnValue(mockProblems);
    vi.spyOn(patterns, 'detectPatterns').mockReturnValue(mockPatterns);
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l2PerformanceAnalysisTool.name).toBe('l2_performance_analysis');
      expect(l2PerformanceAnalysisTool.description).toContain('performance patterns');
      expect(l2PerformanceAnalysisTool.description).toContain('Layer 2');
    });

    it('should define proper schema', () => {
      const props = l2PerformanceAnalysisTool.inputSchema.properties as any;
      expect(props.reportId.type).toBe('string');
      expect(props.url.type).toBe('string');
      expect(props.device.enum).toContain('mobile');
      expect(props.device.enum).toContain('desktop');
      expect(props.gather.type).toBe('boolean');
    });
  });

  describe('executeL2PerformanceAnalysis', () => {
    it('should analyze existing report by ID', async () => {
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

      const result = await executeL2PerformanceAnalysis({
        reportId: 'test-report',
      });

      expect(result.reportId).toBe('test-report');
      expect(result.metrics).toEqual(mockMetrics);
      expect(result.score).toBe(85);
      expect(result.problems).toHaveLength(3);
      expect(result.patterns).toHaveLength(2);
      expect(result.recommendations).toContain('Fix images: Unoptimized images');
      expect(result.recommendations).toContain('Fix javascript: Render-blocking scripts');
      expect(result.recommendations).toContain('Code splitting recommended');
    });

    it('should collect and analyze by URL', async () => {
      vi.spyOn(l1Collect, 'executeL1Collect').mockResolvedValue({
        reportId: 'new-report',
        url: 'https://example.com',
        device: 'desktop',
        categories: ['performance'],
        timestamp: Date.now(),
        cached: false,
      });

      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        reportId: 'new-report',
        data: mockReport as any,
        metadata: {
          url: 'https://example.com',
          device: 'desktop',
          categories: ['performance'],
          timestamp: Date.now(),
        },
      });

      const result = await executeL2PerformanceAnalysis({
        url: 'https://example.com',
        device: 'desktop',
        gather: true,
      });

      expect(l1Collect.executeL1Collect).toHaveBeenCalledWith({
        url: 'https://example.com',
        device: 'desktop',
        categories: ['performance'],
        gather: true,
      });
      expect(result.reportId).toBe('new-report');
    });

    it('should throw error when neither reportId nor url provided', async () => {
      await expect(executeL2PerformanceAnalysis({})).rejects.toThrow(
        'Either reportId, url, or report is required'
      );
    });

    it('should limit recommendations to 5', async () => {
      const manyProblems = Array.from({ length: 10 }, (_, i) => ({
        id: `prob-${i}`,
        category: 'test',
        severity: 'critical' as const,
        impact: 0.9,
        description: `Problem ${i}`,
      }));

      vi.spyOn(problems, 'detectProblems').mockReturnValue(manyProblems);
      
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

      const result = await executeL2PerformanceAnalysis({
        reportId: 'test-report',
      });

      expect(result.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should deduplicate recommendations', async () => {
      const duplicatePatterns = [
        {
          id: 'p1',
          name: 'Pattern 1',
          confidence: 0.9,
          indicators: [],
          recommendations: ['Fix issue A', 'Fix issue B'],
        },
        {
          id: 'p2',
          name: 'Pattern 2',
          confidence: 0.85,
          indicators: [],
          recommendations: ['Fix issue A', 'Fix issue C'],
        },
      ];

      vi.spyOn(patterns, 'detectPatterns').mockReturnValue(duplicatePatterns);
      vi.spyOn(problems, 'detectProblems').mockReturnValue([]);
      
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

      const result = await executeL2PerformanceAnalysis({
        reportId: 'test-report',
      });

      const duplicateCount = result.recommendations.filter(r => r === 'Fix issue A').length;
      expect(duplicateCount).toBe(1);
    });

    it('should handle reports without performance category', async () => {
      const reportWithoutPerf = {
        categories: {},
        audits: {},
      };

      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        reportId: 'test-report',
        data: reportWithoutPerf as any,
        metadata: {
          url: 'https://example.com',
          device: 'mobile',
          categories: ['seo'],
          timestamp: Date.now(),
        },
      });

      const result = await executeL2PerformanceAnalysis({
        reportId: 'test-report',
      });

      expect(result.score).toBe(0);
    });

    it('should only include high confidence patterns in recommendations', async () => {
      const mixedPatterns = [
        {
          id: 'high-conf',
          name: 'High Confidence',
          confidence: 0.9,
          indicators: [],
          recommendations: ['High confidence fix'],
        },
        {
          id: 'low-conf',
          name: 'Low Confidence',
          confidence: 0.3,
          indicators: [],
          recommendations: ['Low confidence fix'],
        },
      ];

      vi.spyOn(patterns, 'detectPatterns').mockReturnValue(mixedPatterns);
      vi.spyOn(problems, 'detectProblems').mockReturnValue([]);
      
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

      const result = await executeL2PerformanceAnalysis({
        reportId: 'test-report',
      });

      expect(result.recommendations).toContain('High confidence fix');
      expect(result.recommendations).not.toContain('Low confidence fix');
    });
  });
});