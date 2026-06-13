---
name: incident-response
description: Production incident triage and mitigation — speed prioritized
trigger: Production incident alert or outage report
stages:
  - id: triage
    agent: debugger
    description: Quick assessment of severity and scope
    skills: [systematic-debugging]
    input:
      required: [incident_report, logs]
    human_review: none
  - id: diagnose
    agent: debugger
    description: Rapid root cause identification
    skills: [systematic-debugging]
    input:
      required: [triage_output]
    output:
      - DIAGNOSIS.md
    max_retries: 2
    human_review: none
  - id: mitigate
    agent: implementer
    description: Apply mitigation — prioritize stopping the bleed over perfect fix
    skills: [test-driven-development]
    input:
      required: [DIAGNOSIS.md]
    strategy: sequential
    max_retries: 2
    human_review: required
  - id: postmortem
    agent: none
    description: Generate incident postmortem, update Knowledge
    actions:
      - generate_postmortem
      - update_knowledge
---

# Incident Response Workflow

Speed is the priority — human_review gates are minimized.

## Stage 1: Triage
Quick severity assessment. No human review delay.

## Stage 2: Diagnose
Rapid root cause identification. 2 retries max.

## Stage 3: Mitigate
Apply mitigation — stop the bleeding. Must pass tests. Human reviews the mitigation.

## Stage 4: Postmortem
Framework generates postmortem document, updates Knowledge with incident learnings.
