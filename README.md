# Lighthouse MCP (Model Context Protocol)

[![CI](https://github.com/mizchi/lighthouse-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/mizchi/lighthouse-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

LighthouseとModel Context Protocol (MCP)を統合した、Webアプリケーションの包括的なパフォーマンス分析ツールセットです。AIアシスタントや自動化ツールから利用可能な、構造化された分析機能を提供します。

## 📋 概要

本プロジェクトは、Google Lighthouseの強力な分析機能をMCP（Model Context Protocol）経由で提供し、AIアシスタントが自動的にWebサイトのパフォーマンス問題を検出・診断・改善提案できるようにします。

### 主な特徴

- **🏗️ 3層アーキテクチャ**: データ収集（L1）→ 分析（L2）→ 解釈（L3）の明確な責任分離
- **📊 包括的なパフォーマンス分析**: Core Web Vitalsを含む全メトリクスの詳細分析
- **🎯 高度な問題検出**: 自動的なパフォーマンス問題の特定と優先順位付け
- **💰 パフォーマンス予算管理**: 目標値の追跡と違反検出
- **🔍 パターン認識**: 複数サイト間の共通問題の特定
- **🤖 MCP統合**: AIアシスタントや自動化ツールとの標準化されたインターフェース
- **✅ 完全なテストカバレッジ**: ユニットテスト、統合テスト、E2Eテストによる品質保証

## 🚀 クイックスタート

### インストール

```bash
# グローバルインストール
npm install -g lighthouse-mcp

# プロジェクトへのインストール
npm install lighthouse-mcp

# 開発環境のセットアップ（pnpm推奨）
git clone https://github.com/mizchi/lighthouse-mcp.git
cd lighthouse-mcp
pnpm install
```

### 基本的な使用方法

```bash
# Webサイトの分析
lhmcp https://example.com

# MCPサーバーとして起動
lhmcp --mcp

# 詳細分析（クリティカルチェーン＋未使用コード）
lhmcp https://example.com --chains --unused --device desktop
```

## 🏗️ アーキテクチャ

### 3層構造の設計

```
┌─────────────────────────────────────────┐
│           L3 - 解釈層                    │
│  （AIによる洞察、戦略立案、推奨事項）      │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│           L2 - 分析層                    │
│  （定量分析、パターン検出、問題特定）      │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│           L1 - 収集層                    │
│  （Lighthouse実行、データ収集、保存）     │
└─────────────────────────────────────────┘
```

#### L1 - データ収集層 (Collection Layer)

Lighthouseを直接実行し、生データを収集する基盤層：

- **`l1_collect_single`**: 単一URLのLighthouse分析実行
- **`l1_collect_multi`**: 複数URLの並列分析
- **`l1_collect_comparative`**: 比較分析用データ収集
- **`l1_get_report`**: 保存されたレポートの取得
- **`l1_list_reports`**: レポート一覧の取得

#### L2 - データ分析層 (Analysis Layer)

収集されたデータを分析し、構造化された洞察を提供：

- **`l2_deep_analysis`**: 包括的なパフォーマンス問題の検出
- **`l2_critical_chain`**: クリティカルリクエストチェーンの分析
- **`l2_critical_chain_report`**: クリティカルチェーンの詳細レポート生成
- **`l2_unused_code`**: 未使用JavaScript/CSSの検出と定量化
- **`l2_third_party_impact`**: サードパーティスクリプトの影響測定
- **`l2_progressive_third_party`**: 段階的なサードパーティブロッキング分析
- **`l2_lcp_chain_analysis`**: LCP要素のクリティカルパス分析
- **`l2_score_analysis`**: スコアと改善機会の体系的分析
- **`l2_weighted_issues`**: 重み付けによる問題の優先順位付け
- **`l2_patterns`**: パフォーマンスパターンの検出

#### L3 - 解釈・推論層 (Intelligence Layer)

高度な解釈と戦略的な推奨を提供：

- **`l3_action_plan_generator`**: 実行可能なアクションプランの生成
- **`l3_performance_budget`**: パフォーマンス予算の管理と違反検出
- **`l3_pattern_insights`**: 複数分析結果からのパターン洞察

## 🔧 利用可能なツール

### 主要な分析ツール

| ツール名 | 検出可能な問題 | 主な用途 |
|---------|---------------|----------|
| `l2_deep_analysis` | LCP遅延、CLS問題、TBT増大、未使用リソース | 包括的な問題診断 |
| `l2_critical_chain` | レンダーブロッキングリソース、リクエストチェーン | 読み込み順序の最適化 |
| `l2_unused_code` | 未使用CSS/JS、デッドコード | バンドルサイズ削減 |
| `l2_third_party_impact` | サードパーティの影響、広告/分析の負荷 | 外部依存の最適化 |
| `l2_lcp_chain_analysis` | LCPボトルネック、画像最適化機会 | LCP改善戦略 |
| `l3_action_plan_generator` | 優先順位付きアクション、実装ガイド | 改善計画の立案 |

### 問題検出能力

本ツールセットは以下の問題を自動検出可能：

- **Core Web Vitals**
  - LCP > 4秒の遅延検出と原因特定
  - CLS > 0.25の視覚的不安定性
  - FID/INP > 300msの応答性問題

- **リソース最適化**
  - 未使用CSS/JavaScript（最大90%削減可能）
  - レンダーブロッキングリソース
  - 非効率なキャッシュ戦略

- **サードパーティの影響**
  - Google Analytics、Facebook SDK等の影響測定
  - 広告ネットワークの負荷分析
  - 段階的ブロッキングによる影響評価

## 💻 プログラマティック利用

### TypeScript/JavaScript

```typescript
import {
  executeL1Collect,
  executeL2DeepAnalysis,
  executeL3ActionPlanGenerator
} from 'lighthouse-mcp';

// 1. データ収集
const collectResult = await executeL1Collect({
  url: 'https://example.com',
  device: 'mobile',
  categories: ['performance']
});

// 2. 深層分析
const analysis = await executeL2DeepAnalysis({
  reportId: collectResult.reportId,
  includeChains: true,
  includeUnusedCode: true
});

// 3. アクションプラン生成
const actionPlan = await executeL3ActionPlanGenerator({
  reportId: collectResult.reportId,
  includeTools: ['deep', 'unused', 'weighted']
});

console.log('検出された問題:', analysis.analysis.problems);
console.log('推奨アクション:', actionPlan.actionPlan);
```

### MCP経由での利用

```javascript
// MCPクライアントからツールを呼び出し
const result = await client.callTool('l2_deep_analysis', {
  url: 'https://example.com',
  includeChains: true
});
```

## 🧪 テスト

プロジェクトは包括的なテストスイートを含んでいます：

```bash
# すべてのテストを実行
pnpm test

# ユニットテストのみ
pnpm test:unit

# 統合テストのみ
pnpm test:integration

# E2Eテスト（実際のLighthouse実行）
pnpm test:e2e

# カバレッジレポート付き
pnpm test:coverage
```

### テストフィクスチャ

`test/fixtures/problem-cases/`に実際の問題を再現するHTMLファイルを用意：

- `slow-lcp.html` - LCP遅延の検出テスト
- `high-cls.html` - CLS問題の検出テスト
- `third-party-heavy.html` - サードパーティ影響テスト
- `unused-code-heavy.html` - 未使用コード検出テスト
- `cpu-intensive-dom-css.html` - CPU負荷の高いDOM/CSSテスト

## 🔄 CI/CD

GitHub Actionsによる自動化されたCI/CDパイプライン：

```yaml
# .github/workflows/ci.yml
- Lint: コード品質チェック
- TypeCheck: 型安全性の検証
- Test: Node.js 18/20/22での互換性テスト
- Build: プロダクションビルド
- Integration: 統合テスト
- Lighthouse Test: 実際のLighthouse実行テスト
```

## 📁 プロジェクト構造

```
lighthouse-mcp/
├── src/
│   ├── analyzers/          # 分析モジュール
│   │   ├── criticalChain.ts    # クリティカルチェーン分析
│   │   ├── unusedCode.ts       # 未使用コード検出
│   │   ├── thirdParty.ts       # サードパーティ影響分析
│   │   ├── deepAnalysis.ts     # 包括的分析
│   │   └── ...
│   ├── core/              # コア機能
│   │   ├── lighthouse.ts       # Lighthouse実行
│   │   ├── browserPool.ts      # ブラウザ管理
│   │   ├── database.ts         # SQLiteストレージ
│   │   └── metrics.ts          # メトリクス抽出
│   ├── tools/             # MCPツール実装
│   │   ├── l1-*.ts            # L1: データ収集層
│   │   ├── l2-*.ts            # L2: 分析層
│   │   ├── l3-*.ts            # L3: 解釈層
│   │   └── utils/             # ユーティリティ
│   ├── types/             # TypeScript型定義
│   └── cli.ts             # CLIエントリポイント
├── test/                  # テストファイル
│   ├── unit/                  # ユニットテスト
│   ├── integration/           # 統合テスト
│   ├── e2e/                   # E2Eテスト
│   └── fixtures/              # テスト用データ
├── docs/                  # ドキュメント
├── .github/workflows/     # CI/CD設定
└── CLAUDE.md             # アーキテクチャガイド
```

## 📚 ドキュメント

- [Analysis Capabilities](./docs/analysis-capabilities.md) - 各ツールの詳細な分析能力
- [Problem-Tool Matrix](./docs/problem-tool-matrix.md) - 問題別の適切なツール選択ガイド
- [Tool Layers](./docs/tool-layers.md) - L1/L2/L3アーキテクチャの詳細
- [MCP Tools Catalog](./docs/MCP-TOOLS-CATALOG.md) - 全ツールのカタログ
- [CLAUDE.md](./CLAUDE.md) - 開発者向けアーキテクチャガイド

## 🛠️ 開発

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/mizchi/lighthouse-mcp.git
cd lighthouse-mcp

# 依存関係のインストール（pnpm推奨）
pnpm install

# ビルド
pnpm build

# 開発サーバー起動
pnpm dev
```

### 開発コマンド

```bash
# TypeScriptコンパイル
pnpm typecheck

# リンター実行
pnpm lint

# テスト監視モード
pnpm test:watch

# CLI開発実行
pnpm cli -- https://example.com
```

## 🔑 環境変数

```bash
# オプション：カスタムユーザーデータディレクトリ
LIGHTHOUSE_USER_DATA_DIR=.lhdata/custom

# オプション：デバッグモード
DEBUG=lighthouse:*

# CI環境フラグ
CI=true
```

## 📈 パフォーマンス改善実績

本ツールを使用した典型的な改善例：

- **LCP改善**: 8.5秒 → 2.1秒 (75%削減)
- **未使用コード削減**: 840KB → 120KB (85%削減)
- **サードパーティ影響**: TBT 1200ms → 300ms (75%削減)
- **パフォーマンススコア**: 35点 → 92点

## 🤝 コントリビューション

プルリクエストを歓迎します！以下のガイドラインに従ってください：

1. Issueを作成して機能や修正を提案
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. テストを追加（カバレッジ90%以上を維持）
4. 型チェックとリンターをパス (`pnpm typecheck && pnpm lint`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 👥 作者

- mizchi ([@mizchi](https://github.com/mizchi))

## 🙏 謝辞

- Google Lighthouse チーム
- Puppeteer 開発者
- MCP (Model Context Protocol) 仕様策定者
- すべてのコントリビューター

---

**注**: このプロジェクトは積極的に開発中です。機能や API は変更される可能性があります。