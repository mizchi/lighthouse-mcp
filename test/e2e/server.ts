import express from "express";
import type { Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import type { Server } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TestServerResult {
  app: Express;
  server: Server;
  close: () => Promise<void>;
}

export function createTestServer(port: number = 3333): TestServerResult {
  const app = express();

  // 静的ファイルの配信（キャッシュなし - パフォーマンス問題をシミュレート）
  app.use(
    express.static(path.join(__dirname, "problematic-site"), {
      etag: false,
      lastModified: false,
      setHeaders: (res) => {
        // キャッシュを無効化（パフォーマンス問題）
        res.setHeader("Cache-Control", "no-store");
        // 圧縮を無効化（パフォーマンス問題）
        res.removeHeader("Content-Encoding");
      },
    })
  );

  // 遅いAPIエンドポイントをシミュレート
  app.get("/api/data", (_req: any, res: any) => {
    setTimeout(() => {
      res.json({ data: "Slow response" });
    }, 2000);
  });

  // サードパーティスクリプトをシミュレート
  app.get("/third-party-widget.js", (_req: any, res: any) => {
    setTimeout(() => {
      res.type("application/javascript");
      res.send(`
                console.log('Third party widget loaded');
                // Heavy third-party script
                for(let i = 0; i < 1000000; i++) {
                    Math.sqrt(i);
                }
            `);
    }, 1000);
  });

  const server = app.listen(port, () => {
    console.log(`Test server running at http://localhost:${port}`);
  });

  return {
    app,
    server,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
