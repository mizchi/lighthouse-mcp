import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeL3PatternInsights, l3PatternInsightsTool } from '../../../src/tools/l3-pattern-insights';
import { LighthouseDatabase } from '../../../src/core/database';

vi.mock('../../../src/core/database');

describe('L3 Pattern Insights', () => {
  let mockDb: any;

  const mockCrawlResults = [
    {
      id: 1,
      url: 'https://example-slow.com',
      timestamp: new Date().toISOString(),
      device: 'mobile',
      performanceScore: 25,
      fcp: 4500,
      lcp: 8000,
      cls: 0.3,
      tbt: 1200,
      si: 5000,
      tti: 7000,
      category: 'E-commerce',
      renderBlockingMs: 2000,
      unusedJsBytes: 300000,
      unusedCssBytes: 100000,
      thirdPartyBlockingMs: 1500
    },
    {
      id: 2,
      url: 'https://example-fast.com',
      timestamp: new Date().toISOString(),
      device: 'mobile',
      performanceScore: 90,
      fcp: 1000,
      lcp: 1800,
      cls: 0.02,
      tbt: 100,
      si: 1500,
      tti: 2000,
      category: 'News & Media',
      renderBlockingMs: 200,
      unusedJsBytes: 10000,
      unusedCssBytes: 5000,
      thirdPartyBlockingMs: 50
    },
    {
      id: 3,
      url: 'https://example-medium.com',
      timestamp: new Date().toISOString(),
      device: 'mobile',
      performanceScore: 60,
      fcp: 2500,
      lcp: 3500,
      cls: 0.1,
      tbt: 400,
      si: 3000,
      tti: 4000,
      category: 'Social Media',
      renderBlockingMs: 800,
      unusedJsBytes: 80000,
      unusedCssBytes: 30000,
      thirdPartyBlockingMs: 600
    },
    {
      id: 4,
      url: 'https://example-poor.com',
      timestamp: new Date().toISOString(),
      device: 'mobile',
      performanceScore: 30,
      fcp: 4000,
      lcp: 6500,
      cls: 0.28,
      tbt: 900,
      si: 4800,
      tti: 6500,
      category: 'E-commerce',
      renderBlockingMs: 1800,
      unusedJsBytes: 250000,
      unusedCssBytes: 80000,
      thirdPartyBlockingMs: 1200
    },
    {
      id: 5,
      url: 'https://example-average.com',
      timestamp: new Date().toISOString(),
      device: 'mobile',
      performanceScore: 55,
      fcp: 2200,
      lcp: 3200,
      cls: 0.12,
      tbt: 450,
      si: 2900,
      tti: 3800,
      category: 'News & Media',
      renderBlockingMs: 700,
      unusedJsBytes: 60000,
      unusedCssBytes: 20000,
      thirdPartyBlockingMs: 400
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      getAllCrawlResults: vi.fn(() => [...mockCrawlResults]),
      close: vi.fn()
    };
    vi.mocked(LighthouseDatabase).mockImplementation(() => mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('executeL3PatternInsights', () => {
    it('should analyze performance patterns', async () => {
      // Add more results to meet minSamples
      const extendedResults = [
        ...mockCrawlResults,
        ...mockCrawlResults.map((r, i) => ({ ...r, id: r.id + 10, url: r.url + '-copy' }))
      ];
      mockDb.getAllCrawlResults.mockReturnValue(extendedResults);

      const result = await executeL3PatternInsights({
        minSamples: 5
      });

      expect(result.patterns).toBeDefined();
      expect(result.patterns.length).toBeGreaterThan(0);

      // Should detect slow LCP pattern
      const slowLCPPattern = result.patterns.find(p => p.pattern.includes('Largest Contentful Paint'));
      expect(slowLCPPattern).toBeDefined();
      expect(slowLCPPattern?.impact).toBe('critical');
      expect(slowLCPPattern?.frequency).toBeGreaterThan(0);
    });

    it('should identify high CLS pattern', async () => {
      const extendedResults = [
        ...mockCrawlResults,
        ...mockCrawlResults.map((r, i) => ({ ...r, id: r.id + 10, url: r.url + '-copy' }))
      ];
      mockDb.getAllCrawlResults.mockReturnValue(extendedResults);

      const result = await executeL3PatternInsights({});

      const clsPattern = result.patterns.find(p => p.pattern.includes('Cumulative Layout Shift'));
      expect(clsPattern).toBeDefined();
      expect(clsPattern?.affectedSites.length).toBeGreaterThan(0);
    });

    it('should analyze category insights', async () => {
      const extendedResults = [
        ...mockCrawlResults,
        ...mockCrawlResults.map((r, i) => ({ ...r, id: r.id + 10, url: r.url + '-copy' }))
      ];
      mockDb.getAllCrawlResults.mockReturnValue(extendedResults);

      const result = await executeL3PatternInsights({});

      expect(result.categoryInsights).toBeDefined();
      expect(result.categoryInsights.length).toBeGreaterThan(0);

      const ecommerceInsight = result.categoryInsights.find(i => i.category === 'E-commerce');
      expect(ecommerceInsight).toBeDefined();
      expect(ecommerceInsight?.averageScore).toBeLessThan(50);
      expect(ecommerceInsight?.commonIssues.length).toBeGreaterThan(0);
    });

    it('should calculate global trends', async () => {
      const extendedResults = [
        ...mockCrawlResults,
        ...mockCrawlResults.map((r, i) => ({ ...r, id: r.id + 10, url: r.url + '-copy' }))
      ];
      mockDb.getAllCrawlResults.mockReturnValue(extendedResults);

      const result = await executeL3PatternInsights({});

      expect(result.globalTrends).toBeDefined();
      expect(result.globalTrends.avgPerformanceScore).toBeGreaterThan(0);
      expect(result.globalTrends.avgPerformanceScore).toBeLessThan(100);
      expect(result.globalTrends.avgLCP).toBeGreaterThan(0);
      expect(result.globalTrends.avgFCP).toBeGreaterThan(0);
      expect(result.globalTrends.avgCLS).toBeGreaterThan(0);
      expect(result.globalTrends.avgTBT).toBeGreaterThan(0);
      expect(result.globalTrends.mostCommonIssues.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', async () => {
      const extendedResults = [
        ...mockCrawlResults,
        ...mockCrawlResults.map((r, i) => ({ ...r, id: r.id + 10, url: r.url + '-copy' }))
      ];
      mockDb.getAllCrawlResults.mockReturnValue(extendedResults);

      const result = await executeL3PatternInsights({});

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.immediate).toBeDefined();
      expect(result.recommendations.strategic).toBeDefined();
      expect(result.recommendations.immediate.length).toBeGreaterThan(0);
    });

    it('should filter by time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const timeFilteredResults = mockCrawlResults.map((r, i) => ({
        ...r,
        timestamp: i < 3 ? oneHourAgo.toISOString() : twoHoursAgo.toISOString()
      }));

      // Add more results to meet minSamples
      const extendedResults = [
        ...timeFilteredResults,
        ...timeFilteredResults.map((r, i) => ({ ...r, id: r.id + 10, url: r.url + '-copy', timestamp: oneHourAgo.toISOString() })),
        ...timeFilteredResults.map((r, i) => ({ ...r, id: r.id + 20, url: r.url + '-copy2', timestamp: oneHourAgo.toISOString() }))
      ];
      mockDb.getAllCrawlResults.mockReturnValue(extendedResults);

      const result = await executeL3PatternInsights({
        timeRange: {
          start: new Date(now.getTime() - 90 * 60 * 1000),
          end: now
        },
        minSamples: 5
      });

      expect(result.patterns).toBeDefined();
      // Should have analyzed some results
      expect(result.summary).toContain('Analyzed');
      expect(result.summary).toMatch(/\d+ sites/);
    });

    it('should filter by categories', async () => {
      const extendedResults = [
        ...mockCrawlResults,
        ...mockCrawlResults.map((r, i) => ({ ...r, id: r.id + 10, url: r.url + '-copy' }))
      ];
      mockDb.getAllCrawlResults.mockReturnValue(extendedResults);

      const result = await executeL3PatternInsights({
        categories: ['E-commerce'],
        minSamples: 2 // Lower minSamples since we're filtering
      });

      // After filtering, only E-commerce sites should be analyzed
      // But categoryInsights may show all categories from the filtered results
      const ecommerceInsight = result.categoryInsights.find(i => i.category === 'E-commerce');
      expect(ecommerceInsight).toBeDefined();
    });

    it('should handle insufficient samples', async () => {
      mockDb.getAllCrawlResults.mockReturnValue([mockCrawlResults[0]]);

      await expect(
        executeL3PatternInsights({ minSamples: 10 })
      ).rejects.toThrow('Insufficient data');
    });

    it('should generate summary correctly', async () => {
      const extendedResults = [
        ...mockCrawlResults,
        ...mockCrawlResults.map((r, i) => ({ ...r, id: r.id + 10, url: r.url + '-copy' }))
      ];
      mockDb.getAllCrawlResults.mockReturnValue(extendedResults);

      const result = await executeL3PatternInsights({});

      expect(result.summary).toBeDefined();
      expect(result.summary).toContain('Analyzed');
      expect(result.summary).toContain('sites');
      expect(result.summary).toContain('categories');
      expect(result.summary).toContain('Average performance score');
    });

    it('should identify third-party impact pattern', async () => {
      const extendedResults = [
        ...mockCrawlResults,
        ...mockCrawlResults.map((r, i) => ({ ...r, id: r.id + 10, url: r.url + '-copy' }))
      ];
      mockDb.getAllCrawlResults.mockReturnValue(extendedResults);

      const result = await executeL3PatternInsights({});

      const thirdPartyPattern = result.patterns.find(p => p.pattern.includes('Third-Party'));
      expect(thirdPartyPattern).toBeDefined();
      expect(thirdPartyPattern?.recommendation.toLowerCase()).toContain('lazy-load');
    });

    it('should detect trends in categories', async () => {
      const extendedResults = [
        ...mockCrawlResults,
        ...mockCrawlResults.map((r, i) => ({ ...r, id: r.id + 10, url: r.url + '-copy' }))
      ];
      mockDb.getAllCrawlResults.mockReturnValue(extendedResults);

      const result = await executeL3PatternInsights({});

      const newsInsight = result.categoryInsights.find(i => i.category === 'News & Media');
      expect(newsInsight).toBeDefined();
      expect(newsInsight?.trends).toBeDefined();
      expect(typeof newsInsight?.trends.improving).toBe('boolean');
      expect(typeof newsInsight?.trends.rateOfChange).toBe('number');
    });
  });

  describe('MCP Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l3PatternInsightsTool.name).toBe('l3_pattern_insights');
      expect(l3PatternInsightsTool.description).toContain('Analyze performance patterns');
      expect(l3PatternInsightsTool.description).toContain('Layer 3');
    });

    it('should have valid input schema', () => {
      const schema = l3PatternInsightsTool.inputSchema;

      expect(schema.type).toBe('object');
      expect(schema.properties.minSamples).toBeDefined();
      expect(schema.properties.categories).toBeDefined();
      expect(schema.properties.timeRange).toBeDefined();
    });

    it('should execute and format output correctly', async () => {
      const extendedResults = [
        ...mockCrawlResults,
        ...mockCrawlResults.map((r, i) => ({ ...r, id: r.id + 10, url: r.url + '-copy' }))
      ];
      mockDb.getAllCrawlResults.mockReturnValue(extendedResults);

      const result = await l3PatternInsightsTool.execute({});

      expect(result.type).toBe('text');
      expect(result.text).toContain('# Performance Pattern Analysis');
      expect(result.text).toContain('## Executive Summary');
      expect(result.text).toContain('## Global Performance Metrics');
      expect(result.text).toContain('## Critical Performance Patterns');
      expect(result.text).toContain('## Strategic Recommendations');
    });
  });
});