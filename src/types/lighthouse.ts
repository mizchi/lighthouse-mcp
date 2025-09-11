// Lighthouse type definitions with internal types
import type * as LH from "lighthouse/types/lh.d.ts";

// Re-export Lighthouse's internal types
export type LighthouseResult = LH.Result;
export type AuditResult = LH.Audit.Result;
export type AuditDetails = LH.Audit.Details;
export type CategoryResult = LH.Result.Category;

// Specific audit types for easier access
export type MetricAudit = LH.Audit.Result & {
  numericValue?: number;
  numericUnit?: string;
};

export type AuditDetailsItem = {
  url?: string;
  wastedMs?: number;
  wastedBytes?: number;
  totalBytes?: number;
  transferSize?: number;
  mainThreadTime?: number;
  blockingTime?: number;
  [key: string]: unknown;
};

export type AuditDetailsWithItems = {
  type: 'opportunity' | 'table' | 'list';
  items: AuditDetailsItem[];
  overallSavingsMs?: number;
  overallSavingsBytes?: number;
  headings?: Array<{key: string; label: string}>;
};

export type CriticalChainDetails = {
  type: 'criticalrequestchain';
  chains: Record<string, ChainNode>;
  longestChain?: {
    duration: number;
    length: number;
    transferSize: number;
  };
};

export type ChainNode = {
  request: {
    url: string;
    startTime: number;
    endTime: number;
    responseReceivedTime: number;
    transferSize: number;
  };
  children?: Record<string, ChainNode>;
};

export type ResourceAudit = LH.Audit.Result & {
  details?: AuditDetailsWithItems;
};

export type OpportunityAudit = LH.Audit.Result & {
  details?: AuditDetailsWithItems;
};

// Map of specific audits we use in the codebase
// Using index signature for flexibility
export interface LighthouseAudits {
  // Core Web Vitals
  "largest-contentful-paint": MetricAudit;
  "first-contentful-paint": MetricAudit;
  "cumulative-layout-shift": MetricAudit;
  "total-blocking-time": MetricAudit;
  "max-potential-fid": MetricAudit;

  // Performance metrics
  "speed-index": MetricAudit;
  interactive: MetricAudit;
  "server-response-time": MetricAudit;
  "first-meaningful-paint"?: MetricAudit;
  "first-cpu-idle"?: MetricAudit;

  // Resource audits
  "render-blocking-resources": ResourceAudit;
  "uses-optimized-images": OpportunityAudit;
  "uses-webp-images": OpportunityAudit;
  "uses-responsive-images": OpportunityAudit;
  "offscreen-images": OpportunityAudit;
  "unused-css-rules": ResourceAudit;
  "unused-javascript": ResourceAudit;
  "modern-image-formats": OpportunityAudit;

  // JavaScript audits
  "bootup-time": ResourceAudit;
  "mainthread-work-breakdown": ResourceAudit;
  "third-party-summary": ResourceAudit;
  "third-party-facades": OpportunityAudit;

  // Network audits
  "network-requests": MetricAudit;
  "network-rtt": MetricAudit;
  "network-server-latency": MetricAudit;
  "uses-rel-preconnect": OpportunityAudit;
  "uses-rel-preload": OpportunityAudit;

  // Caching audits
  "uses-long-cache-ttl": ResourceAudit;
  "efficient-animated-content": OpportunityAudit;

  // Critical chain - special case with specific structure
  "critical-request-chains": LH.Audit.Result & {
    details?: CriticalChainDetails;
  };

  // Font display
  "font-display": MetricAudit;

  // Layout shift
  "layout-shift-elements": MetricAudit;
  
  // Allow any other audit keys
  [key: string]: LH.Audit.Result | undefined;
}

// Our custom LighthouseReport type with stronger typing
export interface LighthouseReport extends Partial<Omit<LH.Result, 'audits' | 'categories'>> {
  // Make requestedUrl always defined for our use case
  requestedUrl: string;
  // finalUrl should also be defined
  finalUrl: string;
  // Use our more specific audit types
  audits: LighthouseAudits;
  // Keep categories with Lighthouse's native type
  categories: {
    performance?: LH.Result.Category;
    accessibility?: LH.Result.Category;
    'best-practices'?: LH.Result.Category;
    seo?: LH.Result.Category;
    pwa?: LH.Result.Category;
  };
}