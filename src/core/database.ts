import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { LighthouseReport } from '../types/lighthouse.js';

export interface CrawlResult {
  id?: number;
  url: string;
  device: 'mobile' | 'desktop';
  timestamp: string;
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
  pwa_score: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  tti: number | null;
  si: number | null;
  report_json: string;
  error: string | null;
  created_at?: string;
}

export interface AnalysisResult {
  id?: number;
  crawl_id: number;
  tool_name: string;
  analysis_type: string;
  result_json: string;
  created_at?: string;
}

export class LighthouseDatabase {
  private db: DatabaseSync;
  private readonly dbPath: string;

  constructor(dbPath: string = '.lhdata/results.db') {
    this.dbPath = dbPath;
    this.ensureDirectory();
    this.db = new DatabaseSync(this.dbPath);
    this.initDatabase();
  }

  private ensureDirectory(): void {
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private initDatabase(): void {
    // Create crawl_results table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS crawl_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        device TEXT NOT NULL CHECK(device IN ('mobile', 'desktop')),
        timestamp TEXT NOT NULL,
        performance_score REAL,
        accessibility_score REAL,
        best_practices_score REAL,
        seo_score REAL,
        pwa_score REAL,
        fcp REAL,
        lcp REAL,
        cls REAL,
        tbt REAL,
        tti REAL,
        si REAL,
        report_json TEXT NOT NULL,
        error TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(url, device, timestamp)
      )
    `);

    // Create analysis_results table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crawl_id INTEGER NOT NULL,
        tool_name TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        result_json TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (crawl_id) REFERENCES crawl_results(id) ON DELETE CASCADE,
        UNIQUE(crawl_id, tool_name, analysis_type)
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_crawl_url ON crawl_results(url);
      CREATE INDEX IF NOT EXISTS idx_crawl_device ON crawl_results(device);
      CREATE INDEX IF NOT EXISTS idx_crawl_timestamp ON crawl_results(timestamp);
      CREATE INDEX IF NOT EXISTS idx_crawl_performance ON crawl_results(performance_score);
      CREATE INDEX IF NOT EXISTS idx_analysis_crawl ON analysis_results(crawl_id);
      CREATE INDEX IF NOT EXISTS idx_analysis_tool ON analysis_results(tool_name);
    `);
  }

  /**
   * Save a Lighthouse report to the database
   */
  saveCrawlResult(report: LighthouseReport, device: 'mobile' | 'desktop' = 'mobile'): number {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO crawl_results (
        url, device, timestamp,
        performance_score, accessibility_score, best_practices_score, seo_score, pwa_score,
        fcp, lcp, cls, tbt, tti, si,
        report_json, error
      ) VALUES (
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?
      )
    `);

    const categories = report.categories || {};
    const audits = report.audits || {};

    const result = stmt.run(
      report.finalUrl || report.requestedUrl,
      device,
      report.fetchTime,
      categories.performance?.score ?? null,
      categories.accessibility?.score ?? null,
      categories['best-practices']?.score ?? null,
      categories.seo?.score ?? null,
      categories.pwa?.score ?? null,
      audits['first-contentful-paint']?.numericValue ?? null,
      audits['largest-contentful-paint']?.numericValue ?? null,
      audits['cumulative-layout-shift']?.numericValue ?? null,
      audits['total-blocking-time']?.numericValue ?? null,
      audits['interactive']?.numericValue ?? null,
      audits['speed-index']?.numericValue ?? null,
      JSON.stringify(report),
      report.runtimeError?.message ?? null,
    );

    return Number(result.lastInsertRowId);
  }

  /**
   * Save an analysis result
   */
  saveAnalysisResult(
    crawlId: number,
    toolName: string,
    analysisType: string,
    result: any
  ): number {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO analysis_results (
        crawl_id, tool_name, analysis_type, result_json
      ) VALUES (
        ?, ?, ?, ?
      )
    `);

    const insertResult = stmt.run(
      crawlId,
      toolName,
      analysisType,
      JSON.stringify(result),
    );

    return insertResult.lastInsertRowId as number;
  }

  /**
   * Get crawl results by URL
   */
  getCrawlsByUrl(url: string, limit: number = 10): CrawlResult[] {
    const stmt = this.db.prepare(`
      SELECT * FROM crawl_results
      WHERE url = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(url, limit) as CrawlResult[];
  }

  /**
   * Get latest crawl result for a URL and device
   */
  getLatestCrawl(url: string, device: 'mobile' | 'desktop' = 'mobile'): CrawlResult | null {
    const stmt = this.db.prepare(`
      SELECT * FROM crawl_results
      WHERE url = ? AND device = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    return stmt.get(url, device) as CrawlResult | null;
  }

  /**
   * Get analysis results for a crawl
   */
  getAnalysisResults(crawlId: number): AnalysisResult[] {
    const stmt = this.db.prepare(`
      SELECT * FROM analysis_results
      WHERE crawl_id = ?
      ORDER BY created_at DESC
    `);

    return stmt.all(crawlId) as AnalysisResult[];
  }

  /**
   * Get performance trends for a URL
   */
  getPerformanceTrends(
    url: string,
    device: 'mobile' | 'desktop' = 'mobile',
    days: number = 30
  ): CrawlResult[] {
    const stmt = this.db.prepare(`
      SELECT * FROM crawl_results
      WHERE url = ? 
        AND device = ?
        AND datetime(timestamp) >= datetime('now', '-' || ? || ' days')
      ORDER BY timestamp ASC
    `);

    return stmt.all(url, device, days) as CrawlResult[];
  }

  /**
   * Get all unique URLs in the database
   */
  getAllUrls(): string[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT url FROM crawl_results
      ORDER BY url
    `);

    return stmt.all().map((row: any) => row.url);
  }

  /**
   * Get crawl statistics
   */
  getStatistics(): {
    totalCrawls: number;
    uniqueUrls: number;
    avgPerformanceScore: number;
    recentCrawls: CrawlResult[];
  } {
    const totalCrawls = this.db
      .prepare('SELECT COUNT(*) as count FROM crawl_results')
      .get() as { count: number };

    const uniqueUrls = this.db
      .prepare('SELECT COUNT(DISTINCT url) as count FROM crawl_results')
      .get() as { count: number };

    const avgPerformance = this.db
      .prepare('SELECT AVG(performance_score) as avg FROM crawl_results WHERE performance_score IS NOT NULL')
      .get() as { avg: number };

    const recentCrawls = this.db
      .prepare(`
        SELECT * FROM crawl_results
        ORDER BY created_at DESC
        LIMIT 10
      `)
      .all() as CrawlResult[];

    return {
      totalCrawls: totalCrawls.count,
      uniqueUrls: uniqueUrls.count,
      avgPerformanceScore: avgPerformance.avg || 0,
      recentCrawls,
    };
  }

  /**
   * Clean old records
   */
  cleanOldRecords(daysToKeep: number = 90): number {
    const stmt = this.db.prepare(`
      DELETE FROM crawl_results
      WHERE datetime(created_at) < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(daysToKeep);
    return result.changes;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Execute a raw SQL query (for advanced use cases)
   */
  query(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }
}