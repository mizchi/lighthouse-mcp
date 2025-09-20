# Architecture Overview

## System Design

Lighthouse MCP follows a layered architecture pattern to separate concerns and maintain modularity.

## Layer Architecture (L1/L2/L3)

### Overview
```
┌─────────────────────────────────────────┐
│        L3 - Intelligence Layer          │
│  Strategic analysis & recommendations   │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│         L2 - Analysis Layer             │
│    Data processing & pattern detection  │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│        L1 - Collection Layer            │
│     Lighthouse execution & storage      │
└─────────────────────────────────────────┘
```

### L1 - Collection Layer
**Purpose**: Interface with Lighthouse and manage raw data

**Responsibilities**:
- Execute Lighthouse audits
- Collect performance metrics
- Store reports in database
- Provide data retrieval APIs

**Key Components**:
- `core/lighthouse.ts` - Lighthouse runner
- `core/browser.ts` - Browser management
- `core/database.ts` - SQLite storage
- `tools/l1-*.ts` - Collection tools

### L2 - Analysis Layer
**Purpose**: Process and analyze collected data

**Responsibilities**:
- Quantitative analysis
- Pattern detection
- Problem identification
- Metric calculations

**Key Components**:
- `analyzers/*.ts` - Analysis modules
- `tools/l2-*.ts` - Analysis tools
- Pattern matching algorithms
- Statistical analysis

### L3 - Intelligence Layer
**Purpose**: Provide strategic insights and recommendations

**Responsibilities**:
- Generate action plans
- Priority ranking
- Budget management
- Cross-site insights

**Key Components**:
- `tools/l3-*.ts` - Intelligence tools
- Recommendation engines
- Budget validators

## Core Components

### Browser Pool
Manages Chrome/Chromium instances for Lighthouse execution:

```typescript
class BrowserPool {
  private instances: Map<string, Browser>;

  async getBrowser(): Promise<Browser> {
    // Reuse or create browser instance
  }

  async closeAll(): Promise<void> {
    // Clean up all instances
  }
}
```

### Database Schema
SQLite database for report storage:

```sql
-- lighthouse_reports table
CREATE TABLE lighthouse_reports (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  device TEXT,
  timestamp INTEGER,
  report JSON,
  performance_score REAL,
  lcp REAL,
  fcp REAL,
  cls REAL,
  tbt REAL
);

-- indexes for common queries
CREATE INDEX idx_url ON lighthouse_reports(url);
CREATE INDEX idx_timestamp ON lighthouse_reports(timestamp);
CREATE INDEX idx_performance ON lighthouse_reports(performance_score);
```

### Report Loader
Common utility for loading reports from various sources:

```typescript
interface ReportLoaderParams {
  reportId?: string;    // Load from database
  url?: string;         // Collect new report
  report?: Report;      // Direct input
}

async function loadReport(params): Promise<LoadedReport> {
  // Priority: report > reportId > url
}
```

## Data Flow

### Collection Flow
```
URL → Lighthouse → Raw Report → Database → Report ID
```

### Analysis Flow
```
Report ID → Load Report → Analyzer → Structured Results → MCP Output
```

### Intelligence Flow
```
Multiple Reports → Pattern Analysis → Strategic Insights → Action Plan
```

## Error Handling

### Result Types
Using `neverthrow` for type-safe error handling:

```typescript
type Result<T, E> = Ok<T> | Err<E>;

function analyzeReport(report: Report): Result<Analysis, AnalysisError> {
  if (!report.audits) {
    return err(new AnalysisError('Missing audits'));
  }
  return ok(performAnalysis(report));
}
```

### Error Categories
- `CollectionError` - Lighthouse execution failures
- `AnalysisError` - Data processing issues
- `ValidationError` - Input validation failures
- `StorageError` - Database operations

## Performance Considerations

### Browser Reuse
- Keep browser instances alive between runs
- Reuse user data directory for caching
- Clean up on process exit

### Database Optimization
- Index commonly queried fields
- Use JSON extraction for metrics
- Implement query result caching

### Memory Management
- Stream large reports
- Limit concurrent analyses
- Clear analysis caches periodically

## Testing Strategy

### Unit Tests
- Test analyzers with fixture data
- Mock external dependencies
- Focus on business logic

### Integration Tests
- Test tool combinations
- Verify data flow
- Check error propagation

### E2E Tests
- Real Lighthouse execution
- Complete workflows
- Performance benchmarks

## Security Considerations

### Input Validation
- Sanitize URLs before execution
- Validate report structure
- Check parameter bounds

### Resource Limits
- Timeout for Lighthouse runs
- Memory limits for analysis
- Concurrent execution caps

### Data Privacy
- No PII in logs
- Configurable data retention
- Secure storage practices

## Extension Points

### Adding Analyzers
1. Create analyzer in `src/analyzers/`
2. Define input/output types
3. Implement analysis logic
4. Add unit tests

### Adding Tools
1. Choose appropriate layer (L1/L2/L3)
2. Create tool in `src/tools/`
3. Define MCP interface
4. Register in tool index

### Custom Storage
- Implement `StorageAdapter` interface
- Support for cloud storage
- Alternative databases

## Configuration

### Environment Variables
```bash
LIGHTHOUSE_USER_DATA_DIR=.lhdata    # Chrome profile directory
LIGHTHOUSE_DB_PATH=.lhdata/reports.db # Database location
DEBUG=lighthouse:*                   # Debug logging
```

### Runtime Configuration
```typescript
interface Config {
  maxConcurrent: number;
  timeout: number;
  retries: number;
  cacheDir: string;
}
```

## Monitoring & Debugging

### Logging
- Structured logging with levels
- Performance timing markers
- Error stack traces

### Metrics
- Tool execution times
- Success/failure rates
- Resource usage

### Debug Tools
- Chrome DevTools Protocol
- Lighthouse debug mode
- SQL query logging