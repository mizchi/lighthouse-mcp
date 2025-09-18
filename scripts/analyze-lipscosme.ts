#!/usr/bin/env tsx

import { executeL1Collect } from '../src/tools/l1-collect-single.js';
import { executeL2UnusedCode } from '../src/tools/l2-unused-code.js';
import { executeL2CriticalChain } from '../src/tools/l2-critical-chain.js';
import { executeL2DeepAnalysis } from '../src/tools/l2-deep-analysis.js';

async function analyzeLipscosme() {
  console.log('Starting analysis of lipscosme.com...\n');

  try {
    // Step 1: Collect Lighthouse data
    console.log('Step 1: Collecting Lighthouse data...');
    const collectResult = await executeL1Collect({
      url: 'https://lipscosme.com/',
      device: 'mobile',
      categories: ['performance']
    });

    if (!collectResult.success || !collectResult.reportId) {
      throw new Error('Failed to collect Lighthouse data');
    }

    console.log(`✓ Data collected. Report ID: ${collectResult.reportId}`);
    console.log(`  Performance Score: ${collectResult.summary?.performanceScore || 'N/A'}`);
    console.log(`  LCP: ${collectResult.summary?.lcp ? (collectResult.summary.lcp / 1000).toFixed(1) + 's' : 'N/A'}`);
    console.log(`  FCP: ${collectResult.summary?.fcp ? (collectResult.summary.fcp / 1000).toFixed(1) + 's' : 'N/A'}`);
    console.log(`  CLS: ${collectResult.summary?.cls || 'N/A'}`);
    console.log(`  TBT: ${collectResult.summary?.tbt ? collectResult.summary.tbt + 'ms' : 'N/A'}\n`);

    // Step 2: Analyze unused code (particularly CSS)
    console.log('Step 2: Analyzing unused CSS and JavaScript...');
    const unusedCodeResult = await executeL2UnusedCode({
      reportId: collectResult.reportId
    });

    if (unusedCodeResult.analysis) {
      console.log(`✓ Unused Code Analysis:`);
      console.log(`  Total Unused CSS: ${(unusedCodeResult.analysis.totalUnusedCSSBytes / 1024).toFixed(0)}KB`);
      console.log(`  Total Unused JS: ${(unusedCodeResult.analysis.totalUnusedJSBytes / 1024).toFixed(0)}KB`);
      console.log(`  Total Wasted Bytes: ${(unusedCodeResult.analysis.totalWastedBytes / 1024).toFixed(0)}KB`);

      if (unusedCodeResult.analysis.unusedCSS.length > 0) {
        console.log('\n  Top Unused CSS Files:');
        unusedCodeResult.analysis.unusedCSS.slice(0, 3).forEach(css => {
          console.log(`    - ${css.url}`);
          console.log(`      Wasted: ${(css.wastedBytes / 1024).toFixed(0)}KB (${css.wastedPercent.toFixed(0)}%)`);
        });
      }
    }

    // Step 3: Analyze critical request chains
    console.log('\nStep 3: Analyzing critical request chains...');
    const criticalChainResult = await executeL2CriticalChain({
      reportId: collectResult.reportId
    });

    if (criticalChainResult.analysis) {
      console.log(`✓ Critical Chain Analysis:`);
      console.log(`  Chain Depth: ${criticalChainResult.analysis.chainDepth}`);
      console.log(`  Total Duration: ${(criticalChainResult.analysis.totalDuration / 1000).toFixed(1)}s`);
      console.log(`  Total Transfer Size: ${(criticalChainResult.analysis.totalTransferSize / 1024).toFixed(0)}KB`);

      if (criticalChainResult.analysis.renderBlockingResources.length > 0) {
        console.log('\n  Render-Blocking Resources:');
        criticalChainResult.analysis.renderBlockingResources.slice(0, 5).forEach(resource => {
          console.log(`    - ${resource.url}`);
          console.log(`      Wasted: ${(resource.wastedMs / 1000).toFixed(1)}s`);
        });
      }
    }

    // Step 4: Deep analysis for comprehensive insights
    console.log('\nStep 4: Performing deep analysis...');
    const deepAnalysisResult = await executeL2DeepAnalysis({
      reportId: collectResult.reportId,
      includeProblems: true,
      includeChains: true,
      includeThirdParty: true
    });

    if (deepAnalysisResult.analysis) {
      console.log(`✓ Deep Analysis Complete:`);

      // CSS-specific findings
      const cssProblems = deepAnalysisResult.analysis.problems.filter(p =>
        p.title.toLowerCase().includes('css') ||
        p.title.toLowerCase().includes('style') ||
        p.title.toLowerCase().includes('render')
      );

      if (cssProblems.length > 0) {
        console.log('\n  CSS-Related Problems:');
        cssProblems.forEach(problem => {
          console.log(`    - ${problem.title}`);
          console.log(`      Impact: ${problem.impact}`);
          if (problem.savings) {
            console.log(`      Potential Savings: ${problem.savings}`);
          }
        });
      }

      // Third-party impact
      if (deepAnalysisResult.analysis.thirdPartyImpact) {
        const cssThirdParty = deepAnalysisResult.analysis.thirdPartyImpact.items.filter(item =>
          item.entity.toLowerCase().includes('font') ||
          item.entity.toLowerCase().includes('cdn') ||
          item.entity.toLowerCase().includes('style')
        );

        if (cssThirdParty.length > 0) {
          console.log('\n  Third-Party CSS/Font Resources:');
          cssThirdParty.forEach(item => {
            console.log(`    - ${item.entity}`);
            console.log(`      Transfer Size: ${(item.transferSize / 1024).toFixed(0)}KB`);
            console.log(`      Blocking Time: ${item.blockingTime.toFixed(0)}ms`);
          });
        }
      }
    }

    // Final diagnosis
    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSIS: CSS Rendering Issues');
    console.log('='.repeat(60));

    // Calculate CSS impact
    const totalCSSWaste = unusedCodeResult.analysis?.totalUnusedCSSBytes || 0;
    const renderBlockingCSS = criticalChainResult.analysis?.renderBlockingResources
      .filter(r => r.url.includes('.css') || r.url.includes('style'))
      .reduce((sum, r) => sum + r.wastedMs, 0) || 0;

    console.log('\n📊 CSS Performance Impact:');
    console.log(`  - Unused CSS: ${(totalCSSWaste / 1024).toFixed(0)}KB`);
    console.log(`  - Render-blocking CSS time: ${(renderBlockingCSS / 1000).toFixed(1)}s`);
    console.log(`  - CSS Coverage: ${100 - (unusedCodeResult.analysis?.unusedCSS[0]?.wastedPercent || 0)}%`);

    console.log('\n🎯 Root Causes:');
    if (totalCSSWaste > 100000) {
      console.log('  1. Excessive unused CSS rules (over 100KB of waste)');
    }
    if (renderBlockingCSS > 1000) {
      console.log('  2. CSS files blocking initial render');
    }
    if (criticalChainResult.analysis && criticalChainResult.analysis.chainDepth > 3) {
      console.log('  3. Deep dependency chain for CSS resources');
    }
    if (unusedCodeResult.analysis && unusedCodeResult.analysis.unusedCSS.some(css => css.wastedPercent > 80)) {
      console.log('  4. CSS files with >80% unused rules');
    }

    console.log('\n💡 Recommendations:');
    console.log('  1. Implement Critical CSS inlining');
    console.log('  2. Use CSS splitting and lazy-loading for non-critical styles');
    console.log('  3. Remove unused CSS rules with PurgeCSS or similar tools');
    console.log('  4. Minify and compress CSS files');
    console.log('  5. Use CSS containment for complex layouts');
    console.log('  6. Consider CSS-in-JS or atomic CSS for better tree-shaking');

    // Estimate potential improvement
    const potentialSavings = totalCSSWaste + (renderBlockingCSS * 1000);
    console.log(`\n✨ Potential Performance Gain: ${(potentialSavings / 1024).toFixed(0)}KB reduction`);
    console.log(`   Estimated LCP improvement: ${(renderBlockingCSS / 1000 * 0.7).toFixed(1)}s`);

  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeLipscosme().then(() => {
  console.log('\n✅ Analysis complete!');
  process.exit(0);
});