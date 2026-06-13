---
name: workflow-runner
description: >
  Executes Clockwork workflow stages within Claude Code by dispatching
  sub-agents. Use when a Clockwork task has been created and needs
  agent execution through workflow stages.
compatibility: requires Claude Code with agent tools
---

# Workflow Runner

This skill is the execution engine for Clockwork workflows within Claude Code.

## Activation

This skill is activated when the user runs:
```
/clockwork:workflow-runner <task-id>
```

## Execution Flow

### Step 1: Load task state
Read `workspace/<task-id>/status.yaml` to understand:
- Which workflow is active
- Which stage we're on
- What stages are complete
- Whether human review is pending

### Step 2: Check preconditions
If `humanReviewPending` is true, STOP and tell the user:
"This task requires human review before continuing. Use `clockwork review <task-id>`."

### Step 3: Load agent context
Read `workspace/<task-id>/agent-context/<agent-name>.json` for the current stage's agent.
This file contains: role, capabilities, boundaries, instructions, skills, inputs, knowledge entries.

### Step 4: Dispatch sub-agent
Use the Agent tool to dispatch a sub-agent with:
- **Agent type:** general-purpose
- **Model:** Use the model specified in the agent definition (or default to sonnet)
- **Prompt:** Construct from the context package:
  
  You are acting as the {role} agent in a Clockwork workflow.
  
  ## Role
  {role}
  
  ## Capabilities
  {capabilities}
  
  ## Boundaries (NEVER violate these)
  {boundaries}
  
  ## Instructions
  {instructions}
  
  ## Inputs
  {inputs}
  
  ## Knowledge Context
  {knowledge entries}
  
  ## Output Requirements
  After completing your work, write your output to workspace/<task-id>/<output-file>
  as specified in the workflow definition.
  
  ## Skills Available
  You have access to these skills: {skills}
  Use the Skill tool to activate them as needed.

### Step 5: Collect output
After the sub-agent completes:
1. Verify the output files exist in workspace/<task-id>/
2. Update workspace/<task-id>/status.yaml:
   - Mark current stage as completed
   - If more stages remain, set up the next stage
   - If human_review is required for the NEXT stage, set humanReviewPending
3. If no more stages, mark task as completed

### Step 6: Handle stage results
- **Stage completed:** "Stage '{stage}' completed. Output: {files}"
- **Stage failed:** "Stage '{stage}' failed. Check workspace/<task-id>/logs/ for details."
- **All stages complete:** "Task <task-id> complete! Run `clockwork review <task-id>` to finalize."
- **Human review needed:** "Stage '{stage}' requires human review. Ask the user to run `clockwork review <task-id>`."

## Multi-Agent Coordination

When a workflow has multiple agents:
- Execute stages sequentially
- Each stage's output becomes the next stage's input
- The context for each agent is pre-built by the CLI and stored in agent-context/
- If a stage has `human_review: required`, pause and wait for human approval

## Constraints

- NEVER skip human_review gates — they exist for a reason
- NEVER modify workflow definitions during execution
- NEVER execute stages out of order
- ALWAYS verify output files exist before marking a stage complete
- IF a sub-agent fails and retries exceed max_retries, mark stage as failed and notify
