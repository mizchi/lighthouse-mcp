# Lighthouse MCP Scripts

Collection of scripts for analyzing website performance using Lighthouse MCP tools.

## Available Scripts

### 📊 L2 Analysis Suite
```bash
# Run all L2 analysis tools on a report
npm run analyze:l2 <report-file.json>

# Example
npm run analyze:l2 report-2024-01-01.json
```

Runs comprehensive L2 layer analysis including:
- Weighted issues analysis
- CPU performance analysis
- Comprehensive issues detection
- Unused code analysis
- Critical chain analysis
- Deep performance analysis

### 🌐 Site-Specific Analysis

#### Analyze Lipscosme
```bash
npm run analyze:lipscosme
```
Specialized analysis for lipscosme.com focusing on unused CSS and performance issues.

#### Analyze Nicovideo
```bash
npm run analyze:nicovideo
```
Comprehensive analysis for nicovideo.jp including third-party impact and critical chains.

#### Batch Site Analysis
```bash
npm run analyze:sites
```
Analyze multiple predefined sites in batch mode.

### 🕷️ Web Crawling

```bash
npm run crawl
```
Crawl and analyze popular Japanese websites. Results are saved to the database.

### 📈 Report Generation

#### Impact Report
```bash
npm run report:impact
```
Generate a comprehensive impact analysis report from stored data.

#### Critical Chain Report
```bash
npm run report:critical
```
Generate detailed critical request chain analysis report.

## Output Files

All analysis scripts generate JSON output files:
- `l2-weighted-issues-result.json` - Prioritized issues by weight
- `l2-cpu-analysis-result.json` - CPU bottlenecks and blocking time
- `l2-comprehensive-issues-result.json` - All detected issues
- `l2-unused-code-result.json` - Unused CSS/JS analysis
- `l2-critical-chain-result.json` - Critical request chains
- `l2-deep-analysis-result.json` - Deep performance metrics

## Direct Script Execution

Scripts can also be run directly with tsx:

```bash
# Run L2 analysis
tsx scripts/run-l2-analysis.ts report.json

# Generate reports
tsx scripts/generate-impact-report.ts
```

## Requirements

- Node.js 18+
- Chrome/Chromium for Lighthouse analysis
- Valid Lighthouse report JSON files for analysis scripts