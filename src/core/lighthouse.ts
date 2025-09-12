/**
 * Lighthouse実行エンジン - I/O操作
 */

import type { LighthouseConfig, LighthouseReport } from '../types/index.js';
import lighthouse from 'lighthouse';
import { Result, err, ok } from 'neverthrow';
import pLimit from 'p-limit';
import { Browser } from 'puppeteer';
import { join } from 'path';
import { createLighthouseConfig, normalizeLighthouseReport } from './runner.js';
import { getBrowserPool, resetBrowserPool } from './browserPool.js';
import { getDefaultStorage } from './reportStorage.js';

/**
 * Lighthouseを実行（ブラウザプールを使用）
 */
export async function runLighthouse(
  url: string,
  config: LighthouseConfig & { userDataDir?: string; gather?: boolean; blockDomains?: string[] } = {},
): Promise<Result<LighthouseReport, Error>> {
  const { gather = false, blockDomains } = config;
  const storage = getDefaultStorage({ baseDir: config.userDataDir ? join(config.userDataDir, 'reports') : '.lhdata/reports' });

  // gather=false の場合、既存のレポートをチェック
  if (!gather) {
    const existingReport = storage.findReport(
      url,
      config.device || 'mobile',
      config.categories || ['performance'],
      1, // 1時間以内のレポートを使用
    );

    if (existingReport.isOk() && existingReport.value) {
      console.log(`Using cached report for ${url} (${existingReport.value.id})`);
      const loadedReport = storage.loadReport(existingReport.value);
      if (loadedReport.isOk()) {
        return ok(loadedReport.value);
      }
    }
  }

  // ブラウザプールを取得
  const browserPool = getBrowserPool(config.maxBrowsers || 5, config.userDataDir);

  let browser: Browser | null = null;

  try {
    // ブラウザプールからブラウザを取得
    browser = await browserPool.getBrowser();

    // ドメインブロック設定を Lighthouse の blockedUrlPatterns として設定
    let blockedUrlPatterns: string[] = [];
    if (blockDomains && blockDomains.length > 0) {
      // ドメインをURLパターンに変換
      blockedUrlPatterns = blockDomains.flatMap(domain => [
        `*://${domain}/*`,
        `*://*.${domain}/*`,
      ]);
    }

    // ブラウザのエンドポイントを取得
    const browserWSEndpoint = browser.wsEndpoint();
    const { port } = new URL(browserWSEndpoint);

    // Lighthouse設定を生成
    const lhConfig = createLighthouseConfig(config);
    
    // blockedUrlPatternsを設定に追加
    if (blockedUrlPatterns.length > 0) {
      lhConfig.settings = {
        ...lhConfig.settings,
        blockedUrlPatterns,
      };
    }
    
    const lighthouseOptions = {
      ...lhConfig,
      port: Number(port),
    };

    // Lighthouseを実行
    const result = await lighthouse(url, lighthouseOptions);
    if (!result?.lhr) {
      return err(new Error('Lighthouse failed to generate report'));
    }

    // レポートを正規化
    const report = normalizeLighthouseReport(result.lhr);
    
    // レポートを保存
    const saveResult = storage.saveReport(
      url,
      config.device || 'mobile',
      config.categories || ['performance'],
      report,
    );

    if (saveResult.isErr()) {
      console.warn(`Failed to save report: ${saveResult.error.message}`);
    } else {
      console.log(`Report saved: ${saveResult.value.id}`);
    }

    return ok(report);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  } finally {
    // ブラウザをプールに返却
    if (browser) {
      await browserPool.releaseBrowser(browser);
    }
  }
}

/**
 * 複数URLに対してLighthouseを並列実行
 */
export async function runLighthouseBatch(
  urls: string[],
  config: LighthouseConfig & { userDataDir?: string; gather?: boolean } = {},
): Promise<Result<LighthouseReport[], Error[]>> {
  // ブラウザプールを取得
  const browserPool = getBrowserPool(config.maxBrowsers || 5, config.userDataDir);
  
  // 並列度を制限
  const limit = pLimit(config.maxBrowsers || 5);

  // メモリ使用量を定期的にチェック
  const memoryCheckInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    
    console.log(`Memory: Heap ${heapUsedMB}/${heapTotalMB} MB, RSS ${rssMB} MB, Active browsers: ${browserPool.getActiveCount()}/${browserPool.getTotalCount()}`);
    
    // メモリ使用量が高い場合は警告
    if (heapUsedMB > 2000) {
      console.warn('⚠️ High memory usage detected. Consider reducing maxBrowsers.');
    }
  }, 5000);

  const results = await Promise.all(
    urls.map((url, index) =>
      limit(async () => {
        console.log(`[${index + 1}/${urls.length}] Processing ${url}`);
        
        const maxRetries = 3;
        let lastError: Error | null = null;
        
        for (let retry = 0; retry < maxRetries; retry++) {
          if (retry > 0) {
            console.log(`[${index + 1}/${urls.length}] Retry ${retry}/${maxRetries} for ${url}`);
            // リトライ前に少し待機
            await new Promise(resolve => setTimeout(resolve, 1000 * retry));
          }
          
          const result = await runLighthouse(url, config);
          
          if (result.isOk()) {
            console.log(`[${index + 1}/${urls.length}] ✓ Completed ${url}`);
            return result;
          }
          
          lastError = result.error;
          console.error(`[${index + 1}/${urls.length}] ✗ Failed ${url}:`, result.error.message);
        }
        
        return err(lastError || new Error(`Failed after ${maxRetries} retries`));
      }),
    ),
  );

  clearInterval(memoryCheckInterval);

  // 結果を分離
  const successes: LighthouseReport[] = [];
  const failures: Error[] = [];

  for (const result of results) {
    if (result.isOk()) {
      successes.push(result.value);
    } else {
      failures.push(result.error);
    }
  }

  if (successes.length === 0) {
    return err(failures);
  }

  return ok(successes);
}

/**
 * ブラウザプールをクリーンアップ
 */
export async function cleanupBrowserPool(): Promise<void> {
  await resetBrowserPool();
}