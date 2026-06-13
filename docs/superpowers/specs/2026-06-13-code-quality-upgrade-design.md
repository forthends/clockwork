# Code Quality Upgrade — Design Spec

**Date**: 2026-06-13
**Scope**: Bug fixes, code style unification, lint/format toolchain for Clockwork v0.2.0

## 1. Bug Fixes

### 1.1 Route ordering (workbench/src/App.tsx)

`/knowledge/*` route defined before `/knowledge`, causing KnowledgeBrowser unreachable.
**Fix**: Swap order — exact match first, then wildcard.

### 1.2 Task counter persistence (cli/src/workspace.ts)

Module-level `taskCounter` variable resets on process restart, risking duplicate task IDs.
**Fix**: Replace with filesystem scan: find max existing task number, increment by 1.

### 1.3 Skill path derivation (cli/src/commands/skill.ts)

Uses `config.agents.dir.replace('agents/', 'skills/')` — fragile string manipulation.
**Fix**: Use `join(options.project, 'skills')` directly.

### 1.4 Status path construction (cli/src/commands/status.ts)

Uses string concatenation for paths instead of `path.join`.
**Fix**: Use `join(options.project, config.workspace.dir)`.

### 1.5 Duplicate source files (workbench/src/)

Stale `.js` files alongside `.tsx` sources (7 files).
**Fix**: Delete all `.js` files under `workbench/src/`.

### 1.6 Knowledge index tags (cli/src/knowledge-indexer.ts)

`buildIndex` never populates `tags` field — always empty array.
**Fix**: Parse frontmatter from each markdown file, extract `tags` field.

### 1.7 useEffect cleanup (4 page components)

Missing cleanup functions — setState may fire after unmount.
**Fix**: Add `cancelled` flag in each async useEffect, clean up on unmount.

## 2. Code Style Unification

### 2.1 pnpm migration

- Add `"packageManager": "pnpm@9.x"` to root package.json
- Remove `package-lock.json`
- Reinstall with pnpm to generate `pnpm-lock.yaml`
- npm scripts remain unchanged (pnpm-compatible)

### 2.2 Named exports

Replace all `export default` with named exports in workbench:

- `App`, `Layout`, `TaskBoard`, `TaskDetail`, `TaskReview`, `KnowledgeBrowser`, `KnowledgeDetail`, `TaskCard`, `StatusBadge`, `MarkdownViewer`, `ReviewActions`
- Update all import sites accordingly

### 2.3 Strict TypeScript

Add `noUnusedLocals: true`, `noUnusedParameters: true` to both tsconfig files.

## 3. Toolchain

### 3.1 Dependencies (monorepo root devDependencies)

- `eslint`, `prettier`, `typescript-eslint`, `lint-staged`, `simple-git-hooks`, `eslint-config-prettier`

### 3.2 ESLint (eslint.config.js, flat config)

- `typescript-eslint` strict ruleset
- `eslint-config-prettier` to avoid conflicts
- Ignore `dist/`, `node_modules/`
- `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: '^_'`

### 3.3 Prettier (.prettierrc)

- `singleQuote: true`, `trailingComma: "all"`, `printWidth: 120`, `tabWidth: 2`

### 3.4 Pre-commit (simple-git-hooks + lint-staged)

- Trigger on commit: format + lint staged TS/TSX files

## 4. Verification

| Gate           | Command      |
| -------------- | ------------ |
| Tests pass     | `pnpm test`  |
| ESLint clean   | `pnpm lint`  |
| Build succeeds | `pnpm build` |
