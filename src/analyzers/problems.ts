/**
 * Lighthouse結果から問題を抽出する
 */

import type { LighthouseReport, Problem } from '../types';
import { buildAuditWeightIndex } from '../core/scoring.js';

export type ProblemSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ProblemCategory = 'performance' | 'accessibility' | 'best-practices' | 'seo';

/**
 * Extract problems from Lighthouse report
 */
export function detectProblems(report: LighthouseReport): Problem[] {
  const problems: Problem[] = [];

  if (!report?.audits) {
    return problems;
  }

  const weightIndex = buildAuditWeightIndex(report);

  // Check each audit for problems
  Object.entries(report.audits).forEach(([auditId, audit]) => {
    if (!audit) {
      return;
    }

    const auditScore = typeof audit.score === 'number' ? audit.score : null;
    if (auditScore === null || auditScore >= 0.9) {
      return;
    }

    const severity = getSeverity(auditScore);
    const weightInfo = weightIndex[auditId];
    const category = weightInfo?.categoryId ?? getCategory(auditId);
    const normalizedWeight = weightInfo?.normalizedWeight ?? 0;
    const impact = (1 - auditScore) * 100;
    const weightedImpact = impact * normalizedWeight;

    problems.push({
      id: auditId,
      category,
      severity,
      impact,
      weight: normalizedWeight,
      weightedImpact,
      description: audit.description || audit.title,
      audit,
    });
  });

  // Sort by weighted impact (fall back to raw impact)
  return problems.sort((a, b) => {
    const aImpact = typeof a.weightedImpact === 'number' && a.weightedImpact > 0 ? a.weightedImpact : a.impact;
    const bImpact = typeof b.weightedImpact === 'number' && b.weightedImpact > 0 ? b.weightedImpact : b.impact;
    return bImpact - aImpact;
  });
}

function getSeverity(score: number): ProblemSeverity {
  if (score < 0.5) return 'critical';
  if (score < 0.7) return 'high';
  if (score < 0.9) return 'medium';
  return 'low';
}

function getCategory(auditId: string): string {
  // Simple categorization based on audit ID patterns
  if (auditId.includes('image') || auditId.includes('font') || auditId.includes('css')) {
    return 'resources';
  }
  if (auditId.includes('js') || auditId.includes('script') || auditId.includes('bootup')) {
    return 'javascript';
  }
  if (auditId.includes('network') || auditId.includes('server') || auditId.includes('cache')) {
    return 'network';
  }
  if (auditId.includes('render') || auditId.includes('paint') || auditId.includes('layout')) {
    return 'rendering';
  }
  return 'performance';
}
