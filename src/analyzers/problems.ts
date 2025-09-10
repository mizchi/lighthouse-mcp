/**
 * Lighthouse結果から問題を抽出する
 */

import type { LighthouseReport, Problem } from '../types';

export type ProblemSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ProblemCategory = 'performance' | 'accessibility' | 'best-practices' | 'seo';

/**
 * Extract problems from Lighthouse report
 */
export function detectProblems(report: LighthouseReport): Problem[] {
  const problems: Problem[] = [];

  if (!report || !report.audits) {
    return problems;
  }

  // Check each audit for problems
  Object.entries(report.audits).forEach(([auditId, audit]) => {
    if (audit && audit.score !== null && audit.score < 0.9) {
      const severity = getSeverity(audit.score);
      const category = getCategory(auditId);
      
      problems.push({
        id: auditId,
        category,
        severity,
        impact: (1 - audit.score) * 100,
        description: audit.description || audit.title,
        audit
      });
    }
  });

  // Sort by impact (highest first)
  return problems.sort((a, b) => b.impact - a.impact);
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