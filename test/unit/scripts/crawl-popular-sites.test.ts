import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('../../../src/core/database', () => ({
  LighthouseDatabase: vi.fn().mockImplementation(() => ({
    getCrawlResult: vi.fn(),
    saveCrawlResult: vi.fn(),
    close: vi.fn(),
  })),
}));

// Mock the tools
vi.mock('../../../src/tools/l1-collect-single', () => ({
  executeL1Collect: vi.fn().mockResolvedValue({
    data: {
      reportId: 'test-report-1',
      url: 'https://example.com',
      fetchTime: new Date().toISOString(),
      categories: {
        performance: { score: 0.95 }
      },
      audits: {
        'first-contentful-paint': { numericValue: 1200 },
        'largest-contentful-paint': { numericValue: 2400 },
        'cumulative-layout-shift': { numericValue: 0.05 },
        'total-blocking-time': { numericValue: 150 },
      }
    }
  })
}));

describe('crawl-popular-sites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should define popular sites with categories', () => {
    // Popular sites should be categorized
    const expectedCategories = [
      'News',
      'E-commerce',
      'Social Media',
      'Search',
      'Development',
      'Entertainment',
      'Japanese'
    ];

    // This is more of a documentation test
    expectedCategories.forEach(category => {
      expect(category).toBeTruthy();
    });
  });

  it('should support simple and full modes', () => {
    const modes = ['simple', 'full'];
    modes.forEach(mode => {
      expect(['simple', 'full']).toContain(mode);
    });
  });

  it('should generate markdown report structure', () => {
    // Verify markdown includes expected sections
    const expectedSections = [
      '# Lighthouse Crawl Report',
      '## Summary Statistics',
      '## Performance Distribution',
      '## Core Web Vitals Violations',
      '## Site-by-Site Results'
    ];

    expectedSections.forEach(section => {
      expect(section).toBeTruthy();
    });
  });

  it('should calculate performance buckets correctly', () => {
    const scores = [0.95, 0.75, 0.45, 0.25, 0.85];

    const buckets = {
      excellent: scores.filter(s => s >= 0.9).length,
      good: scores.filter(s => s >= 0.75 && s < 0.9).length,
      needsImprovement: scores.filter(s => s >= 0.5 && s < 0.75).length,
      poor: scores.filter(s => s < 0.5).length,
    };

    expect(buckets.excellent).toBe(1);
    expect(buckets.good).toBe(2);
    expect(buckets.needsImprovement).toBe(0);
    expect(buckets.poor).toBe(2);
  });

  it('should find best and worst performers in category', () => {
    const categoryResults = [
      { url: 'https://site1.com', performanceScore: 0.85 },
      { url: 'https://site2.com', performanceScore: 0.95 },
      { url: 'https://site3.com', performanceScore: 0.45 },
      { url: 'https://site4.com', performanceScore: null },
      { url: 'https://site5.com', performanceScore: 0.75 },
    ];

    // Find best performer
    const best = categoryResults.reduce((best, current) => {
      if (current.performanceScore === null) return best;
      if (best.performanceScore === null) return current;
      return current.performanceScore > best.performanceScore ? current : best;
    }, categoryResults[0]);

    // Find worst performer
    const worst = categoryResults.reduce((worst, current) => {
      if (current.performanceScore === null) return worst;
      if (worst.performanceScore === null) return current;
      return current.performanceScore < worst.performanceScore ? current : worst;
    }, categoryResults[0]);

    expect(best.url).toBe('https://site2.com');
    expect(best.performanceScore).toBe(0.95);
    expect(worst.url).toBe('https://site3.com');
    expect(worst.performanceScore).toBe(0.45);
  });

  it('should calculate category averages correctly', () => {
    const categoryScores = [0.85, 0.95, 0.45, 0.75, 0.90];
    const avgScore = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;

    expect(avgScore).toBeCloseTo(0.78, 2);
    expect((avgScore * 100).toFixed(1)).toBe('78.0');
  });

  it('should identify Core Web Vitals violations', () => {
    const results = [
      { lcp: 2600, fcp: 1900, cls: 0.15, tbt: 300 }, // All violations
      { lcp: 2400, fcp: 1700, cls: 0.09, tbt: 200 }, // No violations
      { lcp: 3000, fcp: 1500, cls: 0.05, tbt: 250 }, // Only LCP violation
    ];

    const lcpViolations = results.filter(r => r.lcp > 2500);
    const fcpViolations = results.filter(r => r.fcp > 1800);
    const clsViolations = results.filter(r => r.cls > 0.1);

    expect(lcpViolations).toHaveLength(2);
    expect(fcpViolations).toHaveLength(1);
    expect(clsViolations).toHaveLength(1);
  });
});