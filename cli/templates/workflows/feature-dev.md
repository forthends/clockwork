---
name: feature-dev
description: Full feature development workflow — from requirements to merged code
trigger: User requests a new feature or picks a feature from backlog
stages:
  - id: plan
    agent: planner
    description: Analyze requirements and generate implementation plan
    skills: [brainstorming, writing-plans]
    input:
      required: [requirements]
    output:
      - SPEC.md
      - PLAN.md
    human_review: required
  - id: implement
    agent: implementer
    description: Implement tasks from PLAN using TDD
    skills: [test-driven-development]
    input:
      required: [PLAN.md, SPEC.md]
    strategy: sequential
    max_retries: 3
    human_review: none
  - id: review
    agent: reviewer
    description: Review code changes for correctness and quality
    skills: [code-review]
    input:
      required: [code_changes, test_results]
    output:
      - REVIEW.md
    human_review: optional
  - id: deliver
    agent: none
    description: Summarize artifacts, update knowledge, notify for final approval
    actions:
      - summarize_artifacts
      - update_knowledge
---

# Feature Development Workflow

## Stage 1: Plan

Planner agent analyzes requirements. Asks questions one at a time for ambiguity.
Generates SPEC.md and PLAN.md. Human must approve before implementation begins.

## Stage 2: Implement

Implementer agent works through PLAN tasks sequentially, TDD for each task.
Each completed task gets a git commit. Max 3 retries per task before flagging as blocked.

## Stage 3: Review

Reviewer agent assesses code changes against SPEC and project conventions.
Outputs REVIEW.md with verdict. If NEEDS_CHANGES, returns to implement stage.

## Stage 4: Deliver

Framework summarizes all artifacts, updates Knowledge with new findings,
notifies human for final review and merge.
