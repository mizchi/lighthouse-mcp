# Lighthouse MCP Client Guide

## Quick Start

The Lighthouse MCP provides performance analysis tools organized into logical categories. This guide helps you use these tools effectively.

## Tool Categories

### 🔍 **Data Collection** - Gather performance data
- `lighthouse_collect` - Analyze a single URL
- `lighthouse_batch` - Analyze multiple URLs
- `lighthouse_list_reports` - List stored reports
- `lighthouse_get_report` - Retrieve specific report

### 📊 **Performance Analysis** - Analyze metrics
- `performance_analyze` - Core Web Vitals analysis
- `performance_score_breakdown` - Score factor analysis
- `analyze_deep` - Comprehensive deep analysis

### 📦 **Resource Analysis** - Optimize resources
- `resource_unused_code` - Find unused CSS/JS
- `resource_critical_chain` - Identify bottlenecks
- `resource_third_party` - Third-party impact

### 🔎 **Issue Detection** - Find problems
- `issues_comprehensive` - All performance issues
- `issues_lcp_chain` - LCP rendering chain
- `issues_critical_bottlenecks` - Critical path analysis

### ⚖️ **Comparison** - Compare performance
- `compare_sites` - Compare multiple sites
- Historical comparison (via database queries)

### 🎯 **Strategic Intelligence** - Plan improvements
- `budget_analyze` - Check budget compliance
- `patterns_insights` - Cross-site patterns
- `query_database` - Custom analysis

## Common Workflows

### 1. Basic Performance Check
```javascript
// Step 1: Collect data
lighthouse_collect({ url: "https://example.com" })

// Step 2: Analyze performance
performance_analyze({ reportId: "..." })

// Step 3: Find issues
issues_comprehensive({ reportId: "..." })
```

### 2. CSS Optimization
```javascript
// Find unused CSS
resource_unused_code({ url: "https://example.com" })

// Check critical chain impact
resource_critical_chain({ reportId: "..." })
```

### 3. Third-Party Analysis
```javascript
// Basic third-party impact
resource_third_party({ url: "https://example.com" })

// Detailed progressive analysis
resource_third_party_progressive({ reportId: "..." })
```

### 4. Performance Budget Check
```javascript
// Check against default mobile budget
budget_analyze({
  url: "https://example.com",
  useDefaultBudget: true
})

// Custom budget
budget_analyze({
  reportId: "...",
  budget: {
    lcp: 2500,
    fcp: 1800,
    cls: 0.1,
    tbt: 200,
    totalBytes: 1500000
  }
})
```

### 5. Competitive Analysis
```javascript
// Collect competitor data
lighthouse_batch({
  urls: [
    "https://yoursite.com",
    "https://competitor1.com",
    "https://competitor2.com"
  ]
})

// Compare results
compare_sites({ reportIds: ["...", "...", "..."] })
```

### 6. Pattern Analysis
```javascript
// Analyze patterns across all collected data
patterns_insights({
  minSamples: 10,
  categories: ["E-commerce", "News"]
})
```

## Tool Selection Guide

### "My site is slow"
1. Start with `lighthouse_collect`
2. Use `performance_analyze` for metrics
3. Run `issues_comprehensive` for all issues
4. Check `resource_critical_chain` for bottlenecks

### "Too much CSS/JavaScript"
1. Use `resource_unused_code` to find unused code
2. Check `resource_critical_chain` for render-blocking
3. Analyze with `issues_comprehensive` for specific fixes

### "Third-party scripts are a problem"
1. Run `resource_third_party` for impact analysis
2. Use `resource_third_party_progressive` for details
3. Check `issues_comprehensive` for recommendations

### "Need to set performance targets"
1. Run `lighthouse_collect` for baseline
2. Use `budget_analyze` with industry defaults
3. Monitor with `patterns_insights` over time

### "Want to beat competitors"
1. Use `lighthouse_batch` for all sites
2. Run `compare_sites` for comparison
3. Analyze with `patterns_insights` for trends

## Input Parameters

### Common Parameters
- `url`: URL to analyze (triggers new analysis)
- `reportId`: Use existing report (faster)
- `device`: "mobile" or "desktop" (default: mobile)

### Collection Parameters
```javascript
lighthouse_collect({
  url: "https://example.com",
  device: "mobile",
  categories: ["performance", "accessibility"],
  blockDomains: ["googletagmanager.com"],
  throttling: {
    cpuSlowdown: 4,
    requestLatency: 150,
    downloadThroughput: 1638400
  }
})
```

### Analysis Parameters
```javascript
performance_analyze({
  reportId: "report_123",
  // or
  url: "https://example.com",
  includeOptimizations: true
})
```

### Budget Parameters
```javascript
budget_analyze({
  url: "https://example.com",
  budget: {
    lcp: 2500,        // milliseconds
    fcp: 1800,        // milliseconds
    cls: 0.1,         // score
    tbt: 200,         // milliseconds
    totalBytes: 1500000,  // bytes
    jsBytes: 350000,      // bytes
    performanceScore: 90  // 0-100
  },
  compareToIndustry: true,
  includeHistoricalTrend: true
})
```

## Output Format

All tools return structured markdown with:
- Executive summary
- Detailed findings
- Specific recommendations
- Priority actions

Example output structure:
```markdown
# Analysis Title

## Summary
Key findings and metrics

## Details
Specific issues and measurements

## Recommendations
- Immediate actions
- Short-term improvements
- Long-term strategies

## Priority Actions
1. Critical fixes
2. Quick wins
3. Strategic improvements
```

## Best Practices

1. **Start Simple**: Use basic tools first, add complexity as needed
2. **Save Report IDs**: Reuse reports to avoid redundant analysis
3. **Batch Operations**: Analyze multiple URLs together for efficiency
4. **Set Budgets**: Define and track performance targets
5. **Monitor Trends**: Regular analysis to catch regressions
6. **Combine Tools**: Use multiple tools for comprehensive insights

## Aliases

Most tools support multiple names for convenience:
- `lighthouse_collect` = `l1_collect` = `collect`
- `performance_analyze` = `l2_performance_analysis`
- `resource_unused_code` = `l2_unused_code` = `unused_code`
- `issues_comprehensive` = `l2_comprehensive_issues` = `all_issues`
- `budget_analyze` = `l3_performance_budget` = `performance_budget`

## Error Handling

Tools provide helpful error messages:
- Missing required parameters
- Invalid URLs
- Report not found
- Analysis failures

## Getting Help

Use `list_tool_categories({ detailed: true })` to see all available tools with descriptions.