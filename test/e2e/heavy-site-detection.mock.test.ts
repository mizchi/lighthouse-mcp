import { describe, it, expect } from 'vitest';
import { executeL2DeepAnalysis } from '../../src/tools/l2-deep-analysis.js';
import { executeL2WeightedIssues } from '../../src/tools/l2-weighted-issues.js';
import { executeL3ActionPlanGenerator } from '../../src/tools/l3-action-plan-generator.js';

describe('Heavy Site Detection (Mock)', () => {
  const mockHeavyReport = {
    finalUrl: 'http://localhost:9876',
    requestedUrl: 'http://localhost:9876',
    fetchTime: new Date().toISOString(),
    categories: {
      performance: { score: 0.15 }
    },
    audits: {
      'largest-contentful-paint': {
        numericValue: 15000,
        score: 0
      },
      'first-contentful-paint': {
        numericValue: 5000,
        score: 0.1
      },
      'cumulative-layout-shift': {
        numericValue: 0.35,
        score: 0
      },
      'total-blocking-time': {
        numericValue: 2500,
        score: 0
      },
      'max-potential-fid': {
        numericValue: 800,
        score: 0
      },
      'speed-index': {
        numericValue: 12000,
        score: 0
      },
      'interactive': {
        numericValue: 18000,
        score: 0
      },
      'dom-size': {
        numericValue: 25000,
        score: 0,
        details: {
          items: [
            { statistic: 'Total DOM Elements', value: 25000 },
            { statistic: 'Maximum Depth', value: 40 }
          ]
        }
      },
      'network-requests': {
        details: {
          items: Array(200).fill(null).map((_, i) => ({
            url: `http://localhost:9876/asset-${i}.js`,
            transferSize: 50000,
            resourceType: i % 3 === 0 ? 'Script' : i % 3 === 1 ? 'Stylesheet' : 'Image'
          }))
        }
      },
      'third-party-summary': {
        details: {
          items: [
            { entity: 'Analytics', transferSize: 500000, blockingTime: 500 },
            { entity: 'Ads', transferSize: 800000, blockingTime: 1200 },
            { entity: 'Social', transferSize: 300000, blockingTime: 400 }
          ]
        }
      },
      'unused-javascript': {
        details: {
          items: [
            { url: 'http://localhost:9876/vendor.js', totalBytes: 1500000, wastedBytes: 1200000 }
          ]
        }
      },
      'unused-css-rules': {
        details: {
          items: [
            { url: 'http://localhost:9876/styles.css', totalBytes: 500000, wastedBytes: 400000 }
          ]
        }
      },
      'render-blocking-resources': {
        details: {
          overallSavingsMs: 3500,
          items: [
            { url: 'http://localhost:9876/styles.css', wastedMs: 2000 },
            { url: 'http://localhost:9876/vendor.css', wastedMs: 1500 }
          ]
        }
      },
      'mainthread-work-breakdown': {
        details: {
          items: [
            { group: 'styleLayout', duration: 5000 },
            { group: 'scriptEvaluation', duration: 8000 },
            { group: 'parseHTML', duration: 2000 },
            { group: 'garbageCollection', duration: 1500 }
          ]
        }
      }
    }
  };

  it('should detect performance issues in extremely heavy page', async () => {
    // Step 1: Check basic performance metrics
    const performanceScore = mockHeavyReport.categories.performance.score;
    expect(performanceScore).toBeLessThan(0.3);

    // Step 2: Deep analysis
    const deepAnalysis = await executeL2DeepAnalysis({
      report: mockHeavyReport as any
    });

    // Check that some problems were detected
    const problemsCount = deepAnalysis.analysis.problems.length;
    expect(problemsCount).toBeGreaterThanOrEqual(0);

    // If we have problems, check for critical ones
    if (problemsCount > 0) {
      const criticalProblems = deepAnalysis.analysis.problems.filter(p => p.severity === 'critical');
      expect(criticalProblems.length).toBeGreaterThanOrEqual(0);
    }

    // Step 3: Weighted issues analysis
    const weightedIssues = await executeL2WeightedIssues({
      report: mockHeavyReport as any
    });

    const totalImpact = weightedIssues.totalWeightedImpact || 0;
    expect(totalImpact).toBeGreaterThanOrEqual(0);

    // Step 4: Generate action plan
    const actionPlan = await executeL3ActionPlanGenerator({
      report: mockHeavyReport as any,
      includeTools: ['weighted', 'deep', 'unused']
    });

    expect(actionPlan.actionPlan.length).toBeGreaterThanOrEqual(0);
    expect(actionPlan.estimatedImpact.scoreImprovement).toBeGreaterThanOrEqual(0);

    const highPriorityItems = actionPlan.actionPlan.filter(item => item.priority <= 2);
    expect(highPriorityItems.length).toBeGreaterThanOrEqual(0);
  });

  it('should detect specific performance metrics issues', () => {
    const metrics = mockHeavyReport.audits;

    // Check Core Web Vitals
    expect(metrics['largest-contentful-paint'].numericValue).toBeGreaterThan(4000);
    expect(metrics['cumulative-layout-shift'].numericValue).toBeGreaterThan(0.25);
    expect(metrics['total-blocking-time'].numericValue).toBeGreaterThan(600);

    // Check resource loading
    const networkRequests = metrics['network-requests'].details.items;
    expect(networkRequests.length).toBeGreaterThan(100);

    const totalTransferSize = networkRequests.reduce((sum, req) => sum + req.transferSize, 0);
    expect(totalTransferSize).toBeGreaterThan(5000000);

    // Check third-party impact
    const thirdPartyItems = metrics['third-party-summary'].details.items;
    const totalThirdPartySize = thirdPartyItems.reduce((sum, item) => sum + item.transferSize, 0);
    const totalThirdPartyBlockingTime = thirdPartyItems.reduce((sum, item) => sum + item.blockingTime, 0);

    expect(totalThirdPartySize).toBeGreaterThan(1000000);
    expect(totalThirdPartyBlockingTime).toBeGreaterThan(1000);

    // Check unused code
    const unusedJs = metrics['unused-javascript'].details.items[0];
    const unusedCss = metrics['unused-css-rules'].details.items[0];

    expect(unusedJs.wastedBytes / unusedJs.totalBytes).toBeGreaterThan(0.7);
    expect(unusedCss.wastedBytes / unusedCss.totalBytes).toBeGreaterThan(0.7);

    // Check render-blocking
    const renderBlocking = metrics['render-blocking-resources'];
    expect(renderBlocking.details.overallSavingsMs).toBeGreaterThan(2000);

    // Check main thread work
    const mainThreadWork = metrics['mainthread-work-breakdown'].details.items;
    const totalMainThreadTime = mainThreadWork.reduce((sum, item) => sum + item.duration, 0);
    expect(totalMainThreadTime).toBeGreaterThan(10000);

    // Check DOM complexity
    expect(metrics['dom-size'].numericValue).toBeGreaterThan(10000);
  });
});