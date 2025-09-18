import { describe, it, expect } from 'vitest';
import { analyzeUnusedCode } from '../../../src/analyzers/unusedCode';
import type { LighthouseReport } from '../../../src/types';

describe('analyzeUnusedCode', () => {
  it('should analyze unused JavaScript code', () => {
    const report = {
      audits: {
        'unused-javascript': {
          id: 'unused-javascript',
          title: 'Remove unused JavaScript',
          score: 0.5,
          details: {
            type: 'opportunity',
            items: [
              {
                url: 'https://example.com/app.js',
                wastedBytes: 150000,
                wastedPercent: 45,
                totalBytes: 333333,
              },
              {
                url: 'https://example.com/vendor.js',
                wastedBytes: 80000,
                wastedPercent: 30,
                totalBytes: 266667,
              },
            ],
            overallSavingsBytes: 230000,
            overallSavingsMs: 450,
          },
        },
        'unused-css-rules': {
          id: 'unused-css-rules',
          title: 'Remove unused CSS',
          score: 0.6,
          details: {
            type: 'opportunity',
            items: [
              {
                url: 'https://example.com/styles.css',
                wastedBytes: 25000,
                wastedPercent: 60,
                totalBytes: 41667,
              },
            ],
            overallSavingsBytes: 25000,
            overallSavingsMs: 100,
          },
        },
      },
    } as unknown as LighthouseReport;

    const result = analyzeUnusedCode(report);

    expect(result).toBeDefined();
    expect(result?.totalUnusedBytes).toBe(255000);
    expect(result?.totalWastedBytes).toBe(255000);

    // Check JavaScript analysis
    expect(result?.unusedJavaScript).toHaveLength(2);
    expect(result?.unusedJavaScript[0]).toMatchObject({
      url: 'https://example.com/app.js',
      unusedBytes: 150000,
      unusedPercent: 45,
      totalBytes: 333333,
    });

    // Check CSS analysis
    expect(result?.unusedCSS).toHaveLength(1);
    expect(result?.unusedCSS[0]).toMatchObject({
      url: 'https://example.com/styles.css',
      unusedBytes: 25000,
      unusedPercent: 60,
      totalBytes: 41667,
    });

    // Check items sorted by waste
    expect(result?.items).toBeDefined();
    expect(result?.items.length).toBeGreaterThan(0);
    expect(result?.items[0].url).toBe('https://example.com/app.js');
  });

  it('should handle missing audit data gracefully', () => {
    const report = {
      audits: {},
    } as unknown as LighthouseReport;

    const result = analyzeUnusedCode(report);

    expect(result).toBeDefined();
    expect(result?.totalUnusedBytes).toBe(0);
    expect(result?.totalWastedBytes).toBe(0);
    expect(result?.unusedJavaScript).toHaveLength(0);
    expect(result?.unusedCSS).toHaveLength(0);
    expect(result?.items).toHaveLength(0);
  });

  it('should calculate percentages correctly', () => {
    const report = {
      audits: {
        'unused-javascript': {
          id: 'unused-javascript',
          title: 'Remove unused JavaScript',
          score: 0.2,
          details: {
            type: 'opportunity',
            items: [
              {
                url: 'https://example.com/large.js',
                wastedBytes: 500000,
                wastedPercent: 80,
                totalBytes: 625000,
              },
            ],
            overallSavingsBytes: 500000,
            overallSavingsMs: 1000,
          },
        },
      },
    } as unknown as LighthouseReport;

    const result = analyzeUnusedCode(report);

    expect(result).toBeDefined();
    expect(result?.totalUnusedBytes).toBe(500000);
    expect(result?.unusedJavaScript[0].unusedPercent).toBe(80);

    // Should identify as high impact
    expect(result?.items[0].unusedBytes).toBe(500000);
  });

  it('should handle null or undefined details', () => {
    const report = {
      audits: {
        'unused-javascript': {
          id: 'unused-javascript',
          title: 'Remove unused JavaScript',
          score: 1,
          details: null,
        },
        'unused-css-rules': {
          id: 'unused-css-rules',
          title: 'Remove unused CSS',
          score: 1,
          details: undefined,
        },
      },
    } as unknown as LighthouseReport;

    const result = analyzeUnusedCode(report);

    expect(result).toBeDefined();
    expect(result?.totalUnusedBytes).toBe(0);
    expect(result?.unusedJavaScript).toHaveLength(0);
    expect(result?.unusedCSS).toHaveLength(0);
  });
});