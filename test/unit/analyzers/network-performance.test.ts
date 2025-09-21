import { describe, it, expect } from 'vitest';
import { analyzeNetworkPerformance, type NetworkPerformanceAnalysis } from '../../../src/analyzers/networkPerformance';
import type { LighthouseReport } from '../../../src/types';

describe('Network Performance Analysis', () => {
  describe('analyzeNetworkPerformance', () => {
    it('should analyze HTTP/2 and HTTP/3 usage', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'network-requests': {
            id: 'network-requests',
            title: 'Network Requests',
            details: {
              type: 'table',
              items: [
                {
                  url: 'https://example.com/',
                  protocol: 'h2',
                  transferSize: 10000,
                  resourceType: 'Document'
                },
                {
                  url: 'https://example.com/app.js',
                  protocol: 'h2',
                  transferSize: 50000,
                  resourceType: 'Script'
                },
                {
                  url: 'https://cdn.example.com/styles.css',
                  protocol: 'h3',
                  transferSize: 20000,
                  resourceType: 'Stylesheet'
                },
                {
                  url: 'https://legacy.example.com/old.js',
                  protocol: 'http/1.1',
                  transferSize: 30000,
                  resourceType: 'Script'
                }
              ]
            }
          },
          'uses-http2': {
            id: 'uses-http2',
            title: 'Use HTTP/2',
            score: 0.75,
            details: {
              type: 'table',
              items: [
                {
                  url: 'https://legacy.example.com',
                  protocol: 'http/1.1'
                }
              ]
            }
          }
        }
      };

      const result = analyzeNetworkPerformance(report as LighthouseReport);

      expect(result.protocols).toBeDefined();
      expect(result.protocols?.http2).toMatchObject({
        usage: 50, // 2 out of 4 requests
        transferSize: 60000,
        resources: 2
      });
      expect(result.protocols?.http3).toMatchObject({
        usage: 25, // 1 out of 4 requests
        transferSize: 20000,
        resources: 1
      });
      expect(result.protocols?.http1).toMatchObject({
        usage: 25,
        transferSize: 30000,
        resources: 1,
        domains: ['legacy.example.com']
      });
      expect(result.protocols?.recommendations).toContain('Upgrade legacy.example.com to HTTP/2');
    });

    it('should measure CDN effectiveness', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'network-requests': {
            id: 'network-requests',
            title: 'Network Requests',
            details: {
              type: 'table',
              items: [
                {
                  url: 'https://cdn.cloudflare.com/app.js',
                  transferSize: 50000,
                  startTime: 0,
                  endTime: 100,
                  resourceType: 'Script'
                },
                {
                  url: 'https://example.com/api/data',
                  transferSize: 10000,
                  startTime: 0,
                  endTime: 500,
                  resourceType: 'XHR'
                },
                {
                  url: 'https://cdn.cloudflare.com/styles.css',
                  transferSize: 20000,
                  startTime: 0,
                  endTime: 80,
                  resourceType: 'Stylesheet'
                },
                {
                  url: 'https://example.com/image.jpg',
                  transferSize: 100000,
                  startTime: 0,
                  endTime: 1000,
                  resourceType: 'Image'
                }
              ]
            }
          },
          'uses-long-cache-ttl': {
            id: 'uses-long-cache-ttl',
            title: 'Cache TTL',
            score: 0.8,
            details: {
              type: 'table',
              items: [
                {
                  url: 'https://cdn.cloudflare.com/app.js',
                  cacheLifetimeMs: 31536000000
                },
                {
                  url: 'https://example.com/image.jpg',
                  cacheLifetimeMs: 0
                }
              ]
            }
          }
        }
      };

      const result = analyzeNetworkPerformance(report as LighthouseReport);

      expect(result.cdn).toBeDefined();
      expect(result.cdn?.usage).toBe(50); // 2 out of 4 resources
      expect(result.cdn?.transferSize).toBe(70000);
      expect(result.cdn?.avgLoadTime).toBe(90); // (100 + 80) / 2
      expect(result.cdn?.nonCdnAvgLoadTime).toBe(750); // (500 + 1000) / 2
      expect(result.cdn?.speedImprovement).toBeGreaterThan(80); // ~88% faster
      expect(result.cdn?.recommendations).toContain('Move image.jpg to CDN');
    });

    it('should analyze cache efficiency', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'uses-long-cache-ttl': {
            id: 'uses-long-cache-ttl',
            title: 'Cache TTL',
            score: 0.6,
            numericValue: 150000,
            details: {
              type: 'table',
              items: [
                {
                  url: 'https://example.com/app.js',
                  cacheLifetimeMs: 3600000, // 1 hour
                  transferSize: 50000,
                  wastedBytes: 25000
                },
                {
                  url: 'https://example.com/styles.css',
                  cacheLifetimeMs: 31536000000, // 1 year
                  transferSize: 20000,
                  wastedBytes: 0
                },
                {
                  url: 'https://example.com/api/data',
                  cacheLifetimeMs: 0, // no cache
                  transferSize: 10000,
                  wastedBytes: 10000
                }
              ]
            }
          },
          'uses-text-compression': {
            id: 'uses-text-compression',
            title: 'Text Compression',
            score: 0.7,
            details: {
              type: 'opportunity',
              items: [
                {
                  url: 'https://example.com/app.js',
                  totalBytes: 50000,
                  wastedBytes: 35000
                }
              ],
              overallSavingsBytes: 35000
            }
          }
        }
      };

      const result = analyzeNetworkPerformance(report as LighthouseReport);

      expect(result.caching).toBeDefined();
      expect(result.caching?.efficiency).toBe(60);
      expect(result.caching?.missedOpportunities).toHaveLength(2);
      expect(result.caching?.missedOpportunities[0]).toMatchObject({
        url: 'https://example.com/app.js',
        currentTTL: 3600000,
        recommendedTTL: 31536000000,
        impact: 'high'
      });
      expect(result.caching?.potentialSavings).toBe(35000);
      expect(result.caching?.recommendations).toContain('Enable long-term caching for static assets');
    });

    it('should analyze connection optimization', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'network-rtt': {
            id: 'network-rtt',
            title: 'Network RTT',
            numericValue: 50,
            details: {
              type: 'debugdata',
              rtt: 50
            }
          },
          'network-server-latency': {
            id: 'network-server-latency',
            title: 'Server latency',
            numericValue: 150,
            details: {
              type: 'debugdata',
              serverResponseTime: 150
            }
          },
          'uses-rel-preconnect': {
            id: 'uses-rel-preconnect',
            title: 'Preconnect',
            score: 0.5,
            details: {
              type: 'opportunity',
              items: [
                {
                  url: 'https://fonts.googleapis.com',
                  wastedMs: 300
                },
                {
                  url: 'https://www.google-analytics.com',
                  wastedMs: 250
                }
              ],
              overallSavingsMs: 550
            }
          }
        }
      };

      const result = analyzeNetworkPerformance(report as LighthouseReport);

      expect(result.connections).toBeDefined();
      expect(result.connections?.rtt).toBe(50);
      expect(result.connections?.serverLatency).toBe(150);
      expect(result.connections?.preconnectOpportunities).toHaveLength(2);
      expect(result.connections?.potentialSavings).toBe(550);
      expect(result.connections?.recommendations).toContain('Add preconnect hints');
    });

    it('should provide overall network health score', () => {
      const report: Partial<LighthouseReport> = {
        audits: {
          'uses-http2': {
            id: 'uses-http2',
            score: 0.9
          },
          'uses-long-cache-ttl': {
            id: 'uses-long-cache-ttl',
            score: 0.8
          },
          'uses-text-compression': {
            id: 'uses-text-compression',
            score: 0.85
          },
          'uses-rel-preconnect': {
            id: 'uses-rel-preconnect',
            score: 0.7
          }
        }
      };

      const result = analyzeNetworkPerformance(report as LighthouseReport);

      expect(result.overallHealth).toBeDefined();
      expect(result.overallHealth?.score).toBeCloseTo(81.25, 1);
      expect(result.overallHealth?.rating).toBe('good');
      expect(result.overallHealth?.strengths).toContain('HTTP/2 adoption');
      expect(result.overallHealth?.weaknesses).toContain('Connection optimization');
    });
  });
});