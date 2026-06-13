---
name: team-feature-dev
description: Multi-role feature development workflow for agile teams
trigger: PM provides requirements, team collaborates through design → implement → test
stages:
  - id: requirements
    agent: planner
    role: pm
    description: Define product requirements and acceptance criteria
    skills: [brainstorming]
    input:
      required: [feature_brief]
    output:
      - PRD.md
    human_review: required
  - id: design
    agent: planner
    role: developer
    description: Technical design based on PRD
    skills: [brainstorming, writing-plans]
    input:
      required: [PRD.md, knowledge_context]
    output:
      - SPEC.md
      - PLAN.md
    human_review: required
  - id: implementation
    agent: implementer
    role: developer
    description: TDD-driven implementation following PLAN
    skills: [test-driven-development]
    input:
      required: [SPEC.md, PLAN.md]
    strategy: sequential
    max_retries: 3
    human_review: none
  - id: testing
    agent: reviewer
    role: tester
    description: Generate test plan, execute tests, report bugs
    skills: [test-driven-development, systematic-debugging]
    input:
      required: [PRD.md, SPEC.md, code_changes]
    output:
      - TEST_PLAN.md
      - TEST_REPORT.md
    human_review: required
  - id: deliver
    agent: knowledge-keeper
    role: developer
    description: Summarize artifacts, update knowledge base
    input:
      required: [PRD.md, SPEC.md, TEST_REPORT.md]
    actions:
      - summarize_artifacts
      - update_knowledge_index
---

# Team Feature Development Workflow

## Stage 1: Requirements

PM defines product requirements using the Planner agent. Outputs PRD.md with
acceptance criteria. PM must approve before design begins.

## Stage 2: Design

Developer produces technical design (SPEC.md) and implementation plan (PLAN.md)
based on the PRD. Developer or tech lead must approve before implementation.

## Stage 3: Implementation

Developer implements tasks from the PLAN using TDD. Auto-proceeds to testing
on completion. Max 3 retries per task.

## Stage 4: Testing

Tester generates TEST_PLAN.md, executes tests, and produces TEST_REPORT.md.
Bugs are filed as defect tasks. Tester must approve before delivery.

## Stage 5: Deliver

Knowledge Keeper summarizes artifacts and updates knowledge base.
Final notification for team review and merge.
