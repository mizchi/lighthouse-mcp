import type { LighthouseReport as LHReport } from '../types';
import { Result, err, ok } from 'neverthrow';
import { analyzeReport } from './scores';
import { detectProblems } from './problems';
import { detectPatterns } from './patterns';

/**
 * Lighthouseレポートから包括的な分析と最適化提案を生成
 *
 * This is the main entry point for performance analysis.
 * It provides a unified API that combines score analysis, problem detection, and fix generation.
 */
export class PerformanceAnalyzer {
  /**
   * レポートを分析して問題と修正提案を生成
   *
   * @param report - Lighthouse report to analyze
   * @returns Analysis result containing score analysis, detected problems, and suggested fixes
   */
  async analyze(report: LHReport): Promise<
    Result<
      {
        score: number;
        scoreAnalysis: ReturnType<typeof analyzeReport>;
        problems: ReturnType<typeof detectProblems>;
        patterns: ReturnType<typeof detectPatterns>;
      },
      Error
    >
  > {
    try {
      // バリデーション
      if (!report || !report.categories) {
        return err(new Error('Invalid report: missing required fields'));
      }

      // スコア分析
      const scoreAnalysis = analyzeReport(report);
      const score = report.categories.performance?.score || 0;

      // 問題検出
      const problems = detectProblems(report);

      // パターン検出
      const patterns = detectPatterns(report);

      return ok({
        score,
        scoreAnalysis,
        problems,
        patterns,
      });
    } catch (error) {
      return err(new Error(`Analysis failed: ${error}`));
    }
  }

}

/**
 * Convenience function for analyzing performance
 */
export function analyzePerformance(report: LHReport) {
  const scoreAnalysis = analyzeReport(report);
  const problems = detectProblems(report);
  const patterns = detectPatterns(report);
  const score = report.categories?.performance?.score || 0;
  
  // Extract metrics from audits
  const metrics: Record<string, unknown> = {};
  if (report.audits) {
    const lcpAudit = report.audits['largest-contentful-paint'];
    const fcpAudit = report.audits['first-contentful-paint'];
    const clsAudit = report.audits['cumulative-layout-shift'];
    const tbtAudit = report.audits['total-blocking-time'];
    const ttfbAudit = report.audits['server-response-time'];
    
    if (lcpAudit?.numericValue) metrics.lcp = lcpAudit.numericValue;
    if (fcpAudit?.numericValue) metrics.fcp = fcpAudit.numericValue;
    if (clsAudit?.numericValue) metrics.cls = clsAudit.numericValue;
    if (tbtAudit?.numericValue) metrics.tbt = tbtAudit.numericValue;
    if (ttfbAudit?.numericValue) metrics.ttfb = ttfbAudit.numericValue;
  }
  
  return {
    score,
    metrics,
    patterns,
    problems,
    scoreAnalysis
  };
}
