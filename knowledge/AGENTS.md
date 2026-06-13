# Clockwork — Agent Guide

AI collaboration governance framework for agile development teams.

## Package Manager

Use **pnpm**: `pnpm install`, `pnpm test`, `pnpm build`

## Build & Test

- CLI: `cd cli && pnpm test`
- CLI single test: `cd cli && pnpm vitest run tests/path/to/file.test.ts`
- Web: `cd workbench && pnpm test`

## Architecture

- cli/ CLI tool (Node.js/TypeScript, commander.js)
- workbench/ Web dashboard (React/Vite)
- agents/ Agent role definitions (Markdown + YAML frontmatter)
- skills/ Agent Skills (SKILL.md format)
- knowledge/ Project knowledge base (this directory)
- workflows/ Multi-agent workflow definitions
- repos/ Project code repositories (git submodule)
- workspace/ Task artifacts (created per task at runtime)

## Code Style

- TypeScript strict mode
- No default exports — use named exports
- TDD for all production code: test first, then implement

## Rules

- Never commit .env files
- All CLI commands must have tests
- Knowledge updates from agents default to draft status
- NEVER modify files in workspace/ except through CLI commands
