// Type definitions for Lighthouse MCP
export { 
  LighthouseReport, 
  LighthouseAudits, 
  CategoryResult,
  CriticalChainDetails,
  ChainNode,
  AuditDetailsItem,
  AuditDetailsWithItems,
  ResourceAudit,
  OpportunityAudit,
  MetricAudit
} from "./lighthouse";

// Lighthouse configuration types
export interface LighthouseConfig {
  categories?: string[];
  device?: "mobile" | "desktop";
  throttling?: any;
  onlyCategories?: string[];
  disableStorageReset?: boolean;
  emulatedFormFactor?: string;
  maxBrowsers?: number;
  timeout?: number;
  userDataDir?: string;
  formFactor?: 'mobile' | 'desktop';
  screenEmulation?: any;
  logLevel?: string;
}

export interface PerformanceMetrics {
  lcp?: number;
  fcp?: number;
  cls?: number;
  tti?: number;
  tbt?: number;
  si?: number;
  fid?: number;
  ttfb?: number;
}

import type { AuditResult } from './lighthouse';

export interface Problem {
  id: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  impact: number;
  weight?: number;
  weightedImpact?: number;
  description: string;
  audit?: AuditResult;
}

export interface Pattern {
  id: string;
  name: string;
  confidence: number;
  indicators: string[];
  recommendations: string[];
}
