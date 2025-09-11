/**
 * Report Storage - Lighthouse生ログの保存と管理
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import type { LighthouseReport } from '../types/index.js';
import { Result, ok, err } from 'neverthrow';

export interface StorageConfig {
  baseDir?: string;
  maxReports?: number;
  ttlHours?: number;
}

export interface StoredReport {
  id: string;
  url: string;
  timestamp: number;
  device: 'mobile' | 'desktop';
  categories: string[];
  reportPath: string;
  hash: string;
}

export interface StorageIndex {
  reports: StoredReport[];
  version: string;
}

/**
 * レポートストレージ管理クラス
 */
export class ReportStorage {
  private baseDir: string;
  private maxReports: number;
  private ttlHours: number;
  private indexPath: string;

  constructor(config: StorageConfig = {}) {
    this.baseDir = config.baseDir || '.lhdata/reports';
    this.maxReports = config.maxReports || 100;
    this.ttlHours = config.ttlHours || 24;
    this.indexPath = join(this.baseDir, 'index.json');

    // ディレクトリを作成
    this.ensureDirectory();
  }

  /**
   * ディレクトリの存在を確認・作成
   */
  private ensureDirectory(): void {
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * URLとデバイスからハッシュを生成
   */
  private generateHash(url: string, device: string, categories: string[]): string {
    const data = `${url}:${device}:${categories.sort().join(',')}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * インデックスファイルを読み込み
   */
  private loadIndex(): StorageIndex {
    if (!existsSync(this.indexPath)) {
      return { reports: [], version: '1.0.0' };
    }

    try {
      const data = readFileSync(this.indexPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { reports: [], version: '1.0.0' };
    }
  }

  /**
   * インデックスファイルを保存
   */
  private saveIndex(index: StorageIndex): void {
    writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * 期限切れのレポートをクリーンアップ
   */
  private cleanup(index: StorageIndex): StorageIndex {
    const now = Date.now();
    const ttlMs = this.ttlHours * 60 * 60 * 1000;

    // 期限切れのレポートを削除
    const validReports = index.reports.filter(report => {
      if (now - report.timestamp > ttlMs) {
        // ファイルを削除
        try {
          if (existsSync(report.reportPath)) {
            // ファイル削除はここでは行わず、フラグを立てるだけ
            // 実際の削除は別のタイミングで行う
          }
        } catch {
          // エラーは無視
        }
        return false;
      }
      return true;
    });

    // 最大数を超えた場合は古いものから削除
    if (validReports.length > this.maxReports) {
      validReports.sort((a, b) => b.timestamp - a.timestamp);
      return {
        ...index,
        reports: validReports.slice(0, this.maxReports),
      };
    }

    return { ...index, reports: validReports };
  }

  /**
   * 既存のレポートを検索
   */
  findReport(
    url: string,
    device: 'mobile' | 'desktop',
    categories: string[],
    maxAgeHours?: number,
  ): Result<StoredReport | null, Error> {
    try {
      const index = this.loadIndex();
      const hash = this.generateHash(url, device, categories);
      const now = Date.now();
      const maxAgeMs = (maxAgeHours || this.ttlHours) * 60 * 60 * 1000;

      const report = index.reports.find(
        r =>
          r.hash === hash &&
          r.url === url &&
          r.device === device &&
          JSON.stringify(r.categories.sort()) === JSON.stringify(categories.sort()) &&
          now - r.timestamp <= maxAgeMs,
      );

      return ok(report || null);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * レポートを保存
   */
  saveReport(
    url: string,
    device: 'mobile' | 'desktop',
    categories: string[],
    report: LighthouseReport,
  ): Result<StoredReport, Error> {
    try {
      const index = this.loadIndex();
      const hash = this.generateHash(url, device, categories);
      const id = `${hash}-${Date.now()}`;
      const reportPath = join(this.baseDir, `${id}.json`);

      // レポートをファイルに保存
      writeFileSync(reportPath, JSON.stringify(report, null, 2));

      // インデックスに追加
      const storedReport: StoredReport = {
        id,
        url,
        timestamp: Date.now(),
        device,
        categories,
        reportPath,
        hash,
      };

      // 既存の同じハッシュのレポートを削除
      const filteredReports = index.reports.filter(r => r.hash !== hash);
      filteredReports.push(storedReport);

      // クリーンアップして保存
      const cleanedIndex = this.cleanup({ ...index, reports: filteredReports });
      this.saveIndex(cleanedIndex);

      return ok(storedReport);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 保存されたレポートを読み込み
   */
  loadReport(storedReport: StoredReport): Result<LighthouseReport, Error> {
    try {
      if (!existsSync(storedReport.reportPath)) {
        return err(new Error(`Report file not found: ${storedReport.reportPath}`));
      }

      const data = readFileSync(storedReport.reportPath, 'utf-8');
      const report = JSON.parse(data) as LighthouseReport;
      return ok(report);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * すべてのレポートを取得
   */
  getAllReports(): Result<StoredReport[], Error> {
    try {
      const index = this.loadIndex();
      return ok(index.reports);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * ストレージをクリア
   */
  clear(): Result<void, Error> {
    try {
      const index: StorageIndex = { reports: [], version: '1.0.0' };
      this.saveIndex(index);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * デフォルトのストレージインスタンス
 */
let defaultStorage: ReportStorage | null = null;

/**
 * デフォルトストレージを取得
 */
export function getDefaultStorage(config?: StorageConfig): ReportStorage {
  if (!defaultStorage) {
    defaultStorage = new ReportStorage(config);
  }
  return defaultStorage;
}