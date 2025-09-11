/**
 * Unit tests for L2 Critical Chain Tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeL2CriticalChain, l2CriticalChainTool } from '../../../src/tools/l2-critical-chain';
import * as l1GetReport from '../../../src/tools/l1-get-report';
import * as l1Collect from '../../../src/tools/l1-collect-single';
import * as criticalChain from '../../../src/analyzers/criticalChain';

vi.mock('../../../src/tools/l1-get-report');
vi.mock('../../../src/tools/l1-collect-single');
vi.mock('../../../src/analyzers/criticalChain');

describe('L2 Critical Chain Tool', () => {
  const mockReport = {
    audits: {
      'critical-request-chains': {
        details: {},
      },
    },
  };

  const mockChainAnalysis = {
    totalDuration: 2500,
    totalTransferSize: 150000,
    longestChain: [
      {
        url: 'https://example.com/index.html',
        duration: 800,
        transferSize: 25000,
        resourceType: 'document',
      },
      {
        url: 'https://example.com/style.css',
        duration: 600,
        transferSize: 45000,
        resourceType: 'stylesheet',
      },
      {
        url: 'https://example.com/script.js',
        duration: 1100,
        transferSize: 80000,
        resourceType: 'script',
      },
    ],
    bottleneck: {
      url: 'https://example.com/script.js',
      impact: 'High blocking time',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l2CriticalChainTool.name).toBe('l2_critical_chain');
      expect(l2CriticalChainTool.description).toContain('critical request chains');
      expect(l2CriticalChainTool.description).toContain('Layer 2');
    });

    it('should define proper schema', () => {
      const props = l2CriticalChainTool.inputSchema.properties as any;
      expect(props.reportId.type).toBe('string');
      expect(props.url.type).toBe('string');
      expect(props.device.enum).toContain('mobile');
      expect(props.maxDepth.type).toBe('number');
      expect(props.maxDepth.default).toBe(10);
    });
  });

  describe('executeL2CriticalChain', () => {
    it('should analyze critical chains from report ID', async () => {
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

      vi.spyOn(criticalChain, 'analyzeCriticalChains').mockReturnValue(mockChainAnalysis as any);

      const result = await executeL2CriticalChain({
        reportId: 'test-report',
      });

      expect(result.reportId).toBe('test-report');
      expect(result.criticalChain.longestChain.duration).toBe(2500);
      expect(result.criticalChain.longestChain.length).toBe(3);
      expect(result.criticalChain.longestChain.transferSize).toBe(150000);
      expect(result.criticalChain.chains).toHaveLength(3);
      
      expect(result.criticalChain.chains[0]).toEqual({
        url: 'https://example.com/index.html',
        duration: 800,
        depth: 0,
        transferSize: 25000,
        isRenderBlocking: true,
      });

      expect(result.criticalChain.chains[2].isRenderBlocking).toBe(false);
      expect(result.criticalChain.recommendations).toContain('Optimize https://example.com/script.js: High blocking time');
      expect(result.criticalChain.recommendations).toContain('Reduce critical chain duration');
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

      vi.spyOn(criticalChain, 'analyzeCriticalChains').mockReturnValue(mockChainAnalysis as any);

      const result = await executeL2CriticalChain({
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

    it('should handle no critical chains detected', async () => {
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

      vi.spyOn(criticalChain, 'analyzeCriticalChains').mockReturnValue(null);

      const result = await executeL2CriticalChain({
        reportId: 'test-report',
      });

      expect(result.criticalChain.longestChain.duration).toBe(0);
      expect(result.criticalChain.longestChain.length).toBe(0);
      expect(result.criticalChain.chains).toHaveLength(0);
      expect(result.criticalChain.recommendations).toContain('No critical chains detected');
    });

    it('should throw error when neither reportId nor url provided', async () => {
      await expect(executeL2CriticalChain({})).rejects.toThrow(
        'Either reportId or url is required'
      );
    });

    it('should correctly identify render-blocking resources', async () => {
      const chainWithVariousTypes = {
        ...mockChainAnalysis,
        longestChain: [
          { url: 'doc.html', duration: 100, transferSize: 1000, resourceType: 'document' },
          { url: 'style.css', duration: 100, transferSize: 1000, resourceType: 'stylesheet' },
          { url: 'script.js', duration: 100, transferSize: 1000, resourceType: 'script' },
          { url: 'image.png', duration: 100, transferSize: 1000, resourceType: 'image' },
        ],
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

      vi.spyOn(criticalChain, 'analyzeCriticalChains').mockReturnValue(chainWithVariousTypes as any);

      const result = await executeL2CriticalChain({
        reportId: 'test-report',
      });

      expect(result.criticalChain.chains[0].isRenderBlocking).toBe(true); // document
      expect(result.criticalChain.chains[1].isRenderBlocking).toBe(true); // stylesheet
      expect(result.criticalChain.chains[2].isRenderBlocking).toBe(false); // script
      expect(result.criticalChain.chains[3].isRenderBlocking).toBe(false); // image
    });

    it('should not recommend chain depth reduction for short chains', async () => {
      const shortChain = {
        totalDuration: 500,
        totalTransferSize: 50000,
        longestChain: [
          { url: 'index.html', duration: 300, transferSize: 25000, resourceType: 'document' },
          { url: 'style.css', duration: 200, transferSize: 25000, resourceType: 'stylesheet' },
        ],
        bottleneck: null,
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

      vi.spyOn(criticalChain, 'analyzeCriticalChains').mockReturnValue(shortChain as any);

      const result = await executeL2CriticalChain({
        reportId: 'test-report',
      });

      expect(result.criticalChain.recommendations).not.toContain('Reduce chain depth');
      expect(result.criticalChain.recommendations).not.toContain('Reduce critical chain duration');
    });

    it('should assign correct depth values to chains', async () => {
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

      vi.spyOn(criticalChain, 'analyzeCriticalChains').mockReturnValue(mockChainAnalysis as any);

      const result = await executeL2CriticalChain({
        reportId: 'test-report',
      });

      result.criticalChain.chains.forEach((chain, index) => {
        expect(chain.depth).toBe(index);
      });
    });
  });
});