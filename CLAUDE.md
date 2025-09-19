# Lighthouse MCP アーキテクチャガイド

## MCPツール使用ガイド

### ツールの選び方

#### 1. パフォーマンス分析をしたい時
- **まず使うツール**: `l2_deep_analysis` - 包括的な分析を実行
- **補足ツール**:
  - `l2_score_analysis` - スコアの詳細な内訳が必要な場合
  - `l2_weighted_issues` - 改善優先度を重み付けで評価したい場合

#### 2. 特定の問題を調査したい時
- **未使用コード**: `l2_unused_code` - CSS/JSの未使用部分を検出
- **サードパーティの影響**: `l2_third_party_impact` → `l2_progressive_third_party` - 段階的に詳細化
- **LCPの問題**: `l2_lcp_chain_analysis` - LCPに影響するリソースチェーンを分析
- **クリティカルパス**: `l2_critical_chain` または `l2_critical_chain_report` - ボトルネック特定

#### 3. 複数サイトを比較したい時
- `l2_site_comparison` - サイト間のパフォーマンス比較

#### 4. 高度な分析が必要な時
- `l3_action_plan_generator` - 複数のL2ツールから問題を集約し優先順位付きアクションプランを生成
- `l3_performance_budget` - パフォーマンス予算との適合性評価
- `l3_pattern_insights` - パターン認識による洞察
- `l3_database_query` - 履歴データのクエリ

### ツール実行の推奨フロー

```
1. データ収集（L1）
   ↓
   l1_collect_single または l1_batch_collect
   ↓
2. 基本分析（L2）
   ↓
   l2_deep_analysis（包括的）
   ↓
3. 問題別詳細分析（L2）
   ↓
   必要に応じて特化型ツールを実行
   ↓
4. 統合・解釈（L3）
   ↓
   l3_action_plan_generator で改善計画作成
```

### ツール選択のベストプラクティス

1. **初回分析時**: `l2_deep_analysis`から始める
2. **問題が特定されたら**: 特化型L2ツールで詳細調査
3. **改善提案が必要な時**: L3ツールで戦略的分析
4. **定期モニタリング**: `l3_database_query`で傾向分析

### 削除されたツール（重複のため）
- `l2-performance-analysis.ts` → `l2-deep-analysis.ts`を使用
- `l2-comprehensive-issues.ts` → `l2-weighted-issues.ts`を使用
- `l2-cpu-analysis.ts` → `l2-deep-analysis.ts`に統合済み

## ツール層構造（L1/L2/L3）

このプロジェクトでは、ツールを3つの層に分類して整理しています：

### L1 - データ収集層（Collection Layer）
**定義**: Lighthouseを直接実行してログ・レポートを収集する機能

**責務**:
- Lighthouseの実行とレポート生成
- 生データの収集と保存
- 基本的なデータ変換

**ツール例**:
- `l1_collect_single`: 単一URLのLighthouse分析を実行
- `l1_collect_batch`: 複数URLの並列分析を実行
- `l1_list_reports`: 保存済みレポートの一覧取得
- `l1_get_report`: 特定レポートの詳細取得

### L2 - データ分析層（Analysis Layer）
**定義**: 収集されたログ・レポートを直接分析する機能

**責務**:
- 定量的な分析とメトリクス計算
- パターン検出と自動分類
- 構造化された分析結果の生成

**現在利用可能なツール**:
- `l2_critical_chain`: クリティカルリクエストチェーンの分析
- `l2_critical_chain_report`: ボトルネック特化の分析レポート
- `l2_unused_code`: 未使用コードの検出と定量化
- `l2_deep_analysis`: パフォーマンスメトリクスの詳細分析（最も包括的）
- `l2_score_analysis`: スコアと改善点の体系的分析
- `l2_weighted_issues`: Lighthouse重み付けによる問題の優先順位付け
- `l2_third_party_impact`: サードパーティスクリプトの影響測定
- `l2_progressive_third_party`: サードパーティの段階的詳細分析
- `l2_lcp_chain_analysis`: LCP（Largest Contentful Paint）チェーン分析
- `l2_site_comparison`: 複数サイト間のパフォーマンス比較

### L3 - 解釈・推論層（Interpretation Layer）
**定義**: 人間による考察やAIモデルの思考を挟んで解釈が必要な処理のための機能

**責務**:
- 複雑な問題の診断と解決策の提案
- ビジネスインパクトの評価
- カスタム最適化戦略の立案
- コンテキストを考慮した優先順位付け

**現在利用可能なツール**:
- `l3_action_plan_generator`: 問題を集約して優先順位付きアクションプラン生成
- `l3_performance_budget`: パフォーマンス予算の評価と提案
- `l3_pattern_insights`: パターン認識による洞察生成
- `l3_database_query`: 履歴データのクエリと傾向分析

## 設計原則

### 1. 層の独立性
- 各層は独立して動作可能
- 上位層は下位層の結果を利用可能
- 層間の依存関係は単方向（L3 → L2 → L1）

### 2. データフロー
```
[URL] → L1（収集） → [生データ] → L2（分析） → [構造化データ] → L3（解釈） → [アクション可能な洞察]
```

### 3. 責任の分離
- **L1**: 「何が起きているか」を記録
- **L2**: 「なぜ起きているか」を分析
- **L3**: 「どう改善すべきか」を提案

## 実装ガイドライン

### L1ツールの実装
```typescript
// L1ツールは生データの収集に集中
export interface L1CollectParams {
  url: string;
  device?: 'mobile' | 'desktop';
  categories?: string[];
  blockDomains?: string[];  // データ収集時の制御
}
```

### L2ツールの実装
```typescript
// L2ツールは定量的な分析を提供
export interface L2AnalysisResult {
  metrics: Record<string, number>;  // 数値化された指標
  patterns: Pattern[];               // 検出されたパターン
  issues: Issue[];                   // 特定された問題
}
```

### L3ツールの実装
```typescript
// L3ツールは解釈と推奨を提供
export interface L3InterpretationResult {
  diagnosis: string;                 // 問題の診断
  recommendations: Recommendation[]; // 優先順位付けされた推奨事項
  rationale: string;                // 推論の根拠
}
```

## 開発時の注意事項

1. **新しいツールを追加する際**:
   - 適切な層（L1/L2/L3）を選択
   - 命名規則に従う（`l[層番号]_[機能名]`）
   - 層の責務を守る

2. **データの流れ**:
   - L1は外部システム（Lighthouse）とのインターフェース
   - L2はL1の出力を入力として受け取る
   - L3はL2の分析結果を基に高度な解釈を行う

3. **エラーハンドリング**:
   - 各層で適切なエラーハンドリングを実装
   - Result型を使用して型安全性を保証

## 今後の拡張計画

### L3層の実装
- AIモデルとの統合強化
- ビジネスメトリクスとの連携
- カスタムルールエンジンの実装

### クロスレイヤー機能
- パイプライン実行の自動化
- レイヤー間のキャッシング最適化
- リアルタイム分析の実装