/**
 * Tests for L2 CPU Analysis Tool
 */

import { describe, it, expect } from 'vitest';
import { analyzeCPUPerformance } from '../../../src/tools/l2-cpu-analysis';
import { createMockReport } from '../../utils/test-helpers';

describe('L2 CPU Analysis', () => {
  describe('analyzeCPUPerformance', () => {
    it('should detect critical CPU issues with high TBT', () => {
      const report = createMockReport({
        tbt: 1200, // Critical TBT
        tti: 7000,
        audits: {
          'bootup-time': {
            id: 'bootup-time',
            title: 'JavaScript execution time',
            score: 0,
            numericValue: 5000,
            details: {
              type: 'table',
              items: [
                {
                  url: 'https://example.com/heavy-script.js',
                  total: 2000,
                  scripting: 1800
                },
                {
                  url: 'https://third-party.com/analytics.js',
                  total: 1000,
                  scripting: 900
                }
              ]
            }
          },
          'mainthread-work-breakdown': {
            id: 'mainthread-work-breakdown',
            title: 'Minimize main-thread work',
            score: 0,
            details: {
              type: 'table',
              items: [
                { group: 'scriptEvaluation', duration: 4500 },
                { group: 'styleLayout', duration: 800 },
                { group: 'other', duration: 700 }
              ]
            }
          }
        }
      });

      const result = analyzeCPUPerformance(report);

      // Check severity
      expect(result.summary.severity).toBe('critical');
      expect(result.summary.cpuScore).toBeLessThan(25);

      // Check TBT bottleneck
      const tbtBottleneck = result.bottlenecks.find(b => b.type === 'main-thread-blocking');
      expect(tbtBottleneck).toBeDefined();
      expect(tbtBottleneck?.impact).toBe('critical');
      expect(tbtBottleneck?.duration).toBe(1200);

      // Check script evaluation bottleneck
      const scriptBottleneck = result.bottlenecks.find(b =>
        b.type === 'script-evaluation' && b.duration === 4500
      );
      expect(scriptBottleneck).toBeDefined();
      expect(scriptBottleneck?.impact).toBe('critical');

      // Check recommendations
      expect(result.recommendations).toContain('🚨 CRITICAL: Reduce Total Blocking Time by splitting long-running tasks');
      expect(result.recommendations).toContain('📦 Implement code splitting to reduce initial JavaScript payload');
    });

    it('should identify third-party script bottlenecks', () => {
      const report = createMockReport({
        tbt: 500,
        audits: {
          'third-party-summary': {
            id: 'third-party-summary',
            title: 'Reduce the impact of third-party code',
            score: 0,
            details: {
              type: 'table',
              items: [
                {
                  entity: { text: 'Google Analytics', type: 'link' },
                  transferSize: 50000,
                  blockingTime: 600,
                  mainThreadTime: 720
                },
                {
                  entity: { text: 'Facebook SDK', type: 'link' },
                  transferSize: 120000,
                  blockingTime: 300,
                  mainThreadTime: 360
                }
              ]
            }
          }
        }
      });

      const result = analyzeCPUPerformance(report);

      // Check third-party bottlenecks
      const gaBottleneck = result.bottlenecks.find(b =>
        b.type === 'third-party-script' && b.resource?.includes('Google Analytics')
      );
      expect(gaBottleneck).toBeDefined();
      expect(gaBottleneck?.impact).toBe('critical');
      expect(gaBottleneck?.duration).toBe(600);

      const fbBottleneck = result.bottlenecks.find(b =>
        b.type === 'third-party-script' && b.resource?.includes('Facebook SDK')
      );
      expect(fbBottleneck).toBeDefined();
      expect(fbBottleneck?.impact).toBe('high');

      // Check third-party recommendations
      expect(result.recommendations.some(r => r.includes('third-party'))).toBe(true);
    });

    it('should detect layout thrashing', () => {
      const report = createMockReport({
        audits: {
          'mainthread-work-breakdown': {
            id: 'mainthread-work-breakdown',
            title: 'Minimize main-thread work',
            score: 0.5,
            details: {
              type: 'table',
              items: [
                { group: 'scriptEvaluation', duration: 1000 },
                { group: 'styleLayout', duration: 1200 }, // High layout time
                { group: 'other', duration: 300 }
              ]
            }
          }
        }
      });

      const result = analyzeCPUPerformance(report);

      // Check layout bottleneck
      const layoutBottleneck = result.bottlenecks.find(b => b.type === 'layout-thrashing');
      expect(layoutBottleneck).toBeDefined();
      expect(layoutBottleneck?.impact).toBe('high');
      expect(layoutBottleneck?.duration).toBe(1200);

      // Check layout recommendations
      expect(result.recommendations.some(r => r.includes('CSS') && r.includes('layout'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('containment'))).toBe(true);
    });

    it('should calculate CPU score correctly', () => {
      // Low CPU usage
      const goodReport = createMockReport({
        tbt: 100,
        audits: {
          'mainthread-work-breakdown': {
            id: 'mainthread-work-breakdown',
            title: 'Minimize main-thread work',
            score: 0.9,
            details: {
              type: 'table',
              items: [
                { group: 'scriptEvaluation', duration: 500 },
                { group: 'styleLayout', duration: 200 },
                { group: 'other', duration: 300 }
              ]
            }
          }
        }
      });

      const goodResult = analyzeCPUPerformance(goodReport);
      expect(goodResult.summary.cpuScore).toBeGreaterThan(75);
      expect(goodResult.summary.severity).toBe('low');

      // High CPU usage
      const badReport = createMockReport({
        tbt: 800,
        audits: {
          'mainthread-work-breakdown': {
            id: 'mainthread-work-breakdown',
            title: 'Minimize main-thread work',
            score: 0,
            details: {
              type: 'table',
              items: [
                { group: 'scriptEvaluation', duration: 5000 },
                { group: 'styleLayout', duration: 1500 },
                { group: 'other', duration: 1500 }
              ]
            }
          }
        }
      });

      const badResult = analyzeCPUPerformance(badReport);
      expect(badResult.summary.cpuScore).toBeLessThan(25);
      expect(badResult.summary.severity).toBe('critical');
    });

    it('should identify top CPU offenders', () => {
      const report = createMockReport({
        audits: {
          'bootup-time': {
            id: 'bootup-time',
            title: 'JavaScript execution time',
            score: 0.3,
            numericValue: 3000,
            details: {
              type: 'table',
              items: [
                {
                  url: 'https://example.com/app.js',
                  total: 1500,
                  scripting: 1200
                },
                {
                  url: 'https://example.com/vendor.js',
                  total: 800,
                  scripting: 600
                },
                {
                  url: 'https://cdn.com/library.js',
                  total: 500,
                  scripting: 400
                },
                {
                  url: 'https://example.com/small.js',
                  total: 50,
                  scripting: 30
                }
              ]
            }
          }
        }
      });

      const result = analyzeCPUPerformance(report);

      // Check top offenders
      expect(result.topOffenders.length).toBe(3); // Should exclude small.js
      expect(result.topOffenders[0].url).toBe('https://example.com/app.js');
      expect(result.topOffenders[0].totalTime).toBe(1500);
      expect(result.topOffenders[0].scriptTime).toBe(1200);

      // Check that small files are excluded
      expect(result.topOffenders.find(o => o.url.includes('small.js'))).toBeUndefined();
    });

    it('should handle missing audit data gracefully', () => {
      const report = createMockReport({
        tbt: 300,
        // No additional audits
      });

      const result = analyzeCPUPerformance(report);

      expect(result.summary.totalBlockingTime).toBe(300);
      expect(result.summary.cpuScore).toBeGreaterThan(0);
      expect(result.bottlenecks.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect when too many JavaScript files are loaded', () => {
      const report = createMockReport({
        audits: {
          'bootup-time': {
            id: 'bootup-time',
            title: 'JavaScript execution time',
            score: 0.5,
            numericValue: 2000,
            details: {
              type: 'table',
              items: [
                { url: 'https://example.com/file1.js', total: 200, scripting: 150 },
                { url: 'https://example.com/file2.js', total: 200, scripting: 150 },
                { url: 'https://example.com/file3.js', total: 200, scripting: 150 },
                { url: 'https://example.com/file4.js', total: 200, scripting: 150 },
                { url: 'https://example.com/file5.js', total: 200, scripting: 150 },
                { url: 'https://example.com/file6.js', total: 200, scripting: 150 },
              ]
            }
          }
        }
      });

      const result = analyzeCPUPerformance(report);

      expect(result.topOffenders.length).toBe(6);
      expect(result.recommendations).toContain('📊 Too many JavaScript files - consider bundling and minification');
    });
  });
});