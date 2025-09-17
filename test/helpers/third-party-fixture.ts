import { vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as collectModule from '../../src/tools/l1-collect-single.js';
import * as getReportModule from '../../src/tools/l1-get-report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadFixture = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, '..', 'fixtures', `${name}.json`), 'utf-8'));

const fixtureReports: Record<string, any> = {
  'goal-full': loadFixture('goal-full'),
  'goal-blocked': loadFixture('goal-blocked'),
  'example-minimal': loadFixture('example-minimal'),
};

export function setupThirdPartyFixtures(): () => void {
  const collectSpy = vi.spyOn(collectModule, 'executeL1Collect').mockImplementation(
    async (params: import('../../src/tools/l1-collect-single.js').L1CollectParams) => {
      const {
        url,
        device = 'mobile',
        categories = ['performance'],
        gather = false,
        blockDomains = [],
      } = params;

      // Mimic production URL validation
      try {
        new URL(url);
      } catch {
        throw new Error(`Invalid URL format: ${url}`);
      }

      let reportId = 'goal-full';
      if (url.includes('goal.com')) {
        reportId = blockDomains.length > 0 ? 'goal-blocked' : 'goal-full';
      } else if (url.includes('example.com')) {
        reportId = 'example-minimal';
      }

      return {
        reportId,
        url,
        device,
        categories,
        timestamp: Date.now(),
        cached: !gather,
      };
    }
  );

  const getSpy = vi.spyOn(getReportModule, 'executeL1GetReport').mockImplementation(
    async ({ reportId }: import('../../src/tools/l1-get-report.js').L1GetReportParams) => {
      const data = fixtureReports[reportId];
      if (!data) {
        throw new Error(`Fixture report not found: ${reportId}`);
      }

      return {
        reportId,
        data,
        metadata: {
          url: data.finalUrl ?? data.requestedUrl,
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now(),
        },
      };
    }
  );

  return () => {
    collectSpy.mockRestore();
    getSpy.mockRestore();
  };
}
