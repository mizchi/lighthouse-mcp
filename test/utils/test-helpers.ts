/**
 * Test Utilities for MCP Tools
 *
 * Provides helper functions and mock data generators for testing
 */

import type { LighthouseReport, LighthouseAudits } from '../../src/types/lighthouse';

/**
 * Create a mock Lighthouse report with customizable metrics
 */
export function createMockReport(options: {
  url?: string;
  performanceScore?: number;
  lcp?: number;
  fcp?: number;
  cls?: number;
  tbt?: number;
  tti?: number;
  si?: number;
  audits?: Partial<LighthouseAudits>;
}): LighthouseReport {
  const {
    url = 'https://example.com',
    performanceScore = 0.85,
    lcp = 2500,
    fcp = 1800,
    cls = 0.05,
    tbt = 150,
    tti = 3500,
    si = 2000,
    audits = {}
  } = options;

  return {
    requestedUrl: url,
    finalUrl: url,
    fetchTime: new Date().toISOString(),
    categories: {
      performance: {
        id: 'performance',
        title: 'Performance',
        score: performanceScore,
        auditRefs: []
      }
    },
    audits: {
      'largest-contentful-paint': {
        id: 'largest-contentful-paint',
        title: 'Largest Contentful Paint',
        score: lcp <= 2500 ? 1 : lcp <= 4000 ? 0.5 : 0,
        numericValue: lcp,
        numericUnit: 'millisecond',
        displayValue: `${(lcp / 1000).toFixed(1)} s`
      },
      'first-contentful-paint': {
        id: 'first-contentful-paint',
        title: 'First Contentful Paint',
        score: fcp <= 1800 ? 1 : fcp <= 3000 ? 0.5 : 0,
        numericValue: fcp,
        numericUnit: 'millisecond',
        displayValue: `${(fcp / 1000).toFixed(1)} s`
      },
      'cumulative-layout-shift': {
        id: 'cumulative-layout-shift',
        title: 'Cumulative Layout Shift',
        score: cls <= 0.1 ? 1 : cls <= 0.25 ? 0.5 : 0,
        numericValue: cls,
        numericUnit: 'unitless',
        displayValue: cls.toFixed(3)
      },
      'total-blocking-time': {
        id: 'total-blocking-time',
        title: 'Total Blocking Time',
        score: tbt <= 200 ? 1 : tbt <= 600 ? 0.5 : 0,
        numericValue: tbt,
        numericUnit: 'millisecond',
        displayValue: `${tbt} ms`
      },
      'interactive': {
        id: 'interactive',
        title: 'Time to Interactive',
        score: tti <= 3800 ? 1 : tti <= 7300 ? 0.5 : 0,
        numericValue: tti,
        numericUnit: 'millisecond',
        displayValue: `${(tti / 1000).toFixed(1)} s`
      },
      'speed-index': {
        id: 'speed-index',
        title: 'Speed Index',
        score: si <= 3400 ? 1 : si <= 5800 ? 0.5 : 0,
        numericValue: si,
        numericUnit: 'millisecond',
        displayValue: `${(si / 1000).toFixed(1)} s`
      },
      ...audits
    } as LighthouseAudits,
    configSettings: {
      formFactor: 'mobile',
      throttlingMethod: 'simulate',
      screenEmulation: {
        mobile: true,
        width: 360,
        height: 640,
        deviceScaleFactor: 2
      }
    }
  } as LighthouseReport;
}

/**
 * Create a mock critical request chain
 */
export function createMockChain(options: {
  url: string;
  startTime: number;
  endTime: number;
  transferSize?: number;
  children?: Record<string, any>;
}) {
  const { url, startTime, endTime, transferSize = 10000, children = {} } = options;

  return {
    request: {
      url,
      startTime: startTime / 1000, // Convert to seconds for Lighthouse format
      endTime: endTime / 1000,
      responseReceivedTime: (endTime - 20) / 1000,
      transferSize
    },
    children
  };
}

/**
 * Create mock unused code audit
 */
export function createUnusedCodeAudit(files: Array<{
  url: string;
  totalBytes: number;
  wastedBytes: number;
  wastedPercent: number;
}>) {
  return {
    id: 'unused-css-rules',
    title: 'Reduce unused CSS',
    score: files.some(f => f.wastedPercent > 80) ? 0 : 0.5,
    details: {
      type: 'opportunity',
      items: files,
      overallSavingsBytes: files.reduce((sum, f) => sum + f.wastedBytes, 0),
      overallSavingsMs: files.reduce((sum, f) => sum + f.wastedBytes, 0) / 1000
    }
  };
}

/**
 * Create mock third-party summary audit
 */
export function createThirdPartySummary(entities: Array<{
  entity: string;
  transferSize: number;
  blockingTime: number;
  mainThreadTime?: number;
}>) {
  return {
    id: 'third-party-summary',
    title: 'Reduce the impact of third-party code',
    score: entities.some(e => e.blockingTime > 250) ? 0 : 0.5,
    details: {
      type: 'table',
      items: entities.map(e => ({
        entity: { text: e.entity, type: 'link' },
        transferSize: e.transferSize,
        blockingTime: e.blockingTime,
        mainThreadTime: e.mainThreadTime || e.blockingTime * 1.2
      }))
    }
  };
}

/**
 * Create mock network requests
 */
export function createNetworkRequests(requests: Array<{
  url: string;
  startTime: number;
  endTime: number;
  transferSize: number;
  resourceType: string;
  priority?: string;
  statusCode?: number;
}>) {
  return requests.map(req => ({
    url: req.url,
    protocol: 'http/2',
    startTime: req.startTime,
    endTime: req.endTime,
    finished: true,
    transferSize: req.transferSize,
    resourceType: req.resourceType,
    mimeType: getMimeType(req.resourceType),
    statusCode: req.statusCode || 200,
    priority: req.priority || 'High',
    networkRequestTime: req.startTime,
    networkEndTime: req.endTime,
    responseReceivedTime: req.endTime - 20,
    rendererStartTime: 0
  }));
}

/**
 * Get MIME type from resource type
 */
function getMimeType(resourceType: string): string {
  const mimeTypes: Record<string, string> = {
    Document: 'text/html',
    Stylesheet: 'text/css',
    Script: 'application/javascript',
    Image: 'image/jpeg',
    Font: 'font/woff2',
    XHR: 'application/json',
    Fetch: 'application/json',
    Media: 'video/mp4'
  };
  return mimeTypes[resourceType] || 'application/octet-stream';
}

/**
 * Create mock LCP element
 */
export function createLCPElement(options: {
  type: 'image' | 'text';
  url?: string;
  selector: string;
  timing: number;
  size?: number;
}) {
  const { type, url, selector, timing, size = 100000 } = options;

  if (type === 'image') {
    return {
      node: {
        type: 'node',
        selector,
        nodeLabel: 'Image',
        snippet: `<img src="${url}" alt="">`,
        boundingRect: {
          top: 0,
          bottom: 600,
          left: 0,
          right: 800,
          width: 800,
          height: 600
        }
      },
      url,
      timing,
      size,
      loadTime: timing - 100,
      renderTime: timing
    };
  } else {
    return {
      node: {
        type: 'node',
        selector,
        nodeLabel: 'Text',
        snippet: `<${selector.split('.')[0]}>Sample Text</${selector.split('.')[0]}>`,
        boundingRect: {
          top: 100,
          bottom: 200,
          left: 0,
          right: 800,
          width: 800,
          height: 100
        }
      },
      timing
    };
  }
}

/**
 * Create a complex critical chain with LCP and non-LCP resources
 */
export function createComplexChainWithLCP(lcpUrl: string) {
  return {
    'https://example.com/': createMockChain({
      url: 'https://example.com/',
      startTime: 0,
      endTime: 100,
      children: {
        // LCP-related chain
        'https://example.com/critical.css': createMockChain({
          url: 'https://example.com/critical.css',
          startTime: 100,
          endTime: 200,
          children: {
            [lcpUrl]: createMockChain({
              url: lcpUrl,
              startTime: 200,
              endTime: 2000,
              transferSize: 500000
            })
          }
        }),
        // Non-LCP chains
        'https://analytics.example.com/track.js': createMockChain({
          url: 'https://analytics.example.com/track.js',
          startTime: 150,
          endTime: 300,
          children: {
            'https://analytics.example.com/collect': createMockChain({
              url: 'https://analytics.example.com/collect',
              startTime: 300,
              endTime: 350,
              transferSize: 100
            })
          }
        }),
        'https://ads.example.com/banner.js': createMockChain({
          url: 'https://ads.example.com/banner.js',
          startTime: 200,
          endTime: 500,
          children: {
            'https://ads.example.com/creative.jpg': createMockChain({
              url: 'https://ads.example.com/creative.jpg',
              startTime: 500,
              endTime: 700,
              transferSize: 50000
            })
          }
        })
      }
    }),
    // Completely independent chain
    'https://social.example.com/widget.js': createMockChain({
      url: 'https://social.example.com/widget.js',
      startTime: 1000,
      endTime: 1200,
      children: {
        'https://social.example.com/api/likes': createMockChain({
          url: 'https://social.example.com/api/likes',
          startTime: 1200,
          endTime: 1300,
          transferSize: 2000
        })
      }
    })
  };
}

/**
 * Assert that a critical path contains only LCP-related resources
 */
export function assertLCPPathOnly(
  criticalPath: Array<{ url: string }>,
  lcpUrl: string,
  allowedUrls: string[] = []
) {
  const defaultAllowed = [
    'https://example.com/', // Root document
    'https://example.com/critical.css', // Critical CSS
  ];

  const allAllowed = [...defaultAllowed, ...allowedUrls, lcpUrl];

  criticalPath.forEach(node => {
    const isAllowed = allAllowed.some(allowed => node.url === allowed || node.url.includes(lcpUrl));
    if (!isAllowed) {
      throw new Error(`Unexpected URL in LCP critical path: ${node.url}`);
    }
  });

  // Ensure LCP resource is in the path
  const hasLCP = criticalPath.some(node => node.url === lcpUrl || node.url.includes(lcpUrl));
  if (!hasLCP) {
    throw new Error(`LCP resource ${lcpUrl} not found in critical path`);
  }
}

/**
 * Create test context for MCP tool testing
 */
export function createMCPTestContext() {
  return {
    mockReports: new Map<string, LighthouseReport>(),

    addReport(id: string, report: LighthouseReport) {
      this.mockReports.set(id, report);
    },

    getReport(id: string) {
      return this.mockReports.get(id);
    },

    reset() {
      this.mockReports.clear();
    }
  };
}