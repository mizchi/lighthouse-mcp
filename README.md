# Lighthouse MCP (Model Context Protocol)

[![CI](https://github.com/mizchi/lighthouse-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/mizchi/lighthouse-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A comprehensive web application performance analysis toolset integrating Google Lighthouse with Model Context Protocol (MCP), providing structured analysis capabilities accessible to AI assistants and automation tools.

## 📋 Overview

This project provides Google Lighthouse's powerful analysis capabilities through MCP (Model Context Protocol), enabling AI assistants to automatically detect, diagnose, and suggest improvements for website performance issues.

### Key Features

- **🏗️ Three-Layer Architecture**: Clear separation of concerns with Collection (L1) → Analysis (L2) → Intelligence (L3)
- **📊 Comprehensive Performance Analysis**: Detailed analysis of all metrics including Core Web Vitals
- **🎯 Advanced Problem Detection**: Automatic identification and prioritization of performance issues
- **💰 Performance Budget Management**: Target tracking and violation detection
- **🔍 Pattern Recognition**: Identification of common issues across multiple sites
- **🤖 MCP Integration**: Standardized interface for AI assistants and automation tools
- **✅ Complete Test Coverage**: Quality assurance through unit, integration, and E2E tests

## 🚀 Quick Start

### Installation

```bash
# Global installation
npm install -g lighthouse-mcp

# Project installation
npm install lighthouse-mcp

# Development setup (pnpm recommended)
git clone https://github.com/mizchi/lighthouse-mcp.git
cd lighthouse-mcp
pnpm install
```

### Basic Usage

```bash
# Analyze a website
lhmcp https://example.com

# Start as MCP server
lhmcp --mcp

# Detailed analysis (critical chains + unused code)
lhmcp https://example.com --chains --unused --device desktop
```

## 🏗️ Architecture

### Three-Layer Design

```
┌─────────────────────────────────────────┐
│        L3 - Intelligence Layer          │
│  (AI insights, strategy, recommendations)│
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│         L2 - Analysis Layer             │
│  (Quantitative analysis, pattern detection)│
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│        L1 - Collection Layer            │
│  (Lighthouse execution, data collection) │
└─────────────────────────────────────────┘
```

#### L1 - Collection Layer

Foundation layer that directly executes Lighthouse and collects raw data:

- **`l1_collect_single`**: Execute Lighthouse analysis on a single URL
- **`l1_collect_multi`**: Parallel analysis of multiple URLs
- **`l1_collect_comparative`**: Collect data for comparative analysis
- **`l1_get_report`**: Retrieve saved reports
- **`l1_list_reports`**: List available reports

#### L2 - Analysis Layer

Analyzes collected data and provides structured insights:

- **`l2_deep_analysis`**: Comprehensive performance problem detection
- **`l2_critical_chain`**: Critical request chain analysis
- **`l2_critical_chain_report`**: Detailed critical chain report generation
- **`l2_unused_code`**: Detect and quantify unused JavaScript/CSS
- **`l2_third_party_impact`**: Measure third-party script impact
- **`l2_progressive_third_party`**: Progressive third-party blocking analysis
- **`l2_lcp_chain_analysis`**: LCP element critical path analysis
- **`l2_score_analysis`**: Systematic score and improvement analysis
- **`l2_weighted_issues`**: Priority ranking through weighted analysis
- **`l2_patterns`**: Performance pattern detection

#### L3 - Intelligence Layer

Provides advanced interpretation and strategic recommendations:

- **`l3_action_plan_generator`**: Generate actionable improvement plans
- **`l3_performance_budget`**: Performance budget management and violation detection
- **`l3_pattern_insights`**: Pattern insights from multiple analysis results

## 🔧 Available Tools

### Primary Analysis Tools

| Tool Name | Detectable Issues | Primary Use Case |
|-----------|------------------|------------------|
| `l2_deep_analysis` | LCP delays, CLS issues, TBT increase, unused resources | Comprehensive problem diagnosis |
| `l2_critical_chain` | Render-blocking resources, request chains | Load order optimization |
| `l2_unused_code` | Unused CSS/JS, dead code | Bundle size reduction |
| `l2_third_party_impact` | Third-party impact, ad/analytics load | External dependency optimization |
| `l2_lcp_chain_analysis` | LCP bottlenecks, image optimization opportunities | LCP improvement strategy |
| `l3_action_plan_generator` | Prioritized actions, implementation guide | Improvement planning |

### Problem Detection Capabilities

This toolset can automatically detect:

- **Core Web Vitals**
  - LCP > 4s delay detection and root cause analysis
  - CLS > 0.25 visual instability
  - FID/INP > 300ms responsiveness issues

- **Resource Optimization**
  - Unused CSS/JavaScript (up to 90% reduction possible)
  - Render-blocking resources
  - Inefficient caching strategies

- **Third-Party Impact**
  - Google Analytics, Facebook SDK impact measurement
  - Ad network load analysis
  - Progressive blocking impact assessment

## 💻 Programmatic Usage

### TypeScript/JavaScript

```typescript
import {
  executeL1Collect,
  executeL2DeepAnalysis,
  executeL3ActionPlanGenerator
} from 'lighthouse-mcp';

// 1. Data collection
const collectResult = await executeL1Collect({
  url: 'https://example.com',
  device: 'mobile',
  categories: ['performance']
});

// 2. Deep analysis
const analysis = await executeL2DeepAnalysis({
  reportId: collectResult.reportId,
  includeChains: true,
  includeUnusedCode: true
});

// 3. Generate action plan
const actionPlan = await executeL3ActionPlanGenerator({
  reportId: collectResult.reportId,
  includeTools: ['deep', 'unused', 'weighted']
});

console.log('Detected issues:', analysis.analysis.problems);
console.log('Recommended actions:', actionPlan.actionPlan);
```

### MCP Usage

```javascript
// Call tools from MCP client
const result = await client.callTool('l2_deep_analysis', {
  url: 'https://example.com',
  includeChains: true
});
```

## 🧪 Testing

The project includes a comprehensive test suite:

```bash
# Run all tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# E2E tests (actual Lighthouse execution)
pnpm test:e2e

# With coverage report
pnpm test:coverage
```

### Test Fixtures

HTML files in `test/fixtures/problem-cases/` reproduce actual problems:

- `slow-lcp.html` - LCP delay detection test
- `high-cls.html` - CLS problem detection test
- `third-party-heavy.html` - Third-party impact test
- `unused-code-heavy.html` - Unused code detection test
- `cpu-intensive-dom-css.html` - High CPU load DOM/CSS test

## 🔄 CI/CD

Automated CI/CD pipeline with GitHub Actions:

```yaml
# .github/workflows/ci.yml
- Lint: Code quality checks
- TypeCheck: Type safety verification
- Test: Compatibility testing on Node.js 18/20/22
- Build: Production build
- Integration: Integration tests
- Lighthouse Test: Actual Lighthouse execution tests
```

## 📁 Project Structure

```
lighthouse-mcp/
├── src/
│   ├── analyzers/          # Analysis modules
│   │   ├── criticalChain.ts    # Critical chain analysis
│   │   ├── unusedCode.ts       # Unused code detection
│   │   ├── thirdParty.ts       # Third-party impact analysis
│   │   ├── deepAnalysis.ts     # Comprehensive analysis
│   │   └── ...
│   ├── core/              # Core functionality
│   │   ├── lighthouse.ts       # Lighthouse execution
│   │   ├── browserPool.ts      # Browser management
│   │   ├── database.ts         # SQLite storage
│   │   └── metrics.ts          # Metrics extraction
│   ├── tools/             # MCP tool implementations
│   │   ├── l1-*.ts            # L1: Collection layer
│   │   ├── l2-*.ts            # L2: Analysis layer
│   │   ├── l3-*.ts            # L3: Intelligence layer
│   │   └── utils/             # Utilities
│   ├── types/             # TypeScript type definitions
│   └── cli.ts             # CLI entry point
├── test/                  # Test files
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   ├── e2e/                   # E2E tests
│   └── fixtures/              # Test data
├── docs/                  # Documentation
├── .github/workflows/     # CI/CD configuration
└── CLAUDE.md             # Architecture guide
```

## 📚 Documentation

- [Analysis Capabilities](./docs/analysis-capabilities.md) - Detailed analysis capabilities of each tool
- [Problem-Tool Matrix](./docs/problem-tool-matrix.md) - Guide for selecting appropriate tools by problem
- [Tool Layers](./docs/tool-layers.md) - Detailed L1/L2/L3 architecture
- [MCP Tools Catalog](./docs/MCP-TOOLS-CATALOG.md) - Complete tool catalog
- [CLAUDE.md](./CLAUDE.md) - Developer architecture guide

## 🛠️ Development

### Setup

```bash
# Clone repository
git clone https://github.com/mizchi/lighthouse-mcp.git
cd lighthouse-mcp

# Install dependencies (pnpm recommended)
pnpm install

# Build
pnpm build

# Start development server
pnpm dev
```

### Development Commands

```bash
# TypeScript compilation
pnpm typecheck

# Run linter
pnpm lint

# Watch mode for tests
pnpm test:watch

# CLI development execution
pnpm cli -- https://example.com
```

## 🔑 Environment Variables

```bash
# Optional: Custom user data directory
LIGHTHOUSE_USER_DATA_DIR=.lhdata/custom

# Optional: Debug mode
DEBUG=lighthouse:*

# CI environment flag
CI=true
```

## 📈 Performance Improvement Results

Typical improvements achieved using this toolset:

- **LCP Improvement**: 8.5s → 2.1s (75% reduction)
- **Unused Code Reduction**: 840KB → 120KB (85% reduction)
- **Third-Party Impact**: TBT 1200ms → 300ms (75% reduction)
- **Performance Score**: 35 → 92 points

## 🤝 Contributing

Pull requests are welcome! Please follow these guidelines:

1. Create an issue to propose features or fixes
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Add tests (maintain 90%+ coverage)
4. Pass type checking and linting (`pnpm typecheck && pnpm lint`)
5. Create a pull request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 👥 Author

- mizchi ([@mizchi](https://github.com/mizchi))

## 🙏 Acknowledgments

- Google Lighthouse Team
- Puppeteer Developers
- MCP (Model Context Protocol) Specification Contributors
- All Contributors

---

**Note**: This project is actively under development. Features and APIs may change.