# Lighthouse MCP アーキテクチャガイド

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
- `l1_collect_multi`: 複数URLの並列分析を実行
- `l1_collect_comparative`: 比較分析用のデータ収集

### L2 - データ分析層（Analysis Layer）
**定義**: 収集されたログ・レポートを直接分析する機能

**責務**:
- 定量的な分析とメトリクス計算
- パターン検出と自動分類
- 構造化された分析結果の生成

**ツール例**:
- `l2_critical_chain`: クリティカルリクエストチェーンの分析
- `l2_unused_code`: 未使用コードの検出と定量化
- `l2_deep_analysis`: パフォーマンスメトリクスの詳細分析
- `l2_score_analysis`: スコアと改善点の体系的分析
- `l2_third_party_impact`: サードパーティスクリプトの影響測定

### L3 - 解釈・推論層（Interpretation Layer）
**定義**: 人間による考察やAIモデルの思考を挟んで解釈が必要な処理のための機能

**責務**:
- 複雑な問題の診断と解決策の提案
- ビジネスインパクトの評価
- カスタム最適化戦略の立案
- コンテキストを考慮した優先順位付け

**ツール例**（将来実装予定）:
- `l3_optimization_strategy`: 最適化戦略の立案
- `l3_business_impact`: ビジネス影響の評価
- `l3_custom_recommendations`: カスタム推奨事項の生成
- `l3_architecture_review`: アーキテクチャレビューと提案

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

### L3ツールの実装（将来）
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
- AIモデルとの統合
- ビジネスメトリクスとの連携
- カスタムルールエンジンの実装

### クロスレイヤー機能
- パイプライン実行の自動化
- レイヤー間のキャッシング最適化
- リアルタイム分析の実装