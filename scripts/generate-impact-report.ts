#!/usr/bin/env tsx

/**
 * Generate detailed third-party impact report
 *
 * Usage: pnpm tsx scripts/generate-impact-report.ts
 */

import { executeL2ThirdPartyImpact } from '../dist/tools/l2-third-party-impact.js';
import { executeL2PerformanceAnalysis } from '../dist/tools/l2-performance-analysis.js';
import { executeL2UnusedCode } from '../dist/tools/l2-unused-code.js';
import * as fs from 'fs/promises';

interface SiteAnalysis {
  url: string;
  name: string;
  thirdParty?: any;
  performance?: any;
  unusedCode?: any;
}

async function analyzeSiteDetails(url: string, siteName: string): Promise<SiteAnalysis> {
  console.log(`\n📊 Analyzing ${siteName}...`);
  
  const result: SiteAnalysis = { url, name: siteName };

  try {
    // 1. Third-party analysis
    console.log('  • Collecting third-party data...');
    const thirdPartyResult = await executeL2ThirdPartyImpact({
      url,
      device: 'mobile',
      compareMode: 'analyze',
      gather: true,
    });
    result.thirdParty = thirdPartyResult.analysis;

    // 2. Performance analysis
    console.log('  • Analyzing performance patterns...');
    const performanceResult = await executeL2PerformanceAnalysis({
      url,
      device: 'mobile',
      gather: false, // Use cached
    });
    result.performance = performanceResult;

    // 3. Unused code analysis
    console.log('  • Detecting unused code...');
    const unusedCodeResult = await executeL2UnusedCode({
      url,
      device: 'mobile',
    });
    result.unusedCode = unusedCodeResult.unusedCode;

  } catch (error) {
    console.error(`  ❌ Error: ${error}`);
  }

  return result;
}

function generateMarkdownReport(analyses: SiteAnalysis[]): string {
  let report = `# Third-Party Script Impact Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Executive Summary\n\n`;

  // Summary table
  report += `| Site | Third-Party Count | Total Blocking (ms) | Performance Score | Unused Code (KB) |\n`;
  report += `|------|-------------------|---------------------|-------------------|------------------|\n`;
  
  for (const analysis of analyses) {
    const tp = analysis.thirdParty?.summary;
    const perf = analysis.performance;
    const unused = analysis.unusedCode;
    
    report += `| ${analysis.name} `;
    report += `| ${tp?.entityCount || 'N/A'} `;
    report += `| ${tp ? Math.round(tp.totalBlockingTime) : 'N/A'} `;
    report += `| ${perf?.score || 'N/A'} `;
    report += `| ${unused ? Math.round(unused.totalWastedBytes / 1024) : 'N/A'} |\n`;
  }

  report += `\n---\n\n`;

  // Detailed analysis for each site
  for (const analysis of analyses) {
    report += `## ${analysis.name}\n\n`;
    report += `URL: ${analysis.url}\n\n`;

    if (analysis.thirdParty) {
      const tp = analysis.thirdParty;
      
      report += `### 🎯 Third-Party Impact\n\n`;
      report += `**Summary:**\n`;
      report += `- Total Entities: ${tp.summary.entityCount}\n`;
      report += `- Total Blocking Time: ${Math.round(tp.summary.totalBlockingTime)}ms\n`;
      report += `- Total Main Thread Time: ${Math.round(tp.summary.totalMainThreadTime)}ms\n`;
      report += `- Total Transfer Size: ${Math.round(tp.summary.totalTransferSize / 1024)}KB\n\n`;

      report += `**Top 10 Heaviest Scripts:**\n\n`;
      report += `| Rank | Entity | Blocking (ms) | Main Thread (ms) | Transfer (KB) | Scripts | Impact |\n`;
      report += `|------|--------|---------------|------------------|---------------|---------|--------|\n`;

      const topEntities = tp.entities.slice(0, 10);
      topEntities.forEach((entity: any, i: number) => {
        const blockingRatio = (entity.blockingTime / entity.mainThreadTime * 100).toFixed(1);
        const impact = entity.blockingTime > 1000 ? '🔴 Critical' : 
                       entity.blockingTime > 500 ? '🟠 High' : 
                       entity.blockingTime > 250 ? '🟡 Medium' : '🟢 Low';
        
        report += `| ${i + 1} `;
        report += `| ${entity.entity} `;
        report += `| ${Math.round(entity.blockingTime)} `;
        report += `| ${Math.round(entity.mainThreadTime)} `;
        report += `| ${Math.round(entity.transferSize / 1024)} `;
        report += `| ${entity.subRequests.length} `;
        report += `| ${impact} |\n`;
      });

      report += `\n**Blocking Time Distribution:**\n`;
      const critical = tp.entities.filter((e: any) => e.blockingTime > 1000).length;
      const high = tp.entities.filter((e: any) => e.blockingTime > 500 && e.blockingTime <= 1000).length;
      const medium = tp.entities.filter((e: any) => e.blockingTime > 250 && e.blockingTime <= 500).length;
      const low = tp.entities.filter((e: any) => e.blockingTime <= 250).length;
      
      report += `- 🔴 Critical (>1000ms): ${critical} scripts\n`;
      report += `- 🟠 High (500-1000ms): ${high} scripts\n`;
      report += `- 🟡 Medium (250-500ms): ${medium} scripts\n`;
      report += `- 🟢 Low (<250ms): ${low} scripts\n\n`;

      // Script URLs for top offenders
      report += `**Detailed Script Breakdown (Top 3):**\n\n`;
      tp.entities.slice(0, 3).forEach((entity: any, i: number) => {
        report += `<details>\n`;
        report += `<summary>${i + 1}. ${entity.entity} (${Math.round(entity.blockingTime)}ms blocking)</summary>\n\n`;
        report += `| URL | Blocking (ms) | Transfer (KB) |\n`;
        report += `|-----|---------------|---------------|\n`;
        
        entity.subRequests.slice(0, 5).forEach((req: any) => {
          const shortUrl = req.url.length > 60 ? req.url.substring(0, 57) + '...' : req.url;
          report += `| ${shortUrl} `;
          report += `| ${Math.round(req.blockingTime)} `;
          report += `| ${Math.round(req.transferSize / 1024)} |\n`;
        });
        
        if (entity.subRequests.length > 5) {
          report += `\n*... and ${entity.subRequests.length - 5} more scripts*\n`;
        }
        report += `\n</details>\n\n`;
      });
    }

    if (analysis.performance) {
      const perf = analysis.performance;
      
      report += `### 📈 Performance Metrics\n\n`;
      report += `**Core Web Vitals:**\n`;
      report += `- LCP: ${perf.metrics.lcp ? Math.round(perf.metrics.lcp) + 'ms' : 'N/A'}\n`;
      report += `- FCP: ${perf.metrics.fcp ? Math.round(perf.metrics.fcp) + 'ms' : 'N/A'}\n`;
      report += `- CLS: ${perf.metrics.cls || 'N/A'}\n`;
      report += `- TBT: ${perf.metrics.tbt ? Math.round(perf.metrics.tbt) + 'ms' : 'N/A'}\n`;
      report += `- TTI: ${perf.metrics.tti ? Math.round(perf.metrics.tti) + 'ms' : 'N/A'}\n\n`;

      if (perf.problems && perf.problems.length > 0) {
        report += `**Top Performance Problems:**\n`;
        perf.problems.slice(0, 5).forEach((problem: any, i: number) => {
          const severity = problem.severity === 'critical' ? '🔴' : 
                          problem.severity === 'high' ? '🟠' : 
                          problem.severity === 'medium' ? '🟡' : '🟢';
          report += `${i + 1}. ${severity} ${problem.description} (${problem.category})\n`;
        });
        report += `\n`;
      }
    }

    if (analysis.unusedCode) {
      const unused = analysis.unusedCode;
      
      report += `### 🗑️ Unused Code\n\n`;
      report += `**Summary:**\n`;
      report += `- Total Wasted: ${Math.round(unused.totalWastedBytes / 1024)}KB\n`;
      report += `- Files with Unused Code: ${unused.files.length}\n\n`;

      if (unused.files.length > 0) {
        report += `**Top Unused Code by File:**\n\n`;
        report += `| File | Wasted (KB) | Wasted % | Total (KB) | Type |\n`;
        report += `|------|-------------|----------|------------|------|\n`;
        
        unused.files.slice(0, 10).forEach((file: any) => {
          const shortUrl = file.url.length > 50 ? '...' + file.url.substring(file.url.length - 47) : file.url;
          report += `| ${shortUrl} `;
          report += `| ${Math.round(file.wastedBytes / 1024)} `;
          report += `| ${file.wastedPercent}% `;
          report += `| ${Math.round(file.totalBytes / 1024)} `;
          report += `| ${file.type} |\n`;
        });
      }
    }

    report += `\n---\n\n`;
  }

  // Recommendations section
  report += `## 📋 Recommendations\n\n`;
  
  for (const analysis of analyses) {
    report += `### ${analysis.name}\n\n`;
    
    const tp = analysis.thirdParty;
    if (tp && tp.entities) {
      const criticalScripts = tp.entities.filter((e: any) => e.blockingTime > 1000);
      
      if (criticalScripts.length > 0) {
        report += `**Critical Actions Required:**\n`;
        criticalScripts.slice(0, 3).forEach((entity: any) => {
          report += `- 🔴 **${entity.entity}**: ${Math.round(entity.blockingTime)}ms blocking\n`;
          report += `  - Consider lazy loading or removing if not essential\n`;
          report += `  - Investigate async/defer loading options\n`;
        });
        report += `\n`;
      }

      const highImpactScripts = tp.entities.filter((e: any) => e.blockingTime > 500 && e.blockingTime <= 1000);
      if (highImpactScripts.length > 0) {
        report += `**High Priority Optimizations:**\n`;
        highImpactScripts.slice(0, 3).forEach((entity: any) => {
          report += `- 🟠 **${entity.entity}**: ${Math.round(entity.blockingTime)}ms blocking\n`;
        });
        report += `\n`;
      }
    }

    if (analysis.unusedCode && analysis.unusedCode.totalWastedBytes > 100000) {
      report += `**Code Optimization:**\n`;
      report += `- Remove or tree-shake ${Math.round(analysis.unusedCode.totalWastedBytes / 1024)}KB of unused code\n`;
      report += `- Focus on files with >50% unused code\n\n`;
    }
  }

  // Technical details
  report += `## 🔧 Technical Analysis\n\n`;
  
  report += `### Script Loading Patterns\n\n`;
  for (const analysis of analyses) {
    if (analysis.thirdParty) {
      report += `**${analysis.name}:**\n`;
      
      // Group by category
      const categories: { [key: string]: any[] } = {};
      analysis.thirdParty.entities.forEach((entity: any) => {
        const category = entity.entity.includes('Google') ? 'Google/Analytics' :
                        entity.entity.includes('Amazon') ? 'Amazon/Ads' :
                        entity.entity.includes('Facebook') ? 'Facebook/Social' :
                        entity.entity.includes('Tag') ? 'Tag Management' :
                        entity.entity.includes('Ad') ? 'Advertising' : 'Other';
        
        if (!categories[category]) categories[category] = [];
        categories[category].push(entity);
      });

      Object.entries(categories).forEach(([cat, entities]) => {
        const totalBlocking = entities.reduce((sum, e) => sum + e.blockingTime, 0);
        const totalSize = entities.reduce((sum, e) => sum + e.transferSize, 0);
        report += `- ${cat}: ${entities.length} entities, ${Math.round(totalBlocking)}ms blocking, ${Math.round(totalSize / 1024)}KB\n`;
      });
      report += `\n`;
    }
  }

  report += `\n## 📊 Methodology\n\n`;
  report += `This report analyzes:\n`;
  report += `1. **Third-party scripts**: External JavaScript and resources loaded from different domains\n`;
  report += `2. **Blocking time**: Time the main thread is blocked by script execution\n`;
  report += `3. **Transfer size**: Network bytes transferred for each script\n`;
  report += `4. **Unused code**: JavaScript and CSS bytes that are downloaded but never executed\n\n`;
  
  report += `Impact levels:\n`;
  report += `- 🔴 **Critical**: >1000ms blocking time - Severe performance impact\n`;
  report += `- 🟠 **High**: 500-1000ms - Significant impact\n`;
  report += `- 🟡 **Medium**: 250-500ms - Noticeable impact\n`;
  report += `- 🟢 **Low**: <250ms - Minor impact\n`;

  return report;
}

async function main() {
  console.log('🚀 Generating Third-Party Impact Report\n');

  const sites = [
    { url: 'https://www.nicovideo.jp/', name: 'ニコニコ動画 (nicovideo.jp)' },
    { url: 'https://www.goal.com/', name: 'Goal.com' },
  ];

  const analyses: SiteAnalysis[] = [];

  for (const site of sites) {
    const analysis = await analyzeSiteDetails(site.url, site.name);
    analyses.push(analysis);
  }

  console.log('\n📝 Generating report...');
  const report = generateMarkdownReport(analyses);

  const filename = `third-party-impact-report-${new Date().toISOString().split('T')[0]}.md`;
  await fs.writeFile(filename, report);
  
  console.log(`\n✅ Report saved to: ${filename}`);
  console.log('\nReport preview:');
  console.log('================');
  console.log(report.substring(0, 500) + '...\n');
}

main().catch(console.error);