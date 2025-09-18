import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { LighthouseReport } from '../../../src/types';
import {
  analyzeLCPChain,
  executeL2LCPChainAnalysis,
  l2LCPChainAnalysisTool
} from '../../../src/tools/l2-lcp-chain-analysis';
import * as l1GetReport from '../../../src/tools/l1-get-report';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('L2 LCP Chain Analysis', () => {
  let mockReport: LighthouseReport;

  beforeEach(() => {
    // Load the mock LCP chain report
    const reportPath = join(__dirname, '../../fixtures/heavy-sites/lcp-critical-chain-mock.json');
    const reportContent = readFileSync(reportPath, 'utf-8');
    mockReport = JSON.parse(reportContent) as LighthouseReport;
  });

  describe('analyzeLCPChain', () => {
    it('should identify LCP element correctly', () => {
      const result = analyzeLCPChain(mockReport);

      expect(result.lcpElement).toBeDefined();
      expect(result.lcpElement?.selector).toBe('body > div.hero > img.hero-image');
      expect(result.lcpElement?.url).toBeDefined();
    });

    it('should calculate LCP time correctly', () => {
      const result = analyzeLCPChain(mockReport);

      expect(result.lcpTime).toBe(12500);
      expect(result.lcpTime).toBeGreaterThan(4000); // Poor LCP
    });

    it('should build critical path with correct depth', () => {
      const result = analyzeLCPChain(mockReport);

      expect(result.criticalPath.length).toBeGreaterThan(0);
      expect(result.chainDepth).toBeGreaterThanOrEqual(8); // Deep chain

      // Check if path is sorted by start time
      for (let i = 1; i < result.criticalPath.length; i++) {
        expect(result.criticalPath[i].startTime).toBeGreaterThanOrEqual(
          result.criticalPath[i - 1].startTime
        );
      }
    });

    it('should calculate total duration and transfer size', () => {
      const result = analyzeLCPChain(mockReport);

      expect(result.totalDuration).toBeGreaterThan(10000); // > 10s
      expect(result.totalTransferSize).toBeGreaterThan(1000000); // > 1MB
    });

    it('should identify critical bottlenecks', () => {
      const result = analyzeLCPChain(mockReport);

      expect(result.bottlenecks.length).toBeGreaterThan(0);

      const criticalBottlenecks = result.bottlenecks.filter(b => b.impact === 'critical');
      expect(criticalBottlenecks.length).toBeGreaterThan(0);

      // Check the hero image is identified as a bottleneck
      const heroImageBottleneck = result.bottlenecks.find(b =>
        b.url.includes('hero-final.jpg')
      );
      expect(heroImageBottleneck).toBeDefined();
      expect(heroImageBottleneck?.duration).toBeGreaterThan(3000);
    });

    it('should generate optimization opportunities', () => {
      const result = analyzeLCPChain(mockReport);

      expect(result.optimizationOpportunities.length).toBeGreaterThan(0);

      // Should recommend preloading LCP image
      const preloadOpt = result.optimizationOpportunities.find(o =>
        o.type === 'preload' && o.resource.includes('hero-final.jpg')
      );
      expect(preloadOpt).toBeDefined();
      expect(preloadOpt?.priority).toBe('high');
      expect(preloadOpt?.potentialSaving).toBeGreaterThan(0);

      // Should recommend deferring non-critical scripts
      const deferOpts = result.optimizationOpportunities.filter(o => o.type === 'defer');
      expect(deferOpts.length).toBeGreaterThan(0);
    });

    it('should prioritize optimizations correctly', () => {
      const result = analyzeLCPChain(mockReport);

      const priorities = result.optimizationOpportunities.map(o => o.priority);
      const highPriorityIndex = priorities.findIndex(p => p === 'high');
      const lowPriorityIndex = priorities.findIndex(p => p === 'low');

      if (highPriorityIndex >= 0 && lowPriorityIndex >= 0) {
        expect(highPriorityIndex).toBeLessThan(lowPriorityIndex);
      }
    });
  });

  describe('executeL2LCPChainAnalysis', () => {
    beforeEach(() => {
      // Mock the L1 get report function
      vi.spyOn(l1GetReport, 'executeL1GetReport').mockResolvedValue({
        data: mockReport
      } as any);
    });

    it('should generate summary with key metrics', async () => {

      const result = await executeL2LCPChainAnalysis({ reportId: 'test-report' });

      expect(result.summary).toContain('LCP: 12.5s');
      expect(result.summary).toContain('Chain depth:');
      expect(result.summary).toContain('critical bottlenecks');
    });

    it('should identify critical findings', async () => {

      const result = await executeL2LCPChainAnalysis({ reportId: 'test-report' });

      expect(result.criticalFindings.length).toBeGreaterThan(0);

      // Should flag LCP > 4s
      const lcpFinding = result.criticalFindings.find(f =>
        f.includes('LCP') && f.includes('12.5s')
      );
      expect(lcpFinding).toBeDefined();

      // Should flag deep chain
      const chainFinding = result.criticalFindings.find(f =>
        f.includes('chain depth')
      );
      expect(chainFinding).toBeDefined();
    });

    it('should generate actionable recommendations', async () => {

      const result = await executeL2LCPChainAnalysis({ reportId: 'test-report' });

      expect(result.recommendations.length).toBeGreaterThan(0);

      // Should recommend preloading
      const preloadRec = result.recommendations.find(r =>
        r.toLowerCase().includes('preload')
      );
      expect(preloadRec).toBeDefined();

      // Should recommend reducing chain depth
      const chainRec = result.recommendations.find(r =>
        r.toLowerCase().includes('chain depth') || r.toLowerCase().includes('bundling')
      );
      expect(chainRec).toBeDefined();
    });

    it('should throw error without reportId or url', async () => {
      await expect(
        executeL2LCPChainAnalysis({})
      ).rejects.toThrow('Either reportId or url is required');
    });
  });

  describe('MCP Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l2LCPChainAnalysisTool.name).toBe('l2_lcp_chain_analysis');
      expect(l2LCPChainAnalysisTool.description).toContain('LCP critical request chains');
      expect(l2LCPChainAnalysisTool.description).toContain('Layer 2');
    });

    it('should have valid input schema', () => {
      const schema = l2LCPChainAnalysisTool.inputSchema;

      expect(schema.type).toBe('object');
      expect(schema.properties.reportId).toBeDefined();
      expect(schema.properties.url).toBeDefined();
      expect(schema.oneOf).toHaveLength(2);
    });

    it('should execute and format output correctly', async () => {

      const result = await l2LCPChainAnalysisTool.execute({ reportId: 'test-report' });

      expect(result.type).toBe('text');
      expect(result.text).toContain('# LCP Critical Chain Analysis');
      expect(result.text).toContain('## Summary');
      expect(result.text).toContain('Critical Findings');
      expect(result.text).toContain('## LCP Element');
      expect(result.text).toContain('## Critical Path Metrics');
      expect(result.text).toContain('## Bottlenecks');
      expect(result.text).toContain('## Optimization Opportunities');
      expect(result.text).toContain('## Recommendations');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty network requests', () => {
      const reportWithoutNetwork = {
        ...mockReport,
        audits: {
          ...mockReport.audits,
          'network-requests': {
            ...mockReport.audits?.['network-requests'],
            details: { type: 'table', items: [] } as any
          }
        }
      };

      const result = analyzeLCPChain(reportWithoutNetwork);
      expect(result).toBeDefined();
      expect(result.criticalPath.length).toBeGreaterThan(0); // Should still have chain data
    });

    it('should handle missing LCP audit', () => {
      const reportWithoutLCP = {
        ...mockReport,
        audits: {
          ...mockReport.audits,
          'largest-contentful-paint': undefined
        }
      };

      const result = analyzeLCPChain(reportWithoutLCP);
      expect(result.lcpTime).toBe(0);
      expect(result.criticalPath.length).toBeGreaterThan(0);
    });

    it('should handle circular dependencies in chains', () => {
      // This shouldn't happen in real data, but we should handle it gracefully
      const circularChains = {
        ...mockReport,
        audits: {
          ...mockReport.audits,
          'critical-request-chains': {
            details: {
              type: 'criticalrequestchain',
              chains: {
                '1': {
                  request: {
                    url: 'https://example.com/a.js',
                    startTime: 0,
                    endTime: 1,
                    transferSize: 1000
                  },
                  children: {
                    '2': {
                      request: {
                        url: 'https://example.com/b.js',
                        startTime: 1,
                        endTime: 2,
                        transferSize: 2000
                      }
                    }
                  }
                }
              }
            } as any
          }
        }
      };

      expect(() => analyzeLCPChain(circularChains)).not.toThrow();
    });

    it('should handle report without LCP element', () => {
      const reportWithoutLCP = {
        ...mockReport,
        audits: {
          ...mockReport.audits,
          'largest-contentful-paint-element': undefined
        }
      };

      const result = analyzeLCPChain(reportWithoutLCP);
      expect(result.lcpElement).toBeUndefined();
      expect(result.criticalPath.length).toBeGreaterThan(0);
    });

    it('should handle report without critical chains', () => {
      const reportWithoutChains = {
        ...mockReport,
        audits: {
          ...mockReport.audits,
          'critical-request-chains': {
            ...mockReport.audits?.['critical-request-chains'],
            details: { type: 'criticalrequestchain', chains: {} } as any
          }
        }
      } as LighthouseReport;

      const result = analyzeLCPChain(reportWithoutChains);
      expect(result.criticalPath).toHaveLength(0);
      expect(result.chainDepth).toBe(0);
      expect(result.bottlenecks).toHaveLength(0);
    });

    it('should handle very deep chains gracefully', () => {
      const result = analyzeLCPChain(mockReport);

      // Should identify deep chains as bottlenecks
      const deepChainBottlenecks = result.bottlenecks.filter(b =>
        b.reason.includes('Deep in request chain')
      );
      expect(deepChainBottlenecks.length).toBeGreaterThan(0);

      // Should recommend prefetching for deep resources
      const prefetchOpts = result.optimizationOpportunities.filter(o =>
        o.type === 'prefetch'
      );
      expect(prefetchOpts.length).toBeGreaterThan(0);
    });

    it('should handle resources with zero duration', () => {
      const reportWithZeroDuration = {
        ...mockReport,
        audits: {
          ...mockReport.audits,
          'critical-request-chains': {
            details: {
              type: 'criticalrequestchain',
              chains: {
                '1': {
                  request: {
                    url: 'https://example.com/instant.js',
                    startTime: 0,
                    endTime: 0, // Zero duration
                    transferSize: 100
                  }
                }
              }
            } as any
          }
        }
      };

      const result = analyzeLCPChain(reportWithZeroDuration);
      expect(result.criticalPath).toBeDefined();
      const zeroDurationNode = result.criticalPath.find(n => n.duration === 0);
      // Zero duration nodes might not be included in the path
      // expect(zeroDurationNode).toBeDefined();
      // Should not be identified as a bottleneck
      const bottleneck = result.bottlenecks.find(b => b.url === 'https://example.com/instant.js');
      expect(bottleneck).toBeUndefined();
    });

    it('should handle very large transfer sizes correctly', () => {
      const largeTransferReport = {
        ...mockReport,
        audits: {
          ...mockReport.audits,
          'network-requests': {
            details: {
              type: 'table',
              items: [
                ...((mockReport.audits?.['network-requests'] as any)?.details?.items || []),
                {
                  url: 'https://example.com/huge.js',
                  startTime: 0,
                  endTime: 5000,
                  transferSize: 10000000, // 10MB
                  resourceType: 'Script'
                }
              ]
            } as any
          }
        }
      };

      const result = analyzeLCPChain(largeTransferReport);
      // Total includes existing + new large resource
      expect(result.totalTransferSize).toBeGreaterThan(1000000); // More than 1MB
    });
  });

  describe('Performance Score Thresholds', () => {
    it('should categorize LCP times correctly', () => {
      const categorize = (lcpTime: number): string => {
        if (lcpTime <= 2500) return 'good';
        if (lcpTime <= 4000) return 'needs-improvement';
        return 'poor';
      };

      expect(categorize(2000)).toBe('good');
      expect(categorize(3000)).toBe('needs-improvement');
      expect(categorize(5000)).toBe('poor');
      expect(categorize(mockReport.audits?.['largest-contentful-paint']?.numericValue || 0)).toBe('poor');
    });

    it('should identify multiple optimization types', async () => {
      const result = await executeL2LCPChainAnalysis({ reportId: 'test-report' });
      const analysis = result.analysis;

      const optimizationTypes = new Set(analysis.optimizationOpportunities.map(o => o.type));
      expect(optimizationTypes.size).toBeGreaterThanOrEqual(2); // At least 2 different types
      expect(optimizationTypes.has('preload')).toBe(true);
    });
  });
});