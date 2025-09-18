import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupThirdPartyFixtures } from '../helpers/third-party-fixture.js';
import { executeL2ThirdPartyImpact, executeL2ProgressiveThirdParty } from '../../src/tools/l2-third-party-impact.js';

describe('L2 Third-Party Impact Tool', () => {
  const TEST_URL = 'https://www.goal.com';
  const TIMEOUT = 120000; // 2 minutes per test

  let restoreFixtures: (() => void) | undefined;

  beforeAll(() => {
    restoreFixtures = setupThirdPartyFixtures();
  });

  afterAll(() => {
    restoreFixtures?.();
  });

  describe('executeL2ThirdPartyImpact', () => {
    it('should analyze third-party scripts', async () => {
      const result = await executeL2ThirdPartyImpact({
        url: TEST_URL,
        device: 'mobile',
        compareMode: 'analyze',
        gather: true,
      });

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      
      if (result.analysis) {
        const { summary, entities } = result.analysis;
        
        // Verify summary structure
        expect(summary).toHaveProperty('entityCount');
        expect(summary).toHaveProperty('totalMainThreadTime');
        expect(summary).toHaveProperty('totalBlockingTime');
        expect(summary).toHaveProperty('totalTransferSize');
        
        // Verify entities structure
        expect(Array.isArray(entities)).toBe(true);
        if (entities.length > 0) {
          const entity = entities[0];
          expect(entity).toHaveProperty('entity');
          expect(entity).toHaveProperty('mainThreadTime');
          expect(entity).toHaveProperty('blockingTime');
          expect(entity).toHaveProperty('transferSize');
          expect(entity).toHaveProperty('subRequests');
        }
      }
    }, TIMEOUT);

    it('should extract third-party domains', async () => {
      const result = await executeL2ThirdPartyImpact({
        url: TEST_URL,
        device: 'mobile',
        compareMode: 'domains',
        gather: false, // Use cached report if available
      });

      expect(result).toBeDefined();
      expect(result.domains).toBeDefined();
      expect(Array.isArray(result.domains)).toBe(true);
      
      if (result.domains && result.domains.length > 0) {
        // Verify domain format
        result.domains.forEach(domain => {
          expect(typeof domain).toBe('string');
          expect(domain.length).toBeGreaterThan(0);
        });
      }
    }, TIMEOUT);

    it('should compare performance with and without third-party scripts', async () => {
      const result = await executeL2ThirdPartyImpact({
        url: TEST_URL,
        device: 'mobile',
        compareMode: 'compare',
        gather: true,
      });

      expect(result).toBeDefined();
      expect(result.comparison).toBeDefined();
      
      if (result.comparison) {
        const { baseline, withThirdParty, impact } = result.comparison;
        
        // Verify baseline metrics
        expect(baseline).toHaveProperty('score');
        expect(baseline).toHaveProperty('fcp');
        expect(baseline).toHaveProperty('lcp');
        expect(baseline).toHaveProperty('tbt');
        expect(baseline).toHaveProperty('cls');
        
        // Verify withThirdParty metrics
        expect(withThirdParty).toHaveProperty('score');
        expect(withThirdParty).toHaveProperty('fcp');
        expect(withThirdParty).toHaveProperty('lcp');
        expect(withThirdParty).toHaveProperty('tbt');
        expect(withThirdParty).toHaveProperty('cls');
        
        // Verify impact deltas
        expect(impact).toHaveProperty('scoreDelta');
        expect(impact).toHaveProperty('fcpDelta');
        expect(impact).toHaveProperty('lcpDelta');
        expect(impact).toHaveProperty('tbtDelta');
        expect(impact).toHaveProperty('clsDelta');
        
        // Typically, blocking third-party scripts should improve performance
        expect(impact.scoreDelta).toBeGreaterThanOrEqual(0);
      }
      
      // Verify recommendations
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    }, TIMEOUT * 2); // Double timeout for comparison
  });

  describe('executeL2ProgressiveThirdParty', () => {
    it('should perform progressive blocking analysis', async () => {
      const result = await executeL2ProgressiveThirdParty({
        url: TEST_URL,
        device: 'mobile',
        maxIterations: 2, // Test only 2 iterations for speed
      });

      expect(result).toBeDefined();
      expect(result.iterations).toBeDefined();
      expect(Array.isArray(result.iterations)).toBe(true);
      
      // Verify each iteration
      result.iterations.forEach((iteration, index) => {
        expect(iteration).toHaveProperty('iteration');
        expect(iteration).toHaveProperty('blockedDomains');
        expect(iteration).toHaveProperty('score');
        expect(iteration).toHaveProperty('scoreDelta');
        expect(iteration).toHaveProperty('metrics');
        
        // Verify metrics structure
        expect(iteration.metrics).toHaveProperty('fcp');
        expect(iteration.metrics).toHaveProperty('lcp');
        expect(iteration.metrics).toHaveProperty('tbt');
        expect(iteration.metrics).toHaveProperty('cls');
        
        // Verify recommendation exists
        expect(iteration.recommendation).toBeDefined();
        
        // Blocked domains should increase with each iteration
        if (index > 0) {
          expect(iteration.blockedDomains.length).toBeGreaterThan(
            result.iterations[index - 1].blockedDomains.length
          );
        }
      });
      
      // Verify optimal blocking recommendation
      expect(result.optimalBlocking).toBeDefined();
      expect(Array.isArray(result.optimalBlocking)).toBe(true);
      
      // Verify recommendations
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    }, TIMEOUT * 3); // Triple timeout for progressive analysis
  });

  describe('Edge cases', () => {
    it('should handle sites with no third-party scripts', async () => {
      // Use a simple static site with minimal third-party scripts
      const result = await executeL2ThirdPartyImpact({
        url: 'https://example.com',
        device: 'mobile',
        compareMode: 'analyze',
        gather: true,
      });

      expect(result).toBeDefined();
      if (result.analysis) {
        expect(result.analysis.summary.entityCount).toBeGreaterThanOrEqual(0);
      }
    }, TIMEOUT);

    it('should handle invalid URLs gracefully', async () => {
      await expect(
        executeL2ThirdPartyImpact({
          url: 'not-a-valid-url',
          device: 'mobile',
          compareMode: 'analyze',
          gather: true,
        })
      ).rejects.toThrow();
    });

    it('should respect custom block domains', async () => {
      const customBlockDomains = ['doubleclick.net', 'google-analytics.com'];
      
      const result = await executeL2ThirdPartyImpact({
        url: TEST_URL,
        device: 'mobile',
        compareMode: 'compare',
        blockDomains: customBlockDomains,
        gather: true,
      });

      expect(result).toBeDefined();
      expect(result.comparison).toBeDefined();
      
      // Custom domains should be blocked in the comparison
      if (result.comparison) {
        expect(result.comparison.impact.scoreDelta).toBeGreaterThanOrEqual(0);
      }
    }, TIMEOUT * 2);
  });
});