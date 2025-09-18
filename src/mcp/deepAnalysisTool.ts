import { performDeepAnalysis } from '../analyzers/deepAnalysis';
import type { LighthouseReport } from '../types';
import { generateAnalysisPrompt } from '../prompts/lhUsages';

export interface DeepAnalysisToolParams {
  url?: string;
  reportData?: LighthouseReport;
  includeChains?: boolean;
  includeUnusedCode?: boolean;
  maxRecommendations?: number;
}

/**
 * Deep Analysis Tool for MCP
 */
export async function createDeepAnalysisTool() {
  return {
    name: 'deep_analysis',
    description: 'Perform deep analysis including critical chains, unused code, and prioritized recommendations',
    
    async execute(params: DeepAnalysisToolParams) {
      if (!params.url && !params.reportData) {
        throw new Error('Either url or reportData is required');
      }
      
      let report: LighthouseReport;
      
      if (params.reportData) {
        report = params.reportData;
      } else if (params.url) {
        // Run Lighthouse if only URL is provided
        const { runLighthouse } = await import('../core/lighthouse');
        // Use a unique userDataDir for MCP to avoid conflicts
        const result = await runLighthouse(params.url, {
          categories: ['performance', 'accessibility', 'best-practices', 'seo'],
          device: 'mobile',
          userDataDir: '.lhdata/mcp'
        });
        
        if (!result.isOk()) {
          throw new Error(`Failed to generate Lighthouse report: ${result.error.message}`);
        }
        
        report = result.value;
      } else {
        throw new Error('No valid input provided');
      }
      
      // Perform deep analysis
      const analysis = performDeepAnalysis(report);
      
      // Format the output
      let output = `# Deep Performance Analysis\n\n`;
      output += `**URL:** ${analysis.url}\n`;
      output += `**Timestamp:** ${analysis.timestamp}\n\n`;
      
      // Performance scores
      output += `## Performance Scores\n\n`;
      output += `- **Performance:** ${Math.round((analysis.scoreAnalysis.summary?.performance || 0) * 100)}/100\n`;
      output += `- **Accessibility:** ${Math.round((analysis.scoreAnalysis.summary?.accessibility || 0) * 100)}/100\n`;
      output += `- **Best Practices:** ${Math.round((analysis.scoreAnalysis.summary?.bestPractices || 0) * 100)}/100\n`;
      output += `- **SEO:** ${Math.round((analysis.scoreAnalysis.summary?.seo || 0) * 100)}/100\n\n`;
      
      // Core Web Vitals
      output += `## Core Web Vitals\n\n`;
      if (analysis.metrics.lcp) output += `- **LCP:** ${Math.round(analysis.metrics.lcp)}ms\n`;
      if (analysis.metrics.fid) output += `- **FID:** ${Math.round(analysis.metrics.fid)}ms\n`;
      if (analysis.metrics.cls) output += `- **CLS:** ${analysis.metrics.cls.toFixed(3)}\n`;
      if (analysis.metrics.ttfb) output += `- **TTFB:** ${Math.round(analysis.metrics.ttfb)}ms\n`;
      if (analysis.metrics.fcp) output += `- **FCP:** ${Math.round(analysis.metrics.fcp)}ms\n`;
      if (analysis.metrics.tbt) output += `- **TBT:** ${Math.round(analysis.metrics.tbt)}ms\n`;
      output += '\n';
      
      // Critical chain analysis
      if (params.includeChains !== false && analysis.criticalChains.longestChain.nodes.length > 0) {
        output += `## Critical Request Chains\n\n`;
        output += `**Total Duration:** ${Math.round(analysis.criticalChains.totalDuration)}ms\n`;
        output += `**Total Transfer Size:** ${Math.round(analysis.criticalChains.totalTransferSize / 1024)}KB\n\n`;
        
        if (analysis.criticalChains.bottleneck) {
          output += `### Bottleneck\n`;
          output += `- **URL:** ${analysis.criticalChains.bottleneck.url}\n`;
          output += `- **Duration:** ${Math.round(analysis.criticalChains.bottleneck.duration)}ms\n`;
          output += `- **Impact:** ${analysis.criticalChains.bottleneck.impact}\n\n`;
        }
        
        output += `### Top Critical Resources\n`;
        for (const item of analysis.criticalChains.longestChain.nodes.slice(0, 3)) {
          output += `- ${item.url.split('/').pop() || item.url} (${Math.round(item.duration)}ms, ${item.resourceType})\n`;
        }
        output += '\n';
      }
      
      // Unused code analysis
      if (params.includeUnusedCode !== false) {
        output += `## Unused Code Analysis\n\n`;
        
        if (analysis.unusedCode.totalUnusedBytes > 0) {
          output += `**Total Unused:** ${Math.round(analysis.unusedCode.totalUnusedBytes / 1024)}KB (${Math.round(analysis.unusedCode.unusedPercent)}%)\n\n`;
          
          output += `### Summary by Type\n`;
          output += `- **JavaScript:** ${Math.round(analysis.unusedCode.summary.js.unusedBytes / 1024)}KB unused (${Math.round(analysis.unusedCode.summary.js.unusedPercent)}%)\n`;
          output += `- **CSS:** ${Math.round(analysis.unusedCode.summary.css.unusedBytes / 1024)}KB unused (${Math.round(analysis.unusedCode.summary.css.unusedPercent)}%)\n\n`;
          
          if (analysis.unusedCode.items.length > 0) {
            output += `### Top Unused Resources\n`;
            for (const item of analysis.unusedCode.items.slice(0, 5)) {
              const filename = item.url.split('/').pop() || item.url;
              output += `- ${filename}: ${Math.round(item.unusedBytes / 1024)}KB unused (${Math.round(item.unusedPercent)}%)\n`;
            }
            output += '\n';
          }
        } else {
          output += `No significant unused code detected. Your code is well-optimized!\n\n`;
        }
      }
      
      // Prioritized recommendations
      const maxRecs = params.maxRecommendations || 10;
      if (analysis.recommendations.length > 0) {
        output += `## Prioritized Recommendations\n\n`;
        for (const rec of analysis.recommendations.slice(0, maxRecs)) {
          const icon = rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟡' : '🟢';
          output += `### ${icon} ${rec.description}\n`;
          output += `**Category:** ${rec.category}\n`;
          output += `**Impact:** ${rec.impact}\n\n`;
        }
      }
      
      // Detected patterns
      if (analysis.patterns.length > 0) {
        output += `## Detected Performance Patterns\n\n`;
        for (const pattern of analysis.patterns) {
          output += `### ${pattern.name}\n`;
          output += `**Confidence:** ${Math.round(pattern.confidence * 100)}%\n`;
          output += `**Indicators:**\n`;
          for (const indicator of pattern.indicators) {
            output += `- ${indicator}\n`;
          }
          output += `**Recommendations:**\n`;
          for (const rec of pattern.recommendations.slice(0, 3)) {
            output += `- ${rec}\n`;
          }
          output += '\n';
        }
      }
      
      // Top problems
      if (analysis.problems.length > 0) {
        output += `## Top Performance Problems\n\n`;
        for (const problem of analysis.problems.slice(0, 5)) {
          const icon = problem.severity === 'critical' ? '🔴' : problem.severity === 'high' ? '🟡' : '🟢';
          output += `- ${icon} **${problem.audit?.title || problem.id}** (Impact: ${Math.round(problem.impact)}%)\n`;
        }
      }
      
      // プロンプト生成を追加
      const analysisPrompt = generateAnalysisPrompt(report, analysis);
      
      return {
        content: [
          {
            type: 'text',
            text: output + '\n\n---\n\n' + analysisPrompt
          }
        ]
      };
    }
  };
}