/**
 * E2E Test Setup
 * Ensures tests run sequentially to avoid browser conflicts
 */

import { beforeAll, afterAll } from 'vitest';
import { getBrowserPool } from '../../src/core/browserPool.js';
import { rmSync, existsSync } from 'fs';

// Global setup for all E2E tests
beforeAll(async () => {
  console.log('E2E Test Suite: Starting');

  // Clean up any stale browser data
  const staleDirs = ['.lhdata/mcp', '.lhdata/browser-*'];
  for (const pattern of staleDirs) {
    try {
      if (existsSync(pattern)) {
        rmSync(pattern, { recursive: true, force: true });
      }
    } catch {}
  }
});

afterAll(async () => {
  console.log('E2E Test Suite: Cleaning up');

  // Ensure all browsers are closed
  const pool = getBrowserPool();
  await pool.closeAll();

  // Wait a bit for processes to clean up
  await new Promise(resolve => setTimeout(resolve, 500));
});

// Ensure tests run sequentially
export const testConfig = {
  concurrent: false,
  timeout: 120000, // 2 minutes for each test
};