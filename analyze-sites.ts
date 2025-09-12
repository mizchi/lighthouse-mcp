#!/usr/bin/env tsx

/**
 * Analyze third-party impact on nicovideo.jp and goal.com
 */

import { executeL2ThirdPartyImpact } from './dist/tools/l2-third-party-impact.js';

async function analyzeSite(url: string, siteName: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${siteName} (${url})`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Step 1: Analyze third-party scripts
    console.log('📊 Analyzing third-party scripts...\n');
    const analysisResult = await executeL2ThirdPartyImpact({
      url,
      device: 'mobile',
      compareMode: 'analyze',
      gather: true,
    });

    if (analysisResult.analysis) {
      const { summary, entities, impact } = analysisResult.analysis;
      
      console.log('📈 Summary:');
      console.log(`   • Third-party entities: ${summary.entityCount}`);
      console.log(`   • Total blocking time: ${Math.round(summary.totalBlockingTime)}ms`);
      console.log(`   • Total main thread time: ${Math.round(summary.totalMainThreadTime)}ms`);
      console.log(`   • Total transfer size: ${Math.round(summary.totalTransferSize / 1024)}KB`);
      console.log();

      console.log('🎯 Estimated Impact:');
      console.log(`   • Performance score impact: ${(impact.performanceScore * 100).toFixed(1)}%`);
      console.log(`   • FCP impact: ${(impact.fcpImpact * 100).toFixed(1)}%`);
      console.log(`   • LCP impact: ${(impact.lcpImpact * 100).toFixed(1)}%`);
      console.log(`   • TBT impact: ${(impact.tbtImpact * 100).toFixed(1)}%`);
      console.log();

      console.log('🔥 Top 5 Performance Offenders:');
      entities.slice(0, 5).forEach((entity, i) => {
        const blockingRatio = entity.blockingTime / entity.mainThreadTime;
        console.log(`   ${i + 1}. ${entity.entity}`);
        console.log(`      • Blocking: ${Math.round(entity.blockingTime)}ms (${(blockingRatio * 100).toFixed(1)}% of main thread)`);
        console.log(`      • Transfer: ${Math.round(entity.transferSize / 1024)}KB`);
        console.log(`      • Scripts: ${entity.subRequests.length}`);
      });
      console.log();

      // Get high-impact domains for testing
      const highImpactDomains: string[] = [];
      for (const entity of entities.slice(0, 3)) {
        for (const subRequest of entity.subRequests.slice(0, 3)) {
          try {
            const requestUrl = new URL(subRequest.url);
            if (!highImpactDomains.includes(requestUrl.hostname)) {
              highImpactDomains.push(requestUrl.hostname);
            }
          } catch {}
        }
      }

      if (highImpactDomains.length > 0) {
        console.log('🚫 Testing with blocking top domains...\n');
        console.log(`   Blocking: ${highImpactDomains.slice(0, 5).join(', ')}`);
        if (highImpactDomains.length > 5) {
          console.log(`   ... and ${highImpactDomains.length - 5} more`);
        }
        console.log();

        // Compare with blocking
        const compareResult = await executeL2ThirdPartyImpact({
          url,
          device: 'mobile',
          compareMode: 'compare',
          blockDomains: highImpactDomains.slice(0, 10),
          gather: true,
        });

        if (compareResult.comparison) {
          const { baseline, withThirdParty, impact: compareImpact } = compareResult.comparison;
          
          console.log('⚡ Performance Comparison:');
          console.log('   ┌────────────────────────────────────────────┐');
          console.log('   │ Metric       │ With 3P     │ Without 3P   │');
          console.log('   ├────────────────────────────────────────────┤');
          console.log(`   │ Score        │ ${(withThirdParty.score * 100).toFixed(0).padEnd(11)} │ ${(baseline.score * 100).toFixed(0).padEnd(12)} │`);
          console.log(`   │ FCP (ms)     │ ${withThirdParty.fcp.toFixed(0).padEnd(11)} │ ${baseline.fcp.toFixed(0).padEnd(12)} │`);
          console.log(`   │ LCP (ms)     │ ${withThirdParty.lcp.toFixed(0).padEnd(11)} │ ${baseline.lcp.toFixed(0).padEnd(12)} │`);
          console.log(`   │ TBT (ms)     │ ${withThirdParty.tbt.toFixed(0).padEnd(11)} │ ${baseline.tbt.toFixed(0).padEnd(12)} │`);
          console.log(`   │ CLS          │ ${withThirdParty.cls.toFixed(3).padEnd(11)} │ ${baseline.cls.toFixed(3).padEnd(12)} │`);
          console.log('   └────────────────────────────────────────────┘');
          console.log();
          
          console.log('📊 Impact Summary:');
          const scoreImprovement = compareImpact.scoreDelta * 100;
          console.log(`   • Score: ${scoreImprovement > 0 ? '+' : ''}${scoreImprovement.toFixed(0)} points`);
          console.log(`   • FCP: ${compareImpact.fcpDelta > 0 ? '+' : ''}${Math.round(compareImpact.fcpDelta)}ms`);
          console.log(`   • LCP: ${compareImpact.lcpDelta > 0 ? '+' : ''}${Math.round(compareImpact.lcpDelta)}ms`);
          console.log(`   • TBT: ${compareImpact.tbtDelta > 0 ? '+' : ''}${Math.round(compareImpact.tbtDelta)}ms`);
          
          if (scoreImprovement > 10) {
            console.log(`\n   🎉 Significant improvement potential: ${scoreImprovement.toFixed(0)} points!`);
          } else if (scoreImprovement > 5) {
            console.log(`\n   ✅ Moderate improvement potential: ${scoreImprovement.toFixed(0)} points`);
          } else {
            console.log(`\n   ℹ️  Minor improvement potential: ${scoreImprovement.toFixed(0)} points`);
          }
        }
      }

      if (analysisResult.recommendations) {
        console.log('\n💡 Recommendations:');
        analysisResult.recommendations.slice(0, 5).forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }
    }

  } catch (error) {
    console.error(`❌ Error analyzing ${siteName}:`, error);
  }
}

async function main() {
  console.log('🚀 Third-Party Script Impact Analysis\n');
  console.log('Analyzing two sites: nicovideo.jp and goal.com');
  console.log('This will take several minutes...\n');

  // Analyze nicovideo.jp
  await analyzeSite('https://www.nicovideo.jp/', 'ニコニコ動画');

  // Analyze goal.com
  await analyzeSite('https://www.goal.com/', 'Goal.com');

  console.log(`\n${'='.repeat(60)}`);
  console.log('  Analysis Complete');
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error);