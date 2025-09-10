# Lighthouse MCP

A Model Context Protocol (MCP) server and CLI tool for Google Lighthouse performance analysis.

## Features

- 🚀 **Performance Analysis**: Comprehensive performance metrics including Core Web Vitals
- 🔍 **Deep Analysis**: Critical request chains, unused code detection, and performance patterns
- 📊 **Multiple Categories**: Performance, Accessibility, Best Practices, and SEO
- 🎯 **Actionable Recommendations**: Prioritized suggestions for performance improvements
- 💻 **CLI & Library**: Use as a command-line tool or integrate into your Node.js application
- 🤖 **MCP Server**: Model Context Protocol integration for AI-powered analysis

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

### Available MCP Tools

- `runLighthouse`: Execute Lighthouse analysis on a URL
- `analyzePerformance`: Deep analysis of Lighthouse reports
- `getCriticalChain`: Analyze critical request chains
- `getUnusedCode`: Detect unused JavaScript and CSS

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
│   ├── analysis/          # Analysis modules
│   │   ├── deep-analyzer.ts
│   │   ├── critical-chain-analyzer.ts
│   │   ├── unused-code-analyzer.ts
│   │   └── ...
│   ├── lighthouse/        # Lighthouse execution
│   │   ├── executor.ts
│   │   ├── metrics.ts
│   │   └── runner.ts
│   ├── mcp/              # MCP server and tools
│   │   ├── server.ts
│   │   └── deep-analysis-tool.ts
│   ├── types/            # TypeScript types
│   └── cli.ts            # CLI entry point
├── test/                 # Test files
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