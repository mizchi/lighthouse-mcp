/**
 * Helpers for reasoning about Lighthouse scoring weights.
 *
 * The logic mirrors the default Lighthouse scoring implementation
 * (see tmp/lighthouse/core/scoring.js and default-config auditRefs).
 */

import type { LighthouseReport } from '../types/index.js';

export interface AuditWeightInfo {
  categoryId: string;
  weight: number;
  normalizedWeight: number;
}

/**
 * Build a lookup of audit weights keyed by audit id.
 */
export function buildAuditWeightIndex(report: LighthouseReport): Record<string, AuditWeightInfo> {
  const index: Record<string, AuditWeightInfo> = {};

  if (!report?.categories) {
    return index;
  }

  for (const [categoryId, category] of Object.entries(report.categories)) {
    const auditRefs = category?.auditRefs || [];
    if (!Array.isArray(auditRefs) || auditRefs.length === 0) {
      continue;
    }

    const totalWeight = auditRefs
      .map(ref => ref.weight || 0)
      .filter(weight => weight > 0)
      .reduce((sum, weight) => sum + weight, 0);

    for (const ref of auditRefs) {
      const rawWeight = ref.weight || 0;
      const normalizedWeight = totalWeight > 0 && rawWeight > 0 ? rawWeight / totalWeight : 0;

      index[ref.id] = {
        categoryId,
        weight: rawWeight,
        normalizedWeight,
      };
    }
  }

  return index;
}

/**
 * Retrieve weight information for a specific audit.
 */
export function getAuditWeightInfo(
  report: LighthouseReport,
  auditId: string,
): AuditWeightInfo | undefined {
  const index = buildAuditWeightIndex(report);
  return index[auditId];
}
