# Lighthouse MCP (Model Context Protocol)

Advanced performance analysis tools for web applications using Google Lighthouse and Model Context Protocol.

## 🚀 Features

- **Three-Layer Architecture**: L1 (Collection) → L2 (Analysis) → L3 (Intelligence)
- **Comprehensive Performance Analysis**: Deep dive into Core Web Vitals and all performance metrics
- **Advanced Issue Detection**: Automatically identify and prioritize performance problems
- **Performance Budget Management**: Track and enforce performance targets
- **Pattern Recognition**: Cross-site analysis to identify common issues
- **MCP Integration**: Standardized tool interface for AI assistants and automation

## Installation

```bash
# Install globally
npm install -g lighthouse-mcp

# Or use in your project
npm install lighthouse-mcp
```

## CLI Usage

### Basic Usage

```bash
# Analyze a website
lhmcp https://example.com

# Start MCP server
lhmcp --mcp
```

### Options

```bash
lhmcp <url> [options]
lhmcp --mcp

Options:
  -d, --device <device>     Device type: mobile (default) or desktop
  -c, --categories <list>   Categories to test (comma-separated)
                            Default: performance,accessibility,best-practices,seo
  --chains                  Include critical chain analysis
  --unused                  Include unused code analysis
  --json                    Output raw JSON instead of formatted text
  --mcp                     Start as MCP server
  -h, --help               Show this help message
```

### Examples

```bash
# Desktop analysis
lhmcp https://example.com --device desktop

# Full analysis with critical chains and unused code
lhmcp https://example.com --chains --unused

# Export as JSON
lhmcp https://example.com --json > report.json

# Analyze specific categories only
lhmcp https://example.com -c performance,seo
```

## Library Usage

```typescript
import { runLighthouse } from 'lighthouse-mcp';
import { performDeepAnalysis } from 'lighthouse-mcp';

// Run Lighthouse analysis
const result = await runLighthouse('https://example.com', {
  device: 'mobile',
  categories: ['performance', 'accessibility']
});

if (result.isOk()) {
  // Perform deep analysis
  const analysis = performDeepAnalysis(result.value);
  
  console.log('Performance Score:', analysis.scoreAnalysis.summary?.performance);
  console.log('Core Web Vitals:', analysis.metrics);
  console.log('Recommendations:', analysis.recommendations);
}
```

## MCP Server Usage

The MCP server provides tools for AI models to perform Lighthouse analysis:

```bash
# Start the MCP server
lhmcp --mcp
```

### Tool Architecture (L1/L2/L3)

The tools are organized in a three-layer architecture:

#### L1 - Collection Layer
Tools that directly execute Lighthouse and collect raw data:
- `l1_collect_single`: Execute Lighthouse analysis on a single URL
- `l1_collect_multi`: Parallel analysis of multiple URLs
- `l1_collect_comparative`: Collect data for comparative analysis

#### L2 - Analysis Layer
Tools that analyze collected logs and reports directly:
- `l2_critical_chain`: Analyze critical request chains
- `l2_unused_code`: Detect and quantify unused JavaScript and CSS
- `l2_deep_analysis`: Deep performance metrics analysis
- `l2_score_analysis`: Systematic score and improvement analysis
- `l2_third_party_impact`: Measure third-party script impact
- `l2_progressive_third_party`: Progressive third-party blocking analysis

#### L3 - Interpretation Layer (Future)
Tools requiring human insight or AI model reasoning:
- `l3_optimization_strategy`: Optimization strategy planning (planned)
- `l3_business_impact`: Business impact assessment (planned)
- `l3_custom_recommendations`: Custom recommendations (planned)

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/lighthouse-mcp.git
cd lighthouse-mcp

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Run CLI in development
pnpm cli -- https://example.com
```

## Project Structure

```
lighthouse-mcp/
├── src/
│   ├── analyzers/         # Analysis modules
│   │   ├── criticalChain.ts
│   │   ├── unusedCode.ts
│   │   ├── thirdParty.ts
│   │   └── ...
│   ├── core/             # Core functionality
│   │   ├── lighthouse.ts
│   │   ├── browser.ts
│   │   └── config.ts
│   ├── tools/            # MCP tools (L1/L2/L3 layers)
│   │   ├── l1-collect-*.ts      # L1: Data collection
│   │   ├── l2-*.ts              # L2: Direct analysis
│   │   └── index.ts
│   ├── types/            # TypeScript types
│   └── cli.ts            # CLI entry point
├── test/                 # Test files
├── CLAUDE.md            # Architecture guide
└── package.json
```

## Output Example

```
🔍 Analyzing https://example.com...
   Device: mobile
   Categories: performance, accessibility, best-practices, seo

✅ Analysis completed in 15.2s

# Deep Performance Analysis

**URL:** https://example.com/
**Timestamp:** 2025-09-08T12:00:00.000Z

## Performance Scores
- **Performance:** 95/100
- **Accessibility:** 100/100
- **Best Practices:** 100/100
- **SEO:** 100/100

## Core Web Vitals
- **LCP:** 1234ms
- **FCP:** 456ms
- **CLS:** 0.001
- **TBT:** 50ms

## Prioritized Recommendations
### 🟡 Optimize images
**Category:** Performance
**Impact:** Could save 200KB and improve load time by 0.5s
```

## Technologies Used

- **Lighthouse**: Google's automated tool for improving web pages
- **Puppeteer**: Headless Chrome automation
- **TypeScript**: Type-safe development
- **Vitest**: Fast unit testing
- **oxlint**: Fast linting with type-aware rules
- **neverthrow**: Type-safe error handling
- **MCP SDK**: Model Context Protocol for AI integration

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.