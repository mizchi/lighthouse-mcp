/**
 * ブラウザプール管理
 */

import { mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { cwd } from 'process';
import puppeteer, { Browser } from 'puppeteer';

/**
 * ブラウザプールの管理クラス
 */
export class BrowserPool {
  private browsers: Browser[] = [];
  private maxBrowsers: number;
  private availableBrowsers: Browser[] = [];
  private userDataBaseDir: string;
  private userDataDirs: Set<string> = new Set();
  private browserIndex = 0;

  constructor(maxBrowsers: number = 5, userDataDir?: string) {
    this.maxBrowsers = maxBrowsers;

    // user-data-dirのベースディレクトリを決定
    if (userDataDir) {
      // 明示的に指定された場合はそれを使用
      this.userDataBaseDir = resolve(userDataDir);
    } else if (process.env.LIGHTHOUSE_USER_DATA_DIR) {
      // 環境変数で指定された場合
      this.userDataBaseDir = resolve(process.env.LIGHTHOUSE_USER_DATA_DIR);
    } else {
      // デフォルトは現在のディレクトリの.lhdata
      this.userDataBaseDir = join(cwd(), '.lhdata');
    }
    
    try {
      mkdirSync(this.userDataBaseDir, { recursive: true });
    } catch {
      // ディレクトリが既に存在する場合は無視
    }

    // プロセス終了時にクリーンアップ（既にリスナーがある場合は設定しない）
    if (process.listenerCount('exit') === 0) {
      process.on('exit', () => this.closeAll());
    }
    if (process.listenerCount('SIGINT') === 0) {
      process.on('SIGINT', () => this.closeAll());
    }
  }

  async getBrowser(): Promise<Browser> {
    // 利用可能なブラウザがあれば再利用
    if (this.availableBrowsers.length > 0) {
      return this.availableBrowsers.pop()!;
    }

    // 最大数に達していない場合は新しいブラウザを作成
    if (this.browsers.length < this.maxBrowsers) {
      // 一意のuser-data-dirを作成
      const userDataDir = join(this.userDataBaseDir, `browser-${this.browserIndex++}`);
      mkdirSync(userDataDir, { recursive: true });
      this.userDataDirs.add(userDataDir);

      const browser = await puppeteer.launch({
        headless: true,
        userDataDir: userDataDir,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-extensions',
          `--user-data-dir=${userDataDir}`,
        ],
      });
      this.browsers.push(browser);
      return browser;
    }

    // 最大数に達している場合は利用可能になるまで待機
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.availableBrowsers.length > 0) {
          clearInterval(checkInterval);
          resolve(this.availableBrowsers.pop()!);
        }
      }, 100);
    });
  }

  async releaseBrowser(browser: Browser): Promise<void> {
    // ページをすべて閉じる
    const pages = await browser.pages();
    for (const page of pages) {
      if (page.url() !== 'about:blank') {
        await page.close();
      }
    }
    
    // 再利用のためにプールに戻す
    this.availableBrowsers.push(browser);
  }

  async closeAll(): Promise<void> {
    const closePromises = this.browsers.map(browser => browser.close());
    await Promise.all(closePromises);
    this.browsers = [];
    this.availableBrowsers = [];
    
    // user-data-dirをクリーンアップ
    for (const dir of this.userDataDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // クリーンアップエラーは無視
      }
    }
    this.userDataDirs.clear();
  }

  getActiveCount(): number {
    return this.browsers.length - this.availableBrowsers.length;
  }

  getTotalCount(): number {
    return this.browsers.length;
  }
}

// シングルトンインスタンス
let browserPoolInstance: BrowserPool | null = null;

/**
 * シングルトンのBrowserPoolインスタンスを取得
 */
export function getBrowserPool(maxBrowsers: number = 5, userDataDir?: string): BrowserPool {
  if (!browserPoolInstance) {
    browserPoolInstance = new BrowserPool(maxBrowsers, userDataDir);
  }
  return browserPoolInstance;
}

/**
 * BrowserPoolをリセット（主にテスト用）
 */
export async function resetBrowserPool(): Promise<void> {
  if (browserPoolInstance) {
    await browserPoolInstance.closeAll();
    browserPoolInstance = null;
  }
}