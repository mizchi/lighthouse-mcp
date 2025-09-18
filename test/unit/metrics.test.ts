import { describe, it, expect } from 'vitest';
import { extractMetrics } from '../../src/core/metrics';
import type { LighthouseReport, LighthouseAudits } from '../../src/types';

describe('extractMetrics', () => {
  it('メトリクスを抽出する', () => {
    const report = {
      requestedUrl: 'https://example.com',
      finalUrl: 'https://example.com',
      fetchTime: '2024-01-01T00:00:00Z',
      lighthouseVersion: '11.0.0',
      userAgent: 'test',
      environment: {} as any,
      categories: {},
      audits: {
        'first-contentful-paint': { 
          id: 'first-contentful-paint',
          title: 'First Contentful Paint',
          description: 'First Contentful Paint marks the time at which the first text or image is painted.',
          score: 0.9,
          scoreDisplayMode: 'numeric',
          numericValue: 1800
        },
        'largest-contentful-paint': {
          id: 'largest-contentful-paint',
          title: 'Largest Contentful Paint',
          description: 'Largest Contentful Paint marks the time at which the largest text or image is painted.',
          score: 0.8,
          scoreDisplayMode: 'numeric',
          numericValue: 2500
        },
        'total-blocking-time': {
          id: 'total-blocking-time',
          title: 'Total Blocking Time',
          description: 'Sum of all time periods between FCP and TTI.',
          score: 0.85,
          scoreDisplayMode: 'numeric',
          numericValue: 300
        },
        'cumulative-layout-shift': {
          id: 'cumulative-layout-shift',
          title: 'Cumulative Layout Shift',
          description: 'Cumulative Layout Shift measures the movement of visible elements.',
          score: 0.95,
          scoreDisplayMode: 'numeric',
          numericValue: 0.1
        },
        'speed-index': {
          id: 'speed-index',
          title: 'Speed Index',
          description: 'Speed Index shows how quickly the contents of a page are visibly populated.',
          score: 0.85,
          scoreDisplayMode: 'numeric',
          numericValue: 3400
        },
        'interactive': {
          id: 'interactive',
          title: 'Time to Interactive',
          description: 'Time to Interactive is the amount of time it takes for the page to become fully interactive.',
          score: 0.8,
          scoreDisplayMode: 'numeric',
          numericValue: 3900
        }
      } as LighthouseAudits
    } as LighthouseReport;

    const metrics = extractMetrics(report);
    
    expect(metrics).toEqual({
      fcp: 1800,
      lcp: 2500,
      tbt: 300,
      cls: 0.1,
      si: 3400,
      tti: 3900,
      ttfb: undefined,
      fid: undefined
    });
  });

  it('auditsがない場合はundefinedを含むオブジェクトを返す', () => {
    const report = {
      requestedUrl: 'https://example.com',
      finalUrl: 'https://example.com',
      fetchTime: '2024-01-01T00:00:00Z',
      lighthouseVersion: '11.0.0',
      userAgent: 'test',
      environment: {} as any,
      categories: {}
    } as LighthouseReport;

    const metrics = extractMetrics(report);
    
    expect(metrics).toEqual({
      fcp: undefined,
      lcp: undefined,
      tbt: undefined,
      cls: undefined,
      si: undefined,
      tti: undefined,
      ttfb: undefined,
      fid: undefined
    });
  });
});