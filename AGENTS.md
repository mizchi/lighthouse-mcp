# Repository Guidelines

## Project Structure & Module Organization
The workspace centers on `src/` for TypeScript modules. `src/core/` orchestrates Lighthouse runs and scoring, `src/analyzers/` hosts performance heuristics, `src/tools/` maps the L1/L2 layers, `src/mcp/` wraps tools, and `src/prompts/`/`src/types/` share prompts and contracts. Docs on tool layering sit in `docs/`; scenario scripts in `scripts/`. Tests live under `test/` with `unit/`, `integration/`, `e2e/`, fixtures, and helpers. Generated output (`dist/`, `.lhdata/`, `tmp/`) is disposable.

## Build, Test, and Development Commands
- `pnpm install` bootstraps workspace.
- `pnpm build` compiles to `dist/` via `tsc -p tsconfig.build.json`.
- `pnpm dev` watches TypeScript sources.
- `pnpm cli -- https://example.com` runs the CLI against a URL.
- `pnpm lint`, `pnpm format`, `pnpm typecheck` keep linting, formatting, and types clean.
- `pnpm test`, `pnpm test:unit|integration|e2e`, and `pnpm test:coverage` drive Vitest suites.

## Coding Style & Naming Conventions
Write modern TypeScript with ES modules, explicit `await`, and `neverthrow` results when possible. Use `camelCase` for functions and values, `PascalCase` for exports, and kebab-case file names. Retain semicolons and double quotes, and keep imports grouped by origin. Run `pnpm format` before commits; Oxlint (`pnpm lint`) must pass.

## Testing Guidelines
Vitest backs all suites with shared setup in `test/setup.ts`. Place utilities under `test/helpers/` and fixtures in `test/fixtures/`. Name files `*.test.ts`, mirroring the source path (`src/core/runner.ts` → `test/unit/core/runner.test.ts`). Assert on metrics, chain parsing, and tool orchestration. Use `pnpm test:coverage` to keep key modules near 80% line coverage or justify dips.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`); scopes are optional but helpful (`feat(core): add SQLite storage`). Keep summaries brief, in English or Japanese, and describe intent. Pull requests need a focused description, linked issues, reproduction steps or CLI samples, plus before/after output snippets when formatting changes. Verify lint, typecheck, and tests before review.

## Agent Integration Notes
When adding MCP tools, document their layer in `docs/tool-layers.md`, register under `src/tools/`, and wire exports through `src/mcp/` and `src/index.ts` as needed. Surface CLI options in `src/cli.ts` and update sample server configs when behaviour shifts. Include sample commands in PRs so agent integrators can validate quickly.
