#!/usr/bin/env tsx

/**
 * Test third-party impact analysis on goal.com
 */

import { executeL2ThirdPartyImpact, executeL2ProgressiveThirdParty } from './dist/tools/l2-third-party-impact.js';

const URL = 'https://www.goal.com';

async function main() {
  console.log('=== Third-Party Script Impact Analysis for goal.com ===\n');

  try {
    // Step 1: Analyze third-party scripts
    console.log('📊 Step 1: Analyzing third-party scripts...\n');
    const analysisResult = await executeL2ThirdPartyImpact({
      url: URL,
      device: 'mobile',
      compareMode: 'analyze',
      gather: true,
    });

    if (analysisResult.analysis) {
      const { summary, entities } = analysisResult.analysis;
      console.log('Summary:');
      console.log(`- Total entities: ${summary.entityCount}`);
      console.log(`- Total main thread time: ${Math.round(summary.totalMainThreadTime)}ms`);
      console.log(`- Total blocking time: ${Math.round(summary.totalBlockingTime)}ms`);
      console.log(`- Total transfer size: ${Math.round(summary.totalTransferSize / 1024)}KB\n`);

      console.log('Top 5 Third-Party Scripts by Blocking Time:');
      entities.slice(0, 5).forEach((entity, i) => {
        console.log(`${i + 1}. ${entity.entity}`);
        console.log(`   - Blocking time: ${Math.round(entity.blockingTime)}ms`);
        console.log(`   - Main thread time: ${Math.round(entity.mainThreadTime)}ms`);
        console.log(`   - Transfer size: ${Math.round(entity.transferSize / 1024)}KB`);
      });
      console.log();
    }

    // Step 2: Get list of third-party domains
    console.log('🔍 Step 2: Identifying third-party domains...\n');
    const domainsResult = await executeL2ThirdPartyImpact({
      url: URL,
      device: 'mobile',
      compareMode: 'domains',
      gather: false, // Use cached report
    });

    if (domainsResult.domains) {
      console.log(`Found ${domainsResult.domains.length} third-party domains\n`);
      console.log('Domains:', domainsResult.domains.slice(0, 10).join(', '));
      if (domainsResult.domains.length > 10) {
        console.log(`... and ${domainsResult.domains.length - 10} more`);
      }
      console.log();
    }

    // Step 3: Compare with and without blocking all third-party scripts
    console.log('⚡ Step 3: Comparing performance with/without all third-party scripts...\n');
    console.log('This will take a few minutes...\n');
    
    const compareResult = await executeL2ThirdPartyImpact({
      url: URL,
      device: 'mobile',
      compareMode: 'compare',
      gather: true,
    });

    if (compareResult.comparison) {
      const { baseline, withThirdParty, impact } = compareResult.comparison;
      
      console.log('Performance Comparison:');
      console.log('┌─────────────────────────────────────────┐');
      console.log('│ Metric       │ With 3P    │ Without 3P │');
      console.log('├─────────────────────────────────────────┤');
      console.log(`│ Score        │ ${(withThirdParty.score * 100).toFixed(0).padEnd(10)} │ ${(baseline.score * 100).toFixed(0).padEnd(10)} │`);
      console.log(`│ FCP (ms)     │ ${Math.round(withThirdParty.fcp).toString().padEnd(10)} │ ${Math.round(baseline.fcp).toString().padEnd(10)} │`);
      console.log(`│ LCP (ms)     │ ${Math.round(withThirdParty.lcp).toString().padEnd(10)} │ ${Math.round(baseline.lcp).toString().padEnd(10)} │`);
      console.log(`│ TBT (ms)     │ ${Math.round(withThirdParty.tbt).toString().padEnd(10)} │ ${Math.round(baseline.tbt).toString().padEnd(10)} │`);
      console.log(`│ CLS          │ ${withThirdParty.cls.toFixed(3).padEnd(10)} │ ${baseline.cls.toFixed(3).padEnd(10)} │`);
      console.log('└─────────────────────────────────────────┘\n');

      console.log('Impact:');
      console.log(`- Score improvement: ${Math.round(impact.scoreDelta * 100)} points`);
      console.log(`- FCP increase: ${Math.round(impact.fcpDelta)}ms`);
      console.log(`- LCP increase: ${Math.round(impact.lcpDelta)}ms`);
      console.log(`- TBT increase: ${Math.round(impact.tbtDelta)}ms`);
      console.log(`- CLS increase: ${impact.clsDelta.toFixed(3)}\n`);
    }

    if (compareResult.recommendations) {
      console.log('Recommendations:');
      compareResult.recommendations.forEach(rec => {
        console.log(`- ${rec}`);
      });
      console.log();
    }

    // Step 4: Progressive blocking analysis (optional - takes longer)
    const runProgressive = process.argv.includes('--progressive');
    if (runProgressive) {
      console.log('🔄 Step 4: Progressive blocking analysis...\n');
      console.log('This will test blocking scripts progressively (may take 5-10 minutes)...\n');
      
      const progressiveResult = await executeL2ProgressiveThirdParty({
        url: URL,
        device: 'mobile',
        maxIterations: 3, // Test top 3 worst offenders
      });

      if (progressiveResult.iterations.length > 0) {
        console.log('Progressive Blocking Results:');
        console.log('┌────────────────────────────────────────────┐');
        console.log('│ Blocked Count │ Score │ Delta │ Domains   │');
        console.log('├────────────────────────────────────────────┤');
        
        progressiveResult.iterations.forEach((iteration, i) => {
          const domainCount = iteration.blockedDomains.length;
          const score = (iteration.score * 100).toFixed(0);
          const delta = (iteration.scoreDelta > 0 ? '+' : '') + (iteration.scoreDelta * 100).toFixed(0);
          console.log(`│ ${(i + 1).toString().padEnd(13)} │ ${score.padEnd(5)} │ ${delta.padEnd(5)} │ ${domainCount.toString().padEnd(9)} │`);
        });
        console.log('└────────────────────────────────────────────┘\n');

        if (progressiveResult.optimalBlocking.length > 0) {
          console.log(`Optimal blocking: ${progressiveResult.optimalBlocking.length} domains`);
          console.log(`Best score achieved: ${(progressiveResult.iterations[progressiveResult.iterations.length - 1].score * 100).toFixed(0)}\n`);
        }
      }
    } else {
      console.log('💡 Tip: Run with --progressive flag for detailed progressive blocking analysis\n');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();