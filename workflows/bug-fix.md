---
name: bug-fix
description: Bug fix workflow with root cause analysis and regression testing
trigger: Bug report received or test failure detected
stages:
  - id: diagnose
    agent: debugger
    description: Root cause analysis and diagnosis
    skills: [systematic-debugging]
    input:
      required: [bug_report]
    output:
      - DIAGNOSIS.md
    max_retries: 3
    human_review: optional
  - id: fix
    agent: implementer
    description: Implement the fix with TDD
    skills: [test-driven-development]
    input:
      required: [DIAGNOSIS.md]
    strategy: sequential
    max_retries: 2
    human_review: none
  - id: verify
    agent: reviewer
    description: Verify the fix and check for regressions
    skills: [code-review]
    input:
      required: [code_changes, test_results]
    output:
      - REVIEW.md
    human_review: required
  - id: deliver
    agent: none
    description: Summarize fix, update knowledge if root cause reveals new learning
    actions:
      - summarize_artifacts
      - update_knowledge
---

# Bug Fix Workflow

## Stage 1: Diagnose

Debugger agent reproduces the bug, traces root cause, documents findings.
3 fix attempt threshold — if exceeded, questions architecture.

## Stage 2: Fix

Implementer agent writes regression test first, then minimal fix.
Max 2 retries. TDD enforced.

## Stage 3: Verify

Reviewer agent verifies fix correctness and checks for regressions.
Human must approve before delivery.

## Stage 4: Deliver

Framework summarizes and updates Knowledge if root cause reveals new insight.
