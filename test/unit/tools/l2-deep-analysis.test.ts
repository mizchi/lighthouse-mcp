/**
 * Unit tests for L2 Deep Analysis Tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeL2DeepAnalysis, l2DeepAnalysisTool } from '../../../src/tools/l2-deep-analysis';
import * as l1GetReport from '../../../src/tools/l1-get-report';
import * as l1Collect from '../../../src/tools/l1-collect-single';
import * as deepAnalysis from '../../../src/analyzers/deepAnalysis';
import * as criticalChain from '../../../src/analyzers/criticalChain';
import * as unusedCode from '../../../src/analyzers/unusedCode';

vi.mock('../../../src/tools/l1-get-report');
vi.mock('../../../src/tools/l1-collect-single');
vi.mock('../../../src/analyzers/deepAnalysis');
vi.mock('../../../src/analyzers/criticalChain');
vi.mock('../../../src/analyzers/unusedCode');

describe('L2 Deep Analysis Tool', () => {
  const mockReport = {
    categories: {
      performance: { score: 0.75 },
    },
    audits: {},
  };

  const mockDeepAnalysisResult = {
    scoreAnalysis: {
      categoryScores: {
        performance: { score: 0.75 },
      },
    },
    metrics: {
      lcp: 2500,
      fcp: 1800,
      cls: 0.1,
    },
    problems: [
      { id: 'p1', category: 'images', description: 'Large images' },
      { id: 'p2', category: 'javascript', description: 'Blocking scripts' },
    ],
    patterns: [
      { id: 'pattern1', name: 'Heavy JS', confidence: 0.8 },
    ],
    recommendations: [
      'Optimize images',
      'Reduce JavaScript',
      'Enable caching',
      'Use CDN',
      'Minify CSS',
    ],
    criticalChains: null,
    unusedCode: null,
  };

  const mockCriticalChains = {
    chains: [],
    longestChain: {
      id: 'empty',
      nodes: [],
      startTime: 0,
      endTime: 0,
      totalDuration: 0,
      totalTransferSize: 0,
    },
    totalDuration: 0,
    totalTransferSize: 0,
    bottleneck: undefined,
    lcp: undefined,
  };

  const mockUnusedCodeResult = {
    totalWastedBytes: 100000,
    items: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(deepAnalysis, 'performDeepAnalysis').mockReturnValue(mockDeepAnalysisResult as any);
    vi.spyOn(criticalChain, 'analyzeCriticalChains').mockReturnValue(mockCriticalChains as any);
    vi.spyOn(unusedCode, 'analyzeUnusedCode').mockReturnValue(mockUnusedCodeResult as any);
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l2DeepAnalysisTool.name).toBe('l2_deep_analysis');
      expect(l2DeepAnalysisTool.description).toContain('Comprehensive deep analysis');
      expect(l2DeepAnalysisTool.description).toContain('Layer 2');
    });

    it('should define proper schema', () => {
      const props = l2DeepAnalysisTool.inputSchema.properties as any;
      expect(props.reportId.type).toBe('string');
      expect(props.url.type).toBe('string');
      expect(props.device.enum).toContain('mobile');
      expect(props.categories.type).toBe('array');
      expect(props.includeChains.type).toBe('boolean');
      expect(props.includeUnusedCode.type).toBe('boolean');
      expect(props.maxRecommendations.type).toBe('number');
      expect(props.maxRecommendations.default).toBe(10);
    });
  });

  describe('executeL2DeepAnalysis', () => {
    it('should perform deep analysis from report ID', async () => {
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

      const result = await executeL2DeepAnalysis({
        reportId: 'test-report',
      });

      expect(result.reportId).toBe('test-report');
      expect(result.analysis.score).toBe(0.75);
      expect(result.analysis.metrics).toEqual(mockDeepAnalysisResult.metrics);
      expect(result.analysis.problems).toHaveLength(2);
      expect(result.analysis.patterns).toHaveLength(1);
      expect(result.analysis.recommendations).toHaveLength(5);
      expect(result.analysis.criticalChain).toBeNull();
      expect(result.analysis.unusedCode).toBeNull();
    });

    it('should include critical chains when requested', async () => {
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

      const result = await executeL2DeepAnalysis({
        reportId: 'test-report',
        includeChains: true,
      });

      expect(criticalChain.analyzeCriticalChains).toHaveBeenCalledWith(mockReport);
      expect(result.analysis.criticalChain).toEqual(mockCriticalChains);
    });

    it('should include unused code analysis when requested', async () => {
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

      const result = await executeL2DeepAnalysis({
        reportId: 'test-report',
        includeUnusedCode: true,
      });

      expect(unusedCode.analyzeUnusedCode).toHaveBeenCalledWith(mockReport);
      expect(result.analysis.unusedCode).toEqual(mockUnusedCodeResult);
    });

    it('should collect and analyze by URL', async () => {
      vi.spyOn(l1Collect, 'executeL1Collect').mockResolvedValue({
        reportId: 'new-report',
        url: 'https://example.com',
        device: 'desktop',
        categories: ['performance', 'seo'],
        timestamp: Date.now(),
        cached: false,
      });

      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        reportId: 'new-report',
        data: mockReport as any,
        metadata: {
          url: 'https://example.com',
          device: 'desktop',
          categories: ['performance', 'seo'],
          timestamp: Date.now(),
        },
      });

      const result = await executeL2DeepAnalysis({
        url: 'https://example.com',
        device: 'desktop',
        categories: ['performance', 'seo'],
      });

      expect(l1Collect.executeL1Collect).toHaveBeenCalledWith({
        url: 'https://example.com',
        device: 'desktop',
        categories: ['performance', 'seo'],
        gather: false,
      });
      expect(result.reportId).toBe('new-report');
    });

    it('should limit recommendations when maxRecommendations specified', async () => {
      const manyRecommendations = Array.from({ length: 20 }, (_, i) => `Recommendation ${i + 1}`);
      
      vi.spyOn(deepAnalysis, 'performDeepAnalysis').mockReturnValue({
        ...mockDeepAnalysisResult,
        recommendations: manyRecommendations,
      } as any);

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

      const result = await executeL2DeepAnalysis({
        reportId: 'test-report',
        maxRecommendations: 3,
      });

      expect(result.analysis.recommendations).toHaveLength(3);
      expect(result.analysis.recommendations).toEqual(['Recommendation 1', 'Recommendation 2', 'Recommendation 3']);
    });

    it('should throw error when neither reportId nor url provided', async () => {
      await expect(executeL2DeepAnalysis({})).rejects.toThrow(
        'Either reportId or url is required'
      );
    });

    it('should format object recommendations as strings', async () => {
      const objectRecommendations = [
        { category: 'Performance', description: 'Optimize images' },
        'Simple string recommendation',
        { category: 'SEO', description: 'Add meta tags' },
      ];

      vi.spyOn(deepAnalysis, 'performDeepAnalysis').mockReturnValue({
        ...mockDeepAnalysisResult,
        recommendations: objectRecommendations,
      } as any);

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

      const result = await executeL2DeepAnalysis({
        reportId: 'test-report',
      });

      expect(result.analysis.recommendations).toContain('Performance: Optimize images');
      expect(result.analysis.recommendations).toContain('Simple string recommendation');
      expect(result.analysis.recommendations).toContain('SEO: Add meta tags');
    });

    it('should handle missing score analysis gracefully', async () => {
      vi.spyOn(deepAnalysis, 'performDeepAnalysis').mockReturnValue({
        ...mockDeepAnalysisResult,
        scoreAnalysis: null,
      } as any);

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

      const result = await executeL2DeepAnalysis({
        reportId: 'test-report',
      });

      expect(result.analysis.score).toBe(0);
    });

    it('should include both critical chains and unused code when both requested', async () => {
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

      const result = await executeL2DeepAnalysis({
        reportId: 'test-report',
        includeChains: true,
        includeUnusedCode: true,
      });

      expect(criticalChain.analyzeCriticalChains).toHaveBeenCalled();
      expect(unusedCode.analyzeUnusedCode).toHaveBeenCalled();
      expect(result.analysis.criticalChain).toBeDefined();
      expect(result.analysis.unusedCode).toBeDefined();
    });

    it('should preserve all deep analysis results', async () => {
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

      const result = await executeL2DeepAnalysis({
        reportId: 'test-report',
      });

      expect(deepAnalysis.performDeepAnalysis).toHaveBeenCalledWith(mockReport);
      expect(result.analysis.metrics).toEqual(mockDeepAnalysisResult.metrics);
      expect(result.analysis.problems).toEqual(mockDeepAnalysisResult.problems);
      expect(result.analysis.patterns).toEqual(mockDeepAnalysisResult.patterns);
    });
  });
});
