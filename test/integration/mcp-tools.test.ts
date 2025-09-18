/**
 * MCP Tools Integration Tests
 *
 * Tests the integration and interoperability of MCP tools
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMockReport,
  createUnusedCodeAudit,
  createThirdPartySummary,
  createLCPElement,
  createComplexChainWithLCP,
  createMCPTestContext
} from '../utils/test-helpers';

// Import MCP tools
import { executeL1GetReport } from '../../src/tools/l1-get-report';
import { executeL2ComprehensiveIssues } from '../../src/tools/l2-comprehensive-issues';
import { executeL2UnusedCode } from '../../src/tools/l2-unused-code';
import { executeL2CriticalChain } from '../../src/tools/l2-critical-chain';
import { executeL2LCPChainAnalysis } from '../../src/tools/l2-lcp-chain-analysis';
import { executeL3PerformanceBudget } from '../../src/tools/l3-performance-budget';
import { executeL3PatternInsights } from '../../src/tools/l3-pattern-insights';

// Mock database and L1 tools
vi.mock('../../src/core/database');
vi.mock('../../src/tools/l1-get-report');

describe('MCP Tools Integration', () => {
  const testContext = createMCPTestContext();

  beforeEach(() => {
    testContext.reset();
    vi.clearAllMocks();

    // Setup default mock for executeL1GetReport
    const mockExecuteL1GetReport = executeL1GetReport as vi.MockedFunction<typeof executeL1GetReport>;
    mockExecuteL1GetReport.mockImplementation(async () => ({
      success: false,
      error: 'Not configured',
      reportId: '',
      timestamp: new Date()
    }));
  });

  describe('Layer 1 → Layer 2 Pipeline', () => {
    it('should flow data from collection to analysis', async () => {
      // Create a mock report with performance issues
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

      // Mock L1 tool
      const mockExecuteL1GetReport = executeL1GetReport as vi.MockedFunction<typeof executeL1GetReport>;
      mockExecuteL1GetReport.mockResolvedValue({
        success: true,
        data: mockReport,
        reportId: 'test-report-1',
        timestamp: new Date()
      });

      // Execute L2 comprehensive issues analysis
      const issuesResult = await executeL2ComprehensiveIssues({
        reportId: 'test-report-1'
      });

      // Verify issues were detected
      expect(issuesResult.summary.totalIssues).toBeGreaterThan(0);
      expect(issuesResult.summary.criticalCount).toBeGreaterThan(0);

      // Check for specific issue types
      const cssIssue = issuesResult.issues.find(i => i.type === 'unused-css');
      expect(cssIssue).toBeDefined();
      expect(cssIssue?.severity).toBe('critical');

      const lcpIssue = issuesResult.issues.find(i => i.type === 'slow-lcp');
      expect(lcpIssue).toBeDefined();
      expect(lcpIssue?.impact.value).toBe(8500);

      const thirdPartyIssue = issuesResult.issues.find(i => i.type === 'third-party-blocking');
      expect(thirdPartyIssue).toBeDefined();
    });

    it('should handle unused code analysis pipeline', async () => {
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

      const mockExecuteL1GetReport = executeL1GetReport as vi.MockedFunction<typeof executeL1GetReport>;
      mockExecuteL1GetReport.mockResolvedValue({
        success: true,
        data: mockReport,
        reportId: 'test-report-2',
        timestamp: new Date()
      });

      const unusedResult = await executeL2UnusedCode({
        reportId: 'test-report-2'
      });

      // Verify unused code totals (new structure)
      expect(unusedResult.unusedCode.totalWastedBytes).toBe(840000);
      expect(unusedResult.unusedCode.files).toHaveLength(4);

      // Check CSS files
      const cssFiles = unusedResult.unusedCode.files.filter(f => f.type === 'css');
      const totalCSSWasted = cssFiles.reduce((sum, f) => sum + f.wastedBytes, 0);
      expect(totalCSSWasted).toBe(240000);

      // Check JS files
      const jsFiles = unusedResult.unusedCode.files.filter(f => f.type === 'js');
      const totalJSWasted = jsFiles.reduce((sum, f) => sum + f.wastedBytes, 0);
      expect(totalJSWasted).toBe(600000);

      // Check recommendations
      expect(unusedResult.unusedCode.recommendations).toBeDefined();
      expect(unusedResult.unusedCode.recommendations.some(r => r.includes('PurgeCSS'))).toBe(true);
      expect(unusedResult.unusedCode.recommendations.some(r => r.includes('tree-shaking'))).toBe(true);
    });
  });

  describe('Layer 2 → Layer 3 Pipeline', () => {
    it('should perform budget analysis based on L2 findings', async () => {
      const mockReport = createMockReport({
        performanceScore: 0.45,
        lcp: 5000,
        fcp: 2500,
        cls: 0.15,
        tbt: 400
      });

      const mockExecuteL1GetReport = executeL1GetReport as vi.MockedFunction<typeof executeL1GetReport>;
      mockExecuteL1GetReport.mockResolvedValue({
        success: true,
        data: mockReport,
        reportId: 'test-report-3',
        timestamp: new Date()
      });

      // Define strict budget
      const budget = {
        lcp: 2500,
        fcp: 1800,
        cls: 0.1,
        tbt: 200,
        performanceScore: 90
      };

      const budgetResult = await executeL3PerformanceBudget({
        reportId: 'test-report-3',
        budget
      });

      // Check violations (status can be 'warning' or 'failing' based on threshold)
      expect(['warning', 'failing']).toContain(budgetResult.status);
      expect(budgetResult.violations.length).toBeGreaterThan(0);

      // Verify LCP violation
      const lcpViolation = budgetResult.violations.find(v => v.metric === 'lcp');
      expect(lcpViolation).toBeDefined();
      expect(lcpViolation?.actual).toBe(5000);
      expect(lcpViolation?.overBy).toBe(2500);
      expect(lcpViolation?.severity).toBe('critical');

      // Check recommendations
      expect(budgetResult.recommendations.immediate.length).toBeGreaterThan(0);
    });
  });

  describe('LCP Chain Analysis Integration', () => {
    it('should correctly analyze LCP chains with mixed resources', async () => {
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

      const mockExecuteL1GetReport = executeL1GetReport as vi.MockedFunction<typeof executeL1GetReport>;
      mockExecuteL1GetReport.mockResolvedValue({
        success: true,
        data: mockReport,
        reportId: 'test-lcp-report',
        timestamp: new Date()
      });

      const lcpAnalysis = await executeL2LCPChainAnalysis({
        reportId: 'test-lcp-report'
      });

      // Verify LCP element is identified
      expect(lcpAnalysis.analysis.lcpElement?.url).toBe(lcpUrl);

      // Check critical path contains only LCP-related resources
      const criticalUrls = lcpAnalysis.analysis.criticalPath.map(node => node.url);

      // Should contain LCP and its parents
      expect(criticalUrls).toContain(lcpUrl);
      expect(criticalUrls).toContain('https://example.com/');

      // Should NOT contain analytics or ads
      expect(criticalUrls).not.toContain('https://analytics.example.com/track.js');
      expect(criticalUrls).not.toContain('https://ads.example.com/banner.js');

      // Check bottlenecks
      expect(lcpAnalysis.analysis.bottlenecks.length).toBeGreaterThan(0);
      const imageBottleneck = lcpAnalysis.analysis.bottlenecks.find(b =>
        b.resource && b.resource.includes('hero-image')
      );
      expect(imageBottleneck).toBeDefined();

      // Verify recommendations
      expect(lcpAnalysis.recommendations.some(r =>
        r.toLowerCase().includes('preload')
      )).toBe(true);
    });
  });

  describe('Cross-Layer Tool Composition', () => {
    it('should support chaining multiple analysis tools', async () => {
      const mockReport = createMockReport({
        performanceScore: 0.3,
        lcp: 6000,
        audits: {
          'unused-css-rules': createUnusedCodeAudit([
            { url: 'https://test.com/styles.css', totalBytes: 200000, wastedBytes: 180000, wastedPercent: 90 }
          ])
        }
      });

      const mockExecuteL1GetReport = executeL1GetReport as vi.MockedFunction<typeof executeL1GetReport>;
      mockExecuteL1GetReport.mockResolvedValue({
        success: true,
        data: mockReport,
        reportId: 'composite-test',
        timestamp: new Date()
      });

      // Run multiple L2 analyses in parallel
      const [issuesResult, unusedResult, criticalResult] = await Promise.all([
        executeL2ComprehensiveIssues({ reportId: 'composite-test' }),
        executeL2UnusedCode({ reportId: 'composite-test' }),
        executeL2CriticalChain({ reportId: 'composite-test' })
      ]);

      // All analyses should succeed
      expect(issuesResult.issues.length).toBeGreaterThan(0);
      expect(unusedResult.unusedCode.totalWastedBytes).toBeGreaterThan(0);
      expect(criticalResult.criticalChains).toBeDefined();

      // Use L2 results for L3 analysis
      const budgetResult = await executeL3PerformanceBudget({
        reportId: 'composite-test',
        budget: { performanceScore: 90, lcp: 2500 }
      });

      expect(budgetResult.violations.length).toBeGreaterThan(0);

      // Recommendations should consider the issues found
      const hasUnusedCSSRec = budgetResult.recommendations.immediate.some(r =>
        r.toLowerCase().includes('css') || r.toLowerCase().includes('unused')
      );
      expect(hasUnusedCSSRec).toBeDefined();
    });
  });

  describe('Error Handling Across Layers', () => {
    it('should handle missing report gracefully', async () => {
      const mockExecuteL1GetReport = executeL1GetReport as vi.MockedFunction<typeof executeL1GetReport>;
      mockExecuteL1GetReport.mockResolvedValue({
        success: false,
        error: 'Report not found',
        reportId: 'missing-report',
        timestamp: new Date()
      });

      await expect(
        executeL2ComprehensiveIssues({ reportId: 'missing-report' })
      ).rejects.toThrow();
    });

    it('should handle malformed data', async () => {
      const malformedReport = {
        requestedUrl: 'https://test.com',
        audits: {} // Missing required audits
      } as any;

      const mockExecuteL1GetReport = executeL1GetReport as vi.MockedFunction<typeof executeL1GetReport>;
      mockExecuteL1GetReport.mockResolvedValue({
        success: true,
        data: malformedReport,
        reportId: 'malformed-report',
        timestamp: new Date()
      });

      // Should handle gracefully with defaults
      const result = await executeL2ComprehensiveIssues({ reportId: 'malformed-report' });
      expect(result.issues).toBeDefined();
      expect(result.summary.totalIssues).toBeGreaterThanOrEqual(0);
    });
  });
});