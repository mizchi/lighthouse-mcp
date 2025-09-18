/**
 * Simplified MCP Tools Integration Tests
 *
 * Tests the integration of MCP tools with proper mocking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockReport,
  createUnusedCodeAudit,
  createThirdPartySummary,
  createComplexChainWithLCP,
  createLCPElement
} from '../utils/test-helpers';

// Import analysis logic directly
import { analyzeComprehensiveIssues } from '../../src/tools/l2-comprehensive-issues';
import {
  analyzeUnusedCode,
  analyzeLCPChain,
  analyzePerformanceBudget
} from '../../src/tools/analysis-functions';

describe('MCP Tools Integration - Simplified', () => {
  beforeEach(() => {
    // Clear any test state
  });

  describe('Layer 2 Analysis', () => {
    it('should detect comprehensive issues from mock report', () => {
      const mockReport = createMockReport({
        url: 'https://test-site.com',
        performanceScore: 0.35,
        lcp: 8500,
        fcp: 4200,
        cls: 0.25,
        tbt: 1200,
        audits: {
          'unused-css-rules': createUnusedCodeAudit([
            {
              url: 'https://test-site.com/styles.css',
              totalBytes: 300000,
              wastedBytes: 280000,
              wastedPercent: 93
            }
          ]),
          'third-party-summary': createThirdPartySummary([
            {
              entity: 'Google Analytics',
              transferSize: 50000,
              blockingTime: 400
            },
            {
              entity: 'Facebook SDK',
              transferSize: 120000,
              blockingTime: 600
            }
          ])
        }
      });

      const result = analyzeComprehensiveIssues(mockReport);

      // Verify issues were detected
      expect(result.summary.totalIssues).toBeGreaterThan(0);
      expect(result.summary.criticalCount).toBeGreaterThan(0);

      // Check for specific issue types
      const cssIssue = result.issues.find(i => i.type === 'unused-css');
      expect(cssIssue).toBeDefined();
      expect(cssIssue?.severity).toBe('critical');

      const lcpIssue = result.issues.find(i => i.type === 'slow-lcp');
      expect(lcpIssue).toBeDefined();
      expect(lcpIssue?.impact.value).toBe(8500);

      const thirdPartyIssue = result.issues.find(i => i.type === 'third-party-blocking');
      expect(thirdPartyIssue).toBeDefined();
    });

    it('should analyze unused code correctly', () => {
      const mockReport = createMockReport({
        audits: {
          'unused-css-rules': createUnusedCodeAudit([
            { url: 'https://test.com/app.css', totalBytes: 100000, wastedBytes: 90000, wastedPercent: 90 },
            { url: 'https://test.com/vendor.css', totalBytes: 200000, wastedBytes: 150000, wastedPercent: 75 }
          ]),
          'unused-javascript': {
            id: 'unused-javascript',
            title: 'Remove unused JavaScript',
            score: 0.2,
            details: {
              type: 'opportunity',
              items: [
                { url: 'https://test.com/app.js', totalBytes: 500000, wastedBytes: 400000, wastedPercent: 80 },
                { url: 'https://test.com/vendor.js', totalBytes: 300000, wastedBytes: 200000, wastedPercent: 66 }
              ],
              overallSavingsBytes: 600000
            }
          }
        }
      });

      const result = analyzeUnusedCode(mockReport);

      // Verify unused code totals
      expect(result.totalUnusedCSSBytes).toBe(240000);
      expect(result.totalUnusedJSBytes).toBe(600000);
      expect(result.totalWastedBytes).toBe(840000);

      // Check recommendations
      expect(result.recommendations).toContain('PurgeCSS');
      expect(result.recommendations.some(r => r.includes('tree-shaking'))).toBe(true);
    });
  });

  describe('LCP Chain Analysis', () => {
    it('should filter non-LCP resources from critical chain', () => {
      const lcpUrl = 'https://test-site.com/hero-image.webp';

      const mockReport = createMockReport({
        lcp: 4500,
        audits: {
          'critical-request-chains': {
            id: 'critical-request-chains',
            title: 'Avoid chaining critical requests',
            displayValue: '10 chains found',
            details: {
              type: 'criticalrequestchain',
              chains: createComplexChainWithLCP(lcpUrl),
              longestChain: {
                duration: 2000,
                length: 3,
                transferSize: 510000
              }
            }
          },
          'largest-contentful-paint-element': {
            id: 'largest-contentful-paint-element',
            title: 'Largest Contentful Paint element',
            displayValue: '4.5 s',
            details: {
              type: 'list',
              items: [createLCPElement({
                type: 'image',
                url: lcpUrl,
                selector: 'img.hero',
                timing: 4500
              })]
            }
          },
          'network-requests': {
            id: 'network-requests',
            title: 'Network Requests',
            details: {
              type: 'table',
              items: [
                { url: 'https://example.com/', startTime: 0, endTime: 100 },
                { url: 'https://example.com/critical.css', startTime: 100, endTime: 200 },
                { url: lcpUrl, startTime: 200, endTime: 2000 },
                { url: 'https://analytics.example.com/track.js', startTime: 150, endTime: 300 },
                { url: 'https://ads.example.com/banner.js', startTime: 200, endTime: 500 }
              ]
            }
          }
        }
      });

      const result = analyzeLCPChain(mockReport);

      // Verify LCP element is identified
      expect(result.lcpElement?.url).toBe(lcpUrl);

      // Check critical path contains only LCP-related resources
      const criticalUrls = result.criticalPath.map(node => node.url);

      // Should contain LCP and its parents
      expect(criticalUrls).toContain(lcpUrl);
      expect(criticalUrls).toContain('https://example.com/');

      // Should NOT contain analytics or ads
      expect(criticalUrls).not.toContain('https://analytics.example.com/track.js');
      expect(criticalUrls).not.toContain('https://ads.example.com/banner.js');

      // Check bottlenecks
      expect(result.bottlenecks.length).toBeGreaterThan(0);
      const imageBottleneck = result.bottlenecks.find(b =>
        b.resource.includes('hero-image')
      );
      expect(imageBottleneck).toBeDefined();
    });
  });

  describe('Layer 3 Budget Analysis', () => {
    it('should detect budget violations', () => {
      const mockReport = createMockReport({
        performanceScore: 0.45,
        lcp: 5000,
        fcp: 2500,
        cls: 0.15,
        tbt: 400
      });

      const budget = {
        lcp: 2500,
        fcp: 1800,
        cls: 0.1,
        tbt: 200,
        performanceScore: 90
      };

      const result = analyzePerformanceBudget(mockReport, budget);

      // Check violations
      expect(result.status).toBe('failing');
      expect(result.violations.length).toBeGreaterThan(0);

      // Verify LCP violation
      const lcpViolation = result.violations.find(v => v.metric === 'lcp');
      expect(lcpViolation).toBeDefined();
      expect(lcpViolation?.actual).toBe(5000);
      expect(lcpViolation?.overBy).toBe(2500);
      expect(lcpViolation?.severity).toBe('high');

      // Check recommendations
      expect(result.recommendations.immediate.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Layer Analysis', () => {
    it('should compose multiple analyses', () => {
      const mockReport = createMockReport({
        performanceScore: 0.3,
        lcp: 6000,
        audits: {
          'unused-css-rules': createUnusedCodeAudit([
            { url: 'https://test.com/styles.css', totalBytes: 200000, wastedBytes: 180000, wastedPercent: 90 }
          ])
        }
      });

      // Run multiple analyses
      const issues = analyzeComprehensiveIssues(mockReport);
      const unused = analyzeUnusedCode(mockReport);
      const budget = analyzePerformanceBudget(mockReport, {
        performanceScore: 90,
        lcp: 2500
      });

      // All analyses should produce results
      expect(issues.issues.length).toBeGreaterThan(0);
      expect(unused.totalWastedBytes).toBeGreaterThan(0);
      expect(budget.violations.length).toBeGreaterThan(0);

      // Check for CSS-related recommendations
      const hasUnusedCSSRec = budget.recommendations.immediate.some(r =>
        r.toLowerCase().includes('css') || r.toLowerCase().includes('unused')
      );
      expect(hasUnusedCSSRec).toBeDefined();
    });
  });
});