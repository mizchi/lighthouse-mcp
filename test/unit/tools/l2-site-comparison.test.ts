import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeL2SiteComparison, l2SiteComparisonTool } from '../../../src/tools/l2-site-comparison';
import * as l1BatchCollect from '../../../src/tools/l1-collect-batch';
import * as reportStorage from '../../../src/core/reportStorage';

vi.mock('../../../src/tools/l1-collect-batch');
vi.mock('../../../src/core/reportStorage');

describe('L2 Site Comparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock storage to return our test reports
    const mockStorage = {
      getAllReports: vi.fn().mockReturnValue({
        isOk: () => true,
        value: [
          { id: 'report-news-1', url: 'https://www.example-news.com' },
          { id: 'report-shop-1', url: 'https://www.example-shop.com' },
          { id: 'report-social-1', url: 'https://www.example-social.com' }
        ]
      }),
      loadReport: vi.fn().mockImplementation((report) => {
        if (report.id === 'report-news-1') {
          return { isOk: () => true, value: mockNewsReport };
        } else if (report.id === 'report-shop-1') {
          return { isOk: () => true, value: mockShopReport };
        } else if (report.id === 'report-social-1') {
          return { isOk: () => true, value: mockSocialReport };
        }
        return { isOk: () => false };
      })
    };

    vi.mocked(reportStorage.getDefaultStorage).mockReturnValue(mockStorage as any);
  });

  const mockReports = [
    {
      reportId: 'report-news-1',
      url: 'https://www.example-news.com',
      device: 'mobile',
      categories: ['performance'],
      timestamp: Date.now(),
      cached: false
    },
    {
      reportId: 'report-shop-1',
      url: 'https://www.example-shop.com',
      device: 'mobile',
      categories: ['performance'],
      timestamp: Date.now(),
      cached: false
    },
    {
      reportId: 'report-social-1',
      url: 'https://www.example-social.com',
      device: 'mobile',
      categories: ['performance'],
      timestamp: Date.now(),
      cached: false
    }
  ];

  const mockBatchResult = {
    reports: mockReports,
    failed: []
  };

  // Mock report data for each site
  const mockNewsReport = {
    requestedUrl: 'https://www.example-news.com',
    finalUrl: 'https://www.example-news.com',
    categories: {
      performance: { score: 0.85 }
    },
    audits: {
      'first-contentful-paint': { numericValue: 1200 },
      'largest-contentful-paint': { numericValue: 2100 },
      'cumulative-layout-shift': { numericValue: 0.05 },
      'total-blocking-time': { numericValue: 200 },
      'speed-index': { numericValue: 2800 },
      'interactive': { numericValue: 3200 }
    }
  };

  const mockShopReport = {
    requestedUrl: 'https://www.example-shop.com',
    finalUrl: 'https://www.example-shop.com',
    categories: {
      performance: { score: 0.45 }
    },
    audits: {
      'first-contentful-paint': { numericValue: 3500 },
      'largest-contentful-paint': { numericValue: 5200 },
      'cumulative-layout-shift': { numericValue: 0.15 },
      'total-blocking-time': { numericValue: 800 },
      'speed-index': { numericValue: 4500 },
      'interactive': { numericValue: 6000 },
      'render-blocking-resources': {
        score: 0.3,
        details: {
          overallSavingsMs: 2000
        }
      },
      'unused-javascript': {
        score: 0.4,
        details: {
          overallSavingsBytes: 150000
        }
      }
    }
  };

  const mockSocialReport = {
    requestedUrl: 'https://www.example-social.com',
    finalUrl: 'https://www.example-social.com',
    categories: {
      performance: { score: 0.65 }
    },
    audits: {
      'first-contentful-paint': { numericValue: 2000 },
      'largest-contentful-paint': { numericValue: 3000 },
      'cumulative-layout-shift': { numericValue: 0.08 },
      'total-blocking-time': { numericValue: 400 },
      'third-party-summary': {
        details: {
          items: [
            { entity: 'Analytics', blockingTime: 600 },
            { entity: 'Ads', blockingTime: 800 }
          ]
        }
      }
    }
  };

  describe('executeL2SiteComparison', () => {
    it('should compare multiple sites successfully', async () => {
      vi.mocked(l1BatchCollect.executeL1BatchCollect).mockResolvedValue(mockBatchResult);

      const result = await executeL2SiteComparison({
        urls: [
          'https://www.example-news.com',
          'https://www.example-shop.com',
          'https://www.example-social.com'
        ]
      });

      expect(result.sites).toHaveLength(3);
      expect(result.summary).toBeDefined();
      expect(result.summary.averageScore).toBeCloseTo(65, 0);
    });

    it('should identify best and worst performers', async () => {
      vi.mocked(l1BatchCollect.executeL1BatchCollect).mockResolvedValue(mockBatchResult);

      const result = await executeL2SiteComparison({
        urls: ['https://www.example-news.com', 'https://www.example-shop.com']
      });

      expect(result.summary.bestPerformer.url).toBe('https://www.example-news.com');
      expect(result.summary.bestPerformer.performanceScore).toBe(85);
      expect(result.summary.worstPerformer.url).toBe('https://www.example-shop.com');
      expect(result.summary.worstPerformer.performanceScore).toBe(45);
    });

    it('should calculate median metrics correctly', async () => {
      vi.mocked(l1BatchCollect.executeL1BatchCollect).mockResolvedValue(mockBatchResult);

      const result = await executeL2SiteComparison({
        urls: ['https://www.example-news.com', 'https://www.example-shop.com', 'https://www.example-social.com']
      });

      expect(result.summary.medianLCP).toBe(3000); // Middle value of [2100, 3000, 5200]
      expect(result.summary.medianFCP).toBe(2000); // Middle value of [1200, 2000, 3500]
      expect(result.summary.medianCLS).toBe(0.08); // Middle value of [0.05, 0.08, 0.15]
      expect(result.summary.medianTBT).toBe(400); // Middle value of [200, 400, 800]
    });

    it('should categorize sites correctly', async () => {
      vi.mocked(l1BatchCollect.executeL1BatchCollect).mockResolvedValue(mockBatchResult);

      const result = await executeL2SiteComparison({
        urls: ['https://www.example-news.com', 'https://www.example-shop.com', 'https://www.example-social.com']
      });

      const newseSite = result.sites.find(s => s.url === 'https://www.example-news.com');
      const shopSite = result.sites.find(s => s.url === 'https://www.example-shop.com');
      const socialSite = result.sites.find(s => s.url === 'https://www.example-social.com');

      expect(newseSite?.category).toBe('News & Media');
      expect(shopSite?.category).toBe('E-commerce');
      expect(socialSite?.category).toBe('Social Media');
    });

    it('should identify performance issues', async () => {
      vi.mocked(l1BatchCollect.executeL1BatchCollect).mockResolvedValue({
        reports: [mockReports[1]], // Only the shop site with issues
        failed: []
      });

      const result = await executeL2SiteComparison({
        urls: ['https://www.example-shop.com']
      });

      const shopSite = result.sites[0];
      expect(shopSite.issues).toBeDefined();
      expect(shopSite.issues.length).toBeGreaterThan(0);
      expect(shopSite.issues).toContain('Poor LCP: 5.2s');
      expect(shopSite.issues).toContain('Slow FCP: 3.5s');
      expect(shopSite.issues).toContain('High TBT: 800ms');
      expect(shopSite.issues).toContain('Render-blocking: 2.0s');
      expect(shopSite.issues).toContain('Unused JS: 146KB');
    });

    it('should generate recommendations', async () => {
      vi.mocked(l1BatchCollect.executeL1BatchCollect).mockResolvedValue(mockBatchResult);

      const result = await executeL2SiteComparison({
        urls: ['https://www.example-news.com', 'https://www.example-shop.com']
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('LCP'))).toBe(true);
    });

    it('should group sites by category', async () => {
      vi.mocked(l1BatchCollect.executeL1BatchCollect).mockResolvedValue(mockBatchResult);

      const result = await executeL2SiteComparison({
        urls: ['https://www.example-news.com', 'https://www.example-shop.com', 'https://www.example-social.com']
      });

      expect(result.byCategory).toBeDefined();
      expect(result.byCategory?.['News & Media']).toBeDefined();
      expect(result.byCategory?.['E-commerce']).toBeDefined();
      expect(result.byCategory?.['Social Media']).toBeDefined();

      expect(result.byCategory?.['News & Media'].averageScore).toBe(85);
      expect(result.byCategory?.['E-commerce'].averageScore).toBe(45);
    });

    it('should handle batch collection errors', async () => {
      vi.mocked(l1BatchCollect.executeL1BatchCollect).mockResolvedValue({
        reports: [],
        failed: []
      });

      await expect(
        executeL2SiteComparison({ urls: ['https://example.com'] })
      ).rejects.toThrow('Failed to collect site data');
    });

    it('should use cache when specified', async () => {
      vi.mocked(l1BatchCollect.executeL1BatchCollect).mockResolvedValue(mockBatchResult);

      await executeL2SiteComparison({
        urls: ['https://example.com'],
        useCache: true
      });

      expect(l1BatchCollect.executeL1BatchCollect).toHaveBeenCalledWith(
        expect.objectContaining({
          gather: false // useCache: true => gather: false
        })
      );
    });
  });

  describe('MCP Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l2SiteComparisonTool.name).toBe('l2_site_comparison');
      expect(l2SiteComparisonTool.description).toContain('Compare performance metrics');
      expect(l2SiteComparisonTool.description).toContain('Layer 2');
    });

    it('should have valid input schema', () => {
      const schema = l2SiteComparisonTool.inputSchema;

      expect(schema.type).toBe('object');
      expect(schema.properties.urls).toBeDefined();
      expect(schema.properties.urls.type).toBe('array');
      expect(schema.properties.device).toBeDefined();
      expect(schema.properties.device.enum).toContain('mobile');
      expect(schema.properties.device.enum).toContain('desktop');
      expect(schema.required).toContain('urls');
    });

    it('should execute and format output correctly', async () => {
      vi.mocked(l1BatchCollect.executeL1BatchCollect).mockResolvedValue(mockBatchResult);

      const result = await l2SiteComparisonTool.execute({
        urls: ['https://www.example-news.com', 'https://www.example-shop.com']
      });

      expect(result.type).toBe('text');
      expect(result.text).toContain('# Site Performance Comparison');
      expect(result.text).toContain('## Summary');
      expect(result.text).toContain('## Median Metrics');
      expect(result.text).toContain('## Sites Ranked by Performance');
      expect(result.text).toContain('## Performance by Category');
      expect(result.text).toContain('## Recommendations');
    });
  });
});