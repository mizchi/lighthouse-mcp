import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeL2ComprehensiveIssues,
  l2ComprehensiveIssuesTool,
  type Issue
} from '../../../src/tools/l2-comprehensive-issues';
import * as l1GetReport from '../../../src/tools/l1-get-report';

vi.mock('../../../src/tools/l1-get-report');

describe('L2 Comprehensive Issues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockReport = {
    requestedUrl: 'https://example.com',
    finalUrl: 'https://example.com',
    categories: {
      performance: { score: 0.45 }
    },
    audits: {
      'unused-css-rules': {
        score: 0.2,
        details: {
          items: [
            {
              url: 'https://example.com/style.css',
              wastedBytes: 250000,
              wastedPercent: 85
            }
          ],
          overallSavingsBytes: 250000,
          overallSavingsMs: 1200
        }
      },
      'unused-javascript': {
        score: 0.3,
        details: {
          items: [
            {
              url: 'https://example.com/app.js',
              wastedBytes: 180000,
              wastedPercent: 75
            }
          ],
          overallSavingsBytes: 180000
        }
      },
      'mainthread-work-breakdown': {
        details: {
          items: [
            {
              group: 'styleLayout',
              duration: 1800
            },
            {
              group: 'scriptEvaluation',
              duration: 2500
            }
          ]
        }
      },
      'render-blocking-resources': {
        score: 0.7,
        details: {
          items: [
            {
              url: 'https://example.com/critical.css',
              wastedMs: 1500
            }
          ],
          overallSavingsMs: 1500
        }
      },
      'uses-responsive-images': {
        score: 0.6,
        details: {
          items: [
            {
              url: 'https://example.com/hero.jpg',
              wastedBytes: 200000
            }
          ],
          overallSavingsBytes: 200000
        }
      },
      'uses-webp-images': {
        score: 0.7,
        details: {
          items: [],
          overallSavingsBytes: 150000
        }
      },
      'offscreen-images': {
        score: 0.8,
        details: {
          items: [],
          overallSavingsBytes: 80000
        }
      },
      'font-display': {
        score: 0
      },
      'uses-rel-preconnect': {
        details: {
          items: [
            {
              url: 'https://fonts.googleapis.com'
            }
          ]
        }
      },
      'uses-http2': {
        score: 0,
        details: {
          items: Array(10).fill({ url: 'https://example.com/resource' })
        }
      },
      'uses-text-compression': {
        score: 0.5,
        details: {
          overallSavingsBytes: 100000
        }
      },
      'uses-long-cache-ttl': {
        score: 0.6,
        details: {
          items: Array(15).fill({
            url: 'https://example.com/asset',
            cacheLifetimeMs: 3600000
          })
        }
      },
      'dom-size': {
        score: 0.3,
        details: {
          items: [
            {
              statistic: 'Total DOM Elements',
              value: { type: 'numeric', value: 2500 }
            }
          ]
        }
      },
      'cumulative-layout-shift': {
        numericValue: 0.15
      },
      'total-blocking-time': {
        numericValue: 850
      },
      'third-party-summary': {
        score: 0.7,
        details: {
          items: [
            {
              entity: 'Google Analytics',
              blockingTime: 400,
              transferSize: 50000
            },
            {
              entity: 'Facebook',
              blockingTime: 300,
              transferSize: 80000
            }
          ]
        }
      },
      'long-tasks': {
        details: {
          items: Array(8).fill({ duration: 75 })
        }
      },
      'non-composited-animations': {
        score: 0
      }
    }
  } as any;

  describe('executeL2ComprehensiveIssues', () => {
    it('should detect CSS issues', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      const cssIssues = result.categories.cssIssues;
      expect(cssIssues.length).toBeGreaterThan(0);

      const unusedCSSIssue = cssIssues.find(i => i.type === 'unused-css');
      expect(unusedCSSIssue).toBeDefined();
      expect(unusedCSSIssue?.severity).toBe('critical');
      expect(unusedCSSIssue?.description).toContain('244KB');
      expect(unusedCSSIssue?.solution.quick).toContain('PurgeCSS');
    });

    it('should detect JavaScript issues', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      const jsIssues = result.categories.jsIssues;
      expect(jsIssues.length).toBeGreaterThan(0);

      const unusedJSIssue = jsIssues.find(i => i.type === 'unused-javascript');
      expect(unusedJSIssue).toBeDefined();
      expect(unusedJSIssue?.severity).toBe('high');

      const longTasksIssue = jsIssues.find(i => i.type === 'long-tasks');
      expect(longTasksIssue).toBeDefined();
      expect(longTasksIssue?.severity).toBe('high');

      const thirdPartyIssue = jsIssues.find(i => i.type === 'third-party-blocking');
      expect(thirdPartyIssue).toBeDefined();
    });

    it('should detect image optimization issues', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      const imageIssues = result.categories.imageIssues;
      expect(imageIssues.length).toBeGreaterThan(0);

      const oversizedImages = imageIssues.find(i => i.type === 'oversized-images');
      expect(oversizedImages).toBeDefined();
      expect(oversizedImages?.impact.value).toBe(200000);

      const modernFormats = imageIssues.find(i => i.type === 'legacy-image-formats');
      expect(modernFormats).toBeDefined();
    });

    it('should detect font issues', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      const fontIssues = result.categories.fontIssues;
      expect(fontIssues.length).toBeGreaterThan(0);

      const fontDisplay = fontIssues.find(i => i.type === 'font-display');
      expect(fontDisplay).toBeDefined();
      expect(fontDisplay?.severity).toBe('medium');
      expect(fontDisplay?.solution.quick).toContain('font-display: swap');
    });

    it('should detect network issues', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      const networkIssues = result.categories.networkIssues;
      expect(networkIssues.length).toBeGreaterThan(0);

      const http2Issue = networkIssues.find(i => i.type === 'http1-resources');
      expect(http2Issue).toBeDefined();

      const compressionIssue = networkIssues.find(i => i.type === 'uncompressed-text');
      if (compressionIssue) {
        expect(compressionIssue).toBeDefined();
        expect(compressionIssue.severity).toBe('high');
      }

      const cacheIssue = networkIssues.find(i => i.type === 'short-cache-ttl');
      expect(cacheIssue).toBeDefined();
    });

    it('should detect rendering issues', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      const renderingIssues = result.categories.renderingIssues;
      expect(renderingIssues.length).toBeGreaterThan(0);

      const renderBlocking = renderingIssues.find(i => i.type === 'render-blocking');
      expect(renderBlocking).toBeDefined();
      expect(renderBlocking?.severity).toBe('high');

      const domSize = renderingIssues.find(i => i.type === 'excessive-dom');
      expect(domSize).toBeDefined();
      expect(domSize?.description).toContain('2500');

      const layoutShift = renderingIssues.find(i => i.type === 'layout-shift');
      expect(layoutShift).toBeDefined();
      expect(layoutShift?.severity).toBe('medium');

      const animations = renderingIssues.find(i => i.type === 'non-composited-animations');
      expect(animations).toBeDefined();
    });

    it('should identify quick wins', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      expect(result.quickWins.length).toBeGreaterThan(0);
      expect(result.quickWins.length).toBeLessThanOrEqual(5);

      // Quick wins should be low effort and not low severity
      result.quickWins.forEach(issue => {
        expect(issue.solution.effort).toBe('low');
        expect(issue.severity).not.toBe('low');
      });
    });

    it('should calculate summary correctly', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      expect(result.summary.totalIssues).toBeGreaterThan(0);
      expect(result.summary.criticalCount).toBeGreaterThanOrEqual(0);
      expect(result.summary.highCount).toBeGreaterThanOrEqual(0);
      expect(result.summary.mediumCount).toBeGreaterThanOrEqual(0);
      expect(result.summary.lowCount).toBeGreaterThanOrEqual(0);

      const total = result.summary.criticalCount +
                   result.summary.highCount +
                   result.summary.mediumCount +
                   result.summary.lowCount;
      expect(total).toBe(result.summary.totalIssues);

      expect(result.summary.estimatedImpact.performance).toBeGreaterThanOrEqual(0);
      expect(result.summary.estimatedImpact.size).toBeGreaterThan(0);
      expect(result.summary.estimatedImpact.time).toBeGreaterThan(0);
    });

    it('should generate recommendations', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Recommendations should be generated based on the issues found
      // Check for at least one relevant recommendation
      const hasRelevantRecommendation = result.recommendations.some(r =>
        r.includes('CSS') ||
        r.includes('JavaScript') ||
        r.includes('quick wins') ||
        r.includes('critical')
      );
      expect(hasRelevantRecommendation).toBe(true);
    });

    it('should sort issues by severity', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < result.issues.length; i++) {
        const prevSeverity = severityOrder[result.issues[i - 1].severity];
        const currSeverity = severityOrder[result.issues[i].severity];
        expect(prevSeverity).toBeLessThanOrEqual(currSeverity);
      }
    });

    it('should handle missing audits gracefully', async () => {
      const minimalReport = {
        requestedUrl: 'https://example.com',
        finalUrl: 'https://example.com',
        categories: {
          performance: { score: 0.8 }
        },
        audits: {}
      };

      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: minimalReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      expect(result.issues).toBeDefined();
      expect(result.summary.totalIssues).toBeGreaterThanOrEqual(0);
    });

    it('should throw error without reportId or url', async () => {
      await expect(
        executeL2ComprehensiveIssues({})
      ).rejects.toThrow('Either reportId, url, or report is required');
    });
  });

  describe('MCP Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l2ComprehensiveIssuesTool.name).toBe('l2_comprehensive_issues');
      expect(l2ComprehensiveIssuesTool.description).toContain('Detect all performance issues');
      expect(l2ComprehensiveIssuesTool.description).toContain('Layer 2');
    });

    it('should have valid input schema', () => {
      const schema = l2ComprehensiveIssuesTool.inputSchema;

      expect(schema.type).toBe('object');
      expect(schema.properties.reportId).toBeDefined();
      expect(schema.properties.url).toBeDefined();
      expect(schema.properties.thresholds).toBeDefined();
      expect(schema.oneOf).toHaveLength(2);
    });

    it('should execute and format output correctly', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await l2ComprehensiveIssuesTool.execute({
        reportId: 'test-report'
      });

      expect(result.type).toBe('text');
      expect(result.text).toContain('# Comprehensive Performance Issues Analysis');
      expect(result.text).toContain('## Summary');
      expect(result.text).toContain('Total Issues:');

      // Should include critical issues section if there are any
      const hasOutput = await executeL2ComprehensiveIssues({ reportId: 'test-report' });
      if (hasOutput.summary.criticalCount > 0) {
        expect(result.text).toContain('## 🚨 Critical Issues');
      }

      if (hasOutput.quickWins.length > 0) {
        expect(result.text).toContain('## ✅ Quick Wins');
      }

      expect(result.text).toContain('## 📊 Issues by Category');
      expect(result.text).toContain('## 💡 Recommendations');
    });
  });

  describe('Issue Detection Functions', () => {
    it('should properly categorize issue effort levels', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      result.issues.forEach(issue => {
        expect(['low', 'medium', 'high']).toContain(issue.solution.effort);
      });
    });

    it('should include resources for relevant issues', async () => {
      vi.mocked(l1GetReport.executeL1GetReport).mockResolvedValue({
        data: mockReport
      } as any);

      const result = await executeL2ComprehensiveIssues({
        reportId: 'test-report'
      });

      const cssIssue = result.issues.find(i => i.type === 'unused-css');
      expect(cssIssue?.resources).toBeDefined();
      if (cssIssue?.resources) {
        expect(cssIssue.resources.length).toBeGreaterThan(0);
        expect(cssIssue.resources[0]).toContain('http');
      }
    });
  });
});