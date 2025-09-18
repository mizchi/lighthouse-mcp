/**
 * Tests for L2 Weighted Issues Analysis Tool
 */

import { describe, it, expect } from 'vitest';
import { analyzeWeightedIssues } from '../../../src/tools/l2-weighted-issues';
import { createMockReport } from '../../utils/test-helpers';

describe('L2 Weighted Issues Analysis', () => {
  describe('analyzeWeightedIssues', () => {
    it('should identify high-weight Core Web Vitals issues', () => {
      const report = createMockReport({
        lcp: 4500,
        fcp: 3000,
        cls: 0.25,
        tbt: 800,
        performanceScore: 0.4
      });

      // Add weight information to the mock report
      report.categories = {
        performance: {
          id: 'performance',
          title: 'Performance',
          score: 0.4,
          auditRefs: [
            { id: 'largest-contentful-paint', weight: 25, group: 'metrics' },
            { id: 'first-contentful-paint', weight: 10, group: 'metrics' },
            { id: 'cumulative-layout-shift', weight: 15, group: 'metrics' },
            { id: 'total-blocking-time', weight: 30, group: 'metrics' },
            { id: 'speed-index', weight: 10, group: 'metrics' },
            { id: 'interactive', weight: 10, group: 'metrics' }
          ]
        }
      };

      const result = analyzeWeightedIssues(report, { topN: 5 });

      // TBT should be the top issue (highest weight * worst score)
      expect(result.topIssues[0].auditId).toBe('total-blocking-time');
      expect(result.topIssues[0].weight).toBe(30);
      expect(result.topIssues[0].weightedImpact).toBeGreaterThan(10); // High impact

      // LCP should be high priority (high weight)
      const lcpIssue = result.topIssues.find(i => i.auditId === 'largest-contentful-paint');
      expect(lcpIssue).toBeDefined();
      expect(lcpIssue?.weight).toBe(25);

      // Check recommendations
      expect(result.recommendations.some(r => r.includes('Total Blocking Time'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('Largest Contentful Paint'))).toBe(true);
    });

    it('should calculate weighted impact correctly', () => {
      const report = createMockReport({});

      // Create specific audits with known scores
      report.audits = {
        'test-audit-1': {
          id: 'test-audit-1',
          title: 'Test Audit 1',
          score: 0.2, // 80% failure
          numericValue: 1000,
          numericUnit: 'ms'
        },
        'test-audit-2': {
          id: 'test-audit-2',
          title: 'Test Audit 2',
          score: 0.5, // 50% failure
          numericValue: 500,
          numericUnit: 'ms'
        },
        'test-audit-3': {
          id: 'test-audit-3',
          title: 'Test Audit 3',
          score: 1.0, // Perfect score, should be excluded
          numericValue: 100,
          numericUnit: 'ms'
        }
      };

      report.categories = {
        performance: {
          id: 'performance',
          title: 'Performance',
          score: 0.5,
          auditRefs: [
            { id: 'test-audit-1', weight: 20 },
            { id: 'test-audit-2', weight: 10 },
            { id: 'test-audit-3', weight: 5 }
          ]
        }
      };

      const result = analyzeWeightedIssues(report);

      // Audit 1: (1 - 0.2) * 20 = 0.8 * 20 = 16
      // Audit 2: (1 - 0.5) * 10 = 0.5 * 10 = 5
      // Audit 3: excluded (perfect score)
      expect(result.topIssues).toHaveLength(2);
      expect(result.topIssues[0].auditId).toBe('test-audit-1');
      expect(result.topIssues[0].weightedImpact).toBe(16);
      expect(result.topIssues[1].auditId).toBe('test-audit-2');
      expect(result.topIssues[1].weightedImpact).toBe(5);

      expect(result.totalWeightedImpact).toBe(21);
      expect(result.maxPossibleImpact).toBe(30); // Total weight of non-perfect audits
    });

    it('should detect unused code with high weight', () => {
      const report = createMockReport({
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
          },
          'unused-javascript': {
            id: 'unused-javascript',
            title: 'Remove unused JavaScript',
            score: 0.1,
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
          score: 0.3,
          auditRefs: [
            { id: 'unused-css-rules', weight: 10 },
            { id: 'unused-javascript', weight: 15 }
          ]
        }
      };

      const result = analyzeWeightedIssues(report);

      // Check that unused code issues are detected
      const unusedCSSIssue = result.topIssues.find(i => i.auditId === 'unused-css-rules');
      const unusedJSIssue = result.topIssues.find(i => i.auditId === 'unused-javascript');

      expect(unusedCSSIssue).toBeDefined();
      expect(unusedCSSIssue?.weightedImpact).toBe(10); // (1-0) * 10
      expect(unusedCSSIssue?.metrics?.savings).toBe(1500);

      expect(unusedJSIssue).toBeDefined();
      expect(unusedJSIssue?.weightedImpact).toBe(13.5); // (1-0.1) * 15

      // Check recommendations
      expect(result.recommendations.some(r => r.includes('unused code'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('Quick wins'))).toBe(true);
    });

    it('should categorize issues by category', () => {
      const report = createMockReport({});

      report.audits = {
        'perf-audit': {
          id: 'perf-audit',
          title: 'Performance Audit',
          score: 0.3
        },
        'a11y-audit': {
          id: 'a11y-audit',
          title: 'Accessibility Audit',
          score: 0.5
        },
        'seo-audit': {
          id: 'seo-audit',
          title: 'SEO Audit',
          score: 0.2
        }
      };

      report.categories = {
        performance: {
          id: 'performance',
          title: 'Performance',
          score: 0.5,
          auditRefs: [{ id: 'perf-audit', weight: 20 }]
        },
        accessibility: {
          id: 'accessibility',
          title: 'Accessibility',
          score: 0.7,
          auditRefs: [{ id: 'a11y-audit', weight: 15 }]
        },
        seo: {
          id: 'seo',
          title: 'SEO',
          score: 0.6,
          auditRefs: [{ id: 'seo-audit', weight: 10 }]
        }
      };

      const result = analyzeWeightedIssues(report);

      // Check category summary
      expect(result.categorySummary.performance).toBeDefined();
      expect(result.categorySummary.performance.totalWeight).toBe(20);
      expect(result.categorySummary.performance.totalImpact).toBe(14); // (1-0.3) * 20
      expect(result.categorySummary.performance.issueCount).toBe(1);

      expect(result.categorySummary.accessibility).toBeDefined();
      expect(result.categorySummary.accessibility.totalWeight).toBe(15);
      expect(result.categorySummary.accessibility.totalImpact).toBe(7.5); // (1-0.5) * 15

      expect(result.categorySummary.seo).toBeDefined();
      expect(result.categorySummary.seo.totalWeight).toBe(10);
      expect(result.categorySummary.seo.totalImpact).toBe(8); // (1-0.2) * 10
    });

    it('should filter issues by minimum weight', () => {
      const report = createMockReport({});

      report.audits = {
        'high-weight': {
          id: 'high-weight',
          title: 'High Weight Issue',
          score: 0.5
        },
        'medium-weight': {
          id: 'medium-weight',
          title: 'Medium Weight Issue',
          score: 0.5
        },
        'low-weight': {
          id: 'low-weight',
          title: 'Low Weight Issue',
          score: 0.5
        }
      };

      report.categories = {
        performance: {
          id: 'performance',
          title: 'Performance',
          score: 0.5,
          auditRefs: [
            { id: 'high-weight', weight: 20 },
            { id: 'medium-weight', weight: 10 },
            { id: 'low-weight', weight: 2 }
          ]
        }
      };

      const result = analyzeWeightedIssues(report, { minWeight: 10 });

      // Only high and medium weight issues should be included
      expect(result.topIssues).toHaveLength(2);
      expect(result.topIssues.find(i => i.auditId === 'high-weight')).toBeDefined();
      expect(result.topIssues.find(i => i.auditId === 'medium-weight')).toBeDefined();
      expect(result.topIssues.find(i => i.auditId === 'low-weight')).toBeUndefined();
    });

    it('should provide resource-specific recommendations', () => {
      const report = createMockReport({
        audits: {
          'uses-webp-images': {
            id: 'uses-webp-images',
            title: 'Serve images in modern formats',
            score: 0.2
          },
          'unused-css-rules': {
            id: 'unused-css-rules',
            title: 'Reduce unused CSS',
            score: 0.1
          },
          'unused-javascript': {
            id: 'unused-javascript',
            title: 'Remove unused JavaScript',
            score: 0.3
          }
        }
      });

      report.categories = {
        performance: {
          id: 'performance',
          title: 'Performance',
          score: 0.4,
          auditRefs: [
            { id: 'uses-webp-images', weight: 15 },
            { id: 'unused-css-rules', weight: 10 },
            { id: 'unused-javascript', weight: 20 }
          ]
        }
      };

      const result = analyzeWeightedIssues(report);

      // Check for resource-specific recommendations
      expect(result.recommendations.some(r => r.includes('Image optimization'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('CSS optimization'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('JavaScript optimization'))).toBe(true);
    });

    it('should handle missing weight information gracefully', () => {
      const report = createMockReport({
        lcp: 3000,
        fcp: 2000
      });

      // Report without category weight information
      report.categories = {};

      const result = analyzeWeightedIssues(report);

      // Without weight information, issues won't have weight
      // But audits with scores < 1 might still be returned with weight 0
      result.topIssues.forEach(issue => {
        expect(issue.weight).toBe(0);
      });
    });
  });
});