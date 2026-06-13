---
name: code-review
description: >
  Review code changes for correctness, security, architecture compliance,
  and test coverage. Use when code has been written and needs review
  before merging.
license: MIT
---

# Code Review

## Review Process

1. Read the specification/plan to understand what was intended
2. Read the git diff to understand what was changed
3. Assess each file against these dimensions:

### Correctness

- Does the code do what was specified?
- Are edge cases handled?
- Is error handling appropriate for the project conventions?

### Architecture

- Does it follow project patterns (check Knowledge)?
- Are new dependencies justified?
- Does it respect module boundaries?

### Security

- Are there any injection vulnerabilities (SQL, XSS, command)?
- Is authentication/authorization properly enforced?
- Are secrets or credentials exposed?

### Tests

- Do tests cover the new behavior?
- Do tests cover edge cases and error paths?
- Are there regression tests?

## Output Format

Report findings in REVIEW.md:

- PASS: All dimensions satisfactory
- NEEDS_CHANGES: Specific, actionable issues with file paths
- REJECTED: Fundamental problem requiring redesign

Cite specific file paths and line ranges. Distinguish blocking vs. suggestion.
