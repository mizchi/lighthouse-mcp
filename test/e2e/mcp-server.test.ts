import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'http';

describe('MCP Server E2E Tests', () => {
  let server: http.Server;
  const PORT = 3334;
  const TEST_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    // Start test HTTP server
    server = http.createServer((req, res) => {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MCP Test Page</title>
            <style>
              body { font-family: sans-serif; margin: 0; }
              .hero { padding: 100px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; }
              .content { padding: 50px 20px; max-width: 800px; margin: 0 auto; }
              .card { background: #f7f7f7; padding: 20px; margin: 20px 0; border-radius: 8px; }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <div class="hero">
              <h1>MCP Test Page</h1>
              <p>Testing MCP Server Integration</p>
            </div>
            <div class="content">
              <div class="card">
                <h2>Performance Testing</h2>
                <p>This page is designed to test various performance aspects.</p>
                <img src="/large-image.jpg" alt="Large Image" width="800" height="600">
              </div>
              <div class="card">
                <h2>JavaScript Performance</h2>
                <script>
                  // Simulate some JavaScript processing
                  const data = Array.from({ length: 1000 }, (_, i) => i);
                  const processed = data.map(x => x * 2).filter(x => x % 3 === 0);
                  console.log('Processed', processed.length, 'items');
                </script>
              </div>
              <div class="card">
                <h2>CSS Performance</h2>
                <style>
                  .unused-class-1 { color: red; }
                  .unused-class-2 { background: blue; }
                  .unused-class-3 { border: 1px solid green; }
                </style>
              </div>
            </div>
          </body>
          </html>
        `);
      } else if (req.url === '/large-image.jpg') {
        // Simulate a large image
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        const fakeImage = Buffer.alloc(500000); // 500KB fake image
        res.end(fakeImage);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(PORT, () => {
        console.log(`Test server running on port ${PORT}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
      // Give server time to close gracefully
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, 5000); // Add timeout

  describe('Deep Analysis Tool', () => {
    it('should perform deep analysis with all features', async () => {
      const { createDeepAnalysisTool } = await import('../../src/mcp/deep-analysis-tool');
      const tool = await createDeepAnalysisTool();

      const result = await tool.execute({
        url: TEST_URL,
        includeChains: true,
        includeUnusedCode: true,
        maxRecommendations: 5,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      const content = Array.isArray(result.content) ? result.content[0].text : result.content;
      expect(content).toContain('# Deep Performance Analysis');
      expect(content).toContain('## Performance Score');
      expect(content).toContain('## Critical Request Chains');
      expect(content).toContain('## Unused Code Analysis');
      expect(content).toContain('## Prioritized Recommendations');
    });

    it('should analyze critical chains', async () => {
      const { runLighthouse } = await import('../../src/core/lighthouse');
      const { analyzeCriticalChains } = await import('../../src/analyzers/criticalChain');

      const result = await runLighthouse(TEST_URL, {
        categories: ['performance'],
        device: 'mobile',
      });

      if (!result.isOk()) {
        console.error('Critical chain - Lighthouse failed:', result.error.message);
      }
      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;
      
      const analysis = analyzeCriticalChains(result.value);

      expect(analysis).toBeDefined();
      expect(analysis.longestChain).toBeDefined();
      expect(Array.isArray(analysis.longestChain)).toBe(true);
      expect(analysis.totalDuration).toBeDefined();
      expect(analysis.totalTransferSize).toBeGreaterThanOrEqual(0);
    });

    it('should detect unused code', async () => {
      const { runLighthouse } = await import('../../src/core/lighthouse');
      const { analyzeUnusedCode } = await import('../../src/analyzers/unusedCode');

      const result = await runLighthouse(TEST_URL, {
        categories: ['performance'],
        device: 'mobile',
      });

      if (!result.isOk()) {
        console.error('Unused code - Lighthouse failed:', result.error.message);
      }
      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;
      
      const analysis = analyzeUnusedCode(result.value);

      expect(analysis).toBeDefined();
      expect(analysis.totalWastedBytes).toBeGreaterThanOrEqual(0);
      expect(analysis.unusedJavaScript).toBeDefined();
      expect(analysis.unusedCSS).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });
  });

  describe('Performance Analysis', () => {
    it('should analyze performance patterns', async () => {
      const { runLighthouse } = await import('../../src/core/lighthouse');
      const { analyzePerformance } = await import('../../src/analyzers/performance');

      const result = await runLighthouse(TEST_URL, {
        categories: ['performance'],
        device: 'mobile',
      });

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const analysis = analyzePerformance(result.value);

      expect(analysis).toBeDefined();
      expect(analysis.metrics).toBeDefined();
      expect(analysis.patterns).toBeDefined();
      expect(Array.isArray(analysis.patterns)).toBe(true);
    });

    it('should extract Core Web Vitals', async () => {
      const { runLighthouse } = await import('../../src/core/lighthouse');
      const { extractMetrics } = await import('../../src/core/metrics');

      const result = await runLighthouse(TEST_URL, {
        categories: ['performance'],
        device: 'mobile',
      });

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const metrics = extractMetrics(result.value);

      expect(metrics).toBeDefined();
      expect(metrics.lcp).toBeDefined();
      expect(metrics.fcp).toBeDefined();
      expect(metrics.cls).toBeDefined();
      expect(metrics.tbt).toBeDefined();
      expect(metrics.ttfb).toBeDefined();
    });
  });

  describe('Problem Detection', () => {
    it('should detect and categorize problems', async () => {
      const { runLighthouse } = await import('../../src/core/lighthouse');
      const { detectProblems } = await import('../../src/analyzers/problems');

      const result = await runLighthouse(TEST_URL, {
        categories: ['performance'],
        device: 'mobile',
      });

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const problems = detectProblems(result.value);

      expect(problems).toBeDefined();
      expect(Array.isArray(problems)).toBe(true);
      
      problems.forEach(problem => {
        expect(problem).toHaveProperty('id');
        expect(problem).toHaveProperty('category');
        expect(problem).toHaveProperty('severity');
        expect(['critical', 'high', 'medium', 'low']).toContain(problem.severity);
        expect(problem).toHaveProperty('impact');
        expect(problem.impact).toBeGreaterThanOrEqual(0);
        expect(problem.impact).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Score Analysis', () => {
    it('should analyze score breakdown', async () => {
      const { runLighthouse } = await import('../../src/core/lighthouse');
      const { analyzeReport } = await import('../../src/analyzers/scores');

      const result = await runLighthouse(TEST_URL, {
        categories: ['performance', 'accessibility'],
        device: 'mobile',
      });

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const analysis = analyzeReport(result.value);

      expect(analysis).toBeDefined();
      expect(analysis.categoryScores).toBeDefined();
      expect(analysis.categoryScores.performance).toBeDefined();
      expect(analysis.categoryScores.performance?.score).toBeGreaterThanOrEqual(0);
      expect(analysis.categoryScores.performance?.score).toBeLessThanOrEqual(100);
      
      expect(analysis.auditDetails).toBeDefined();
      expect(Array.isArray(analysis.auditDetails)).toBe(true);
    });

    it('should identify score opportunities', async () => {
      const { runLighthouse } = await import('../../src/core/lighthouse');
      const { analyzeReport } = await import('../../src/analyzers/scores');

      const result = await runLighthouse(TEST_URL, {
        categories: ['performance'],
        device: 'mobile',
      });

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const analysis = analyzeReport(result.value);
      const performanceAudits = analysis.auditDetails.filter(
        audit => audit.category === 'performance'
      );

      expect(performanceAudits.length).toBeGreaterThan(0);
      
      performanceAudits.forEach(audit => {
        expect(audit).toHaveProperty('id');
        expect(audit).toHaveProperty('title');
        expect(audit).toHaveProperty('score');
        expect(audit).toHaveProperty('weight');
        expect(audit).toHaveProperty('impact');
      });
    });
  });
});