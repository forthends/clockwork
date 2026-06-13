---
name: workflow-runner
description: >
  Executes Clockwork workflow stages within Claude Code by calling
  the deterministic workflow engine. Use when a Clockwork task has
  been created and needs agent execution through workflow stages.
compatibility: requires Claude Code with agent tools
---

# Workflow Runner

This skill delegates workflow orchestration to the Clockwork workflow engine (`cli/src/workflow-engine.ts`), a deterministic TypeScript state machine. This skill is the Claude Code adapter that calls the engine to decide what to do next, dispatches sub-agents when instructed, and reports results back to the engine.

## Execution Flow

### Step 1: Initialize the engine

Read the workflow engine module at `cli/src/workflow-engine.ts` and call `initEngine(projectRoot, workspaceDir, taskId)` to load the task state, workflow definition, and compute the current stage.

### Step 2: Loop on getNextAction

Call `getNextAction(state)` and act on the returned action type:

- **dispatch_agent**: Use the Agent tool to dispatch the agent specified in the action. Construct the prompt from the agent definition (read from `agents/<agentName>.md`) and the task context (read from `workspace/<taskId>/agent-context/<agentName>.json`). If `agentName` is `"none"`, execute the stage's framework actions (summarize, update knowledge) directly instead of dispatching. After completion, verify output artifacts exist, then call `applyStageResult(state, { success, artifacts })` to advance the state machine.

- **wait_review**: Tell the user: "Stage '{reviewStageId}' requires human review. Run `clockwork review <taskId> --approve` or `--reject '<reason>'`." Halt until told to resume.

- **complete**: Report that all stages are complete and summarize the completed stages list.

- **error**: Report the error message and suggest remediation. If retries are exhausted, advise re-evaluating the task approach.

- **recover**: Read the recovery snapshot from `workspace/<taskId>/recovery/snapshot.yaml`, restore the stage indicated in `snapshot.lastStage`, rebuild agent context if needed, then continue from that recovery point.

### Step 3: Before any dispatch, save recovery point

Call `saveRecoveryPoint(state)` to persist a recovery snapshot. This ensures interrupted tasks can resume cleanly via `clockwork resume <taskId>`.

## Handling no-agent stages

When `agentName` is `"none"`, the stage requires framework actions (e.g., `summarize_artifacts`, `update_knowledge`). Execute these directly:

- **summarize_artifacts**: Read all `.md` files in `workspace/<taskId>/`, produce a summary paragraph.
- **update_knowledge**: If the task produced new learnings, create or update knowledge entries in `knowledge/` and rebuild the index.
- **generate_postmortem**: Write `workspace/<taskId>/POSTMORTEM.md` with incident timeline, root cause, impact, and action items.

After completing these actions, call `applyStageResult` with success to advance.

## Retry backoff

When `backoffMs` is present on a `dispatch_agent` action, wait that duration before re-dispatching. The engine calculates backoff as `min(2^retryCount * 60000, 3600000)` — doubling from 1 minute to a cap of 1 hour.

## Constraints

- NEVER skip human_review gates — they are enforced by the engine
- NEVER modify workflow definitions during execution
- NEVER execute stages out of order
- ALWAYS verify output files exist before calling applyStageResult with success
- ALWAYS call saveRecoveryPoint before dispatching an agent
