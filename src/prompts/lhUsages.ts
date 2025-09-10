/**
 * Lighthouse分析プロンプト生成
 * 各メトリクスの問題に対する具体的な調査手順を提供
 */

import type { LighthouseReport } from '../types';
import type { DeepAnalysisResult } from '../analyzers/deepAnalysis';

export interface MetricChecklistItem {
  metric: string;
  condition: string;
  checklist: string[];
  improvements: string[];
}

/**
 * Core Web Vitalsが悪い場合のチェックリスト
 */
export const CWV_CHECKLISTS: MetricChecklistItem[] = [
  {
    metric: 'LCP (Largest Contentful Paint)',
    condition: '> 2.5s (要改善) or > 4s (不良)',
    checklist: [
      '最大のコンテンツ要素を特定する（画像、動画、テキストブロック）',
      'サーバーレスポンスタイム（TTFB）を確認',
      'リソースの読み込み順序を確認（critical-request-chains）',
      'レンダリングをブロックしているリソースを特定',
      '画像の最適化状況を確認（フォーマット、サイズ、遅延読み込み）',
      'CDNの使用状況とキャッシュ設定を確認',
      'JavaScriptの実行時間とメインスレッドのブロッキング時間を確認',
      'Webフォントの読み込み戦略を確認'
    ],
    improvements: [
      '画像を最適化（WebP/AVIF形式、適切なサイズ、遅延読み込み）',
      'Critical CSSをインライン化',
      '不要なJavaScriptを削除または遅延読み込み',
      'サーバーレスポンスを高速化（CDN、キャッシュ、圧縮）',
      'リソースヒント（preconnect、preload）を使用',
      'サードパーティスクリプトを最適化'
    ]
  },
  {
    metric: 'FID/TBT (First Input Delay / Total Blocking Time)',
    condition: 'TBT > 200ms (要改善) or > 600ms (不良)',
    checklist: [
      'メインスレッドをブロックしている長いタスクを特定',
      'JavaScriptの実行時間を分析（bootup-time）',
      'サードパーティスクリプトの影響を確認',
      '未使用のJavaScriptコードを特定',
      'イベントハンドラーの複雑さを確認',
      'メインスレッドワークの内訳を確認',
      'コード分割の実装状況を確認'
    ],
    improvements: [
      '長いタスクを分割（タスクを50ms以下に）',
      '未使用のJavaScriptを削除',
      'コード分割を実装',
      'Web Workerで重い処理をオフロード',
      'サードパーティスクリプトを遅延読み込み',
      'メインスレッドの作業を最適化',
      'イベントハンドラーを最適化'
    ]
  },
  {
    metric: 'CLS (Cumulative Layout Shift)',
    condition: '> 0.1 (要改善) or > 0.25 (不良)',
    checklist: [
      'レイアウトシフトを引き起こしている要素を特定（layout-shift-elements）',
      '画像・動画・iframe・広告のサイズ指定を確認',
      'Webフォントの読み込みによるシフトを確認',
      '動的に挿入されるコンテンツを確認',
      'アニメーションの実装方法を確認',
      'CSSプロパティの変更を確認',
      'レスポンシブ画像の実装を確認'
    ],
    improvements: [
      '画像・動画・iframeに明示的なサイズを設定',
      'font-display: swapまたはoptionalを使用',
      '動的コンテンツ用の空間を事前に確保',
      'transformとopacityでアニメーションを実装',
      'コンテンツの挿入は既存コンテンツの下に',
      'aspect-ratioを使用してレスポンシブ要素のサイズを確保',
      '広告・埋め込みコンテンツに固定サイズを設定'
    ]
  },
  {
    metric: 'FCP (First Contentful Paint)',
    condition: '> 1.8s (要改善) or > 3s (不良)',
    checklist: [
      'サーバーレスポンスタイム（TTFB）を確認',
      'レンダリングブロックリソースを特定',
      'クリティカルパスのリソースを確認',
      'HTMLのサイズとパース時間を確認',
      'CSSの読み込みとパース時間を確認',
      'JavaScriptの初期実行を確認',
      'フォントの読み込み戦略を確認'
    ],
    improvements: [
      'サーバーレスポンスを最適化',
      'Critical CSSをインライン化',
      '非Critical CSSを遅延読み込み',
      'レンダリングブロックJavaScriptを削除',
      'HTMLを最小化',
      'HTTPキャッシュを活用',
      'CDNを使用'
    ]
  }
];

/**
 * その他の重要メトリクスのチェックリスト
 */
export const OTHER_METRICS_CHECKLISTS: MetricChecklistItem[] = [
  {
    metric: 'Speed Index',
    condition: '> 3.4s (要改善) or > 5.8s (不良)',
    checklist: [
      'ビューポート内のコンテンツ読み込み順序を確認',
      '画像の最適化状況を確認',
      'CSSとJavaScriptの影響を確認',
      'Webフォントの読み込み影響を確認'
    ],
    improvements: [
      'Above-the-foldコンテンツを優先的に読み込み',
      '画像を最適化（圧縮、適切なフォーマット）',
      'Critical CSSをインライン化',
      'JavaScriptの実行を最適化'
    ]
  },
  {
    metric: 'TTI (Time to Interactive)',
    condition: '> 3.8s (要改善) or > 7.3s (不良)',
    checklist: [
      'メインスレッドの静止期間を確認',
      '長いタスクの存在を確認',
      'ネットワークアクティビティを確認',
      'JavaScriptの実行パターンを確認'
    ],
    improvements: [
      'JavaScriptを分割して段階的に実行',
      '初期読み込みのJavaScriptを最小化',
      'コード分割を実装',
      'リソースの優先順位を最適化'
    ]
  },
  {
    metric: 'TTFB (Time to First Byte)',
    condition: '> 800ms (要改善) or > 1800ms (不良)',
    checklist: [
      'サーバーの処理時間を確認',
      'ネットワークレイテンシを確認',
      'リダイレクトチェーンを確認',
      'CDNの使用状況を確認',
      'キャッシュの実装を確認'
    ],
    improvements: [
      'サーバーサイドの処理を最適化',
      'CDNを使用して地理的に近いサーバーから配信',
      'HTTPキャッシュを実装',
      'リダイレクトを削減',
      'HTTP/2またはHTTP/3を使用'
    ]
  }
];

/**
 * 分析プロンプトを生成
 */
export function generateAnalysisPrompt(
  report: LighthouseReport,
  analysis: DeepAnalysisResult
): string {
  const prompts: string[] = [];
  
  // ヘッダー
  prompts.push('# Lighthouse パフォーマンス分析レポート\n');
  prompts.push(`URL: ${report.requestedUrl}`);
  prompts.push(`分析日時: ${new Date().toISOString()}\n`);
  
  // スコアサマリー
  prompts.push('## パフォーマンススコア');
  const perfScore = report.categories?.performance?.score;
  if (perfScore !== null && perfScore !== undefined) {
    const score = Math.round(perfScore * 100);
    prompts.push(`総合スコア: ${score}/100 ${getScoreEmoji(score)}`);
  }
  prompts.push('');
  
  // Core Web Vitals
  prompts.push('## Core Web Vitals 分析');
  prompts.push('');
  
  // LCP分析
  if (analysis.metrics.lcp) {
    const lcpValue = analysis.metrics.lcp;
    prompts.push(generateMetricAnalysis('LCP', lcpValue, 2500, 4000, CWV_CHECKLISTS[0]));
  }
  
  // TBT/FID分析
  if (analysis.metrics.tbt) {
    const tbtValue = analysis.metrics.tbt;
    prompts.push(generateMetricAnalysis('TBT', tbtValue, 200, 600, CWV_CHECKLISTS[1]));
  }
  
  // CLS分析
  if (analysis.metrics.cls !== undefined) {
    const clsValue = analysis.metrics.cls;
    prompts.push(generateMetricAnalysis('CLS', clsValue, 0.1, 0.25, CWV_CHECKLISTS[2]));
  }
  
  // FCP分析
  if (analysis.metrics.fcp) {
    const fcpValue = analysis.metrics.fcp;
    prompts.push(generateMetricAnalysis('FCP', fcpValue, 1800, 3000, CWV_CHECKLISTS[3]));
  }
  
  // 改善提案
  prompts.push('\n## 優先改善項目\n');
  
  // Critical Chains
  if (analysis.criticalChains.longestChain.length > 0) {
    prompts.push('### クリティカルリクエストチェーン');
    prompts.push('以下のリソースがレンダリングをブロックしています：');
    analysis.criticalChains.longestChain.slice(0, 5).forEach(chain => {
      prompts.push(`- ${chain.url} (${Math.round(chain.duration)}ms)`);
    });
    prompts.push('');
  }
  
  // Unused Code
  if (analysis.unusedCode.unusedPercent > 30) {
    prompts.push('### 未使用コード');
    prompts.push(`全体の${Math.round(analysis.unusedCode.unusedPercent)}%のコードが未使用です。`);
    prompts.push(`削減可能サイズ: ${Math.round(analysis.unusedCode.totalUnusedBytes / 1024)}KB`);
    prompts.push('');
  }
  
  // 推奨アクション
  prompts.push('## 推奨アクション\n');
  analysis.recommendations.slice(0, 10).forEach((rec, index) => {
    prompts.push(`${index + 1}. **${rec.description}**`);
    prompts.push(`   - 優先度: ${rec.priority}`);
    prompts.push(`   - 影響: ${rec.impact}`);
    prompts.push('');
  });
  
  // 次のステップ
  prompts.push('## 次のステップ\n');
  prompts.push('1. 上記の優先改善項目から着手');
  prompts.push('2. 各メトリクスのチェックリストに従って詳細調査');
  prompts.push('3. 改善実施後、再度Lighthouseで計測');
  prompts.push('4. 継続的なモニタリングの実施');
  
  return prompts.join('\n');
}

/**
 * メトリクス分析の詳細を生成
 */
function generateMetricAnalysis(
  metricName: string,
  value: number,
  goodThreshold: number,
  poorThreshold: number,
  checklistItem: MetricChecklistItem
): string {
  const status = getMetricStatus(value, goodThreshold, poorThreshold);
  const emoji = status === 'good' ? '🟢' : status === 'needs-improvement' ? '🟡' : '🔴';
  
  let result = `### ${emoji} ${metricName}: ${formatMetricValue(metricName, value)}\n\n`;
  
  if (status !== 'good') {
    result += '**調査チェックリスト:**\n';
    checklistItem.checklist.forEach(item => {
      result += `- [ ] ${item}\n`;
    });
    
    result += '\n**改善施策:**\n';
    checklistItem.improvements.forEach(item => {
      result += `- ${item}\n`;
    });
  } else {
    result += '✅ 良好な状態です\n';
  }
  
  result += '\n';
  return result;
}

/**
 * メトリクス値のフォーマット
 */
function formatMetricValue(metric: string, value: number): string {
  switch (metric) {
    case 'CLS':
      return value.toFixed(3);
    case 'LCP':
    case 'FCP':
    case 'TBT':
    case 'TTI':
    case 'TTFB':
      return `${value.toFixed(0)}ms`;
    default:
      return value.toString();
  }
}

/**
 * メトリクスのステータスを判定
 */
function getMetricStatus(
  value: number,
  goodThreshold: number,
  poorThreshold: number
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= goodThreshold) {
    return 'good';
  } else if (value <= poorThreshold) {
    return 'needs-improvement';
  } else {
    return 'poor';
  }
}

/**
 * スコアに応じた絵文字を取得
 */
function getScoreEmoji(score: number): string {
  if (score >= 90) return '🟢 良好';
  if (score >= 50) return '🟡 要改善';
  return '🔴 不良';
}

/**
 * MCPツール用の初回分析プロンプトを生成
 */
export function generateMCPInitialPrompt(url: string): string {
  return `
以下のWebサイトのパフォーマンス分析を開始します：
URL: ${url}

## 分析手順

1. **Lighthouse実行**
   - デバイス: mobile（モバイルファースト）
   - カテゴリ: performance, accessibility, best-practices, seo
   - 詳細分析: クリティカルチェーン、未使用コード

2. **Core Web Vitals評価**
   - LCP (Largest Contentful Paint) - 目標: < 2.5秒
   - FID/TBT (First Input Delay / Total Blocking Time) - 目標: < 200ms
   - CLS (Cumulative Layout Shift) - 目標: < 0.1

3. **問題の特定**
   - レンダリングブロックリソース
   - 未使用のJavaScript/CSS
   - 最適化されていない画像
   - サードパーティスクリプトの影響
   - キャッシュの問題

4. **改善提案の作成**
   - 優先度別の改善項目
   - 具体的な実装方法
   - 期待される改善効果

このプロンプトに基づいて、Lighthouse分析を実行し、
詳細なレポートと改善提案を提供してください。
`.trim();
}