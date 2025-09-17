import { describe, it, expect } from 'vitest';
import { detectProblems } from '../../../src/analyzers/problems.js';

const makeReport = () => ({
  categories: {
    performance: {
      auditRefs: [
        { id: 'first-contentful-paint', weight: 10 },
        { id: 'speed-index', weight: 20 },
      ],
    },
  },
  audits: {
    'first-contentful-paint': {
      score: 0.5,
      title: 'First Contentful Paint',
      description: 'Paint quickly',
    },
    'speed-index': {
      score: 0.8,
      title: 'Speed Index',
      description: 'Overall speed',
    },
    'third-party-summary': {
      score: 0.95,
      title: 'Third party summary',
      description: 'Informative',
    },
  },
});

describe('detectProblems', () => {
  it('calculates weighted impact using audit weights', () => {
    const report = makeReport();
    const result = detectProblems(report as any);

    const fcp = result.find(problem => problem.id === 'first-contentful-paint');
    const speedIndex = result.find(problem => problem.id === 'speed-index');

    expect(fcp).toBeDefined();
    expect(speedIndex).toBeDefined();

    expect(fcp?.weight).toBeCloseTo(10 / 30, 5);
    expect(speedIndex?.weight).toBeCloseTo(20 / 30, 5);

    const expectedFcpImpact = (1 - 0.5) * 100 * (10 / 30);
    const expectedSiImpact = (1 - 0.8) * 100 * (20 / 30);

    expect(fcp?.weightedImpact).toBeCloseTo(expectedFcpImpact, 5);
    expect(speedIndex?.weightedImpact).toBeCloseTo(expectedSiImpact, 5);

    // Highest weighted impact should come first
    expect(result[0].id).toBe('first-contentful-paint');
  });

  it('falls back to heuristic category when weight not defined', () => {
    const report = makeReport();
    delete (report.categories as any).performance;

    const result = detectProblems(report as any);
    const fcp = result.find(problem => problem.id === 'first-contentful-paint');

    expect(fcp?.category).toBe('rendering');
    expect(fcp?.weight).toBe(0);
    expect(fcp?.weightedImpact).toBe(0);
  });
});
