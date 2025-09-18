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

  const mockChainNodes = [
    {
      url: 'https://example.com/index.html',
      duration: 800,
      transferSize: 25000,
      resourceType: 'document',
      latency: 200,
      downloadTime: 600,
      startTime: 0,
      endTime: 800,
      startOffset: 0,
      depth: 0,
      contribution: 0.32,
    },
    {
      url: 'https://example.com/style.css',
      duration: 600,
      transferSize: 45000,
      resourceType: 'stylesheet',
      latency: 100,
      downloadTime: 500,
      startTime: 800,
      endTime: 1400,
      startOffset: 800,
      depth: 1,
      contribution: 0.24,
    },
    {
      url: 'https://example.com/script.js',
      duration: 1100,
      transferSize: 80000,
      resourceType: 'script',
      latency: 300,
      downloadTime: 800,
      startTime: 1400,
      endTime: 2500,
      startOffset: 1400,
      depth: 2,
      contribution: 0.44,
    },
  ];

  const mockChainPath = {
    id: 'root-chain',
    nodes: mockChainNodes,
    startTime: 0,
    endTime: 2500,
    totalDuration: 2500,
    totalTransferSize: 150000,
  };

  const mockBottleneck = {
    url: 'https://example.com/script.js',
    duration: 1100,
    contribution: 0.44,
    impact: 'High',
    startTime: 1400,
    endTime: 2500,
    reason: 'Mock reason',
  };

  const mockChainAnalysis = {
    chains: [mockChainPath],
    longestChain: mockChainPath,
    totalDuration: 2500,
    totalTransferSize: 150000,
    bottleneck: mockBottleneck,
    lcp: {
      timestamp: 2300,
      candidateUrl: 'https://example.com/script.js',
      durationToLcp: 2300,
      nodes: mockChainNodes,
      bottleneck: mockBottleneck,
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

      expect(result.criticalChain.chains[0]).toMatchObject({
        url: 'https://example.com/index.html',
        duration: 800,
        depth: 0,
        transferSize: 25000,
        isRenderBlocking: true,
        latency: 200,
      });

      expect(result.criticalChain.chains[2].isRenderBlocking).toBe(false);
      expect(result.criticalChain.bottleneck?.url).toBe('https://example.com/script.js');
      expect(result.criticalChain.lcp?.bottleneck?.url).toBe('https://example.com/script.js');
      expect(result.criticalChain.recommendations.some(r => r.includes('Investigate https://example.com/script.js'))).toBe(true);
      expect(result.criticalChain.recommendations.some(r => r.includes('Reduce critical chain duration'))).toBe(true);
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
        'Either reportId, url, or report is required'
      );
    });

    it('should correctly identify render-blocking resources', async () => {
      const chainWithVariousTypes = {
        chains: [
          {
            id: 'root',
            startTime: 0,
            endTime: 400,
            totalDuration: 400,
            totalTransferSize: 4000,
            nodes: [
              { url: 'doc.html', duration: 100, transferSize: 1000, resourceType: 'document', latency: 40, downloadTime: 60, startTime: 0, endTime: 100, startOffset: 0, depth: 0, contribution: 0.25 },
              { url: 'style.css', duration: 100, transferSize: 1000, resourceType: 'stylesheet', latency: 20, downloadTime: 80, startTime: 100, endTime: 200, startOffset: 100, depth: 1, contribution: 0.25 },
              { url: 'script.js', duration: 100, transferSize: 1000, resourceType: 'script', latency: 20, downloadTime: 80, startTime: 200, endTime: 300, startOffset: 200, depth: 2, contribution: 0.25 },
              { url: 'image.png', duration: 100, transferSize: 1000, resourceType: 'image', latency: 10, downloadTime: 90, startTime: 300, endTime: 400, startOffset: 300, depth: 3, contribution: 0.25 },
            ],
          },
        ],
        longestChain: {
          id: 'root',
          startTime: 0,
          endTime: 400,
          totalDuration: 400,
          totalTransferSize: 4000,
          nodes: [
            { url: 'doc.html', duration: 100, transferSize: 1000, resourceType: 'document', latency: 40, downloadTime: 60, startTime: 0, endTime: 100, startOffset: 0, depth: 0, contribution: 0.25 },
            { url: 'style.css', duration: 100, transferSize: 1000, resourceType: 'stylesheet', latency: 20, downloadTime: 80, startTime: 100, endTime: 200, startOffset: 100, depth: 1, contribution: 0.25 },
            { url: 'script.js', duration: 100, transferSize: 1000, resourceType: 'script', latency: 20, downloadTime: 80, startTime: 200, endTime: 300, startOffset: 200, depth: 2, contribution: 0.25 },
            { url: 'image.png', duration: 100, transferSize: 1000, resourceType: 'image', latency: 10, downloadTime: 90, startTime: 300, endTime: 400, startOffset: 300, depth: 3, contribution: 0.25 },
          ],
        },
        totalDuration: 400,
        totalTransferSize: 4000,
        bottleneck: null,
        lcp: null,
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
      const shortNodes = [
        {
          url: 'index.html',
          duration: 300,
          transferSize: 25000,
          resourceType: 'document',
          latency: 120,
          downloadTime: 180,
          startTime: 0,
          endTime: 300,
          startOffset: 0,
          depth: 0,
          contribution: 0.6,
        },
        {
          url: 'style.css',
          duration: 200,
          transferSize: 25000,
          resourceType: 'stylesheet',
          latency: 80,
          downloadTime: 120,
          startTime: 300,
          endTime: 500,
          startOffset: 300,
          depth: 1,
          contribution: 0.4,
        },
      ];

      const shortChain = {
        chains: [
          {
            id: 'short',
            startTime: 0,
            endTime: 500,
            totalDuration: 500,
            totalTransferSize: 50000,
            nodes: shortNodes,
          },
        ],
        longestChain: {
          id: 'short',
          startTime: 0,
          endTime: 500,
          totalDuration: 500,
          totalTransferSize: 50000,
          nodes: shortNodes,
        },
        totalDuration: 500,
        totalTransferSize: 50000,
        bottleneck: null,
        lcp: null,
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
      expect(result.criticalChain.recommendations).toContain('Critical request chain is within healthy thresholds');
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
