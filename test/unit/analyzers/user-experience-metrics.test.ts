import { describe, it, expect } from 'vitest';
import { analyzeUserExperience, type UserExperienceAnalysis } from '../../../src/analyzers/userExperienceMetrics';
import type { LighthouseReport } from '../../../src/types';

describe('User Experience Metrics Analysis', () => {
  describe('analyzeUserExperience', () => {
    it('should detect rage clicks patterns', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'max-potential-fid': {
            id: 'max-potential-fid',
            title: 'Max Potential FID',
            score: 0.2,
            numericValue: 500
          },
          'total-blocking-time': {
            id: 'total-blocking-time',
            title: 'Total Blocking Time',
            score: 0.1,
            numericValue: 2000
          },
          'interactive': {
            id: 'interactive',
            title: 'Time to Interactive',
            score: 0.3,
            numericValue: 8000
          }
        }
      };

      const result = analyzeUserExperience(report as LighthouseReport);

      expect(result.rageClicks).toBeDefined();
      expect(result.rageClicks?.likelihood).toBe('high');
      expect(result.rageClicks?.factors).toContain('High blocking time (2000ms)');
      expect(result.rageClicks?.factors).toContain('Poor interactivity (FID: 500ms)');
      expect(result.rageClicks?.riskScore).toBeGreaterThan(70);
      expect(result.rageClicks?.recommendations).toContain('Reduce JavaScript execution time');
    });

    it('should detect dead clicks potential', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'tap-targets': {
            id: 'tap-targets',
            title: 'Tap targets',
            score: 0.4,
            details: {
              type: 'table',
              items: [
                {
                  tapTarget: 'button.submit',
                  size: '20x20',
                  overlappingTargets: ['button.cancel']
                },
                {
                  tapTarget: 'a.link',
                  size: '15x15',
                  overlappingTargets: []
                }
              ]
            }
          },
          'cumulative-layout-shift': {
            id: 'cumulative-layout-shift',
            title: 'CLS',
            score: 0.3,
            numericValue: 0.25
          }
        }
      };

      const result = analyzeUserExperience(report as LighthouseReport);

      expect(result.deadClicks).toBeDefined();
      expect(result.deadClicks?.likelihood).toBe('medium');
      expect(result.deadClicks?.issues).toHaveLength(2);
      expect(result.deadClicks?.issues[0]).toMatchObject({
        element: 'button.submit',
        reason: 'Small tap target with overlapping elements',
        severity: 'high'
      });
      expect(result.deadClicks?.layoutShiftImpact).toBe('high');
      expect(result.deadClicks?.recommendations).toContain('Increase tap target sizes');
    });

    it('should analyze error rate indicators', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'errors-in-console': {
            id: 'errors-in-console',
            title: 'Console Errors',
            score: 0,
            details: {
              type: 'table',
              items: [
                {
                  source: 'javascript',
                  description: 'Uncaught TypeError: Cannot read property',
                  sourceLocation: { url: 'app.js', line: 123 }
                },
                {
                  source: 'network',
                  description: '404 Not Found',
                  sourceLocation: { url: 'api/data' }
                },
                {
                  source: 'javascript',
                  description: 'ReferenceError: variable is not defined',
                  sourceLocation: { url: 'vendor.js', line: 456 }
                }
              ]
            }
          },
          'network-requests': {
            id: 'network-requests',
            title: 'Network Requests',
            details: {
              type: 'table',
              items: [
                { url: 'https://example.com/api/data', statusCode: 404 },
                { url: 'https://example.com/api/user', statusCode: 500 },
                { url: 'https://example.com/app.js', statusCode: 200 },
                { url: 'https://example.com/styles.css', statusCode: 200 }
              ]
            }
          }
        }
      };

      const result = analyzeUserExperience(report as LighthouseReport);

      expect(result.errorRate).toBeDefined();
      expect(result.errorRate?.jsErrors).toBe(2);
      expect(result.errorRate?.networkErrors).toBe(2);
      expect(result.errorRate?.totalErrors).toBe(4);
      expect(result.errorRate?.errorTypes).toMatchObject({
        typeError: 1,
        referenceError: 1,
        notFound: 1,
        serverError: 1
      });
      expect(result.errorRate?.severity).toBe('high');
      expect(result.errorRate?.recommendations).toContain('Fix JavaScript errors');
      expect(result.errorRate?.recommendations).toContain('Handle API errors gracefully');
    });

    it('should calculate frustration index', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'largest-contentful-paint': {
            id: 'largest-contentful-paint',
            score: 0.2,
            numericValue: 5000
          },
          'cumulative-layout-shift': {
            id: 'cumulative-layout-shift',
            score: 0.3,
            numericValue: 0.25
          },
          'total-blocking-time': {
            id: 'total-blocking-time',
            score: 0.1,
            numericValue: 1500
          },
          'max-potential-fid': {
            id: 'max-potential-fid',
            score: 0.2,
            numericValue: 400
          },
          'errors-in-console': {
            id: 'errors-in-console',
            score: 0,
            details: {
              items: [{}, {}, {}] // 3 errors
            }
          }
        }
      };

      const result = analyzeUserExperience(report as LighthouseReport);

      expect(result.frustrationIndex).toBeDefined();
      expect(result.frustrationIndex?.score).toBeGreaterThan(70);
      expect(result.frustrationIndex?.level).toBe('high');
      expect(result.frustrationIndex?.factors).toContain('Slow loading (LCP: 5000ms)');
      expect(result.frustrationIndex?.factors).toContain('Layout instability (CLS: 0.25)');
      expect(result.frustrationIndex?.factors).toContain('Poor responsiveness (TBT: 1500ms)');
      expect(result.frustrationIndex?.topIssues).toHaveLength(3);
    });

    it('should provide engagement quality score', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'first-contentful-paint': {
            id: 'first-contentful-paint',
            score: 0.9,
            numericValue: 1200
          },
          'interactive': {
            id: 'interactive',
            score: 0.85,
            numericValue: 3500
          },
          'cumulative-layout-shift': {
            id: 'cumulative-layout-shift',
            score: 0.95,
            numericValue: 0.02
          },
          'errors-in-console': {
            id: 'errors-in-console',
            score: 1,
            details: { items: [] }
          }
        }
      };

      const result = analyzeUserExperience(report as LighthouseReport);

      expect(result.engagementQuality).toBeDefined();
      expect(result.engagementQuality?.score).toBeGreaterThan(85);
      expect(result.engagementQuality?.rating).toBe('excellent');
      expect(result.engagementQuality?.strengths).toContain('Fast initial load');
      expect(result.engagementQuality?.strengths).toContain('Stable layout');
      expect(result.engagementQuality?.strengths).toContain('No errors detected');
    });

    it('should identify accessibility impact on UX', () => {
      const report: Partial<LighthouseReport> = {
        categories: {
          accessibility: {
            id: 'accessibility',
            score: 0.65
          }
        },
        audits: {
          'color-contrast': {
            id: 'color-contrast',
            title: 'Color Contrast',
            score: 0,
            details: {
              type: 'table',
              items: [
                { node: { selector: 'button.primary' } },
                { node: { selector: 'a.link' } }
              ]
            }
          },
          'image-alt': {
            id: 'image-alt',
            title: 'Image Alt Text',
            score: 0.5,
            details: {
              type: 'table',
              items: [
                { node: { selector: 'img.hero' } }
              ]
            }
          },
          'button-name': {
            id: 'button-name',
            title: 'Button Name',
            score: 1
          }
        }
      };

      const result = analyzeUserExperience(report as LighthouseReport);

      expect(result.accessibilityImpact).toBeDefined();
      expect(result.accessibilityImpact?.score).toBe(65);
      expect(result.accessibilityImpact?.issues).toHaveLength(2);
      expect(result.accessibilityImpact?.criticalIssues).toContain('Poor color contrast');
      expect(result.accessibilityImpact?.uxImpact).toBe('medium');
      expect(result.accessibilityImpact?.affectedUsers).toContain('Users with visual impairments');
    });
  });
});