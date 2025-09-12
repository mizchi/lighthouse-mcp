import { describe, it, expect } from 'vitest';
import { executeL2ThirdPartyImpact } from '../../src/tools/l2-third-party-impact.js';

describe('L2 Third-Party Impact - Simple Tests', () => {
  const TEST_URL = 'https://www.goal.com';
  const TIMEOUT = 60000; // 1 minute

  it('should analyze third-party impact and provide recommendations', async () => {
    // Step 1: Analyze third-party scripts
    const analysisResult = await executeL2ThirdPartyImpact({
      url: TEST_URL,
      device: 'mobile',
      compareMode: 'analyze',
      gather: true,
    });

    expect(analysisResult).toBeDefined();
    expect(analysisResult.analysis).toBeDefined();

    if (analysisResult.analysis) {
      const { summary, entities } = analysisResult.analysis;
      
      // Check summary metrics
      expect(summary.entityCount).toBeGreaterThan(0);
      expect(summary.totalBlockingTime).toBeGreaterThanOrEqual(0);
      expect(summary.totalTransferSize).toBeGreaterThan(0);
      
      // Check entities are sorted by blocking time (descending)
      if (entities.length > 1) {
        for (let i = 0; i < entities.length - 1; i++) {
          expect(entities[i].blockingTime).toBeGreaterThanOrEqual(entities[i + 1].blockingTime);
        }
      }
    }

    // Step 2: Get third-party domains
    const domainsResult = await executeL2ThirdPartyImpact({
      url: TEST_URL,
      device: 'mobile',
      compareMode: 'domains',
      gather: false, // Use cached report
    });

    expect(domainsResult.domains).toBeDefined();
    expect(Array.isArray(domainsResult.domains)).toBe(true);
    
    if (domainsResult.domains && domainsResult.domains.length > 0) {
      // All domains should be valid strings
      domainsResult.domains.forEach(domain => {
        expect(typeof domain).toBe('string');
        expect(domain).toMatch(/^[a-zA-Z0-9.-]+$/);
      });
    }

    // Step 3: Test selective blocking
    if (domainsResult.analysis?.entities && domainsResult.analysis.entities.length > 0) {
      // Get domains from top offenders
      const topOffenders = domainsResult.analysis.entities.slice(0, 3);
      const blockList: string[] = [];
      
      for (const entity of topOffenders) {
        for (const subRequest of entity.subRequests.slice(0, 2)) {
          try {
            const url = new URL(subRequest.url);
            if (!blockList.includes(url.hostname)) {
              blockList.push(url.hostname);
            }
          } catch {
            // Ignore invalid URLs
          }
        }
      }

      if (blockList.length > 0) {
        const compareResult = await executeL2ThirdPartyImpact({
          url: TEST_URL,
          device: 'mobile',
          compareMode: 'compare',
          blockDomains: blockList.slice(0, 5), // Block top 5 domains
          gather: true,
        });

        expect(compareResult.comparison).toBeDefined();
        
        if (compareResult.comparison) {
          const { baseline, withThirdParty, impact } = compareResult.comparison;
          
          // Baseline should have better or equal performance
          expect(baseline.score).toBeGreaterThanOrEqual(withThirdParty.score);
          expect(baseline.tbt).toBeLessThanOrEqual(withThirdParty.tbt);
          
          // Impact should show improvement (positive score delta)
          expect(impact.scoreDelta).toBeGreaterThanOrEqual(0);
          expect(impact.tbtDelta).toBeLessThanOrEqual(0); // Negative means improvement
        }

        // Should provide recommendations
        expect(compareResult.recommendations).toBeDefined();
        expect(Array.isArray(compareResult.recommendations)).toBe(true);
        expect(compareResult.recommendations.length).toBeGreaterThan(0);
      }
    }
  }, TIMEOUT * 2);

  it('should handle sites with minimal third-party scripts', async () => {
    const result = await executeL2ThirdPartyImpact({
      url: 'https://example.com',
      device: 'mobile',
      compareMode: 'analyze',
      gather: true,
    });

    expect(result).toBeDefined();
    
    // Even sites with no third-party scripts should return valid results
    if (result.analysis) {
      expect(result.analysis.summary).toBeDefined();
      expect(result.analysis.entities).toBeDefined();
      expect(Array.isArray(result.analysis.entities)).toBe(true);
    }
  }, TIMEOUT);
});