# Getting Started with Lighthouse MCP

## Installation

### Prerequisites
- Node.js 18 or higher
- Chrome or Chromium browser

### Install from npm
```bash
npm install -g lighthouse-mcp
```

### Install from source
```bash
git clone https://github.com/mizchi/lighthouse-mcp.git
cd lighthouse-mcp
pnpm install
pnpm build
pnpm link --global
```

## Basic Usage

### Command Line Interface

#### Analyze a single website
```bash
lhmcp https://example.com
```

#### Analyze with options
```bash
# Desktop analysis with full details
lhmcp https://example.com --device desktop --chains --unused

# Mobile analysis (default) with specific categories
lhmcp https://example.com -c performance,seo

# Export as JSON
lhmcp https://example.com --json > report.json
```

### MCP Server Mode

Start the MCP server for AI assistants:
```bash
lhmcp --mcp
```

The server will listen for MCP protocol commands and provide all available tools.

## Using with AI Assistants

### Claude Desktop Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "lighthouse": {
      "command": "lhmcp",
      "args": ["--mcp"]
    }
  }
}
```

### Available Tools

Once connected, you can use natural language to:

- "Analyze the performance of example.com"
- "Find unused CSS and JavaScript on my website"
- "Compare performance between mobile and desktop"
- "Show me the critical rendering path"
- "What's causing the slow LCP?"

## Common Workflows

### 1. Basic Performance Audit

```bash
# Step 1: Run analysis
lhmcp https://yoursite.com

# Step 2: Review the output
# The CLI will display:
# - Performance score
# - Core Web Vitals
# - Key recommendations
```

### 2. Deep Performance Investigation

```bash
# Comprehensive analysis with all details
lhmcp https://yoursite.com --chains --unused

# This includes:
# - Critical request chains
# - Unused CSS/JavaScript
# - Detailed metrics
# - Specific optimization opportunities
```

### 3. Comparative Analysis

```bash
# Analyze multiple pages
lhmcp https://site.com/page1 > page1.json
lhmcp https://site.com/page2 > page2.json

# Compare results (using MCP tools or custom scripts)
```

### 4. Progressive Testing

Test with incremental third-party blocking:

```bash
# Baseline
lhmcp https://yoursite.com

# Block analytics
lhmcp https://yoursite.com --block-domains googletagmanager.com,google-analytics.com

# Block all third-parties
lhmcp https://yoursite.com --block-patterns "*"
```

## Understanding Output

### Performance Score
- **90-100**: Good (Green)
- **50-89**: Needs Improvement (Orange)
- **0-49**: Poor (Red)

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s is good
- **FID** (First Input Delay): < 100ms is good
- **CLS** (Cumulative Layout Shift): < 0.1 is good

### Common Issues

#### High LCP
- Large images not optimized
- Render-blocking resources
- Slow server response

#### High CLS
- Images without dimensions
- Dynamically injected content
- Web fonts causing layout shift

#### High TBT (Total Blocking Time)
- Heavy JavaScript execution
- Third-party scripts
- Large bundle sizes

## Programmatic Usage

### Node.js/TypeScript

```typescript
import { executeL1Collect, executeL2DeepAnalysis } from 'lighthouse-mcp';

async function analyzeWebsite(url: string) {
  // Collect data
  const { reportId } = await executeL1Collect({
    url,
    device: 'mobile',
    categories: ['performance']
  });

  // Analyze
  const analysis = await executeL2DeepAnalysis({
    reportId,
    includeChains: true
  });

  console.log('Problems found:', analysis.analysis.problems);
  console.log('Score:', analysis.analysis.score);
}

analyzeWebsite('https://example.com');
```

### Using with MCP Client

```javascript
const { Client } = require('@modelcontextprotocol/sdk');

const client = new Client();
await client.connect('lhmcp', ['--mcp']);

// Use any available tool
const result = await client.callTool('l2_deep_analysis', {
  url: 'https://example.com'
});
```

## Best Practices

### 1. Regular Monitoring
Run analyses regularly to track performance over time:
```bash
# Daily performance check
lhmcp https://yoursite.com --json >> performance-log.jsonl
```

### 2. Test Different Conditions
- Test both mobile and desktop
- Test with slow network conditions
- Test from different geographic locations

### 3. Focus on Core Web Vitals
Prioritize fixing issues that affect:
- LCP (user-perceived load speed)
- FID/INP (interactivity)
- CLS (visual stability)

### 4. Incremental Improvements
- Fix high-impact issues first
- Test after each change
- Monitor for regressions

## Troubleshooting

### Chrome not found
```bash
# Specify Chrome path
CHROME_PATH=/usr/bin/google-chrome lhmcp https://example.com

# Or install Chrome
# Ubuntu/Debian
sudo apt-get install google-chrome-stable

# macOS
brew install --cask google-chrome
```

### Port conflicts
```bash
# Use a different port for debugging
DEBUG_PORT=9223 lhmcp https://example.com
```

### Timeout issues
```bash
# Increase timeout for slow sites
LIGHTHOUSE_TIMEOUT=60000 lhmcp https://slow-site.com
```

## Next Steps

- Read the [Tool Catalog](../MCP-TOOLS-CATALOG.md) to understand all available tools
- Check [Problem-Tool Matrix](../problem-tool-matrix.md) to find the right tool for specific issues
- Learn about [Architecture](../development/architecture.md) for advanced usage
- Contribute by reading the [Contributing Guide](../development/contributing.md)