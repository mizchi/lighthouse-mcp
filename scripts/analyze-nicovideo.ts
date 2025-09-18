#!/usr/bin/env tsx

import { executeL1Collect } from '../src/tools/l1-collect-single.js';
import { executeL2ComprehensiveIssues } from '../src/tools/l2-comprehensive-issues.js';
import { executeL2UnusedCode } from '../src/tools/l2-unused-code.js';
import { executeL2CriticalChain } from '../src/tools/l2-critical-chain.js';
import { executeL2ThirdPartyImpact } from '../src/tools/l2-third-party-impact.js';
import { executeL3PerformanceBudget } from '../src/tools/l3-performance-budget.js';
import { executeL2DeepAnalysis } from '../src/tools/l2-deep-analysis.js';

async function analyzeNicovideo() {
  console.log('🎬 Starting comprehensive analysis of nicovideo.jp...\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Collect Lighthouse data
    console.log('\n📊 Step 1: Collecting Lighthouse data...');
    console.log('-' .repeat(40));

    const collectResult = await executeL1Collect({
      url: 'https://www.nicovideo.jp/',
      device: 'mobile',
      categories: ['performance', 'accessibility', 'best-practices'],
      throttling: {
        cpuSlowdown: 4,
        requestLatency: 150,
        downloadThroughput: 1638400, // 1.6 Mbps
        uploadThroughput: 675000 // 675 Kbps
      }
    });

    if (!collectResult.success || !collectResult.reportId) {
      throw new Error('Failed to collect Lighthouse data');
    }

    console.log(`✅ Data collected successfully!`);
    console.log(`   Report ID: ${collectResult.reportId}`);
    console.log(`   Performance Score: ${collectResult.summary?.performanceScore || 'N/A'}/100`);
    console.log(`   Core Web Vitals:`);
    console.log(`   - LCP: ${collectResult.summary?.lcp ? (collectResult.summary.lcp / 1000).toFixed(2) + 's' : 'N/A'}`);
    console.log(`   - FCP: ${collectResult.summary?.fcp ? (collectResult.summary.fcp / 1000).toFixed(2) + 's' : 'N/A'}`);
    console.log(`   - CLS: ${collectResult.summary?.cls?.toFixed(3) || 'N/A'}`);
    console.log(`   - TBT: ${collectResult.summary?.tbt ? collectResult.summary.tbt + 'ms' : 'N/A'}`);

    // Step 2: Comprehensive issue detection
    console.log('\n🔍 Step 2: Detecting comprehensive issues...');
    console.log('-' .repeat(40));

    const issuesResult = await executeL2ComprehensiveIssues({
      reportId: collectResult.reportId
    });

    console.log(`✅ Found ${issuesResult.summary.totalIssues} issues:`);
    console.log(`   - Critical: ${issuesResult.summary.criticalCount}`);
    console.log(`   - High: ${issuesResult.summary.highCount}`);
    console.log(`   - Medium: ${issuesResult.summary.mediumCount}`);
    console.log(`   - Low: ${issuesResult.summary.lowCount}`);

    // Display top critical issues
    const criticalIssues = issuesResult.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      console.log('\n   🚨 Critical Issues:');
      criticalIssues.slice(0, 3).forEach(issue => {
        console.log(`      - ${issue.title}`);
        console.log(`        ${issue.description}`);
        if (issue.impact.value) {
          const unit = issue.impact.unit || '';
          const value = unit.includes('KB')
            ? (issue.impact.value / 1024).toFixed(0)
            : issue.impact.value;
          console.log(`        Impact: ${value}${unit}`);
        }
      });
    }

    // Step 3: Analyze unused code
    console.log('\n📦 Step 3: Analyzing unused code...');
    console.log('-' .repeat(40));

    const unusedCodeResult = await executeL2UnusedCode({
      reportId: collectResult.reportId
    });

    if (unusedCodeResult.analysis) {
      const totalWasted = unusedCodeResult.analysis.totalWastedBytes;
      const cssWasted = unusedCodeResult.analysis.totalUnusedCSSBytes;
      const jsWasted = unusedCodeResult.analysis.totalUnusedJSBytes;

      console.log(`✅ Unused Code Analysis:`);
      console.log(`   Total Wasted: ${(totalWasted / 1024).toFixed(0)}KB`);
      console.log(`   - CSS: ${(cssWasted / 1024).toFixed(0)}KB (${((cssWasted/totalWasted)*100).toFixed(0)}%)`);
      console.log(`   - JavaScript: ${(jsWasted / 1024).toFixed(0)}KB (${((jsWasted/totalWasted)*100).toFixed(0)}%)`);

      // Top unused files
      if (unusedCodeResult.analysis.unusedCSS.length > 0) {
        console.log('\n   Top Unused CSS Files:');
        unusedCodeResult.analysis.unusedCSS.slice(0, 3).forEach(file => {
          const filename = file.url.split('/').pop()?.split('?')[0] || file.url;
          console.log(`      - ${filename}: ${(file.wastedBytes / 1024).toFixed(0)}KB (${file.wastedPercent.toFixed(0)}% unused)`);
        });
      }

      if (unusedCodeResult.analysis.unusedJS.length > 0) {
        console.log('\n   Top Unused JS Files:');
        unusedCodeResult.analysis.unusedJS.slice(0, 3).forEach(file => {
          const filename = file.url.split('/').pop()?.split('?')[0] || file.url;
          console.log(`      - ${filename}: ${(file.wastedBytes / 1024).toFixed(0)}KB (${file.wastedPercent.toFixed(0)}% unused)`);
        });
      }
    }

    // Step 4: Critical request chains
    console.log('\n⛓️ Step 4: Analyzing critical request chains...');
    console.log('-' .repeat(40));

    const criticalChainResult = await executeL2CriticalChain({
      reportId: collectResult.reportId
    });

    if (criticalChainResult.analysis) {
      console.log(`✅ Critical Chain Analysis:`);
      console.log(`   Chain Depth: ${criticalChainResult.analysis.chainDepth}`);
      console.log(`   Total Duration: ${(criticalChainResult.analysis.totalDuration / 1000).toFixed(2)}s`);
      console.log(`   Total Transfer Size: ${(criticalChainResult.analysis.totalTransferSize / 1024).toFixed(0)}KB`);
      console.log(`   Critical Requests: ${criticalChainResult.analysis.criticalRequests}`);

      if (criticalChainResult.analysis.renderBlockingResources.length > 0) {
        console.log('\n   Render-Blocking Resources:');
        criticalChainResult.analysis.renderBlockingResources.slice(0, 3).forEach(resource => {
          const filename = resource.url.split('/').pop()?.split('?')[0] || 'resource';
          console.log(`      - ${filename}: ${(resource.wastedMs / 1000).toFixed(2)}s wasted`);
        });
      }

      if (criticalChainResult.analysis.bottlenecks.length > 0) {
        console.log('\n   Top Bottlenecks:');
        criticalChainResult.analysis.bottlenecks.slice(0, 3).forEach(bottleneck => {
          console.log(`      - ${bottleneck.type}: ${bottleneck.description}`);
          console.log(`        Impact: ${(bottleneck.impact / 1000).toFixed(2)}s`);
        });
      }
    }

    // Step 5: Third-party impact
    console.log('\n🌐 Step 5: Analyzing third-party impact...');
    console.log('-' .repeat(40));

    const thirdPartyResult = await executeL2ThirdPartyImpact({
      reportId: collectResult.reportId
    });

    if (thirdPartyResult.analysis && thirdPartyResult.analysis.summary) {
      const summary = thirdPartyResult.analysis.summary;
      console.log(`✅ Third-Party Impact:`);
      console.log(`   Total Third-Party Resources: ${summary.totalThirdPartyRequests}`);
      console.log(`   Total Transfer Size: ${(summary.totalThirdPartyBytes / 1024).toFixed(0)}KB`);
      console.log(`   Main Thread Blocking: ${summary.totalBlockingTime.toFixed(0)}ms`);

      if (thirdPartyResult.analysis.byEntity && thirdPartyResult.analysis.byEntity.length > 0) {
        console.log('\n   Top Third-Party Entities:');
        thirdPartyResult.analysis.byEntity.slice(0, 5).forEach(entity => {
          console.log(`      - ${entity.entity}:`);
          console.log(`        Size: ${(entity.transferSize / 1024).toFixed(0)}KB`);
          console.log(`        Blocking: ${entity.blockingTime.toFixed(0)}ms`);
          console.log(`        Requests: ${entity.requestCount}`);
        });
      }
    }

    // Step 6: Performance budget analysis
    console.log('\n💰 Step 6: Analyzing performance budget...');
    console.log('-' .repeat(40));

    const budgetResult = await executeL3PerformanceBudget({
      reportId: collectResult.reportId,
      budget: {
        lcp: 2500,
        fcp: 1800,
        cls: 0.1,
        tbt: 300,
        totalBytes: 2000000,
        jsBytes: 500000,
        cssBytes: 100000,
        performanceScore: 75
      }
    });

    console.log(`✅ Budget Analysis:`);
    console.log(`   Status: ${budgetResult.status.toUpperCase()}`);
    console.log(`   Budget Score: ${budgetResult.budgetScore}/100`);
    console.log(`   Total Violations: ${budgetResult.totalViolations}`);

    if (budgetResult.violations.length > 0) {
      console.log('\n   Budget Violations:');
      budgetResult.violations.slice(0, 5).forEach(violation => {
        const overBy = violation.overByPercent > 100
          ? `${violation.overByPercent.toFixed(0)}% over`
          : `${violation.overByPercent.toFixed(0)}% over`;
        console.log(`      - ${violation.metric}: ${overBy} budget (${violation.severity})`);
      });
    }

    // Step 7: Deep analysis
    console.log('\n🔬 Step 7: Performing deep analysis...');
    console.log('-' .repeat(40));

    const deepAnalysisResult = await executeL2DeepAnalysis({
      reportId: collectResult.reportId,
      includeProblems: true,
      includeThirdParty: true
    });

    // Final diagnosis
    console.log('\n' + '=' .repeat(60));
    console.log('📋 FINAL DIAGNOSIS FOR NICOVIDEO.JP');
    console.log('=' .repeat(60));

    // Performance summary
    const score = collectResult.summary?.performanceScore || 0;
    let performanceGrade = '';
    if (score >= 90) performanceGrade = 'A (Excellent)';
    else if (score >= 70) performanceGrade = 'B (Good)';
    else if (score >= 50) performanceGrade = 'C (Needs Improvement)';
    else if (score >= 30) performanceGrade = 'D (Poor)';
    else performanceGrade = 'F (Critical)';

    console.log(`\n📊 Overall Performance Grade: ${performanceGrade}`);
    console.log(`   Score: ${score}/100`);

    // Key problems
    console.log('\n🔴 Top Performance Issues:');

    const problems = [];

    // Check for slow loading
    if (collectResult.summary?.lcp && collectResult.summary.lcp > 4000) {
      problems.push(`1. Slow page load (LCP: ${(collectResult.summary.lcp / 1000).toFixed(2)}s)`);
    }

    // Check for unused code
    if (unusedCodeResult.analysis && unusedCodeResult.analysis.totalWastedBytes > 500000) {
      problems.push(`2. Excessive unused code (${(unusedCodeResult.analysis.totalWastedBytes / 1024).toFixed(0)}KB wasted)`);
    }

    // Check for third-party impact
    if (thirdPartyResult.analysis?.summary?.totalBlockingTime && thirdPartyResult.analysis.summary.totalBlockingTime > 500) {
      problems.push(`3. Heavy third-party scripts (${thirdPartyResult.analysis.summary.totalBlockingTime.toFixed(0)}ms blocking)`);
    }

    // Check for render-blocking
    if (criticalChainResult.analysis?.renderBlockingResources && criticalChainResult.analysis.renderBlockingResources.length > 5) {
      problems.push(`4. Too many render-blocking resources (${criticalChainResult.analysis.renderBlockingResources.length} files)`);
    }

    // Check for layout shifts
    if (collectResult.summary?.cls && collectResult.summary.cls > 0.1) {
      problems.push(`5. Layout stability issues (CLS: ${collectResult.summary.cls.toFixed(3)})`);
    }

    problems.forEach(problem => console.log(`   ${problem}`));

    // Quick wins
    console.log('\n✨ Quick Wins (Low Effort, High Impact):');

    if (issuesResult.quickWins && issuesResult.quickWins.length > 0) {
      issuesResult.quickWins.slice(0, 5).forEach((win, index) => {
        console.log(`   ${index + 1}. ${win.title}`);
        console.log(`      → ${win.solution.quick}`);
      });
    }

    // Strategic recommendations
    console.log('\n🎯 Strategic Recommendations:');

    const recommendations = [
      'Implement lazy loading for below-the-fold content and images',
      'Use code splitting to reduce initial JavaScript bundle size',
      'Optimize third-party script loading with async/defer attributes',
      'Implement resource hints (preconnect, prefetch) for critical origins',
      'Consider using a CDN for static assets',
      'Implement HTTP/2 or HTTP/3 for better multiplexing',
      'Use service workers for offline functionality and caching'
    ];

    // Filter recommendations based on actual issues
    const relevantRecs = [];

    if (unusedCodeResult.analysis && unusedCodeResult.analysis.totalWastedBytes > 200000) {
      relevantRecs.push('Remove unused CSS and JavaScript code');
      relevantRecs.push('Implement tree-shaking and dead code elimination');
    }

    if (thirdPartyResult.analysis?.summary?.totalThirdPartyRequests && thirdPartyResult.analysis.summary.totalThirdPartyRequests > 10) {
      relevantRecs.push('Audit and reduce third-party dependencies');
      relevantRecs.push('Self-host critical third-party resources');
    }

    if (collectResult.summary?.lcp && collectResult.summary.lcp > 2500) {
      relevantRecs.push('Optimize Largest Contentful Paint (LCP)');
      relevantRecs.push('Preload critical resources and fonts');
    }

    relevantRecs.slice(0, 5).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    // Estimated improvements
    console.log('\n📈 Potential Performance Gains:');

    const potentialSavings = {
      bytes: 0,
      time: 0
    };

    if (unusedCodeResult.analysis) {
      potentialSavings.bytes += unusedCodeResult.analysis.totalWastedBytes;
      potentialSavings.time += unusedCodeResult.analysis.potentialSavings || 0;
    }

    if (criticalChainResult.analysis?.renderBlockingResources) {
      const blockingTime = criticalChainResult.analysis.renderBlockingResources
        .reduce((sum, r) => sum + r.wastedMs, 0);
      potentialSavings.time += blockingTime;
    }

    console.log(`   - Reduce page weight by: ${(potentialSavings.bytes / 1024).toFixed(0)}KB`);
    console.log(`   - Improve load time by: ${(potentialSavings.time / 1000).toFixed(1)}s`);
    console.log(`   - Estimated score improvement: +${Math.min(30, Math.round(potentialSavings.time / 100))} points`);

    // Industry comparison
    console.log('\n🏆 Industry Comparison:');
    console.log(`   Video streaming sites average: 65-75`);
    console.log(`   Your score: ${score}`);

    if (score >= 70) {
      console.log(`   ✅ Above industry average!`);
    } else if (score >= 60) {
      console.log(`   ⚡ Close to industry average`);
    } else {
      console.log(`   ⚠️ Below industry average - optimization needed`);
    }

    // Action plan
    console.log('\n📝 Recommended Action Plan:');
    console.log('   Phase 1 (This Week):');
    console.log('      - Remove unused CSS and JavaScript');
    console.log('      - Optimize image formats and sizes');
    console.log('      - Add resource hints for critical origins');

    console.log('\n   Phase 2 (Next Month):');
    console.log('      - Implement code splitting and lazy loading');
    console.log('      - Optimize third-party script loading');
    console.log('      - Set up performance monitoring');

    console.log('\n   Phase 3 (Quarter):');
    console.log('      - Migrate to modern bundler (Vite/esbuild)');
    console.log('      - Implement edge caching strategy');
    console.log('      - Consider server-side rendering for critical pages');

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Analysis complete!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run the analysis
console.log('🚀 Lighthouse MCP - Advanced Performance Analysis');
console.log('🎯 Target: nicovideo.jp');
console.log('📱 Device: Mobile (4x CPU throttling)');
console.log('🌐 Network: Fast 3G simulation\n');

analyzeNicovideo().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});