import type { LighthouseReport } from '../types';

export interface RageClickAnalysis {
  likelihood: 'low' | 'medium' | 'high';
  factors: string[];
  riskScore: number;
  recommendations: string[];
}

export interface DeadClickAnalysis {
  likelihood: 'low' | 'medium' | 'high';
  issues: Array<{
    element: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  layoutShiftImpact: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface ErrorRateAnalysis {
  jsErrors: number;
  networkErrors: number;
  totalErrors: number;
  errorTypes: {
    typeError?: number;
    referenceError?: number;
    syntaxError?: number;
    notFound?: number;
    serverError?: number;
  };
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface FrustrationIndex {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  topIssues: Array<{
    issue: string;
    impact: number;
  }>;
}

export interface EngagementQuality {
  score: number;
  rating: 'poor' | 'fair' | 'good' | 'excellent';
  strengths: string[];
  weaknesses: string[];
}

export interface AccessibilityImpact {
  score: number;
  issues: Array<{
    type: string;
    count: number;
  }>;
  criticalIssues: string[];
  uxImpact: 'low' | 'medium' | 'high';
  affectedUsers: string[];
}

export interface UserExperienceAnalysis {
  rageClicks?: RageClickAnalysis;
  deadClicks?: DeadClickAnalysis;
  errorRate?: ErrorRateAnalysis;
  frustrationIndex?: FrustrationIndex;
  engagementQuality?: EngagementQuality;
  accessibilityImpact?: AccessibilityImpact;
}

export function analyzeUserExperience(report: LighthouseReport): UserExperienceAnalysis {
  const result: UserExperienceAnalysis = {};

  // Analyze rage click potential
  const maxFidAudit = report.audits?.['max-potential-fid'];
  const tbtAudit = report.audits?.['total-blocking-time'];
  const ttiAudit = report.audits?.['interactive'];

  if (maxFidAudit || tbtAudit || ttiAudit) {
    const factors: string[] = [];
    let riskScore = 0;

    const fidValue = maxFidAudit?.numericValue || 0;
    const tbtValue = tbtAudit?.numericValue || 0;
    const ttiValue = ttiAudit?.numericValue || 0;

    if (tbtValue > 1000) {
      factors.push(`High blocking time (${tbtValue}ms)`);
      riskScore += 40;
    }
    if (fidValue > 300) {
      factors.push(`Poor interactivity (FID: ${fidValue}ms)`);
      riskScore += 30;
    }
    if (ttiValue > 7000) {
      factors.push(`Slow time to interactive (${ttiValue}ms)`);
      riskScore += 30;
    }

    const recommendations: string[] = [];
    if (riskScore > 50) {
      recommendations.push('Reduce JavaScript execution time');
      recommendations.push('Optimize main thread work');
    }

    result.rageClicks = {
      likelihood: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
      factors,
      riskScore,
      recommendations
    };
  }

  // Analyze dead click potential
  const tapTargetsAudit = report.audits?.['tap-targets'];
  const clsAudit = report.audits?.['cumulative-layout-shift'];

  if (tapTargetsAudit || clsAudit) {
    const issues: any[] = [];
    let deadClickLikelihood: 'low' | 'medium' | 'high' = 'low';

    if (tapTargetsAudit?.details?.items) {
      const items = tapTargetsAudit.details.items as any[];
      items.forEach(item => {
        const size = item.size || '';
        const [width, height] = size.split('x').map(Number);

        if (width < 48 || height < 48) {
          issues.push({
            element: item.tapTarget,
            reason: item.overlappingTargets?.length > 0
              ? 'Small tap target with overlapping elements'
              : 'Tap target too small',
            severity: item.overlappingTargets?.length > 0 ? 'high' : 'medium'
          });
        }
      });

      if (issues.length > 3) deadClickLikelihood = 'high';
      else if (issues.length > 0) deadClickLikelihood = 'medium';
    }

    const clsValue = clsAudit?.numericValue || 0;
    const layoutShiftImpact = clsValue >= 0.25 ? 'high' : clsValue > 0.1 ? 'medium' : 'low';

    const recommendations: string[] = [];
    if (issues.length > 0) {
      recommendations.push('Increase tap target sizes');
    }
    if (layoutShiftImpact !== 'low') {
      recommendations.push('Reduce layout shifts');
    }

    result.deadClicks = {
      likelihood: deadClickLikelihood,
      issues,
      layoutShiftImpact,
      recommendations
    };
  }

  // Analyze error rates
  const consoleErrorsAudit = report.audits?.['errors-in-console'];
  const networkRequestsAudit = report.audits?.['network-requests'];

  if (consoleErrorsAudit || networkRequestsAudit) {
    let jsErrors = 0;
    let networkErrors = 0;
    const errorTypes: any = {};

    if (consoleErrorsAudit?.details?.items) {
      const items = consoleErrorsAudit.details.items as any[];
      items.forEach(item => {
        if (item.source === 'javascript') {
          jsErrors++;
          const description = item.description?.toLowerCase() || '';
          if (description.includes('typeerror')) errorTypes.typeError = (errorTypes.typeError || 0) + 1;
          if (description.includes('referenceerror')) errorTypes.referenceError = (errorTypes.referenceError || 0) + 1;
          if (description.includes('syntaxerror')) errorTypes.syntaxError = (errorTypes.syntaxError || 0) + 1;
        }
        // Don't count network errors from console here - they will be counted from network-requests audit
      });
    }

    if (networkRequestsAudit?.details?.items) {
      const items = networkRequestsAudit.details.items as any[];
      items.forEach(item => {
        if (item.statusCode === 404) {
          networkErrors++;
          errorTypes.notFound = (errorTypes.notFound || 0) + 1;
        } else if (item.statusCode >= 500) {
          networkErrors++;
          errorTypes.serverError = (errorTypes.serverError || 0) + 1;
        }
      });
    }

    const totalErrors = jsErrors + networkErrors;
    const recommendations: string[] = [];

    if (jsErrors > 0) {
      recommendations.push('Fix JavaScript errors');
    }
    if (networkErrors > 0) {
      recommendations.push('Handle API errors gracefully');
    }

    result.errorRate = {
      jsErrors,
      networkErrors,
      totalErrors,
      errorTypes,
      severity: totalErrors >= 4 ? 'high' : totalErrors > 2 ? 'medium' : 'low',
      recommendations
    };
  }

  // Calculate frustration index
  const lcpAudit = report.audits?.['largest-contentful-paint'];
  const frustrationFactors: string[] = [];
  const topIssues: any[] = [];
  let frustrationScore = 0;

  if (lcpAudit?.numericValue && lcpAudit.numericValue > 4000) {
    frustrationFactors.push(`Slow loading (LCP: ${lcpAudit.numericValue}ms)`);
    topIssues.push({ issue: 'Slow LCP', impact: 30 });
    frustrationScore += 30;
  }

  if (clsAudit?.numericValue && clsAudit.numericValue > 0.1) {
    frustrationFactors.push(`Layout instability (CLS: ${clsAudit.numericValue.toFixed(2)})`);
    topIssues.push({ issue: 'High CLS', impact: 20 });
    frustrationScore += 20;
  }

  if (tbtAudit?.numericValue && tbtAudit.numericValue > 600) {
    frustrationFactors.push(`Poor responsiveness (TBT: ${tbtAudit.numericValue}ms)`);
    topIssues.push({ issue: 'High TBT', impact: 25 });
    frustrationScore += 25;
  }

  if (result.errorRate && result.errorRate.totalErrors > 0) {
    frustrationFactors.push(`${result.errorRate.totalErrors} errors detected`);
    frustrationScore += result.errorRate.totalErrors * 5;
  }

  // Sort top issues by impact
  topIssues.sort((a, b) => b.impact - a.impact);

  result.frustrationIndex = {
    score: Math.min(frustrationScore, 100),
    level: frustrationScore > 80 ? 'critical' :
           frustrationScore > 50 ? 'high' :
           frustrationScore > 30 ? 'medium' : 'low',
    factors: frustrationFactors,
    topIssues: topIssues.slice(0, 3)
  };

  // Calculate engagement quality
  const fcpAudit = report.audits?.['first-contentful-paint'];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  let qualityScore = 100;

  if (fcpAudit?.numericValue && fcpAudit.numericValue < 1800) {
    strengths.push('Fast initial load');
  } else {
    weaknesses.push('Slow initial load');
    qualityScore -= 20;
  }

  if (ttiAudit?.numericValue && ttiAudit.numericValue < 3800) {
    strengths.push('Quick interactivity');
  } else {
    weaknesses.push('Slow interactivity');
    qualityScore -= 15;
  }

  if (clsAudit?.numericValue && clsAudit.numericValue < 0.1) {
    strengths.push('Stable layout');
  } else {
    weaknesses.push('Layout instability');
    qualityScore -= 15;
  }

  if (result.errorRate?.totalErrors === 0) {
    strengths.push('No errors detected');
  } else {
    weaknesses.push('Errors present');
    qualityScore -= 10;
  }

  result.engagementQuality = {
    score: Math.max(qualityScore, 0),
    rating: qualityScore >= 85 ? 'excellent' :
            qualityScore >= 70 ? 'good' :
            qualityScore >= 50 ? 'fair' : 'poor',
    strengths,
    weaknesses
  };

  // Analyze accessibility impact on UX
  const accessibilityScore = report.categories?.accessibility?.score;
  const colorContrastAudit = report.audits?.['color-contrast'];
  const imageAltAudit = report.audits?.['image-alt'];
  const buttonNameAudit = report.audits?.['button-name'];

  if (accessibilityScore !== undefined) {
    const issues: any[] = [];
    const criticalIssues: string[] = [];
    const affectedUsers: string[] = [];

    if (colorContrastAudit?.score === 0) {
      const items = (colorContrastAudit.details?.items || []) as any[];
      issues.push({ type: 'color-contrast', count: items.length });
      criticalIssues.push('Poor color contrast');
      affectedUsers.push('Users with visual impairments');
    }

    if (imageAltAudit?.score !== undefined && imageAltAudit.score < 1) {
      const items = (imageAltAudit.details?.items || []) as any[];
      issues.push({ type: 'missing-alt', count: items.length });
      criticalIssues.push('Missing image alt text');
      affectedUsers.push('Screen reader users');
    }

    if (buttonNameAudit?.score !== undefined && buttonNameAudit.score < 1) {
      const items = (buttonNameAudit.details?.items || []) as any[];
      issues.push({ type: 'unlabeled-buttons', count: items.length });
      criticalIssues.push('Unlabeled buttons');
      affectedUsers.push('Screen reader users');
    }

    const uxImpact = accessibilityScore < 0.5 ? 'high' :
                     accessibilityScore < 0.8 ? 'medium' : 'low';

    result.accessibilityImpact = {
      score: Math.round(accessibilityScore * 100),
      issues,
      criticalIssues,
      uxImpact,
      affectedUsers: Array.from(new Set(affectedUsers))
    };
  }

  return result;
}