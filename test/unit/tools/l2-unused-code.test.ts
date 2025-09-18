/**
 * Unit tests for L2 Unused Code Tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeL2UnusedCode, l2UnusedCodeTool } from '../../../src/tools/l2-unused-code';
import * as l1GetReport from '../../../src/tools/l1-get-report';
import * as l1Collect from '../../../src/tools/l1-collect-single';
import * as unusedCode from '../../../src/analyzers/unusedCode';

vi.mock('../../../src/tools/l1-get-report');
vi.mock('../../../src/tools/l1-collect-single');
vi.mock('../../../src/analyzers/unusedCode');

describe('L2 Unused Code Tool', () => {
  const mockReport = {
    audits: {
      'unused-css-rules': {
        details: {},
      },
      'unused-javascript': {
        details: {},
      },
    },
  };

  const mockUnusedCodeAnalysis = {
    totalWastedBytes: 250000,
    items: [
      {
        url: 'https://example.com/style.css',
        unusedBytes: 75000,
        unusedPercent: 60,
        totalBytes: 125000,
        type: 'css',
      },
      {
        url: 'https://example.com/vendor.js',
        unusedBytes: 125000,
        unusedPercent: 50,
        totalBytes: 250000,
        type: 'js',
      },
      {
        url: 'https://example.com/app.js',
        unusedBytes: 50000,
        unusedPercent: 25,
        totalBytes: 200000,
        type: 'js',
      },
    ],
    recommendations: [
      'Remove unused CSS from style.css',
      'Tree-shake vendor.js to reduce bundle size',
      'Consider code splitting for app.js',
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l2UnusedCodeTool.name).toBe('l2_unused_code');
      expect(l2UnusedCodeTool.description).toContain('unused CSS and JavaScript');
      expect(l2UnusedCodeTool.description).toContain('Layer 2');
    });

    it('should define proper schema', () => {
      const props = l2UnusedCodeTool.inputSchema.properties as any;
      expect(props.reportId.type).toBe('string');
      expect(props.url.type).toBe('string');
      expect(props.device.enum).toContain('mobile');
      expect(props.threshold.type).toBe('number');
      expect(props.threshold.default).toBe(1024);
    });
  });

  describe('executeL2UnusedCode', () => {
    it('should analyze unused code from report ID', async () => {
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

      vi.spyOn(unusedCode, 'analyzeUnusedCode').mockReturnValue(mockUnusedCodeAnalysis as any);

      const result = await executeL2UnusedCode({
        reportId: 'test-report',
      });

      expect(result.reportId).toBe('test-report');
      expect(result.unusedCode.totalWastedBytes).toBe(250000);
      expect(result.unusedCode.files).toHaveLength(3);
      
      expect(result.unusedCode.files[0]).toEqual({
        url: 'https://example.com/style.css',
        wastedBytes: 75000,
        wastedPercent: 60,
        totalBytes: 125000,
        type: 'css',
      });

      expect(result.unusedCode.recommendations).toContain('Remove unused CSS from style.css');
      expect(result.unusedCode.recommendations).toContain('Tree-shake vendor.js to reduce bundle size');
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

      vi.spyOn(unusedCode, 'analyzeUnusedCode').mockReturnValue(mockUnusedCodeAnalysis as any);

      const result = await executeL2UnusedCode({
        url: 'https://example.com',
        device: 'desktop',
      });

      expect(l1Collect.executeL1Collect).toHaveBeenCalledWith({
        url: 'https://example.com',
        device: 'desktop',
        categories: ['performance'],
        gather: false,
      });
      expect(result.reportId).toBe('new-report');
    });

    it('should handle no unused code detected', async () => {
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

      vi.spyOn(unusedCode, 'analyzeUnusedCode').mockReturnValue(null as any);

      const result = await executeL2UnusedCode({
        reportId: 'test-report',
      });

      expect(result.unusedCode.totalWastedBytes).toBe(0);
      expect(result.unusedCode.totalWastedMs).toBe(0);
      expect(result.unusedCode.files).toHaveLength(0);
      expect(result.unusedCode.recommendations).toContain('No significant unused code detected');
    });

    it('should throw error when neither reportId nor url provided', async () => {
      await expect(executeL2UnusedCode({})).rejects.toThrow(
        'Either reportId or url is required'
      );
    });

    it('should correctly categorize CSS and JS files', async () => {
      const mixedFiles = {
        totalWastedBytes: 100000,
        items: [
          { url: 'main.css', unusedBytes: 10000, unusedPercent: 20, totalBytes: 50000, type: 'css' },
          { url: 'theme.css', unusedBytes: 15000, unusedPercent: 30, totalBytes: 50000, type: 'css' },
          { url: 'app.js', unusedBytes: 25000, unusedPercent: 25, totalBytes: 100000, type: 'js' },
          { url: 'vendor.js', unusedBytes: 50000, unusedPercent: 50, totalBytes: 100000, type: 'js' },
        ],
        recommendations: [],
      };

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

      vi.spyOn(unusedCode, 'analyzeUnusedCode').mockReturnValue(mixedFiles as any);

      const result = await executeL2UnusedCode({
        reportId: 'test-report',
      });

      const cssFiles = result.unusedCode.files.filter(f => f.type === 'css');
      const jsFiles = result.unusedCode.files.filter(f => f.type === 'js');

      expect(cssFiles).toHaveLength(2);
      expect(jsFiles).toHaveLength(2);
    });

    it('should handle empty recommendations', async () => {
      const analysisWithoutRecs = {
        totalWastedBytes: 50000,
        items: [
          { url: 'small.js', unusedBytes: 50000, unusedPercent: 10, totalBytes: 500000, type: 'js' },
        ],
        recommendations: [],
      };

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

      vi.spyOn(unusedCode, 'analyzeUnusedCode').mockReturnValue(analysisWithoutRecs as any);

      const result = await executeL2UnusedCode({
        reportId: 'test-report',
      });

      expect(result.unusedCode.recommendations).toHaveLength(0);
    });

    it('should set totalWastedMs to 0 as not available', async () => {
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

      vi.spyOn(unusedCode, 'analyzeUnusedCode').mockReturnValue(mockUnusedCodeAnalysis as any);

      const result = await executeL2UnusedCode({
        reportId: 'test-report',
      });

      expect(result.unusedCode.totalWastedMs).toBe(0);
    });

    it('should preserve all file metadata', async () => {
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

      vi.spyOn(unusedCode, 'analyzeUnusedCode').mockReturnValue(mockUnusedCodeAnalysis as any);

      const result = await executeL2UnusedCode({
        reportId: 'test-report',
        threshold: 2048,
      });

      result.unusedCode.files.forEach((file, index) => {
        const original = mockUnusedCodeAnalysis.items[index];
        expect(file.url).toBe(original.url);
        expect(file.wastedBytes).toBe(original.unusedBytes);
        expect(file.wastedPercent).toBe(original.unusedPercent);
        expect(file.totalBytes).toBe(original.totalBytes);
        expect(file.type).toBe(original.type);
      });
    });
  });
});