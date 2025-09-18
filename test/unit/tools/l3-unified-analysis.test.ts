/**
 * Tests for L3 Unified Analysis Tool
 */

import { describe, it, expect } from 'vitest';
import { performUnifiedAnalysis } from '../../../src/tools/l3-unified-analysis';
import { createMockReport } from '../../utils/test-helpers';

describe('L3 Unified Analysis', () => {
  describe('performUnifiedAnalysis', () => {
    it('should integrate results from multiple L2 tools', async () => {
      const report = createMockReport({
        performanceScore: 0.35,
        lcp: 6000,
        fcp: 3000,
        cls: 0.25,
        tbt: 1200,
        audits: {
          'unused-css-rules': {
            id: 'unused-css-rules',
            title: 'Reduce unused CSS',
            score: 0,
            details: {
              type: 'opportunity',
              items: [],
              overallSavingsBytes: 300000,
              overallSavingsMs: 1500
            }
          }
        }
      });

      // Add weight information for weighted issues analysis
      report.categories = {
        performance: {
          id: 'performance',
          title: 'Performance',
          score: 0.35,
          auditRefs: [
            { id: 'largest-contentful-paint', weight: 25, group: 'metrics' },
            { id: 'first-contentful-paint', weight: 10, group: 'metrics' },
            { id: 'cumulative-layout-shift', weight: 15, group: 'metrics' },
            { id: 'total-blocking-time', weight: 30, group: 'metrics' }
          ]
        }
      };

      const result = await performUnifiedAnalysis({
        report,
        includeTools: ['weighted', 'comprehensive'],
        verbosity: 'detailed'
      });

      // Check that results are integrated
      expect(result.performanceScore).toBe(0.35);
      expect(result.summary.totalIssues).toBeGreaterThan(0);
      expect(result.unifiedIssues.length).toBeGreaterThan(0);
      expect(result.actionPlan.length).toBeGreaterThan(0);

      // Check that tool coverage is tracked
      expect(result.toolCoverage.weighted).toBe(true);
      expect(result.toolCoverage.comprehensive).toBe(true);
    });

    it('should deduplicate issues from multiple sources', async () => {
      const report = createMockReport({
        lcp: 5000, // This will trigger issues in both weighted and comprehensive
        tbt: 800,
        audits: {
          'unused-javascript': {
            id: 'unused-javascript',
            title: 'Remove unused JavaScript',
            score: 0,
            details: {
              type: 'opportunity',
              items: [],
              overallSavingsBytes: 500000,
              overallSavingsMs: 2000
            }
          }
        }
      });

      report.categories = {
        performance: {
          id: 'performance',
          title: 'Performance',
          score: 0.4,
          auditRefs: [
            { id: 'largest-contentful-paint', weight: 25, group: 'metrics' },
            { id: 'total-blocking-time', weight: 30, group: 'metrics' },
            { id: 'unused-javascript', weight: 15, group: 'opportunities' }
          ]
        }
      };

      const result = await performUnifiedAnalysis({
        report,
        includeTools: ['weighted', 'comprehensive', 'unused']
      });

      // Check that issues are deduplicated
      // LCP issue should appear only once despite being detected by multiple tools
      const lcpIssues = result.unifiedIssues.filter(issue =>
        issue.title.toLowerCase().includes('largest contentful paint') ||
        issue.title.toLowerCase().includes('lcp')
      );
      expect(lcpIssues.length).toBeLessThanOrEqual(1);

      // Check that sources are tracked
      const hasMultipleSources = result.unifiedIssues.some(issue => issue.sources.length > 1);
      expect(hasMultipleSources).toBe(true);
    });

    it('should generate prioritized action plan', async () => {
      const report = createMockReport({
        performanceScore: 0.3,
        lcp: 7000, // Critical
        tbt: 1500, // Critical
        fcp: 2000, // Medium
        cls: 0.15  // Medium
      });

      report.categories = {
        performance: {
          id: 'performance',
          title: 'Performance',
          score: 0.3,
          auditRefs: [
            { id: 'largest-contentful-paint', weight: 25, group: 'metrics' },
            { id: 'total-blocking-time', weight: 30, group: 'metrics' },
            { id: 'first-contentful-paint', weight: 10, group: 'metrics' },
            { id: 'cumulative-layout-shift', weight: 15, group: 'metrics' }
          ]
        }
      };

      const result = await performUnifiedAnalysis({
        report,
        includeTools: ['weighted', 'comprehensive']
      });

      // Check action plan is generated
      expect(result.actionPlan.length).toBeGreaterThan(0);

      // Check that actions are prioritized (critical issues first)
      const firstAction = result.actionPlan[0];
      expect(firstAction.priority).toBeLessThanOrEqual(2); // Should be priority 1 or 2

      // Check that action has implementation details
      expect(firstAction.implementation.effort).toBeDefined();
      expect(firstAction.implementation.timeEstimate).toBeDefined();

      // Check estimated impact
      expect(result.estimatedImpact.scoreImprovement).toBeGreaterThan(0);
    });

    it('should handle partial tool failures gracefully', async () => {
      const report = createMockReport({
        performanceScore: 0.5
      });

      // Report missing some data that might cause certain tools to fail
      report.categories = {};

      const result = await performUnifiedAnalysis({
        report,
        includeTools: ['weighted', 'cpu', 'comprehensive', 'unused']
      });

      // Should still return results even if some tools fail
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();

      // Check which tools succeeded
      // At least some tools should work
      const successfulTools = Object.values(result.toolCoverage).filter(v => v).length;
      expect(successfulTools).toBeGreaterThan(0);
    });

    it('should respect verbosity settings', async () => {
      const report = createMockReport({
        performanceScore: 0.4,
        lcp: 4000,
        tbt: 600
      });

      report.categories = {
        performance: {
          id: 'performance',
          title: 'Performance',
          score: 0.4,
          auditRefs: [
            { id: 'largest-contentful-paint', weight: 25, group: 'metrics' },
            { id: 'total-blocking-time', weight: 30, group: 'metrics' }
          ]
        }
      };

      // Test with summary verbosity
      const summaryResult = await performUnifiedAnalysis({
        report,
        includeTools: ['weighted'],
        verbosity: 'summary'
      });

      expect(summaryResult).toBeDefined();
      expect(summaryResult.unifiedIssues).toBeDefined();

      // Test with full verbosity
      const fullResult = await performUnifiedAnalysis({
        report,
        includeTools: ['weighted', 'comprehensive'],
        verbosity: 'full'
      });

      expect(fullResult).toBeDefined();
      expect(fullResult.unifiedIssues.length).toBeGreaterThanOrEqual(summaryResult.unifiedIssues.length);
    });

    it('should calculate estimated improvements correctly', async () => {
      const report = createMockReport({
        performanceScore: 0.25,
        lcp: 8000,
        tbt: 2000,
        audits: {
          'unused-css-rules': {
            id: 'unused-css-rules',
            title: 'Reduce unused CSS',
            score: 0,
            details: {
              type: 'opportunity',
              items: [],
              overallSavingsBytes: 500000,
              overallSavingsMs: 2000
            }
          },
          'unused-javascript': {
            id: 'unused-javascript',
            title: 'Remove unused JavaScript',
            score: 0,
            details: {
              type: 'opportunity',
              items: [],
              overallSavingsBytes: 800000,
              overallSavingsMs: 3000
            }
          }
        }
      });

      report.categories = {
        performance: {
          id: 'performance',
          title: 'Performance',
          score: 0.25,
          auditRefs: [
            { id: 'largest-contentful-paint', weight: 25, group: 'metrics' },
            { id: 'total-blocking-time', weight: 30, group: 'metrics' },
            { id: 'unused-css-rules', weight: 10, group: 'opportunities' },
            { id: 'unused-javascript', weight: 15, group: 'opportunities' }
          ]
        }
      };

      const result = await performUnifiedAnalysis({
        report,
        includeTools: ['weighted', 'comprehensive', 'unused']
      });

      // Check estimated improvements
      expect(result.estimatedImpact.scoreImprovement).toBeGreaterThan(0);
      expect(result.estimatedImpact.loadTimeReduction).toBeGreaterThan(0);
      expect(result.estimatedImpact.sizeReduction).toBeGreaterThan(0);

      // Size reduction should include unused code
      expect(result.estimatedImpact.sizeReduction).toBeGreaterThanOrEqual(500000);
    });
  });
});