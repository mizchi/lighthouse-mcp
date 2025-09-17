import type { LighthouseReport, Pattern } from '../types';

/**
 * Detect patterns in Lighthouse report
 */
export function detectPatterns(report: LighthouseReport): Pattern[] {
  const patterns: Pattern[] = [];

  if (!report || !report.audits) {
    return patterns;
  }

  // Check for common performance patterns
  const audits = report.audits;

  // Large JavaScript pattern
  const bootupAudit = audits['bootup-time'];
  if (typeof bootupAudit?.score === 'number' && bootupAudit.score < 0.5) {
    patterns.push({
      id: 'large-javascript',
      name: 'Large JavaScript Bundles',
      confidence: 0.8,
      indicators: ['High JavaScript execution time', 'Large bundle sizes'],
      recommendations: [
        'Code split your JavaScript bundles',
        'Remove unused code',
        'Minimize and compress JavaScript files'
      ]
    });
  }

  // Unoptimized images pattern
  const optimizedImagesAudit = audits['uses-optimized-images'];
  if (typeof optimizedImagesAudit?.score === 'number' && optimizedImagesAudit.score < 0.5) {
    patterns.push({
      id: 'unoptimized-images',
      name: 'Unoptimized Images',
      confidence: 0.9,
      indicators: ['Large image file sizes', 'Missing modern formats'],
      recommendations: [
        'Use WebP or AVIF formats',
        'Implement responsive images',
        'Compress images properly'
      ]
    });
  }

  // Render blocking resources pattern
  const renderBlockingAudit = audits['render-blocking-resources'];
  if (typeof renderBlockingAudit?.score === 'number' && renderBlockingAudit.score < 0.5) {
    patterns.push({
      id: 'render-blocking',
      name: 'Render Blocking Resources',
      confidence: 0.85,
      indicators: ['Blocking CSS', 'Blocking JavaScript in head'],
      recommendations: [
        'Inline critical CSS',
        'Defer non-critical JavaScript',
        'Use async/defer attributes'
      ]
    });
  }

  return patterns;
}
