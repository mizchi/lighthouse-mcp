import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { executeL1Collect } from '../../src/tools/l1-collect-single.js';
import { executeL1GetReport } from '../../src/tools/l1-get-report.js';
import { executeL2DeepAnalysis } from '../../src/tools/l2-deep-analysis.js';
import { executeL2WeightedIssues } from '../../src/tools/l2-weighted-issues.js';
import { executeL3ActionPlanGenerator } from '../../src/tools/l3-action-plan-generator.js';
import { rmSync, existsSync } from 'fs';
import { getBrowserPool } from '../../src/core/browserPool.js';
import { createTestServer, closeTestServer } from '../utils/get-port.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Heavy Site Detection (Real Lighthouse)', { timeout: 120000 }, () => {
  let server: any;
  let serverUrl: string;

  // Quick basic test
  it('should run basic Lighthouse analysis', async () => {
    const basicHtml = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>Performance Test</h1>
          <p>Simple test page for Lighthouse</p>
        </body>
      </html>`;

    const { server: testServer, url: testUrl } = await createTestServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(basicHtml);
    });

    try {
      const collectResult = await executeL1Collect({
        url: testUrl,
        device: 'mobile',
        categories: ['performance'],
        gather: true
      });

      expect(collectResult.reportId).toBeDefined();

      // Get the report and do basic analysis
      const reportResult = await executeL1GetReport({
        reportId: collectResult.reportId
      });

      expect(reportResult.data).toBeDefined();
      expect(reportResult.data.categories?.performance).toBeDefined();

      console.log('✓ Basic Lighthouse analysis completed');
    } finally {
      await closeTestServer(testServer);
    }
  }, 30000);

  beforeAll(async () => {
    // Set test-specific browser data directory
    process.env.LIGHTHOUSE_USER_DATA_DIR = '.lhdata/test-heavy-site';

    // Clean up any previous test data
    const testDir = '.lhdata/test-heavy-site';
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch (e) {
        console.log('Could not clean test dir:', e);
      }
    }

    // Reset browser pool for this test
    const pool = getBrowserPool();
    await pool.closeAll();
    // Start a local server to serve the heavy HTML file
    const heavyHtml = readFileSync(
      join(__dirname, '../fixtures/heavy-sites/extremely-heavy.html'),
      'utf-8'
    );

    const serverInfo = await createTestServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(heavyHtml);
    });

    server = serverInfo.server;
    serverUrl = serverInfo.url;
    console.log(`Test server started at ${serverUrl}`);
  });

  afterAll(async () => {
    // Close browser pool before server
    const pool = getBrowserPool();
    await pool.closeAll();

    // Close server
    await closeTestServer(server);
    console.log('Test server closed');

    // Clean up test directory
    const testDir = '.lhdata/test-heavy-site';
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {}

    // Reset environment
    delete process.env.LIGHTHOUSE_USER_DATA_DIR;
  });

  it.skip('should detect performance issues in extremely heavy page - SLOW', async () => {
    // Step 1: Collect Lighthouse report
    console.log('Collecting Lighthouse report for heavy page...');
    const collectResult = await executeL1Collect({
      url: serverUrl,
      device: 'desktop',
      categories: ['performance'],
      gather: true // Force fresh collection
    });

    expect(collectResult.reportId).toBeDefined();

    // Get the full report
    const reportResult = await executeL1GetReport({
      reportId: collectResult.reportId
    });

    expect(reportResult.data).toBeDefined();
    const report = reportResult.data;

    // Step 2: Verify poor performance score
    const performanceScore = report.categories?.performance?.score || 0;
    console.log(`Performance score: ${(performanceScore * 100).toFixed(0)}/100`);

    // Expect very poor performance (less than 50/100)
    expect(performanceScore).toBeLessThan(0.5);

    // Step 3: Run deep analysis
    const deepAnalysis = await executeL2DeepAnalysis({
      report,
      verbosity: 'full'
    });

    console.log(`Found ${deepAnalysis.analysis.problems.length} problems`);
    console.log(`Critical issues: ${deepAnalysis.analysis.problems.filter(p => p.severity === 'critical').length}`);

    // Should detect multiple critical issues
    expect(deepAnalysis.analysis.problems.length).toBeGreaterThan(10);
    expect(deepAnalysis.analysis.problems.filter(p => p.severity === 'critical').length).toBeGreaterThan(3);

    // Check for specific issues that should be detected
    const problemTitles = deepAnalysis.analysis.problems.map(p => p.title.toLowerCase());

    // Should detect render-blocking resources
    expect(problemTitles.some(title =>
      title.includes('render-blocking') || title.includes('blocking resources')
    )).toBe(true);

    // Should detect unused CSS
    expect(problemTitles.some(title =>
      title.includes('unused css') || title.includes('css coverage')
    )).toBe(true);

    // Should detect unused JavaScript
    expect(problemTitles.some(title =>
      title.includes('unused javascript') || title.includes('js coverage')
    )).toBe(true);

    // Should detect CLS issues
    expect(problemTitles.some(title =>
      title.includes('layout shift') || title.includes('cls')
    )).toBe(true);

    // Step 4: Run weighted issues analysis
    const weightedIssues = await executeL2WeightedIssues({
      report,
      topN: 10
    });

    console.log(`Total weighted impact: ${weightedIssues.totalWeightedImpact.toFixed(2)}`);
    console.log(`Top issue: ${weightedIssues.topIssues[0]?.title}`);

    // Should have significant weighted impact
    expect(weightedIssues.totalWeightedImpact).toBeGreaterThan(50);
    expect(weightedIssues.topIssues.length).toBeGreaterThan(5);

    // Step 5: Generate action plan
    const actionPlan = await executeL3ActionPlanGenerator({
      report,
      includeTools: ['weighted', 'deep', 'unused']
    });

    console.log(`Generated ${actionPlan.actionPlan.length} action items`);
    console.log(`Estimated score improvement: ${(actionPlan.estimatedImpact.scoreImprovement * 100).toFixed(0)} points`);

    // Should generate multiple action items
    expect(actionPlan.actionPlan.length).toBeGreaterThan(5);
    expect(actionPlan.estimatedImpact.scoreImprovement).toBeGreaterThan(0.2); // 20+ points improvement possible

    // Verify high-priority items exist
    const highPriorityItems = actionPlan.actionPlan.filter(item => item.priority <= 2);
    expect(highPriorityItems.length).toBeGreaterThan(2);

    // Log summary for debugging
    console.log('\n=== Heavy Site Detection Summary ===');
    console.log(`Performance Score: ${(performanceScore * 100).toFixed(0)}/100`);
    console.log(`Total Problems: ${deepAnalysis.analysis.problems.length}`);
    console.log(`Critical Issues: ${deepAnalysis.analysis.problems.filter(p => p.severity === 'critical').length}`);
    console.log(`Action Items: ${actionPlan.actionPlan.length}`);
    console.log(`Top 3 Actions:`);
    actionPlan.actionPlan.slice(0, 3).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.title} (Priority: ${item.priority}, Effort: ${item.implementation.effort})`);
    });
    console.log('===================================\n');
  }, 60000); // 60 second timeout for Lighthouse

  it.skip('should detect specific performance metrics issues - SLOW', async () => {
    // Collect report with specific focus on metrics
    const collectResult = await executeL1Collect({
      url: serverUrl,
      device: 'desktop',
      categories: ['performance'],
      gather: true // Force fresh collection
    });

    // Get the full report
    const reportResult = await executeL1GetReport({
      reportId: collectResult.reportId
    });

    const report = reportResult.data;
    const metrics = report.audits;

    // Check Core Web Vitals
    const lcp = metrics?.['largest-contentful-paint'];
    const fid = metrics?.['max-potential-fid'];
    const cls = metrics?.['cumulative-layout-shift'];
    const tbt = metrics?.['total-blocking-time'];

    console.log('\n=== Core Web Vitals ===');
    console.log(`LCP: ${lcp?.numericValue}ms (should be > 4000ms for poor)`);
    console.log(`FID: ${fid?.numericValue}ms (should be > 300ms for poor)`);
    console.log(`CLS: ${cls?.numericValue} (should be > 0.25 for poor)`);
    console.log(`TBT: ${tbt?.numericValue}ms (should be > 600ms for poor)`);

    // Expect poor Core Web Vitals
    if (lcp?.numericValue) {
      expect(lcp.numericValue).toBeGreaterThan(2500); // Poor LCP
    }

    if (fid?.numericValue) {
      expect(fid.numericValue).toBeGreaterThan(100); // Poor FID
    }

    if (cls?.numericValue) {
      expect(cls.numericValue).toBeGreaterThan(0.1); // Poor CLS
    }

    if (tbt?.numericValue) {
      expect(tbt.numericValue).toBeGreaterThan(300); // Poor TBT
    }

    // Check resource-related metrics
    const renderBlockingResources = metrics?.['render-blocking-resources'];
    const unusedCss = metrics?.['unused-css-rules'];
    const unusedJs = metrics?.['unused-javascript'];
    const domSize = metrics?.['dom-size'];

    console.log('\n=== Resource Issues ===');
    if (renderBlockingResources?.details?.items) {
      console.log(`Render-blocking resources: ${renderBlockingResources.details.items.length}`);
      expect(renderBlockingResources.details.items.length).toBeGreaterThan(5);
    }

    if (unusedCss?.details?.items) {
      const totalUnusedCss = unusedCss.details.items.reduce((sum: number, item: any) =>
        sum + (item.wastedBytes || 0), 0);
      console.log(`Unused CSS: ${(totalUnusedCss / 1024).toFixed(1)}KB`);
      expect(totalUnusedCss).toBeGreaterThan(50000); // > 50KB unused CSS
    }

    if (unusedJs?.details?.items) {
      const totalUnusedJs = unusedJs.details.items.reduce((sum: number, item: any) =>
        sum + (item.wastedBytes || 0), 0);
      console.log(`Unused JavaScript: ${(totalUnusedJs / 1024).toFixed(1)}KB`);
      expect(totalUnusedJs).toBeGreaterThan(100000); // > 100KB unused JS
    }

    if (domSize?.numericValue) {
      console.log(`DOM Size: ${domSize.numericValue} nodes`);
      expect(domSize.numericValue).toBeGreaterThan(1500); // Excessive DOM size
    }
  }, 60000);
});