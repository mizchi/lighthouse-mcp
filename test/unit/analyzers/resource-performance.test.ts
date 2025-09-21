import { describe, it, expect } from 'vitest';
import { analyzeResourcePerformance, type ResourcePerformanceAnalysis } from '../../../src/analyzers/resourcePerformance';
import type { LighthouseReport } from '../../../src/types';

describe('Resource Performance Analysis', () => {
  describe('analyzeResourcePerformance', () => {
    it('should analyze JavaScript execution time', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'bootup-time': {
            id: 'bootup-time',
            title: 'JavaScript execution time',
            score: 0.3,
            numericValue: 5000,
            details: {
              type: 'table',
              items: [
                {
                  url: 'https://example.com/app.js',
                  total: 2000,
                  scripting: 1500,
                  scriptParseCompile: 500
                },
                {
                  url: 'https://example.com/vendor.js',
                  total: 3000,
                  scripting: 2500,
                  scriptParseCompile: 500
                }
              ]
            }
          },
          'mainthread-work-breakdown': {
            id: 'mainthread-work-breakdown',
            title: 'Main thread work breakdown',
            score: 0.4,
            numericValue: 8000,
            details: {
              type: 'table',
              items: [
                { group: 'Script Evaluation', duration: 4000 },
                { group: 'Style & Layout', duration: 2000 },
                { group: 'Rendering', duration: 1000 },
                { group: 'System', duration: 500 },
                { group: 'Idle', duration: 500 }
              ]
            }
          }
        }
      };

      const result = analyzeResourcePerformance(report as LighthouseReport);

      expect(result.javascript).toBeDefined();
      expect(result.javascript?.totalExecutionTime).toBe(5000);
      expect(result.javascript?.files).toHaveLength(2);
      expect(result.javascript?.files[0]).toMatchObject({
        url: 'https://example.com/app.js',
        executionTime: 1500,
        parseTime: 500,
        impact: 'high'
      });
      expect(result.javascript?.mainThreadImpact).toBe(4000);
      expect(result.javascript?.recommendations).toContain('Consider code splitting');
    });

    it('should analyze CSS processing time', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'mainthread-work-breakdown': {
            id: 'mainthread-work-breakdown',
            title: 'Main thread work breakdown',
            score: 0.5,
            numericValue: 5000,
            details: {
              type: 'table',
              items: [
                { group: 'Style & Layout', duration: 2000 },
                { group: 'Script Evaluation', duration: 2000 },
                { group: 'Rendering', duration: 500 },
                { group: 'Painting', duration: 500 }
              ]
            }
          },
          'unminified-css': {
            id: 'unminified-css',
            title: 'Unminified CSS',
            score: 0.5,
            details: {
              type: 'table',
              items: [
                {
                  url: 'https://example.com/styles.css',
                  totalBytes: 100000,
                  wastedBytes: 30000
                }
              ]
            }
          }
        }
      };

      const result = analyzeResourcePerformance(report as LighthouseReport);

      expect(result.css).toBeDefined();
      expect(result.css?.processingTime).toBe(2000);
      expect(result.css?.renderingImpact).toBe(500);
      expect(result.css?.paintingImpact).toBe(500);
      expect(result.css?.unminifiedFiles).toHaveLength(1);
      expect(result.css?.totalImpact).toBe(3000);
      expect(result.css?.recommendations).toContain('Minify CSS files');
    });

    it('should analyze image optimization opportunities', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'uses-webp-images': {
            id: 'uses-webp-images',
            title: 'Use WebP images',
            score: 0.3,
            numericValue: 2000,
            details: {
              type: 'opportunity',
              items: [
                {
                  url: 'https://example.com/hero.jpg',
                  totalBytes: 500000,
                  wastedBytes: 250000
                },
                {
                  url: 'https://example.com/banner.png',
                  totalBytes: 300000,
                  wastedBytes: 150000
                }
              ],
              overallSavingsBytes: 400000
            }
          },
          'uses-optimized-images': {
            id: 'uses-optimized-images',
            title: 'Optimize images',
            score: 0.4,
            details: {
              type: 'opportunity',
              items: [
                {
                  url: 'https://example.com/hero.jpg',
                  totalBytes: 500000,
                  wastedBytes: 100000
                }
              ],
              overallSavingsBytes: 100000
            }
          },
          'uses-responsive-images': {
            id: 'uses-responsive-images',
            title: 'Properly size images',
            score: 0.5,
            details: {
              type: 'opportunity',
              items: [
                {
                  url: 'https://example.com/logo.png',
                  totalBytes: 50000,
                  wastedBytes: 25000
                }
              ],
              overallSavingsBytes: 25000
            }
          }
        }
      };

      const result = analyzeResourcePerformance(report as LighthouseReport);

      expect(result.images).toBeDefined();
      expect(result.images?.totalSavingsBytes).toBe(525000);
      expect(result.images?.opportunities).toHaveLength(3);
      expect(result.images?.opportunities[0]).toMatchObject({
        type: 'webp',
        savingsBytes: 400000,
        files: expect.any(Array)
      });
      expect(result.images?.largestImpact).toMatchObject({
        url: 'https://example.com/hero.jpg',
        currentSize: 500000,
        potentialSavings: 350000
      });
      expect(result.images?.recommendations).toContain('Convert images to WebP format');
    });

    it('should provide overall resource impact score', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'bootup-time': {
            id: 'bootup-time',
            score: 0.6,
            numericValue: 2000
          },
          'mainthread-work-breakdown': {
            id: 'mainthread-work-breakdown',
            score: 0.7,
            numericValue: 3000,
            details: {
              type: 'table',
              items: [
                { group: 'Script Evaluation', duration: 1500 },
                { group: 'Style & Layout', duration: 1000 },
                { group: 'Rendering', duration: 500 }
              ]
            }
          },
          'uses-webp-images': {
            id: 'uses-webp-images',
            score: 0.8,
            details: {
              overallSavingsBytes: 100000
            }
          }
        }
      };

      const result = analyzeResourcePerformance(report as LighthouseReport);

      expect(result.overallScore).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.bottlenecks).toBeDefined();
      expect(result.bottlenecks).toContain('JavaScript execution');
    });
  });
});