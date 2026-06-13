---
name: systematic-debugging
description: >
  Diagnose and fix bugs through root cause analysis. Use when encountering
  any bug, test failure, or unexpected behavior — before proposing fixes.
license: MIT
---

# Systematic Debugging

## Four Phases

### Phase 1: Root Cause Investigation
- Read the error message completely
- Reproduce the bug reliably
- Check recent changes (`git log`)
- Collect evidence at component boundaries

### Phase 2: Pattern Analysis
- Find similar working code in the project
- Compare differences
- Understand dependencies between components

### Phase 3: Hypothesis and Test
- Form a SINGLE hypothesis: "If X is the root cause, changing Y fixes it"
- Make the minimal change to test the hypothesis
- Test and observe — one variable at a time

### Phase 4: Implement Fix
- Write a regression test that reproduces the bug
- Apply the minimal fix
- Verify the fix passes and no regressions

## Critical Threshold

If 3+ fix attempts fail → STOP fixing and question the architecture.
"This is not a failed hypothesis — this is wrong architecture."

## Constraints

- NEVER fix symptoms — find root cause
- NEVER introduce new features during debugging
- NEVER skip the regression test
- Document findings in DIAGNOSIS.md
