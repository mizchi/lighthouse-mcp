/**
 * MCP Tools Registry
 *
 * Centralized registry for all MCP tools with categorization and metadata
 */

import type { MCPTool } from '../types/mcp-types.js';

export interface ToolCategory {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export interface RegisteredTool {
  tool: MCPTool;
  category: string;
  subcategory?: string;
  aliases?: string[];
  tags?: string[];
  complexity?: 'basic' | 'intermediate' | 'advanced';
  dependencies?: string[];
}

export const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  collection: {
    id: 'collection',
    name: 'Data Collection',
    description: 'Collect Lighthouse reports and raw performance data',
    emoji: '🔍'
  },
  performance: {
    id: 'performance',
    name: 'Performance Analysis',
    description: 'Analyze performance metrics and Core Web Vitals',
    emoji: '📊'
  },
  resource: {
    id: 'resource',
    name: 'Resource Analysis',
    description: 'Analyze resource usage, dependencies, and optimization opportunities',
    emoji: '📦'
  },
  issues: {
    id: 'issues',
    name: 'Issue Detection',
    description: 'Detect and categorize performance issues',
    emoji: '🔎'
  },
  strategy: {
    id: 'strategy',
    name: 'Strategic Intelligence',
    description: 'Strategic planning, budgeting, and optimization',
    emoji: '🎯'
  },
  comparison: {
    id: 'comparison',
    name: 'Comparative Analysis',
    description: 'Compare performance across sites and time',
    emoji: '⚖️'
  }
};

// Tool registry with improved naming and categorization
export const TOOL_REGISTRY: Map<string, RegisteredTool> = new Map();

// Helper function to register a tool
export function registerTool(
  name: string,
  tool: MCPTool,
  category: string,
  options: Partial<RegisteredTool> = {}
): void {
  TOOL_REGISTRY.set(name, {
    tool,
    category,
    ...options
  });
}

// Initialize registry with all tools
export async function initializeRegistry(): Promise<void> {
  // Clear existing registry
  TOOL_REGISTRY.clear();

  // Layer 1 - Collection Tools
  const { l1CollectTool } = await import('./l1-collect-single.js');
  registerTool('lighthouse_collect', l1CollectTool, 'collection', {
    aliases: ['l1_collect', 'collect'],
    tags: ['lighthouse', 'audit', 'performance'],
    complexity: 'basic'
  });

  const { l1BatchCollectTool } = await import('./l1-collect-batch.js');
  registerTool('lighthouse_batch', l1BatchCollectTool, 'collection', {
    aliases: ['l1_batch_collect', 'batch_collect'],
    tags: ['lighthouse', 'batch', 'parallel'],
    complexity: 'intermediate'
  });

  const { l1ListReportsTool } = await import('./l1-list-reports.js');
  registerTool('lighthouse_list_reports', l1ListReportsTool, 'collection', {
    subcategory: 'management',
    aliases: ['l1_list_reports', 'list_reports'],
    tags: ['reports', 'database'],
    complexity: 'basic'
  });

  const { l1GetReportTool } = await import('./l1-get-report.js');
  registerTool('lighthouse_get_report', l1GetReportTool, 'collection', {
    subcategory: 'management',
    aliases: ['l1_get_report', 'get_report'],
    tags: ['reports', 'database'],
    complexity: 'basic'
  });

  // Layer 2 - Performance Analysis Tools

  const { l2ScoreAnalysisTool } = await import('./l2-score-analysis.js');
  registerTool('performance_score_breakdown', l2ScoreAnalysisTool, 'performance', {
    subcategory: 'scoring',
    aliases: ['l2_score_analysis', 'score_analysis'],
    tags: ['score', 'audit', 'breakdown'],
    complexity: 'intermediate'
  });

  // Layer 2 - Resource Analysis Tools
  const { l2UnusedCodeTool } = await import('./l2-unused-code.js');
  registerTool('resource_unused_code', l2UnusedCodeTool, 'resource', {
    aliases: ['l2_unused_code', 'unused_code'],
    tags: ['css', 'javascript', 'coverage'],
    complexity: 'intermediate'
  });

  const { l2CriticalChainTool } = await import('./l2-critical-chain.js');
  registerTool('resource_critical_chain', l2CriticalChainTool, 'resource', {
    aliases: ['l2_critical_chain', 'critical_chain'],
    tags: ['waterfall', 'dependencies', 'blocking'],
    complexity: 'advanced'
  });

  const { l2ThirdPartyImpactTool, l2ProgressiveThirdPartyTool } = await import('./l2-third-party-impact.js');
  registerTool('resource_third_party', l2ThirdPartyImpactTool, 'resource', {
    aliases: ['l2_third_party_impact', 'third_party'],
    tags: ['third-party', 'blocking', 'impact'],
    complexity: 'intermediate'
  });

  registerTool('resource_third_party_progressive', l2ProgressiveThirdPartyTool, 'resource', {
    aliases: ['l2_progressive_third_party'],
    tags: ['third-party', 'progressive', 'detailed'],
    complexity: 'advanced',
    dependencies: ['resource_third_party']
  });

  // Layer 2 - Issue Detection Tools
  const { l2WeightedIssuesTool } = await import('./l2-weighted-issues.js');
  registerTool('issues_weighted', l2WeightedIssuesTool, 'issues', {
    aliases: ['l2_weighted_issues', 'weighted_issues'],
    tags: ['issues', 'problems', 'priority', 'weights'],
    complexity: 'intermediate'
  });

  const { l2LCPChainAnalysisTool } = await import('./l2-lcp-chain-analysis.js');
  registerTool('issues_lcp_chain', l2LCPChainAnalysisTool, 'issues', {
    subcategory: 'rendering',
    aliases: ['l2_lcp_chain_analysis', 'lcp_chain'],
    tags: ['lcp', 'rendering', 'paint'],
    complexity: 'advanced'
  });

  const { l2CriticalChainReportTool } = await import('./l2-critical-chain-report.js');
  registerTool('issues_critical_bottlenecks', l2CriticalChainReportTool, 'issues', {
    subcategory: 'bottlenecks',
    aliases: ['l2_critical_chain_report'],
    tags: ['bottlenecks', 'critical-path'],
    complexity: 'advanced'
  });

  // Layer 2 - Comparison Tools
  const { l2SiteComparisonTool } = await import('./l2-site-comparison.js');
  registerTool('compare_sites', l2SiteComparisonTool, 'comparison', {
    aliases: ['l2_site_comparison', 'site_comparison'],
    tags: ['comparison', 'benchmark', 'competitive'],
    complexity: 'intermediate'
  });

  const { l2DeepAnalysisTool } = await import('./l2-deep-analysis.js');
  registerTool('analyze_deep', l2DeepAnalysisTool, 'performance', {
    subcategory: 'comprehensive',
    aliases: ['l2_deep_analysis', 'deep_analysis'],
    tags: ['comprehensive', 'detailed', 'insights'],
    complexity: 'advanced'
  });

  // Layer 3 - Strategic Intelligence Tools
  const { l3PerformanceBudgetTool } = await import('./l3-performance-budget.js');
  registerTool('budget_analyze', l3PerformanceBudgetTool, 'strategy', {
    subcategory: 'budgeting',
    aliases: ['l3_performance_budget', 'performance_budget'],
    tags: ['budget', 'compliance', 'targets'],
    complexity: 'advanced'
  });

  const { l3PatternInsightsTool } = await import('./l3-pattern-insights.js');
  registerTool('patterns_insights', l3PatternInsightsTool, 'strategy', {
    subcategory: 'patterns',
    aliases: ['l3_pattern_insights', 'pattern_insights'],
    tags: ['patterns', 'trends', 'insights'],
    complexity: 'advanced'
  });

  const { l3DatabaseQueryTool } = await import('./l3-database-query.js');
  registerTool('query_database', l3DatabaseQueryTool, 'strategy', {
    subcategory: 'data',
    aliases: ['l3_database_query', 'database_query'],
    tags: ['database', 'query', 'custom'],
    complexity: 'advanced'
  });

  const { l3ActionPlanGeneratorTool } = await import('./l3-action-plan-generator.js');
  registerTool('action_plan_generator', l3ActionPlanGeneratorTool, 'strategy', {
    subcategory: 'planning',
    aliases: ['l3_action_plan_generator', 'action_plan'],
    tags: ['action-plan', 'prioritization', 'roadmap', 'aggregation'],
    complexity: 'advanced'
  });
}

// Get tool by name or alias
export function getTool(nameOrAlias: string): RegisteredTool | undefined {
  // Direct lookup
  const tool = TOOL_REGISTRY.get(nameOrAlias);
  if (tool) return tool;

  // Search by alias
  for (const [, registeredTool] of TOOL_REGISTRY) {
    if (registeredTool.aliases?.includes(nameOrAlias)) {
      return registeredTool;
    }
  }

  return undefined;
}

// Get tools by category
export function getToolsByCategory(category: string): RegisteredTool[] {
  const tools: RegisteredTool[] = [];
  for (const [, tool] of TOOL_REGISTRY) {
    if (tool.category === category) {
      tools.push(tool);
    }
  }
  return tools;
}

// Get tools by tag
export function getToolsByTag(tag: string): RegisteredTool[] {
  const tools: RegisteredTool[] = [];
  for (const [, tool] of TOOL_REGISTRY) {
    if (tool.tags?.includes(tag)) {
      tools.push(tool);
    }
  }
  return tools;
}

// Get tools by complexity
export function getToolsByComplexity(complexity: 'basic' | 'intermediate' | 'advanced'): RegisteredTool[] {
  const tools: RegisteredTool[] = [];
  for (const [, tool] of TOOL_REGISTRY) {
    if (tool.complexity === complexity) {
      tools.push(tool);
    }
  }
  return tools;
}

// Get all tool names (including aliases)
export function getAllToolNames(): string[] {
  const names: string[] = [];

  for (const [name, tool] of TOOL_REGISTRY) {
    names.push(name);
    if (tool.aliases) {
      names.push(...tool.aliases);
    }
  }

  return names;
}

// Execute tool by name or alias
export async function executeTool(nameOrAlias: string, params: any): Promise<any> {
  const registeredTool = getTool(nameOrAlias);
  if (!registeredTool) {
    throw new Error(`Unknown tool: ${nameOrAlias}`);
  }

  return registeredTool.tool.execute(params);
}

// Get tool recommendations based on user intent
export function recommendTools(intent: string): RegisteredTool[] {
  const recommendations: RegisteredTool[] = [];
  const lowerIntent = intent.toLowerCase();

  // Pattern matching for common intents
  if (lowerIntent.includes('slow') || lowerIntent.includes('performance')) {
    recommendations.push(...getToolsByCategory('performance'));
  }

  if (lowerIntent.includes('css') || lowerIntent.includes('javascript') || lowerIntent.includes('unused')) {
    const unusedCodeTool = getTool('resource_unused_code');
    if (unusedCodeTool) recommendations.push(unusedCodeTool);
  }

  if (lowerIntent.includes('third') || lowerIntent.includes('party') || lowerIntent.includes('external')) {
    const thirdPartyTool = getTool('resource_third_party');
    if (thirdPartyTool) recommendations.push(thirdPartyTool);
  }

  if (lowerIntent.includes('budget') || lowerIntent.includes('target') || lowerIntent.includes('goal')) {
    const budgetTool = getTool('budget_analyze');
    if (budgetTool) recommendations.push(budgetTool);
  }

  if (lowerIntent.includes('compare') || lowerIntent.includes('versus') || lowerIntent.includes('competitor')) {
    recommendations.push(...getToolsByCategory('comparison'));
  }

  if (lowerIntent.includes('issue') || lowerIntent.includes('problem') || lowerIntent.includes('fix')) {
    recommendations.push(...getToolsByCategory('issues'));
  }

  // Remove duplicates - use a unique identifier for each tool
  const uniqueTools = new Map<string, RegisteredTool>();
  for (const tool of recommendations) {
    // Use the tool's description as a unique identifier since tool.name might not exist
    const uniqueKey = tool.tool?.description || JSON.stringify(tool);
    uniqueTools.set(uniqueKey, tool);
  }

  return Array.from(uniqueTools.values());
}

// Generate tool catalog markdown
export function generateCatalog(): string {
  let catalog = '# Available MCP Tools\n\n';

  for (const [categoryId, category] of Object.entries(TOOL_CATEGORIES)) {
    const tools = getToolsByCategory(categoryId);
    if (tools.length === 0) continue;

    catalog += `## ${category.emoji} ${category.name}\n`;
    catalog += `${category.description}\n\n`;

    for (const [name, tool] of TOOL_REGISTRY) {
      if (tool.category !== categoryId) continue;

      catalog += `### \`${name}\`\n`;
      catalog += `${tool.tool.description}\n`;

      if (tool.aliases && tool.aliases.length > 0) {
        catalog += `- **Aliases**: ${tool.aliases.map(a => `\`${a}\``).join(', ')}\n`;
      }

      if (tool.tags && tool.tags.length > 0) {
        catalog += `- **Tags**: ${tool.tags.join(', ')}\n`;
      }

      if (tool.complexity) {
        catalog += `- **Complexity**: ${tool.complexity}\n`;
      }

      catalog += '\n';
    }
  }

  return catalog;
}