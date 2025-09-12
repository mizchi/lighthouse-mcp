#!/usr/bin/env tsx

/**
 * Simple third-party impact test
 */

import { executeL2ThirdPartyImpact } from './dist/tools/l2-third-party-impact.js';

async function main() {
  const testUrl = 'https://www.goal.com';
  
  console.log(`\n=== Testing Third-Party Impact on ${testUrl} ===\n`);

  // Step 1: Analyze existing third-party scripts
  console.log('1. Analyzing third-party scripts...');
  const analysis = await executeL2ThirdPartyImpact({
    url: testUrl,
    device: 'mobile',
    compareMode: 'analyze',
    gather: true,
  });

  if (analysis.analysis) {
    const { summary, entities } = analysis.analysis;
    console.log('\n📊 Third-Party Impact Summary:');
    console.log(`   Total scripts: ${summary.entityCount}`);
    console.log(`   Blocking time: ${Math.round(summary.totalBlockingTime)}ms`);
    console.log(`   Transfer size: ${Math.round(summary.totalTransferSize / 1024)}KB`);
    
    console.log('\n🔥 Top Performance Offenders:');
    entities.slice(0, 3).forEach((entity, i) => {
      console.log(`   ${i + 1}. ${entity.entity}: ${Math.round(entity.blockingTime)}ms blocking`);
    });
  }

  // Step 2: Get domains for selective blocking
  console.log('\n2. Identifying high-impact domains...');
  const domainsResult = await executeL2ThirdPartyImpact({
    url: testUrl,
    device: 'mobile',
    compareMode: 'domains',
    gather: false,
  });

  if (domainsResult.analysis?.entities) {
    // Get domains from top offenders
    const topOffenders = domainsResult.analysis.entities.slice(0, 3);
    const blockList: string[] = [];
    
    for (const entity of topOffenders) {
      for (const subRequest of entity.subRequests.slice(0, 2)) {
        try {
          const url = new URL(subRequest.url);
          blockList.push(url.hostname);
        } catch {}
      }
    }

    console.log(`\n🚫 Testing with selective blocking of ${blockList.length} domains:`);
    console.log(`   ${blockList.slice(0, 5).join(', ')}`);

    // Step 3: Compare with selective blocking
    console.log('\n3. Testing performance improvement with blocking...');
    const compareResult = await executeL2ThirdPartyImpact({
      url: testUrl,
      device: 'mobile',
      compareMode: 'compare',
      blockDomains: blockList.slice(0, 10), // Block top 10 domains
      gather: true,
    });

    if (compareResult.comparison) {
      const { impact } = compareResult.comparison;
      console.log('\n✅ Performance Impact:');
      console.log(`   Score improvement: +${Math.round(impact.scoreDelta * 100)} points`);
      console.log(`   FCP change: ${impact.fcpDelta > 0 ? '+' : ''}${Math.round(impact.fcpDelta)}ms`);
      console.log(`   LCP change: ${impact.lcpDelta > 0 ? '+' : ''}${Math.round(impact.lcpDelta)}ms`);
      console.log(`   TBT change: ${impact.tbtDelta > 0 ? '+' : ''}${Math.round(impact.tbtDelta)}ms`);
    }

    if (compareResult.recommendations) {
      console.log('\n💡 Recommendations:');
      compareResult.recommendations.slice(0, 3).forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
  }

  console.log('\n✨ Analysis complete!\n');
}

main().catch(console.error);