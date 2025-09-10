import type { LighthouseReport, CategoryResult } from '../types';

export interface AuditScoreDetail {
  id: string;
  title: string;
  score: number | null;
  weight: number;
  weightedScore: number;
  displayValue?: string;
  description: string;
  scoreDisplayMode: string;
}

export interface CategoryScoreBreakdown {
  categoryId: string;
  categoryTitle: string;
  score: number | null;
  rating?: 'good' | 'needs-improvement' | 'poor';
  totalWeight: number;
  totalWeightedScore: number;
  audits: AuditScoreDetail[];
  manualAudits: AuditScoreDetail[];
  notApplicableAudits: AuditScoreDetail[];
}

export interface ScoreAnalysis {
  categoryScores: {
    performance?: { score: number };
    accessibility?: { score: number };
    bestPractices?: { score: number };
    seo?: { score: number };
    pwa?: { score: number };
  };
  auditDetails: Array<{
    id: string;
    title: string;
    score: number | null;
    weight: number;
    impact: number;
    category: string;
  }>;
  categories?: Record<string, CategoryScoreBreakdown>;
  summary?: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
    pwa?: number;
  };
}

/**
 * Analyze Lighthouse report scores
 */
export function analyzeReport(report: LighthouseReport): ScoreAnalysis {
  const categories: Record<string, CategoryScoreBreakdown> = {};
  const summary: ScoreAnalysis['summary'] = {};
  const categoryScores: ScoreAnalysis['categoryScores'] = {};
  const auditDetails: ScoreAnalysis['auditDetails'] = [];

  if (!report || !report.categories) {
    return { categoryScores, auditDetails, categories, summary };
  }

  // Analyze each category
  Object.entries(report.categories).forEach(([categoryId, category]) => {
    if (!category) return;

    const breakdown = analyzeCategoryScore(report, categoryId, category);
    categories[categoryId] = breakdown;

    // Update category scores
    const score = (category.score || 0) * 100;
    if (categoryId === 'performance') {
      categoryScores.performance = { score };
      summary.performance = category.score || 0;
    }
    if (categoryId === 'accessibility') {
      categoryScores.accessibility = { score };
      summary.accessibility = category.score || 0;
    }
    if (categoryId === 'best-practices') {
      categoryScores.bestPractices = { score };
      summary.bestPractices = category.score || 0;
    }
    if (categoryId === 'seo') {
      categoryScores.seo = { score };
      summary.seo = category.score || 0;
    }
    if (categoryId === 'pwa') {
      categoryScores.pwa = { score };
      summary.pwa = category.score || 0;
    }

    // Collect audit details
    breakdown.audits.forEach(audit => {
      auditDetails.push({
        id: audit.id,
        title: audit.title,
        score: audit.score,
        weight: audit.weight,
        impact: audit.weight * (1 - (audit.score || 0)) * 100,
        category: categoryId
      });
    });
  });

  return { categoryScores, auditDetails, categories, summary };
}

/**
 * Analyze a single category score
 */
function analyzeCategoryScore(
  report: LighthouseReport,
  categoryId: string,
  category: CategoryResult
): CategoryScoreBreakdown {
  const audits: AuditScoreDetail[] = [];
  const manualAudits: AuditScoreDetail[] = [];
  const notApplicableAudits: AuditScoreDetail[] = [];
  
  let totalWeight = 0;
  let totalWeightedScore = 0;

  // Process audit refs
  if (category.auditRefs) {
    category.auditRefs.forEach(ref => {
      const audit = report.audits[ref.id];
      if (!audit) return;

      const weight = ref.weight || 0;
      const score = audit.score || 0;
      const weightedScore = score * weight;

      const detail: AuditScoreDetail = {
        id: ref.id,
        title: audit.title,
        score: audit.score,
        weight,
        weightedScore,
        displayValue: audit.displayValue,
        description: audit.description,
        scoreDisplayMode: audit.scoreDisplayMode
      };

      // Categorize audit
      if (audit.scoreDisplayMode === 'manual') {
        manualAudits.push(detail);
      } else if (audit.scoreDisplayMode === 'notApplicable' || audit.score === null) {
        notApplicableAudits.push(detail);
      } else {
        audits.push(detail);
        totalWeight += weight;
        totalWeightedScore += weightedScore;
      }
    });
  }

  // Determine rating
  let rating: 'good' | 'needs-improvement' | 'poor' | undefined;
  if (category.score !== null) {
    if (category.score >= 0.9) rating = 'good';
    else if (category.score >= 0.5) rating = 'needs-improvement';
    else rating = 'poor';
  }

  return {
    categoryId,
    categoryTitle: category.title,
    score: category.score,
    rating,
    totalWeight,
    totalWeightedScore,
    audits,
    manualAudits,
    notApplicableAudits
  };
}