/**
 * Lighthouse実行エンジン - I/O操作
 */

import type { LighthouseConfig, LighthouseReport } from '../types/index.js';
import lighthouse from 'lighthouse';
import { Result, err, ok } from 'neverthrow';
import pLimit from 'p-limit';
import { Browser } from 'puppeteer';
import { createLighthouseConfig, normalizeLighthouseReport } from './runner.js';
import { getBrowserPool, resetBrowserPool } from './browserPool.js';

/**
 * Lighthouseを実行（ブラウザプールを使用）
 */
export async function runLighthouse(
  url: string,
  config: LighthouseConfig & { userDataDir?: string } = {},
): Promise<Result<LighthouseReport, Error>> {
  // ブラウザプールを取得
  const browserPool = getBrowserPool(config.maxBrowsers || 5, config.userDataDir);

  let browser: Browser | null = null;

  try {
    // ブラウザプールからブラウザを取得
    browser = await browserPool.getBrowser();

    // ブラウザのエンドポイントを取得
    const browserWSEndpoint = browser.wsEndpoint();
    const { port } = new URL(browserWSEndpoint);

    // Lighthouse設定を生成
    const lhConfig = createLighthouseConfig(config);
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
  config: LighthouseConfig & { userDataDir?: string } = {},
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