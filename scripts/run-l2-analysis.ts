#!/usr/bin/env tsx

import { executeL2WeightedIssues } from '../src/tools/l2-weighted-issues';
import { executeL2CPUAnalysis } from '../src/tools/l2-cpu-analysis';
import { executeL2ComprehensiveIssues } from '../src/tools/l2-comprehensive-issues';
import { executeL2UnusedCode } from '../src/tools/l2-unused-code';
import { executeL2CriticalChain } from '../src/tools/l2-critical-chain';
import { executeL2DeepAnalysis } from '../src/tools/l2-deep-analysis';
import fs from 'fs/promises';
import path from 'path';

// Get report file from command line or use default
const REPORT_FILE = process.argv[2] || 'latest-report.json';

async function runAllL2Analysis() {
  console.log(`📊 L2 Analysis Suite - Analyzing: ${REPORT_FILE}\n`);

  // Check if report file exists
  try {
    await fs.access(REPORT_FILE);
  } catch {
    console.error(`❌ Report file not found: ${REPORT_FILE}`);
    console.log('\nUsage: npm run analyze:l2 <report-file.json>');
    process.exit(1);
  }

  // Ensure reports directory exists
  try {
    await fs.mkdir('reports', { recursive: true });
  } catch {}

  // 1. l2_weighted_issues分析
  console.log('=== 1. l2_weighted_issues分析 ===');
  try {
    const weightedResult = await executeL2WeightedIssues({ reportId: REPORT_FILE });
    console.log('✓ l2_weighted_issues分析完了');

    // 結果をファイルに保存
    await fs.writeFile(
      path.join('reports', 'l2-weighted-issues-result.json'),
      JSON.stringify(weightedResult, null, 2)
    );

    // 簡単なサマリーを表示
    console.log(`Total Weighted Impact: ${weightedResult.totalWeightedImpact.toFixed(2)}`);
    console.log(`Impact Percentage: ${weightedResult.impactPercentage.toFixed(1)}%`);
    console.log(`Top Issue: ${weightedResult.topIssues[0]?.title || 'None'}`);
    console.log('');
  } catch (error) {
    console.error('❌ l2_weighted_issues分析でエラー:', error.message);
    console.log('');
  }

  // 2. l2_cpu_analysis分析
  console.log('=== 2. l2_cpu_analysis分析 ===');
  try {
    const cpuResult = await executeL2CPUAnalysis({ reportId: REPORT_FILE });
    console.log('✓ l2_cpu_analysis分析完了');

    await fs.writeFile(
      path.join('reports', 'l2-cpu-analysis-result.json'),
      JSON.stringify(cpuResult, null, 2)
    );

    console.log(`Total Blocking Time: ${cpuResult.summary.totalBlockingTime}ms`);
    console.log(`Main Thread Busy Time: ${cpuResult.summary.mainThreadBusyTime}ms`);
    console.log(`CPU Score: ${cpuResult.summary.cpuScore}`);
    console.log(`Severity: ${cpuResult.summary.severity}`);
    console.log('');
  } catch (error) {
    console.error('❌ l2_cpu_analysis分析でエラー:', error.message);
    console.log('');
  }

  // 3. l2_comprehensive_issues分析
  console.log('=== 3. l2_comprehensive_issues分析 ===');
  try {
    const comprehensiveResult = await executeL2ComprehensiveIssues({ reportId: REPORT_FILE });
    console.log('✓ l2_comprehensive_issues分析完了');

    await fs.writeFile(
      path.join('reports', 'l2-comprehensive-issues-result.json'),
      JSON.stringify(comprehensiveResult, null, 2)
    );

    console.log(`Total Issues: ${comprehensiveResult.totalIssues}`);
    console.log(`Critical Issues: ${comprehensiveResult.criticalIssues.length}`);
    console.log(`Categories with Issues: ${Object.keys(comprehensiveResult.categorySummary).length}`);
    console.log('');
  } catch (error) {
    console.error('❌ l2_comprehensive_issues分析でエラー:', error.message);
    console.log('');
  }

  // 4. l2_unused_code分析
  console.log('=== 4. l2_unused_code分析 ===');
  try {
    const unusedCodeResult = await executeL2UnusedCode({ reportId: REPORT_FILE });
    console.log('✓ l2_unused_code分析完了');

    await fs.writeFile(
      path.join('reports', 'l2-unused-code-result.json'),
      JSON.stringify(unusedCodeResult, null, 2)
    );

    console.log(`Total Wasted Bytes: ${unusedCodeResult.unusedCode.totalWastedBytes} bytes`);
    console.log(`Total Wasted Time: ${unusedCodeResult.unusedCode.totalWastedMs} ms`);
    console.log(`Files with unused code: ${unusedCodeResult.unusedCode.files.length}`);
    console.log('');
  } catch (error) {
    console.error('❌ l2_unused_code分析でエラー:', error.message);
    console.log('');
  }

  // 5. l2_critical_chain分析
  console.log('=== 5. l2_critical_chain分析 ===');
  try {
    const criticalChainResult = await executeL2CriticalChain({ reportId: REPORT_FILE });
    console.log('✓ l2_critical_chain分析完了');

    await fs.writeFile(
      path.join('reports', 'l2-critical-chain-result.json'),
      JSON.stringify(criticalChainResult, null, 2)
    );

    console.log(`Total Critical Chains: ${criticalChainResult.criticalChains.chains.length}`);
    console.log(`Max Chain Depth: ${criticalChainResult.criticalChains.longestChain.depth}`);
    console.log(`Total Blocking Time: ${criticalChainResult.criticalChains.longestChain.duration}ms`);
    console.log('');
  } catch (error) {
    console.error('❌ l2_critical_chain分析でエラー:', error.message);
    console.log('');
  }

  // 6. l2_deep_analysis分析
  console.log('=== 6. l2_deep_analysis分析 ===');
  try {
    const deepAnalysisResult = await executeL2DeepAnalysis({ reportId: REPORT_FILE });
    console.log('✓ l2_deep_analysis分析完了');

    await fs.writeFile(
      path.join('reports', 'l2-deep-analysis-result.json'),
      JSON.stringify(deepAnalysisResult, null, 2)
    );

    console.log(`Performance Score: ${deepAnalysisResult.analysis.performanceScore}`);
    console.log(`Total Issues: ${deepAnalysisResult.analysis.issues.length}`);
    console.log(`Critical Issues: ${deepAnalysisResult.analysis.issues.filter(i => i.severity === 'critical').length}`);
    console.log('');
  } catch (error) {
    console.error('❌ l2_deep_analysis分析でエラー:', error.message);
    console.log('');
  }

  console.log('\n✅ All L2 analyses complete!');
  console.log('\n📁 Output files saved to reports/ directory:');
  console.log('  • reports/l2-weighted-issues-result.json');
  console.log('  • reports/l2-cpu-analysis-result.json');
  console.log('  • reports/l2-comprehensive-issues-result.json');
  console.log('  • reports/l2-unused-code-result.json');
  console.log('  • reports/l2-critical-chain-result.json');
  console.log('  • reports/l2-deep-analysis-result.json');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAllL2Analysis()
    .then(() => {
      console.log('完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('エラー:', error);
      process.exit(1);
    });
}

export { runAllL2Analysis };