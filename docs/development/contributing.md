# Contributing Guide

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- pnpm (recommended) or npm
- Chrome/Chromium browser

### Getting Started
```bash
# Clone the repository
git clone https://github.com/mizchi/lighthouse-mcp.git
cd lighthouse-mcp

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test
```

## Development Workflow

### Commands
```bash
# Development mode with watch
pnpm dev

# Run CLI in development
pnpm cli -- https://example.com

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

## Code Style

### TypeScript Guidelines
- Use modern ES modules with explicit `import` statements
- Prefer `async/await` over callbacks
- Use `neverthrow` for error handling when appropriate
- Enable strict TypeScript mode

### Naming Conventions
- Files: `kebab-case.ts` (e.g., `critical-chain.ts`)
- Functions/Variables: `camelCase` (e.g., `analyzeReport`)
- Types/Interfaces: `PascalCase` (e.g., `LighthouseReport`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)

### File Organization
```
src/
├── analyzers/     # Analysis logic
├── core/          # Core functionality
├── tools/         # MCP tool implementations
│   ├── l1-*.ts   # Collection layer
│   ├── l2-*.ts   # Analysis layer
│   └── l3-*.ts   # Intelligence layer
├── types/         # TypeScript definitions
└── cli.ts         # CLI entry point
```

## Testing

### Test Structure
- Unit tests: `test/unit/[module].test.ts`
- Integration tests: `test/integration/[feature].test.ts`
- E2E tests: `test/e2e/[scenario].test.ts`

### Writing Tests
```typescript
import { describe, it, expect } from 'vitest';

describe('Module Name', () => {
  it('should perform expected behavior', () => {
    const result = myFunction();
    expect(result).toBe(expectedValue);
  });
});
```

### Test Coverage
- Aim for 80%+ coverage on critical modules
- Run `pnpm test:coverage` to check coverage
- Justify any coverage drops in PRs

## Commit Guidelines

### Commit Message Format
Follow Conventional Commits:
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

### Examples
```bash
feat(l2-tools): add LCP chain analysis tool
fix(analyzer): correct TBT calculation
docs: update README with new examples
refactor(core): simplify browser pool management
```

## Pull Request Process

1. **Create an Issue**: Describe the problem or feature
2. **Fork & Branch**: Create a feature branch
3. **Develop**: Make your changes with tests
4. **Verify**: Run lint, typecheck, and tests
5. **Document**: Update relevant documentation
6. **Submit PR**: Include:
   - Clear description
   - Link to related issue
   - Before/after examples if applicable
   - Test results

### PR Checklist
- [ ] Tests pass (`pnpm test`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] Coverage maintained or improved

## Adding New Tools

### Tool Architecture
Tools follow the L1/L2/L3 layer pattern:

1. **L1 (Collection)**: Direct Lighthouse execution
2. **L2 (Analysis)**: Data processing and analysis
3. **L3 (Intelligence)**: Strategic recommendations

### Steps to Add a Tool

1. **Define the tool** in `src/tools/`:
```typescript
// src/tools/l2-new-analysis.ts
export interface L2NewAnalysisParams {
  reportId?: string;
  // ... parameters
}

export async function executeL2NewAnalysis(
  params: L2NewAnalysisParams
): Promise<L2NewAnalysisResult> {
  // Implementation
}

export const l2NewAnalysisTool: MCPTool = {
  name: 'l2_new_analysis',
  description: 'Description of the tool',
  inputSchema: { /* ... */ },
  execute: async (params) => {
    // Format output for MCP
  }
};
```

2. **Register the tool** in `src/tools/index.ts`

3. **Add tests** in `test/unit/tools/`

4. **Update documentation**:
   - Add to tool catalog
   - Update problem-tool matrix
   - Add usage examples

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG
3. Create git tag: `git tag v1.2.3`
4. Push with tags: `git push origin main --tags`
5. GitHub Actions will handle the rest

## Getting Help

- Create an issue for bugs or feature requests
- Join discussions in GitHub Discussions
- Check existing documentation in `docs/`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.