# Clockwork — Agent Guide

AI collaboration governance framework for agile development teams.

## Package Manager
Use **pnpm** for all packages: `pnpm install`, `pnpm test`, `pnpm build`

## Build & Test
- CLI: `cd cli && pnpm test`
- CLI single test: `cd cli && pnpm vitest run tests/path/to/file.test.ts`
- Web: `cd workbench && pnpm test`
- Web build: `cd workbench && pnpm build`

## Architecture
- cli/          CLI tool (Node.js/TypeScript, commander.js) — task orchestration and management
- workbench/    Web dashboard (React/Vite) — artifact viewing and review for non-technical users
- agents/       Agent role definitions — markdown with YAML frontmatter
- skills/       Agent Skills in SKILL.md format (agentskills.io standard)
- knowledge/    Project knowledge base — AGENTS.md, indexed markdown entries
- workflows/    Multi-agent workflow definitions — markdown with YAML frontmatter
- repos/        Project code repositories (git submodule)
- workspace/    Task artifacts (created per task at runtime)

## Code Style
- TypeScript strict mode
- Named exports (no default exports)
- TDD: all production code requires a failing test first

## Testing
- vitest for both CLI and workbench
- React Testing Library for workbench components
- All commands must have integration tests
- Run full test suite before committing

## Rules
- NEVER commit .env files
- NEVER skip TDD — production code always starts with a failing test
- Knowledge entries added by agents default to draft status (human review required)
- CLI commands use --project flag to specify project root, default to cwd
