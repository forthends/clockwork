---
name: writing-plans
description: >
  Create detailed implementation plans from specifications. Use after
  design is approved and before writing implementation code.
license: MIT
---

# Writing Plans

## Process

1. Read the SPEC.md for full context
2. Query Knowledge for project conventions
3. Decompose into bite-sized tasks (2-5 minutes each)
4. For each task specify: exact file paths, complete code (not descriptions), exact run commands with expected output
5. Output PLAN.md

## Task Granularity

Each step is ONE action:
- "Write the failing test" — step
- "Run it to make sure it fails" — step
- "Implement the minimal code" — step
- "Run the tests" — step
- "Commit" — step

## No Placeholders

These are plan failures — never write them:
- TBD, TODO, "implement later", "fill in details"
- "Add appropriate error handling" / "add validation"
- "Write tests for the above" (without actual test code)
- Steps that describe what to do without showing how

## Output

Generate PLAN.md with exact task specifications ready for the implementer agent.
