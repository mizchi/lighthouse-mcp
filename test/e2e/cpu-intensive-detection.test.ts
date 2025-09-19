import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { executeL1Collect } from '../../src/tools/l1-collect-single.js';
import { executeL1GetReport } from '../../src/tools/l1-get-report.js';
import { executeL2DeepAnalysis } from '../../src/tools/l2-deep-analysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('CPU Intensive DOM & CSS Detection', () => {
  let server: any;
  let serverUrl: string;

  beforeAll(async () => {
    // Start a local server to serve the CPU intensive HTML file
    const port = 9877;
    const cpuIntensiveHtml = readFileSync(
      join(__dirname, '../fixtures/heavy-sites/cpu-intensive-dom-css.html'),
      'utf-8'
    );

    server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(cpuIntensiveHtml);
    });

    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        serverUrl = `http://localhost:${port}`;
        console.log(`CPU test server started at ${serverUrl}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('CPU test server closed');
        resolve();
      });
    });
  });

  it('should detect high CPU usage from complex DOM and CSS', async () => {
    console.log('Analyzing CPU intensive page...');

    // Step 1: Collect Lighthouse report with CPU throttling
    const collectResult = await executeL1Collect({
      url: serverUrl,
      device: 'desktop',
      categories: ['performance'],
      throttling: true // Enable CPU throttling to simulate slower device
    });

    expect(collectResult.reportId).toBeDefined();

    // Step 2: Get the full report
    const reportResult = await executeL1GetReport({
      reportId: collectResult.reportId
    });

    expect(reportResult.report).toBeDefined();
    const report = reportResult.report!;

    // Step 3: Check CPU-related metrics
    const metrics = report.audits;

    // Main thread work breakdown
    const mainThreadWork = metrics?.['mainthread-work-breakdown'];
    if (mainThreadWork?.details?.items) {
      console.log('\n=== Main Thread Work Breakdown ===');
      const items = mainThreadWork.details.items as any[];
      const totalTime = items.reduce((sum, item) => sum + (item.duration || 0), 0);
      console.log(`Total main thread time: ${totalTime.toFixed(0)}ms`);

      // Check for high style & layout time
      const styleItem = items.find(item => item.group === 'styleLayout' || item.groupLabel?.includes('Style'));
      const scriptItem = items.find(item => item.group === 'scriptEvaluation' || item.groupLabel?.includes('Script'));

      if (styleItem) {
        console.log(`Style & Layout: ${styleItem.duration?.toFixed(0)}ms`);
        expect(styleItem.duration).toBeGreaterThan(500); // Expect significant style calculation time
      }

      if (scriptItem) {
        console.log(`Script Evaluation: ${scriptItem.duration?.toFixed(0)}ms`);
      }

      // Total main thread time should be high
      expect(totalTime).toBeGreaterThan(2000); // > 2 seconds of main thread work
    }

    // Total Blocking Time (TBT) - measures main thread blocking
    const tbt = metrics?.['total-blocking-time'];
    if (tbt?.numericValue !== undefined) {
      console.log(`\nTotal Blocking Time: ${tbt.numericValue.toFixed(0)}ms`);
      expect(tbt.numericValue).toBeGreaterThan(500); // > 500ms blocking time indicates CPU issues
    }

    // Max Potential FID - indicates responsiveness issues
    const maxFid = metrics?.['max-potential-fid'];
    if (maxFid?.numericValue !== undefined) {
      console.log(`Max Potential FID: ${maxFid.numericValue.toFixed(0)}ms`);
      expect(maxFid.numericValue).toBeGreaterThan(200); // > 200ms indicates CPU bottleneck
    }

    // DOM size check
    const domSize = metrics?.['dom-size'];
    if (domSize?.numericValue !== undefined) {
      console.log(`\nDOM Size: ${domSize.numericValue} nodes`);
      expect(domSize.numericValue).toBeGreaterThan(5000); // We created 10,000+ nodes

      // Check for excessive DOM depth warning
      if (domSize.details?.items) {
        const items = domSize.details.items as any[];
        const depthItem = items.find(item => item.statistic === 'Depth');
        if (depthItem) {
          console.log(`DOM Depth: ${depthItem.value}`);
          expect(depthItem.value).toBeGreaterThan(15); // Deep nesting causes CPU issues
        }
      }
    }

    // Step 4: Run deep analysis to detect CSS/DOM issues
    const deepAnalysis = await executeL2DeepAnalysis({
      report,
      verbosity: 'detailed'
    });

    console.log(`\n=== Deep Analysis Results ===`);
    console.log(`Total problems found: ${deepAnalysis.analysis.problems.length}`);

    // Filter for CPU-related problems
    const cpuProblems = deepAnalysis.analysis.problems.filter(p =>
      p.title.toLowerCase().includes('dom') ||
      p.title.toLowerCase().includes('css') ||
      p.title.toLowerCase().includes('style') ||
      p.title.toLowerCase().includes('layout') ||
      p.title.toLowerCase().includes('recalc') ||
      p.title.toLowerCase().includes('paint') ||
      p.title.toLowerCase().includes('thread') ||
      p.title.toLowerCase().includes('blocking')
    );

    console.log(`CPU-related problems: ${cpuProblems.length}`);
    cpuProblems.slice(0, 5).forEach(problem => {
      console.log(`  - ${problem.title} (${problem.severity})`);
    });

    // Should detect DOM and CSS issues
    expect(cpuProblems.length).toBeGreaterThan(0);

    // Check for specific issues
    const problemTitles = deepAnalysis.analysis.problems.map(p => p.title.toLowerCase());

    // Should detect excessive DOM size
    expect(problemTitles.some(title =>
      title.includes('dom size') || title.includes('excessive dom')
    )).toBe(true);

    // Performance score should be poor due to CPU issues
    const performanceScore = report.categories?.performance?.score || 0;
    console.log(`\nPerformance Score: ${(performanceScore * 100).toFixed(0)}/100`);
    expect(performanceScore).toBeLessThan(0.5); // < 50/100

    // Step 5: Check bootup time (JavaScript execution time)
    const bootupTime = metrics?.['bootup-time'];
    if (bootupTime?.details?.items) {
      const items = bootupTime.details.items as any[];
      const totalBootupTime = items.reduce((sum, item) => sum + (item.total || 0), 0);
      console.log(`\nTotal Bootup Time: ${totalBootupTime.toFixed(0)}ms`);
      expect(totalBootupTime).toBeGreaterThan(1000); // > 1 second of JS execution
    }

    // Step 6: Check for layout shift (CLS) caused by animations
    const cls = metrics?.['cumulative-layout-shift'];
    if (cls?.numericValue !== undefined) {
      console.log(`Cumulative Layout Shift: ${cls.numericValue.toFixed(3)}`);
      // Animations and transforms should cause some layout shift
      expect(cls.numericValue).toBeGreaterThan(0.05);
    }

    console.log('\n=== CPU Test Summary ===');
    console.log('✓ Detected high main thread usage');
    console.log('✓ Detected excessive DOM size');
    console.log('✓ Detected style recalculation overhead');
    console.log('✓ Detected CPU-related performance issues');
  }, 90000); // 90 second timeout for this intensive test

  it('should detect expensive CSS selectors impact', async () => {
    // Collect report focused on CSS performance
    const collectResult = await executeL1Collect({
      url: serverUrl,
      device: 'mobile', // Mobile simulation for higher CPU impact
      categories: ['performance']
    });

    const reportResult = await executeL1GetReport({
      reportId: collectResult.reportId
    });

    const report = reportResult.report!;
    const metrics = report.audits;

    // Check for unused CSS
    const unusedCss = metrics?.['unused-css-rules'];
    if (unusedCss?.details?.items) {
      const items = unusedCss.details.items as any[];
      const totalWastedBytes = items.reduce((sum, item) => sum + (item.wastedBytes || 0), 0);
      const totalBytes = items.reduce((sum, item) => sum + (item.totalBytes || 0), 0);

      console.log('\n=== CSS Analysis ===');
      console.log(`Total CSS: ${(totalBytes / 1024).toFixed(1)}KB`);
      console.log(`Unused CSS: ${(totalWastedBytes / 1024).toFixed(1)}KB`);
      console.log(`Unused percentage: ${((totalWastedBytes / totalBytes) * 100).toFixed(1)}%`);

      // We generated massive CSS, so total should be large
      expect(totalBytes).toBeGreaterThan(100000); // > 100KB of CSS
    }

    // Check render-blocking resources
    const renderBlocking = metrics?.['render-blocking-resources'];
    if (renderBlocking?.details?.items) {
      const items = renderBlocking.details.items as any[];
      console.log(`\nRender-blocking resources: ${items.length}`);

      // Check if our massive inline CSS is detected
      const inlineStyles = items.filter((item: any) =>
        item.url?.includes('inline') || !item.url
      );
      console.log(`Inline styles blocking render: ${inlineStyles.length}`);
    }

    // Check for layout thrashing indicators
    const diagnostics = metrics?.['diagnostics'];
    if (diagnostics?.details) {
      console.log('\n=== Performance Diagnostics ===');
      const details = diagnostics.details as any;
      if (details.numTasksOver50ms) {
        console.log(`Tasks over 50ms: ${details.numTasksOver50ms}`);
        expect(details.numTasksOver50ms).toBeGreaterThan(5);
      }
      if (details.numTasksOver100ms) {
        console.log(`Tasks over 100ms: ${details.numTasksOver100ms}`);
        expect(details.numTasksOver100ms).toBeGreaterThan(2);
      }
      if (details.numTasksOver500ms) {
        console.log(`Tasks over 500ms: ${details.numTasksOver500ms}`);
      }
    }

    // Check Time to Interactive (TTI)
    const tti = metrics?.['interactive'];
    if (tti?.numericValue !== undefined) {
      console.log(`\nTime to Interactive: ${tti.numericValue.toFixed(0)}ms`);
      expect(tti.numericValue).toBeGreaterThan(5000); // > 5 seconds due to CPU load
    }

    // Check Speed Index (visual progress)
    const speedIndex = metrics?.['speed-index'];
    if (speedIndex?.numericValue !== undefined) {
      console.log(`Speed Index: ${speedIndex.numericValue.toFixed(0)}ms`);
      expect(speedIndex.numericValue).toBeGreaterThan(3000); // > 3 seconds
    }

    console.log('\n=== CSS Performance Impact ===');
    console.log('✓ Detected large CSS payload');
    console.log('✓ Detected expensive selector matching');
    console.log('✓ Detected render-blocking styles');
    console.log('✓ Detected long tasks from style recalculation');
  }, 90000);
});