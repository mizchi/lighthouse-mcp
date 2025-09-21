import type { LighthouseReport } from '../types';

export interface JavaScriptAnalysis {
  totalExecutionTime: number;
  mainThreadImpact: number;
  files: Array<{
    url: string;
    executionTime: number;
    parseTime: number;
    impact: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
}

export interface CSSAnalysis {
  processingTime: number;
  renderingImpact: number;
  paintingImpact: number;
  totalImpact: number;
  unminifiedFiles: Array<{
    url: string;
    currentSize: number;
    potentialSavings: number;
  }>;
  recommendations: string[];
}

export interface ImageOptimization {
  totalSavingsBytes: number;
  opportunities: Array<{
    type: 'webp' | 'compression' | 'sizing';
    savingsBytes: number;
    files: Array<{
      url: string;
      currentSize: number;
      savings: number;
    }>;
  }>;
  largestImpact?: {
    url: string;
    currentSize: number;
    potentialSavings: number;
  };
  recommendations: string[];
}

export interface ResourcePerformanceAnalysis {
  javascript?: JavaScriptAnalysis;
  css?: CSSAnalysis;
  images?: ImageOptimization;
  overallScore?: number;
  bottlenecks?: string[];
}

export function analyzeResourcePerformance(report: LighthouseReport): ResourcePerformanceAnalysis {
  const result: ResourcePerformanceAnalysis = {};
  const bottlenecks: string[] = [];

  // Analyze JavaScript execution
  const bootupTimeAudit = report.audits?.['bootup-time'];
  const mainThreadAudit = report.audits?.['mainthread-work-breakdown'];

  if (bootupTimeAudit?.numericValue !== undefined || bootupTimeAudit?.details?.items) {
    const totalExecutionTime = bootupTimeAudit.numericValue || 0;

    let files: any[] = [];
    if (bootupTimeAudit.details?.items) {
      const items = bootupTimeAudit.details.items as any[];
      files = items.map(item => ({
        url: item.url,
        executionTime: item.scripting || 0,
        parseTime: item.scriptParseCompile || 0,
        impact: item.scripting > 1000 ? 'high' as const :
                item.scripting > 500 ? 'medium' as const :
                'low' as const
      }));
    }

    // Get main thread impact
    let mainThreadImpact = 0;
    if (mainThreadAudit?.details?.items) {
      const mainThreadItems = mainThreadAudit.details.items as any[];
      const scriptItem = mainThreadItems.find(i =>
        i.group === 'Script Evaluation' ||
        i.group === 'scriptEvaluation' ||
        i.groupLabel?.includes('Script')
      );
      mainThreadImpact = scriptItem?.duration || 0;
    }

    const recommendations: string[] = [];
    if (totalExecutionTime > 3000) {
      recommendations.push('Consider code splitting');
      bottlenecks.push('JavaScript execution');
    } else if (totalExecutionTime >= 2000) {
      bottlenecks.push('JavaScript execution');
    }
    if (files.some(f => f.parseTime > 300)) {
      recommendations.push('Optimize JavaScript bundle size');
    }

    result.javascript = {
      totalExecutionTime,
      mainThreadImpact,
      files,
      recommendations
    };
  }

  // Analyze CSS processing
  if (mainThreadAudit?.details?.items) {
    const items = mainThreadAudit.details.items as any[];
    const styleItem = items.find(i =>
      i.group === 'Style & Layout' ||
      i.group === 'styleLayout' ||
      i.groupLabel?.includes('Style')
    );
    const renderItem = items.find(i =>
      i.group === 'Rendering' ||
      i.groupLabel?.includes('Render')
    );
    const paintItem = items.find(i =>
      i.group === 'Painting' ||
      i.groupLabel?.includes('Paint')
    );

    const processingTime = styleItem?.duration || 0;
    const renderingImpact = renderItem?.duration || 0;
    const paintingImpact = paintItem?.duration || 0;

    const unminifiedFiles: any[] = [];
    const unminifiedAudit = report.audits?.['unminified-css'];
    if (unminifiedAudit?.details?.items) {
      const cssItems = unminifiedAudit.details.items as any[];
      cssItems.forEach(item => {
        unminifiedFiles.push({
          url: item.url,
          currentSize: item.totalBytes || 0,
          potentialSavings: item.wastedBytes || 0
        });
      });
    }

    const recommendations: string[] = [];
    if (processingTime > 1000) {
      recommendations.push('Reduce CSS complexity');
      bottlenecks.push('CSS processing');
    }
    if (unminifiedFiles.length > 0) {
      recommendations.push('Minify CSS files');
    }

    result.css = {
      processingTime,
      renderingImpact,
      paintingImpact,
      totalImpact: processingTime + renderingImpact + paintingImpact,
      unminifiedFiles,
      recommendations
    };
  }

  // Analyze image optimization
  const imageAudits = [
    { audit: 'uses-webp-images', type: 'webp' as const },
    { audit: 'uses-optimized-images', type: 'compression' as const },
    { audit: 'uses-responsive-images', type: 'sizing' as const }
  ];

  let totalSavingsBytes = 0;
  const opportunities: any[] = [];
  const allImageFiles = new Map<string, { size: number; savings: number }>();

  imageAudits.forEach(({ audit, type }) => {
    const auditResult = report.audits?.[audit];
    if (auditResult?.details?.items) {
      const items = auditResult.details.items as any[];
      const savingsBytes = auditResult.details.overallSavingsBytes || 0;
      totalSavingsBytes += savingsBytes;

      const files = items.map(item => {
        const existing = allImageFiles.get(item.url) || { size: item.totalBytes || 0, savings: 0 };
        existing.savings += item.wastedBytes || 0;
        allImageFiles.set(item.url, existing);

        return {
          url: item.url,
          currentSize: item.totalBytes || 0,
          savings: item.wastedBytes || 0
        };
      });

      if (savingsBytes > 0) {
        opportunities.push({
          type,
          savingsBytes,
          files
        });
      }
    }
  });

  if (totalSavingsBytes > 0) {
    // Find largest impact image
    let largestImpact = { url: '', currentSize: 0, potentialSavings: 0 };
    allImageFiles.forEach((data, url) => {
      if (data.savings > largestImpact.potentialSavings) {
        largestImpact = {
          url,
          currentSize: data.size,
          potentialSavings: data.savings
        };
      }
    });

    const recommendations: string[] = [];
    if (opportunities.some(o => o.type === 'webp')) {
      recommendations.push('Convert images to WebP format');
    }
    if (opportunities.some(o => o.type === 'compression')) {
      recommendations.push('Optimize image compression');
    }
    if (opportunities.some(o => o.type === 'sizing')) {
      recommendations.push('Use responsive images');
    }

    if (totalSavingsBytes > 500000) {
      bottlenecks.push('Image optimization');
    }

    result.images = {
      totalSavingsBytes,
      opportunities,
      largestImpact: largestImpact.url ? largestImpact : undefined,
      recommendations
    };
  }

  // Calculate overall score
  const scores = [];
  if (bootupTimeAudit?.score !== undefined) scores.push(bootupTimeAudit.score);
  if (mainThreadAudit?.score !== undefined) scores.push(mainThreadAudit.score);
  if (report.audits?.['uses-webp-images']?.score !== undefined) {
    scores.push(report.audits['uses-webp-images'].score);
  }

  if (scores.length > 0) {
    result.overallScore = (scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100;
  }

  if (bottlenecks.length > 0) {
    result.bottlenecks = bottlenecks;
  }

  return result;
}