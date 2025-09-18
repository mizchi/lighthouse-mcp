# MCP Tools Catalog

## Tool Categories and Organization

### 🔍 Data Collection Tools (Layer 1)

#### Basic Collection
- **`lighthouse_collect`** - Run Lighthouse analysis on a single URL
  - Supports mobile/desktop, custom categories, domain blocking
  - Returns report ID and basic metrics

- **`lighthouse_batch`** - Analyze multiple URLs in parallel
  - Efficient batch processing with concurrency control
  - Aggregated results and comparison

#### Data Management
- **`lighthouse_list_reports`** - List all stored Lighthouse reports
  - Filter by URL, date range, device type
  - Pagination support

- **`lighthouse_get_report`** - Retrieve specific Lighthouse report
  - Access by report ID or URL
  - Full audit details and metrics

---

### 📊 Performance Analysis Tools (Layer 2)

#### Core Performance Analysis
- **`performance_analyze`** - Comprehensive performance metrics analysis
  - Core Web Vitals deep dive
  - Metric breakdown and trends
  - Performance score factors

- **`performance_score_breakdown`** - Detailed score analysis
  - Audit weights and contributions
  - Improvement opportunities ranked by impact

#### Resource Analysis
- **`resource_unused_code`** - Detect unused CSS and JavaScript
  - File-by-file breakdown
  - Coverage percentages
  - Removal impact estimation

- **`resource_critical_chain`** - Critical request chain analysis
  - Dependency mapping
  - Bottleneck identification
  - Load waterfall visualization

- **`resource_third_party`** - Third-party script impact
  - Blocking time analysis
  - Transfer size breakdown
  - Entity-level impact assessment

#### Issue Detection
- **`issues_comprehensive`** - Detect all performance issues
  - Multi-category issue detection (CSS, JS, images, fonts, network)
  - Severity classification (critical/high/medium/low)
  - Quick wins identification
  - Solution recommendations with effort estimates

- **`issues_rendering`** - Rendering and paint issues
  - LCP chain analysis
  - Render-blocking resources
  - Layout shift causes

#### Comparative Analysis
- **`compare_sites`** - Compare performance across sites
  - Side-by-side metrics comparison
  - Relative performance scoring
  - Best practices identification

- **`compare_historical`** - Historical performance trends
  - Time-series analysis
  - Regression detection
  - Improvement tracking

---

### 🎯 Strategic Intelligence Tools (Layer 3)

#### Budget and Goals
- **`budget_analyze`** - Performance budget analysis
  - Budget violation detection
  - Severity assessment
  - Compliance scoring
  - Strategic recommendations

- **`budget_recommend`** - Generate performance budgets
  - Industry-based recommendations
  - Device-specific budgets
  - Progressive budget planning

#### Pattern Recognition
- **`patterns_identify`** - Cross-site pattern analysis
  - Common performance antipatterns
  - Category-specific trends
  - Success pattern identification

- **`patterns_insights`** - Strategic pattern insights
  - Industry benchmarking
  - Competitive positioning
  - Trend predictions

#### Optimization Strategy
- **`optimize_prioritize`** - Optimization prioritization
  - ROI-based ranking
  - Effort vs. impact matrix
  - Implementation roadmap

- **`optimize_recommend`** - Custom optimization strategies
  - Context-aware recommendations
  - Technology-specific solutions
  - Phased improvement plans

#### Advanced Queries
- **`query_database`** - Custom database queries
  - Flexible data exploration
  - Aggregation and statistics
  - Custom metric calculations

---

## Tool Usage Patterns

### 1. Quick Performance Check
```
lighthouse_collect → performance_analyze → issues_comprehensive
```

### 2. Deep Optimization Analysis
```
lighthouse_collect → resource_unused_code + resource_critical_chain → optimize_prioritize
```

### 3. Performance Monitoring
```
lighthouse_batch → compare_historical → patterns_identify → budget_analyze
```

### 4. Competitive Analysis
```
lighthouse_batch (competitors) → compare_sites → patterns_insights
```

### 5. Resource Optimization
```
lighthouse_collect → resource_third_party + resource_unused_code → optimize_recommend
```

---

## Tool Selection Guide

### For Initial Analysis
Start with: `lighthouse_collect` → `performance_analyze` → `issues_comprehensive`

### For Optimization Planning
Use: `issues_comprehensive` → `optimize_prioritize` → `budget_recommend`

### For Monitoring
Deploy: `lighthouse_batch` → `compare_historical` → `budget_analyze`

### For Deep Dive
Combine: `resource_critical_chain` + `resource_third_party` + `resource_unused_code`

### For Strategic Planning
Apply: `patterns_insights` → `optimize_recommend` → `budget_recommend`

---

## API Conventions

### Input Parameters
- All tools accept either `reportId` or `url`
- Optional parameters use sensible defaults
- Batch operations support concurrency limits

### Output Format
- Consistent structure across all tools
- Markdown-formatted text for human readability
- Structured data for programmatic access

### Error Handling
- Graceful degradation
- Informative error messages
- Partial results when possible

---

## Best Practices

1. **Start Simple**: Begin with basic collection and analysis
2. **Layer Progressively**: Add deeper analysis as needed
3. **Combine Tools**: Use multiple tools for comprehensive insights
4. **Monitor Trends**: Regular collection for trend analysis
5. **Set Budgets**: Define and track performance budgets
6. **Prioritize Actions**: Focus on high-impact optimizations

---

## Tool Capabilities Matrix

| Tool Category | Real-time Analysis | Historical Data | Comparative | Recommendations |
|--------------|-------------------|-----------------|-------------|-----------------|
| Collection | ✅ | ✅ | ❌ | ❌ |
| Performance Analysis | ✅ | ✅ | ✅ | ✅ |
| Resource Analysis | ✅ | ❌ | ❌ | ✅ |
| Issue Detection | ✅ | ❌ | ❌ | ✅ |
| Strategic Intelligence | ✅ | ✅ | ✅ | ✅ |

---

## Integration Examples

### CI/CD Pipeline
```bash
# Run performance check on deployment
lighthouse_collect --url=$STAGING_URL
budget_analyze --reportId=$REPORT_ID --budget=mobile-strict
```

### Monitoring Dashboard
```javascript
// Regular performance monitoring
const reports = await lighthouse_batch({ urls: sites });
const trends = await compare_historical({ reportIds: reports });
const insights = await patterns_insights({ timeRange: '7d' });
```

### Optimization Workflow
```javascript
// Comprehensive optimization analysis
const report = await lighthouse_collect({ url });
const issues = await issues_comprehensive({ reportId });
const priorities = await optimize_prioritize({ issues });
const roadmap = await optimize_recommend({ priorities });
```