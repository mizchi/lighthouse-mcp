import { describe, it, expect } from 'vitest';
import { analyzeCriticalChains } from '../../../src/analyzers/criticalChain.js';
import type { LighthouseReport } from '../../../src/types/index.js';

const makeReport = (): LighthouseReport => ({
  requestedUrl: 'https://example.com',
  finalUrl: 'https://example.com',
  audits: {
    'critical-request-chains': {
      id: 'critical-request-chains',
      title: 'Critical Request Chains',
      score: 0.8,
      details: {
        type: 'criticalrequestchain',
        chains: {
          root: {
            request: {
              url: 'https://example.com/index.html',
              startTime: 0,
              endTime: 0.2,
              responseReceivedTime: 0.08,
              transferSize: 24000,
            },
            children: {
              css: {
                request: {
                  url: 'https://example.com/style.css',
                  startTime: 0.2,
                  endTime: 0.45,
                  responseReceivedTime: 0.3,
                  transferSize: 32000,
                },
                children: {
                  image: {
                    request: {
                      url: 'https://cdn.example.com/hero.jpg',
                      startTime: 0.45,
                      endTime: 1.8,
                      responseReceivedTime: 0.6,
                      transferSize: 150000,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    'network-requests': {
      id: 'network-requests',
      title: 'Network Requests',
      score: 1,
      details: {
        type: 'table',
        items: [
          { url: 'https://example.com/index.html', resourceType: 'Document', transferSize: 24000 },
          { url: 'https://example.com/style.css', resourceType: 'Stylesheet', transferSize: 32000 },
          { url: 'https://cdn.example.com/hero.jpg', resourceType: 'Image', transferSize: 150000 },
        ],
      },
    },
    'largest-contentful-paint': {
      id: 'largest-contentful-paint',
      title: 'LCP',
      score: 0.45,
      numericValue: 1800,
    },
  } as any,
  categories: {},
} as unknown as LighthouseReport);

describe('analyzeCriticalChains', () => {
  it('builds paths and highlights LCP bottleneck', () => {
    const report = makeReport();
    const analysis = analyzeCriticalChains(report);

    expect(analysis).not.toBeNull();
    if (!analysis) return;

    expect(analysis.longestChain.nodes).toHaveLength(3);
    expect(Math.round(analysis.totalDuration)).toBe(1800);
    expect(analysis.totalTransferSize).toBe(24000 + 32000 + 150000);

    expect(analysis.bottleneck?.url).toBe('https://cdn.example.com/hero.jpg');
    expect(analysis.bottleneck?.impact).toBe('Critical');
    expect(analysis.bottleneck?.reason).toContain('Consumes');

    expect(analysis.lcp?.candidateUrl).toBe('https://cdn.example.com/hero.jpg');
    expect(analysis.lcp?.bottleneck?.url).toBe('https://cdn.example.com/hero.jpg');
    expect(analysis.lcp?.durationToLcp).toBeCloseTo(1800, 0);
    expect(analysis.lcp?.nodes[0].resourceType).toBe('document');
    expect(analysis.lcp?.nodes[1].resourceType).toBe('stylesheet');
  });
});
