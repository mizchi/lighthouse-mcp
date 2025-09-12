/**
 * L3 Database Query Tool
 * 
 * This tool provides database query capabilities for analyzing stored Lighthouse results.
 * It requires interpretation and reasoning about the data patterns.
 */

import { LighthouseDatabase } from '../core/database.js';
import type { CrawlResult } from '../core/database.js';

export interface L3DatabaseQueryParams {
  queryType: 'trends' | 'comparison' | 'statistics' | 'search' | 'custom';
  url?: string;
  device?: 'mobile' | 'desktop';
  days?: number;
  limit?: number;
  customSql?: string;
  customParams?: any[];
}

export interface TrendAnalysis {
  url: string;
  device: 'mobile' | 'desktop';
  period: string;
  dataPoints: Array<{
    timestamp: string;
    performanceScore: number | null;
    fcp: number | null;
    lcp: number | null;
    cls: number | null;
    tbt: number | null;
  }>;
  trends: {
    performance: 'improving' | 'declining' | 'stable' | 'volatile';
    averageScore: number;
    scoreChange: number;
    volatility: number;
  };
  insights: string[];
}

export interface ComparisonResult {
  urls: string[];
  device: 'mobile' | 'desktop';
  metrics: Array<{
    url: string;
    performanceScore: number | null;
    fcp: number | null;
    lcp: number | null;
    cls: number | null;
    tbt: number | null;
    lastAnalyzed: string;
  }>;
  rankings: {
    performance: string[];
    fcp: string[];
    lcp: string[];
    tbt: string[];
  };
  recommendations: string[];
}

export interface DatabaseStatistics {
  totalCrawls: number;
  uniqueUrls: number;
  avgPerformanceScore: number;
  dateRange: {
    first: string;
    last: string;
  };
  topPerformers: Array<{
    url: string;
    score: number;
  }>;
  bottomPerformers: Array<{
    url: string;
    score: number;
  }>;
  recentActivity: Array<{
    url: string;
    timestamp: string;
    score: number | null;
  }>;
}

export interface L3DatabaseQueryResult {
  queryType: string;
  trends?: TrendAnalysis;
  comparison?: ComparisonResult;
  statistics?: DatabaseStatistics;
  searchResults?: CrawlResult[];
  customResults?: any[];
  executionTime: number;
  recommendations?: string[];
}

/**
 * MCP tool definition for L3 database queries
 */
export const l3DatabaseQueryTool = {
  name: 'l3_database_query',
  description: 'Query and analyze stored Lighthouse results from the database with interpretation',
  inputSchema: {
    type: 'object',
    properties: {
      queryType: {
        type: 'string',
        enum: ['trends', 'comparison', 'statistics', 'search', 'custom'],
        description: 'Type of query to execute',
      },
      url: {
        type: 'string',
        description: 'URL to query (for trends and search)',
      },
      device: {
        type: 'string',
        enum: ['mobile', 'desktop'],
        default: 'mobile',
        description: 'Device type to filter by',
      },
      days: {
        type: 'number',
        default: 30,
        description: 'Number of days to look back for trends',
      },
      limit: {
        type: 'number',
        default: 10,
        description: 'Maximum number of results to return',
      },
      customSql: {
        type: 'string',
        description: 'Custom SQL query (for advanced users)',
      },
      customParams: {
        type: 'array',
        description: 'Parameters for custom SQL query',
      },
    },
    required: ['queryType'],
  },
};

/**
 * Execute database query and analysis
 */
export async function executeL3DatabaseQuery(params: L3DatabaseQueryParams): Promise<L3DatabaseQueryResult> {
  const startTime = Date.now();
  const db = new LighthouseDatabase();

  try {
    switch (params.queryType) {
      case 'trends':
        return await analyzeTrends(db, params, startTime);
      
      case 'comparison':
        return await compareUrls(db, params, startTime);
      
      case 'statistics':
        return await getStatistics(db, startTime);
      
      case 'search':
        return await searchCrawls(db, params, startTime);
      
      case 'custom':
        return await executeCustomQuery(db, params, startTime);
      
      default:
        throw new Error(`Unknown query type: ${params.queryType}`);
    }
  } finally {
    db.close();
  }
}

/**
 * Analyze performance trends for a URL
 */
async function analyzeTrends(
  db: LighthouseDatabase,
  params: L3DatabaseQueryParams,
  startTime: number
): Promise<L3DatabaseQueryResult> {
  if (!params.url) {
    throw new Error('URL is required for trends analysis');
  }

  const trends = db.getPerformanceTrends(
    params.url,
    params.device || 'mobile',
    params.days || 30
  );

  if (trends.length === 0) {
    return {
      queryType: 'trends',
      trends: {
        url: params.url,
        device: params.device || 'mobile',
        period: `${params.days || 30} days`,
        dataPoints: [],
        trends: {
          performance: 'stable',
          averageScore: 0,
          scoreChange: 0,
          volatility: 0,
        },
        insights: ['No data available for the specified period'],
      },
      executionTime: Date.now() - startTime,
    };
  }

  // Calculate trend metrics
  const scores = trends
    .map(t => t.performance_score)
    .filter((s): s is number => s !== null);
  
  const avgScore = scores.length > 0 
    ? scores.reduce((a, b) => a + b, 0) / scores.length 
    : 0;
  
  const scoreChange = scores.length >= 2 
    ? scores[scores.length - 1] - scores[0]
    : 0;
  
  // Calculate volatility (standard deviation)
  const variance = scores.length > 0
    ? scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length
    : 0;
  const volatility = Math.sqrt(variance);

  // Determine trend direction
  let trendDirection: 'improving' | 'declining' | 'stable' | 'volatile';
  if (volatility > 0.1) {
    trendDirection = 'volatile';
  } else if (scoreChange > 0.05) {
    trendDirection = 'improving';
  } else if (scoreChange < -0.05) {
    trendDirection = 'declining';
  } else {
    trendDirection = 'stable';
  }

  // Generate insights
  const insights: string[] = [];
  
  if (trendDirection === 'improving') {
    insights.push(`Performance has improved by ${(scoreChange * 100).toFixed(1)} points over the period`);
  } else if (trendDirection === 'declining') {
    insights.push(`Performance has declined by ${Math.abs(scoreChange * 100).toFixed(1)} points over the period`);
  } else if (trendDirection === 'volatile') {
    insights.push(`Performance shows high volatility with standard deviation of ${(volatility * 100).toFixed(1)} points`);
  }

  // Check for Core Web Vitals trends
  const lcpTrend = analyzeCoreWebVitalTrend(trends, 'lcp', 2500, 4000);
  const fcpTrend = analyzeCoreWebVitalTrend(trends, 'fcp', 1800, 3000);
  const clsTrend = analyzeCoreWebVitalTrend(trends, 'cls', 0.1, 0.25);
  
  insights.push(...lcpTrend);
  insights.push(...fcpTrend);
  insights.push(...clsTrend);

  return {
    queryType: 'trends',
    trends: {
      url: params.url,
      device: params.device || 'mobile',
      period: `${params.days || 30} days`,
      dataPoints: trends.map(t => ({
        timestamp: t.timestamp,
        performanceScore: t.performance_score,
        fcp: t.fcp,
        lcp: t.lcp,
        cls: t.cls,
        tbt: t.tbt,
      })),
      trends: {
        performance: trendDirection,
        averageScore: avgScore,
        scoreChange: scoreChange,
        volatility: volatility,
      },
      insights,
    },
    executionTime: Date.now() - startTime,
    recommendations: generateTrendRecommendations(trendDirection, avgScore, insights),
  };
}

/**
 * Analyze Core Web Vital trend
 */
function analyzeCoreWebVitalTrend(
  trends: CrawlResult[],
  metric: 'fcp' | 'lcp' | 'cls' | 'tbt',
  goodThreshold: number,
  poorThreshold: number
): string[] {
  const insights: string[] = [];
  const values = trends.map(t => t[metric]).filter((v): v is number => v !== null);
  
  if (values.length === 0) return insights;
  
  const latestValue = values[values.length - 1];
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  
  const metricName = {
    fcp: 'First Contentful Paint',
    lcp: 'Largest Contentful Paint',
    cls: 'Cumulative Layout Shift',
    tbt: 'Total Blocking Time',
  }[metric];
  
  if (avgValue < goodThreshold) {
    insights.push(`${metricName} is consistently good (avg: ${formatMetricValue(avgValue, metric)})`);
  } else if (avgValue > poorThreshold) {
    insights.push(`${metricName} needs improvement (avg: ${formatMetricValue(avgValue, metric)})`);
  }
  
  // Check for degradation
  if (values.length >= 2) {
    const firstValue = values[0];
    const change = ((latestValue - firstValue) / firstValue) * 100;
    
    if (Math.abs(change) > 20) {
      const direction = change > 0 ? 'increased' : 'decreased';
      insights.push(`${metricName} has ${direction} by ${Math.abs(change).toFixed(0)}%`);
    }
  }
  
  return insights;
}

/**
 * Format metric value for display
 */
function formatMetricValue(value: number, metric: string): string {
  switch (metric) {
    case 'cls':
      return value.toFixed(3);
    case 'fcp':
    case 'lcp':
    case 'tbt':
    case 'tti':
    case 'si':
      return `${Math.round(value)}ms`;
    default:
      return value.toString();
  }
}

/**
 * Compare multiple URLs
 */
async function compareUrls(
  db: LighthouseDatabase,
  params: L3DatabaseQueryParams,
  startTime: number
): Promise<L3DatabaseQueryResult> {
  const urls = db.getAllUrls().slice(0, params.limit || 10);
  
  if (urls.length === 0) {
    return {
      queryType: 'comparison',
      comparison: {
        urls: [],
        device: params.device || 'mobile',
        metrics: [],
        rankings: {
          performance: [],
          fcp: [],
          lcp: [],
          tbt: [],
        },
        recommendations: ['No URLs found in database'],
      },
      executionTime: Date.now() - startTime,
    };
  }

  const metrics = urls.map(url => {
    const latest = db.getLatestCrawl(url, params.device || 'mobile');
    if (!latest) {
      return null;
    }
    
    return {
      url,
      performanceScore: latest.performance_score,
      fcp: latest.fcp,
      lcp: latest.lcp,
      cls: latest.cls,
      tbt: latest.tbt,
      lastAnalyzed: latest.timestamp,
    };
  }).filter((m): m is NonNullable<typeof m> => m !== null);

  // Create rankings
  const rankings = {
    performance: [...metrics].sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0)).map(m => m.url),
    fcp: [...metrics].sort((a, b) => (a.fcp || Infinity) - (b.fcp || Infinity)).map(m => m.url),
    lcp: [...metrics].sort((a, b) => (a.lcp || Infinity) - (b.lcp || Infinity)).map(m => m.url),
    tbt: [...metrics].sort((a, b) => (a.tbt || Infinity) - (b.tbt || Infinity)).map(m => m.url),
  };

  // Generate recommendations
  const recommendations: string[] = [];
  
  const worstPerformer = metrics.reduce((worst, current) => 
    (current.performanceScore || 0) < (worst.performanceScore || 0) ? current : worst
  );
  
  if (worstPerformer && worstPerformer.performanceScore !== null && worstPerformer.performanceScore < 0.5) {
    recommendations.push(`${worstPerformer.url} has the lowest performance score (${(worstPerformer.performanceScore * 100).toFixed(0)}) and should be prioritized for optimization`);
  }
  
  const highTBT = metrics.filter(m => m.tbt && m.tbt > 300);
  if (highTBT.length > 0) {
    recommendations.push(`${highTBT.length} URL(s) have high Total Blocking Time (>300ms), indicating JavaScript performance issues`);
  }

  return {
    queryType: 'comparison',
    comparison: {
      urls,
      device: params.device || 'mobile',
      metrics,
      rankings,
      recommendations,
    },
    executionTime: Date.now() - startTime,
  };
}

/**
 * Get database statistics
 */
async function getStatistics(
  db: LighthouseDatabase,
  startTime: number
): Promise<L3DatabaseQueryResult> {
  const stats = db.getStatistics();
  
  // Get top and bottom performers
  const topPerformers = db.query(
    `SELECT DISTINCT url, AVG(performance_score) as score 
     FROM crawl_results 
     WHERE performance_score IS NOT NULL 
     GROUP BY url 
     ORDER BY score DESC 
     LIMIT 5`
  ).map((row: any) => ({ url: row.url, score: row.score }));
  
  const bottomPerformers = db.query(
    `SELECT DISTINCT url, AVG(performance_score) as score 
     FROM crawl_results 
     WHERE performance_score IS NOT NULL 
     GROUP BY url 
     ORDER BY score ASC 
     LIMIT 5`
  ).map((row: any) => ({ url: row.url, score: row.score }));
  
  // Get date range
  const dateRange = db.query(
    `SELECT MIN(timestamp) as first, MAX(timestamp) as last FROM crawl_results`
  )[0] as { first: string; last: string };
  
  // Recent activity
  const recentActivity = stats.recentCrawls.map(crawl => ({
    url: crawl.url,
    timestamp: crawl.timestamp,
    score: crawl.performance_score,
  }));

  return {
    queryType: 'statistics',
    statistics: {
      totalCrawls: stats.totalCrawls,
      uniqueUrls: stats.uniqueUrls,
      avgPerformanceScore: stats.avgPerformanceScore,
      dateRange,
      topPerformers,
      bottomPerformers,
      recentActivity,
    },
    executionTime: Date.now() - startTime,
    recommendations: generateStatisticsRecommendations(stats, topPerformers, bottomPerformers),
  };
}

/**
 * Search crawls
 */
async function searchCrawls(
  db: LighthouseDatabase,
  params: L3DatabaseQueryParams,
  startTime: number
): Promise<L3DatabaseQueryResult> {
  if (!params.url) {
    throw new Error('URL is required for search');
  }

  const results = db.getCrawlsByUrl(params.url, params.limit || 10);

  return {
    queryType: 'search',
    searchResults: results,
    executionTime: Date.now() - startTime,
    recommendations: results.length === 0 
      ? [`No results found for ${params.url}. Try running a Lighthouse analysis first.`]
      : [`Found ${results.length} result(s) for ${params.url}`],
  };
}

/**
 * Execute custom SQL query
 */
async function executeCustomQuery(
  db: LighthouseDatabase,
  params: L3DatabaseQueryParams,
  startTime: number
): Promise<L3DatabaseQueryResult> {
  if (!params.customSql) {
    throw new Error('Custom SQL is required for custom query');
  }

  // Safety check: only allow SELECT queries
  if (!params.customSql.trim().toUpperCase().startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed');
  }

  try {
    const results = db.query(params.customSql, params.customParams || []);
    
    return {
      queryType: 'custom',
      customResults: results,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    throw new Error(`SQL query failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate recommendations based on trends
 */
function generateTrendRecommendations(
  trend: 'improving' | 'declining' | 'stable' | 'volatile',
  avgScore: number,
  insights: string[]
): string[] {
  const recommendations: string[] = [];

  switch (trend) {
    case 'declining':
      recommendations.push('Performance is declining. Review recent changes and deployments.');
      recommendations.push('Consider running a performance audit to identify bottlenecks.');
      break;
    
    case 'volatile':
      recommendations.push('Performance is unstable. This may indicate inconsistent server response times or third-party script issues.');
      recommendations.push('Monitor during different times of day to identify patterns.');
      break;
    
    case 'improving':
      recommendations.push('Performance is improving. Continue monitoring to ensure the trend continues.');
      break;
    
    case 'stable':
      if (avgScore < 0.5) {
        recommendations.push('Performance is stable but below acceptable levels. Consider optimization efforts.');
      } else if (avgScore < 0.9) {
        recommendations.push('Performance is stable. Look for opportunities to reach the 90+ score range.');
      }
      break;
  }

  // Add specific recommendations based on insights
  if (insights.some(i => i.includes('Largest Contentful Paint needs improvement'))) {
    recommendations.push('Optimize images and server response times to improve LCP.');
  }
  
  if (insights.some(i => i.includes('Total Blocking Time needs improvement'))) {
    recommendations.push('Review and optimize JavaScript execution to reduce TBT.');
  }

  return recommendations;
}

/**
 * Generate recommendations based on statistics
 */
function generateStatisticsRecommendations(
  stats: any,
  topPerformers: any[],
  bottomPerformers: any[]
): string[] {
  const recommendations: string[] = [];

  if (stats.avgPerformanceScore < 0.5) {
    recommendations.push('Overall performance is poor. Consider a comprehensive performance optimization initiative.');
  }

  if (bottomPerformers.length > 0 && bottomPerformers[0].score < 0.3) {
    recommendations.push(`Critical: ${bottomPerformers[0].url} has very poor performance (${(bottomPerformers[0].score * 100).toFixed(0)})`);
  }

  if (topPerformers.length > 0 && bottomPerformers.length > 0) {
    const gap = topPerformers[0].score - bottomPerformers[0].score;
    if (gap > 0.5) {
      recommendations.push('Large performance gap between best and worst URLs. Apply optimizations from top performers to struggling pages.');
    }
  }

  if (stats.uniqueUrls > 20) {
    recommendations.push('Consider implementing automated performance monitoring for all URLs.');
  }

  return recommendations;
}