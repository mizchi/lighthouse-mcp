# Lighthouse MCP Documentation

## Quick Links

### Getting Started
- [Getting Started Guide](./guides/getting-started.md) - Installation and basic usage
- [MCP Integration Guide](./guides/mcp-integration.md) - Using with AI assistants

### Reference
- [MCP Tools Catalog](./MCP-TOOLS-CATALOG.md) - Complete list of available tools
- [Problem-Tool Matrix](./problem-tool-matrix.md) - Find the right tool for your problem
- [Analysis Capabilities](./analysis-capabilities.md) - What each tool can detect

### Architecture
- [Tool Layers (L1/L2/L3)](./tool-layers.md) - Understanding the three-layer design
- [System Architecture](./development/architecture.md) - Technical architecture details

### Development
- [Contributing Guide](./development/contributing.md) - How to contribute to the project
- [Architecture Overview](./development/architecture.md) - System design and components

### Archives
- [Historical Reports](./archive/) - Previous analysis reports and case studies

## Documentation Structure

```
docs/
├── guides/                 # User guides and tutorials
│   ├── getting-started.md
│   └── mcp-integration.md
├── development/           # Developer documentation
│   ├── architecture.md
│   └── contributing.md
├── archive/              # Historical reports
│   └── *.md
├── MCP-TOOLS-CATALOG.md  # Tool reference
├── problem-tool-matrix.md # Problem solving guide
├── analysis-capabilities.md # Detection capabilities
├── tool-layers.md        # L1/L2/L3 explanation
└── README.md            # This file
```

## Finding Information

### By Use Case

**"I want to analyze my website's performance"**
→ Start with [Getting Started Guide](./guides/getting-started.md)

**"I need to integrate with an AI assistant"**
→ Read [MCP Integration Guide](./guides/mcp-integration.md)

**"I have a specific performance problem"**
→ Check [Problem-Tool Matrix](./problem-tool-matrix.md)

**"I want to understand what can be detected"**
→ Review [Analysis Capabilities](./analysis-capabilities.md)

**"I want to contribute to the project"**
→ Follow [Contributing Guide](./development/contributing.md)

### By Technical Level

**Beginners**
1. [Getting Started](./guides/getting-started.md)
2. [MCP Tools Catalog](./MCP-TOOLS-CATALOG.md)

**Intermediate Users**
1. [Problem-Tool Matrix](./problem-tool-matrix.md)
2. [Analysis Capabilities](./analysis-capabilities.md)
3. [MCP Integration](./guides/mcp-integration.md)

**Advanced Users / Contributors**
1. [Tool Layers](./tool-layers.md)
2. [Architecture](./development/architecture.md)
3. [Contributing](./development/contributing.md)

## Key Concepts

### Three-Layer Architecture
- **L1 (Collection)**: Data gathering from Lighthouse
- **L2 (Analysis)**: Processing and pattern detection
- **L3 (Intelligence)**: Strategic recommendations

### Core Web Vitals
- **LCP**: Largest Contentful Paint (loading performance)
- **FID/INP**: First Input Delay / Interaction to Next Paint (interactivity)
- **CLS**: Cumulative Layout Shift (visual stability)

### Performance Scoring
- **90-100**: Good (green)
- **50-89**: Needs Improvement (orange)
- **0-49**: Poor (red)

## Support

For questions, issues, or contributions:
- Create an issue on [GitHub](https://github.com/mizchi/lighthouse-mcp)
- Check existing documentation
- Review closed issues for similar problems