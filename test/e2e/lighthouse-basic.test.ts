import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as http from "http";

describe.skip("Lighthouse E2E Tests", () => {
  let server: http.Server;
  const PORT = 3333;
  const TEST_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    // Start test server
    server = http.createServer((req, res) => {
      if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test Page</title>
            <style>
              body { font-family: sans-serif; }
              .hero { padding: 50px; background: #f0f0f0; }
              .content { padding: 20px; }
            </style>
          </head>
          <body>
            <div class="hero">
              <h1>Test Page for Lighthouse</h1>
              <p>This is a test page for E2E testing.</p>
            </div>
            <div class="content">
              <h2>Content Section</h2>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              <img src="/test-image.jpg" alt="Test" width="400" height="300">
            </div>
          </body>
          </html>
        `);
      } else if (req.url === "/test-image.jpg") {
        // Return a small test image
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(Buffer.from("FFD8FFE000104A46494600", "hex")); // Minimal JPEG header
      } else {
        res.writeHead(404);
        res.end("Not found");
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
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }, 5000); // Add timeout

  it("should run Lighthouse analysis on test page", async () => {
    const { runLighthouse } = await import("../../src/core/lighthouse");

    const result = await runLighthouse(TEST_URL, {
      categories: ["performance", "accessibility"],
      device: "mobile",
    });

    if (!result.isOk()) {
      console.error("Lighthouse failed:", result.error.message);
    }
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const report = result.value;
      expect(report).toBeDefined();
      expect(report.requestedUrl.replace(/\/$/, "")).toBe(
        TEST_URL.replace(/\/$/, "")
      );
      expect(report.categories).toBeDefined();
      expect(report.categories.performance).toBeDefined();
      expect(report.categories.performance?.score).toBeGreaterThanOrEqual(0);
      expect(report.categories.performance?.score).toBeLessThanOrEqual(1);
    }
  });

  it("should detect performance patterns", async () => {
    const { runLighthouse } = await import("../../src/core/lighthouse");
    const { detectPatterns } = await import("../../src/analyzers/patterns");

    const result = await runLighthouse(TEST_URL, {
      categories: ["performance"],
      device: "mobile",
    });

    if (!result.isOk()) {
      console.error("Lighthouse failed:", result.error.message);
    }
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const patterns = detectPatterns(result.value);
      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    }
  });

  it("should extract problems from report", async () => {
    const { runLighthouse } = await import("../../src/core/lighthouse");
    const { detectProblems } = await import("../../src/analyzers/problems");

    const result = await runLighthouse(TEST_URL, {
      categories: ["performance"],
      device: "mobile",
    });

    if (!result.isOk()) {
      console.error("Lighthouse failed:", result.error.message);
    }
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const problems = detectProblems(result.value);
      expect(problems).toBeDefined();
      expect(Array.isArray(problems)).toBe(true);
    }
  });

  it("should analyze score details", async () => {
    const { runLighthouse } = await import("../../src/core/lighthouse");
    const { analyzeReport } = await import("../../src/analyzers/scores");

    const result = await runLighthouse(TEST_URL, {
      categories: ["performance"],
      device: "mobile",
    });

    if (!result.isOk()) {
      console.error("Lighthouse failed:", result.error.message);
    }
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const analysis = analyzeReport(result.value);
      expect(analysis).toBeDefined();
      expect(analysis.categoryScores).toBeDefined();
      expect(analysis.auditDetails).toBeDefined();
    }
  });

  it("should perform deep analysis", async () => {
    const { runLighthouse } = await import("../../src/core/lighthouse");
    const { performDeepAnalysis } = await import(
      "../../src/analyzers/deepAnalysis"
    );

    const result = await runLighthouse(TEST_URL, {
      categories: ["performance"],
      device: "mobile",
    });

    if (!result.isOk()) {
      console.error("Lighthouse failed:", result.error.message);
    }
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const deepAnalysis = performDeepAnalysis(result.value);
      expect(deepAnalysis).toBeDefined();
      expect(deepAnalysis.scoreAnalysis).toBeDefined();
      expect(deepAnalysis.patterns).toBeDefined();
      expect(deepAnalysis.criticalChains).toBeDefined();
      expect(deepAnalysis.unusedCode).toBeDefined();
      expect(deepAnalysis.recommendations).toBeDefined();
    }
  });
});
