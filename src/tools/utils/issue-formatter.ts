/**
 * Common issue formatting utilities
 */

export interface BaseIssue {
  title: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  description?: string;
  recommendation?: string;
  estimatedSavings?: {
    bytes?: number;
    ms?: number;
  };
}

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Calculate issue severity based on numeric value and thresholds
 */
export function calculateSeverity(
  value: number,
  thresholds: {
    critical: number;
    high: number;
    medium: number;
  },
  higherIsBetter: boolean = false
): IssueSeverity {
  if (higherIsBetter) {
    if (value <= thresholds.critical) return 'critical';
    if (value <= thresholds.high) return 'high';
    if (value <= thresholds.medium) return 'medium';
    return 'low';
  } else {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.high) return 'high';
    if (value >= thresholds.medium) return 'medium';
    return 'low';
  }
}

/**
 * Format bytes for human-readable display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format milliseconds for human-readable display
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Sort issues by severity and impact
 */
export function sortIssuesBySeverity<T extends BaseIssue>(issues: T[]): T[] {
  const severityOrder: Record<IssueSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };

  return [...issues].sort((a, b) => {
    const severityDiff = severityOrder[a.impact] - severityOrder[b.impact];
    if (severityDiff !== 0) return severityDiff;

    // Secondary sort by estimated savings if available
    const aSavings = (a.estimatedSavings?.ms || 0) + (a.estimatedSavings?.bytes || 0);
    const bSavings = (b.estimatedSavings?.ms || 0) + (b.estimatedSavings?.bytes || 0);
    return bSavings - aSavings;
  });
}

/**
 * Group issues by category
 */
export function groupIssuesByCategory<T extends BaseIssue>(
  issues: T[]
): Record<string, T[]> {
  return issues.reduce((groups, issue) => {
    const category = issue.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(issue);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Calculate total impact from issues
 */
export function calculateTotalImpact(issues: BaseIssue[]): {
  totalBytes: number;
  totalMs: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
} {
  return issues.reduce((acc, issue) => {
    acc.totalBytes += issue.estimatedSavings?.bytes || 0;
    acc.totalMs += issue.estimatedSavings?.ms || 0;

    switch (issue.impact) {
      case 'critical':
        acc.criticalCount++;
        break;
      case 'high':
        acc.highCount++;
        break;
      case 'medium':
        acc.mediumCount++;
        break;
      case 'low':
        acc.lowCount++;
        break;
    }

    return acc;
  }, {
    totalBytes: 0,
    totalMs: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0
  });
}