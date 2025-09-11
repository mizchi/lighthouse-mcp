/**
 * Lighthouse実行設定と結果の正規化 - 純粋関数
 */

import type { LighthouseConfig, LighthouseReport, LighthouseAudits, CategoryResult } from '../types/index.js';
import type * as LH from 'lighthouse/types/lh.d.ts';

/**
 * Lighthouse実行設定を生成
 */
export function createLighthouseConfig(config: LighthouseConfig): any {
  const settings = {
    formFactor: (config.formFactor || config.device || 'mobile') as 'mobile' | 'desktop',
    screenEmulation: config.screenEmulation || {
      mobile: config.device !== 'desktop',
      width: config.device === 'desktop' ? 1920 : 360,
      height: config.device === 'desktop' ? 1080 : 640,
      deviceScaleFactor: config.device === 'desktop' ? 1 : 2,
      disabled: false,
    },
    throttling: config.throttling || {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 4,
      requestLatencyMs: 0,
      downloadThroughputKbps: 10240,
      uploadThroughputKbps: 10240,
    },
    onlyCategories: config.onlyCategories || ['performance'],
  };

  return {
    logLevel: 'error' as const,
    output: 'json' as const,
    settings,
  };
}

/**
 * 結果を必要最小限のプロパティに正規化
 * 
 * Lighthouseの生の結果は巨大なので、必要な部分のみを抽出。
 * これにより、メモリ使用量を削減し、処理速度を向上させる。
 */
export function normalizeLighthouseReport(rawReport: LH.Result): LighthouseReport {
  return {
    requestedUrl: rawReport.requestedUrl || '',
    finalUrl: rawReport.finalUrl || rawReport.requestedUrl || '',
    fetchTime: rawReport.fetchTime,
    lighthouseVersion: rawReport.lighthouseVersion,
    userAgent: rawReport.userAgent,
    environment: rawReport.environment,
    categories: normalizeCategories(rawReport.categories),
    audits: normalizeAudits(rawReport.audits),
  };
}

/**
 * カテゴリーデータを正規化
 */
function normalizeCategories(categories: LH.Result['categories']): Record<string, CategoryResult> {
  if (!categories || typeof categories !== 'object') {
    return {};
  }

  const normalized: Record<string, CategoryResult> = {};

  for (const [key, value] of Object.entries(categories)) {
    if (value && typeof value === 'object') {
      normalized[key] = {
        id: value.id || key,
        title: value.title || key,
        score: normalizeScore(value.score),
        auditRefs: value.auditRefs || [],
      };
    }
  }

  return normalized;
}

function normalizeAudits(audits: LH.Result['audits']): LighthouseAudits {
  if (!audits || typeof audits !== 'object') {
    return {} as LighthouseAudits;
  }

  const normalized = {} as LighthouseAudits;

  for (const [key, value] of Object.entries(audits)) {
    if (value && typeof value === 'object') {
      const audit = value as LH.Audit.Result;
      normalized[key] = {
        id: audit.id || key,
        title: audit.title || '',
        description: audit.description || '',
        score: normalizeScore(audit.score),
        scoreDisplayMode: audit.scoreDisplayMode || 'numeric',
        displayValue: audit.displayValue,
        explanation: audit.explanation,
        errorMessage: audit.errorMessage,
        warnings: audit.warnings,
        details: audit.details,
        numericValue: audit.numericValue,
        numericUnit: audit.numericUnit,
        metricSavings: audit.metricSavings,
      };
    }
  }

  return normalized;
}

/**
 * スコアを正規化（0-1の範囲またはnull）
 */
function normalizeScore(score: number | null | undefined): number | null {
  if (score === null || score === undefined) {
    return null;
  }
  if (typeof score !== 'number') {
    return null;
  }
  // スコアを0-1の範囲に制限
  return Math.max(0, Math.min(1, score));
}