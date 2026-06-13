---
name: test-driven-development
description: >
  Use when writing or modifying production code — enforces TDD cycle:
  write failing test first, then minimal implementation, then refactor.
  Applies to feature development, bug fixes, and refactoring tasks.
license: MIT
compatibility: requires vitest, Node.js test runner, or similar
---

# Test-Driven Development

## Iron Law

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST

## RED-GREEN-REFACTOR Cycle

### RED: Write the failing test
- Write the test that defines the desired behavior
- Run the test: `npx vitest run path/to/test.test.ts`
- Verify it fails for the EXPECTED reason (feature missing, not syntax error)

### GREEN: Minimal implementation
- Write ONLY the code needed to pass the test
- Run the test: `npx vitest run path/to/test.test.ts`
- Verify it passes

### REFACTOR: Clean up
- Remove duplication, improve naming
- Keep tests green — run after every change
- Commit only when all tests pass

## Constraints

- NEVER write implementation before a failing test
- NEVER keep failing tests to "fix later"
- NEVER skip refactoring — technical debt accumulates fast
- Test file convention: `<source-file>.test.ts` in same directory
