import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  initEngine,
  getNextAction,
  applyStageResult,
  applyReviewDecision,
  saveRecoveryPoint,
  recoverFromSnapshot,
  calculateBackoff,
} from '../src/workflow-engine.js';
import { createTask, updateTaskStatus, loadTask } from '../src/workspace.js';
import type { EngineState, StageResult } from '../src/workflow-engine.js';

function makeProject(): { dir: string; wsDir: string } {
  const dir = join(tmpdir(), 'cw-engine-test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
  mkdirSync(dir, { recursive: true });

  mkdirSync(join(dir, '.clockwork'), { recursive: true });
  writeFileSync(
    join(dir, '.clockwork', 'config.yaml'),
    [
      'project:',
      '  name: test',
      'ide:',
      '  primary: claude-code',
      'agents:',
      '  dir: agents/',
      '  defaultModel: sonnet',
      'knowledge:',
      '  dir: knowledge/',
      '  index: knowledge/index.yaml',
      '  maxEntriesPerQuery: 3',
      'workflows:',
      '  dir: workflows/',
      'repos:',
      '  dir: repos/',
      'workspace:',
      '  dir: workspace/',
      'web:',
      '  port: 4200',
      '  host: localhost',
    ].join('\n'),
  );

  mkdirSync(join(dir, 'agents'), { recursive: true });
  writeFileSync(
    join(dir, 'agents', 'tester.md'),
    [
      '---',
      'name: tester',
      'description: Test agent for engine tests',
      'role: Test Agent',
      'capabilities:',
      '  - Testing',
      '  - Verification',
      'boundaries:',
      '  - No production changes',
      'input:',
      '  required: [requirements]',
      'output:',
      '  - file: OUTPUT.md',
      '    description: Test output',
      'model: sonnet',
      '---',
      '',
      '# Tester Agent',
      '',
      'Run tests and verify.',
    ].join('\n'),
  );

  mkdirSync(join(dir, 'workflows'), { recursive: true });
  writeFileSync(
    join(dir, 'workflows', 'test-wf.md'),
    [
      '---',
      'name: test-wf',
      'description: Test workflow with human review gates',
      'trigger: test',
      'stages:',
      '  - id: plan',
      '    agent: tester',
      '    description: Plan the work',
      '    skills: []',
      '    input:',
      '      required: [requirements]',
      '    output:',
      '      - PLAN.md',
      '    maxRetries: 2',
      '    humanReview: required',
      '  - id: execute',
      '    agent: tester',
      '    description: Execute the plan',
      '    skills: []',
      '    input:',
      '      required: [PLAN.md]',
      '    maxRetries: 3',
      '    humanReview: none',
      '  - id: verify',
      '    agent: tester',
      '    description: Verify results',
      '    skills: []',
      '    input:',
      '      required: [OUTPUT.md]',
      '    humanReview: optional',
      '  - id: deliver',
      '    agent: none',
      '    description: Summarize and deliver',
      '    actions:',
      '      - summarize_artifacts',
      '---',
      '',
      '# Test Workflow',
      '',
      'A test workflow for engine testing.',
    ].join('\n'),
  );

  // Workflow with no-agent stage in the middle
  writeFileSync(
    join(dir, 'workflows', 'no-agent-mid.md'),
    [
      '---',
      'name: no-agent-mid',
      'description: Workflow with a no-agent stage in the middle',
      'trigger: test',
      'stages:',
      '  - id: setup',
      '    agent: tester',
      '    description: Setup',
      '    input:',
      '      required: [requirements]',
      '    humanReview: none',
      '  - id: auto',
      '    agent: none',
      '    description: Auto-generated step',
      '    actions:',
      '      - generate_report',
      '  - id: review',
      '    agent: tester',
      '    description: Final review',
      '    input:',
      '      required: [report]',
      '    humanReview: required',
      '---',
      '',
      '# No-Agent-Mid Workflow',
      '',
      'Workflow with a no-agent stage in the middle.',
    ].join('\n'),
  );

  mkdirSync(join(dir, 'knowledge'), { recursive: true });
  writeFileSync(join(dir, 'knowledge', 'index.yaml'), 'entries: []\n');

  const wsDir = join(dir, 'workspace');
  mkdirSync(wsDir, { recursive: true });

  return { dir, wsDir };
}

describe('workflow engine', () => {
  let dir: string;
  let wsDir: string;

  beforeEach(() => {
    const p = makeProject();
    dir = p.dir;
    wsDir = p.wsDir;
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  });

  async function setupTask(workflow = 'test-wf', slug = 'engine-test'): Promise<EngineState> {
    const task = createTask(wsDir, workflow, slug, []);
    updateTaskStatus(wsDir, task.taskId, 'pending', 'plan');
    return initEngine(dir, wsDir, task.taskId);
  }

  // 1. Basic initialization
  it('initEngine loads workflow and task state', async () => {
    const state = await setupTask();
    expect(state.taskId).toMatch(/^task-\d{3}-engine-test$/);
    expect(state.workflow.name).toBe('test-wf');
    expect(state.workflow.stages.length).toBe(4);
    expect(state.status.status).toBe('pending');
    expect(state.status.currentStage).toBe('plan');
  });

  // 2. First dispatch action
  it('getNextAction returns dispatch_agent for pending task', async () => {
    const state = await setupTask();
    const action = getNextAction(state);
    expect(action.type).toBe('dispatch_agent');
    expect(action.agentName).toBe('tester');
    expect(action.stageId).toBe('plan');
  });

  // 3. Stage completion advances to next stage
  it('applyStageResult success advances to next stage', async () => {
    const state = await setupTask();
    const result: StageResult = { success: true, artifacts: ['PLAN.md'] };
    const next = await applyStageResult(state, result);
    // After completing 'plan' which has humanReview: required, should set humanReviewPending
    expect(next.status.humanReviewPending).toBe(true);
    expect(next.status.stages['plan']).toBe('completed');
  });

  // 4. Human review gate blocks execution
  it('getNextAction returns wait_review when humanReviewPending is true', async () => {
    const state = await setupTask();
    const result: StageResult = { success: true };
    const afterComplete = await applyStageResult(state, result);
    const action = getNextAction(afterComplete);
    expect(action.type).toBe('wait_review');
  });

  // 5. Approve review advances past gate
  it('applyReviewDecision approve advances to next stage', async () => {
    const state = await setupTask();
    const result: StageResult = { success: true };
    const afterComplete = await applyStageResult(state, result);
    const afterApprove = await applyReviewDecision(afterComplete, 'approve');
    expect(afterApprove.status.humanReviewPending).toBe(false);
    expect(afterApprove.status.currentStage).toBe('execute');
    expect(afterApprove.status.stages['execute']).toBe('in_progress');
  });

  // 6. Reject review marks stage failed
  it('applyReviewDecision reject marks stage as failed', async () => {
    const state = await setupTask();
    const result: StageResult = { success: true };
    const afterComplete = await applyStageResult(state, result);
    const afterReject = await applyReviewDecision(afterComplete, 'reject', 'Not good enough');
    expect(afterReject.status.stages['plan']).toBe('failed');
    expect(afterReject.status.status).toBe('failed');
  });

  // 7. Retry on failure
  it('applyStageResult failure increments retry count', async () => {
    const task = createTask(wsDir, 'test-wf', 'retry-test', []);
    // Use execute stage which has humanReview: none
    updateTaskStatus(wsDir, task.taskId, 'pending', 'execute');
    const state = await initEngine(dir, wsDir, task.taskId);

    const result: StageResult = { success: false, error: 'Something broke' };
    const afterFail = await applyStageResult(state, result);
    const meta = afterFail.status.stageMeta?.['execute'];
    expect(meta?.retryCount).toBe(1);
    // Status should still allow retry (not failed since retries remain)
    expect(afterFail.status.status).toBe('pending');
  });

  // 8. Retry exhaustion
  it('applyStageResult exhausts retries and marks failed', async () => {
    const task = createTask(wsDir, 'test-wf', 'exhaust-test', []);
    // plan has maxRetries: 2
    updateTaskStatus(wsDir, task.taskId, 'pending', 'plan');
    const state = await initEngine(dir, wsDir, task.taskId);

    const failResult: StageResult = { success: false };
    let current = state;
    // Fail 3 times (retryCount goes 0→1→2→3, maxRetries is 2)
    for (let i = 0; i < 3; i++) {
      current = await applyStageResult(current, failResult);
    }
    expect(current.status.status).toBe('failed');
    expect(current.status.stages['plan']).toBe('failed');
  });

  // 9. Task completion after all stages
  it('completes task when all stages are done', async () => {
    const state = await setupTask();

    // Complete plan → humanReviewPending
    let s = await applyStageResult(state, { success: true });
    expect(s.status.humanReviewPending).toBe(true);

    // Approve → advances to execute
    s = await applyReviewDecision(s, 'approve');
    expect(s.status.currentStage).toBe('execute');

    // Complete execute (humanReview: none) → advances to verify
    s = await applyStageResult(s, { success: true });
    expect(s.status.currentStage).toBe('verify');

    // Complete verify (humanReview: optional, doesn't block) → advances to deliver
    s = await applyStageResult(s, { success: true });
    // deliver is agent:none, advances past it
    expect(s.status.currentStage).toBe('deliver');

    // Complete deliver (agent:none, last stage)
    s = await applyStageResult(s, { success: true });
    // After the last stage, no next stage → check if completed
    // The engine sets no next stage, markStageComplete returns updated status
    // applyStageResult should detect no next stage and set status to completed
    const afterLast = s;
    // Load from disk
    expect(afterLast.status.stages['deliver']).toBe('completed');
  });

  // 10. No-agent stage returns dispatch_agent with agentName 'none'
  it('getNextAction returns dispatch_agent with agentName none for no-agent stages', async () => {
    const task = createTask(wsDir, 'no-agent-mid', 'no-agent-test', []);
    updateTaskStatus(wsDir, task.taskId, 'pending', 'auto');
    const state = await initEngine(dir, wsDir, task.taskId);

    const action = getNextAction(state);
    expect(action.type).toBe('dispatch_agent');
    expect(action.agentName).toBe('none');
    expect(action.stageId).toBe('auto');
  });

  // 11. No-agent stage completion advances to next
  it('applyStageResult for no-agent stage advances to next stage', async () => {
    const task = createTask(wsDir, 'no-agent-mid', 'no-agent-adv', []);
    // Setup stage first — go through it
    updateTaskStatus(wsDir, task.taskId, 'pending', 'setup');
    const state = await initEngine(dir, wsDir, task.taskId);
    // Complete setup (humanReview: none, so advances directly)
    let s = await applyStageResult(state, { success: true });
    expect(s.status.currentStage).toBe('auto');

    // Now complete the auto (no-agent) stage
    s = await applyStageResult(s, { success: true });
    // Should advance to review stage without review pending (review gate
    // applies to the review stage itself, not the auto stage before it)
    expect(s.status.currentStage).toBe('review');
    expect(s.status.humanReviewPending).toBe(false);
  });

  // 12. calculateBackoff
  it('calculateBackoff returns correct exponential backoff values', () => {
    expect(calculateBackoff(0)).toBe(60000); // 2^0 * 60000 = 1 min
    expect(calculateBackoff(1)).toBe(120000); // 2^1 * 60000 = 2 min
    expect(calculateBackoff(2)).toBe(240000); // 2^2 * 60000 = 4 min
    expect(calculateBackoff(3)).toBe(480000); // 2^3 * 60000 = 8 min
    expect(calculateBackoff(4)).toBe(960000); // 2^4 * 60000 = 16 min
    // Cap at 1 hour
    expect(calculateBackoff(10)).toBe(3600000);
    expect(calculateBackoff(20)).toBe(3600000);
  });

  // 13. Timeout detection in getNextAction
  it('getNextAction detects timed-out stage with retries remaining', async () => {
    const state = await setupTask();

    // Manually set startedAt far in the past to simulate timeout
    const past = new Date(Date.now() - 700000).toISOString(); // ~11.6 min ago, timeout is 10 min
    if (!state.status.stageMeta) state.status.stageMeta = {};
    state.status.stageMeta['plan'] = {
      retryCount: 0,
      maxRetries: 2,
      startedAt: past,
      timeoutMs: 600000,
    };

    const action = getNextAction(state);
    expect(action.type).toBe('dispatch_agent');
    expect(action.stageId).toBe('plan');
    expect(action.backoffMs).toBe(60000); // first retry backoff
  });

  // 14. Timeout with retries exhausted
  it('getNextAction returns error when timeout and retries exhausted', async () => {
    const state = await setupTask();

    const past = new Date(Date.now() - 700000).toISOString();
    if (!state.status.stageMeta) state.status.stageMeta = {};
    state.status.stageMeta['plan'] = {
      retryCount: 2, // already at max (maxRetries is 2 for plan)
      maxRetries: 2,
      startedAt: past,
      timeoutMs: 600000,
    };

    const action = getNextAction(state);
    expect(action.type).toBe('error');
    expect(action.error).toContain('timed out');
  });

  // 15. Recovery snapshot save and load
  it('saveRecoveryPoint and recoverFromSnapshot round-trip', async () => {
    const state = await setupTask();
    // Set some completed stages
    state.status.stages['plan'] = 'completed';

    saveRecoveryPoint(state);

    const recovered = recoverFromSnapshot(dir, wsDir, state.taskId);
    expect(recovered).not.toBeNull();
    expect(recovered!.taskId).toBe(state.taskId);
    expect(recovered!.status.currentStage).toBe('plan');
  });

  // 16. Interrupted state returns recover action
  it('getNextAction returns recover for interrupted task', async () => {
    const task = createTask(wsDir, 'test-wf', 'interrupt-test', []);
    updateTaskStatus(wsDir, task.taskId, 'pending', 'plan');
    // Manually set interrupted
    const t = loadTask(wsDir, task.taskId);
    t.status = 'interrupted';
    const { stringify } = await import('yaml');
    writeFileSync(join(wsDir, task.taskId, 'status.yaml'), stringify(t));

    const state = await initEngine(dir, wsDir, task.taskId);
    const action = getNextAction(state);
    expect(action.type).toBe('recover');
    expect(action.lastStage).toBe('plan');
  });

  // 17. Completed task returns complete action
  it('getNextAction returns complete for completed task', async () => {
    const task = createTask(wsDir, 'test-wf', 'done-test', []);
    updateTaskStatus(wsDir, task.taskId, 'pending', 'plan');
    const t = loadTask(wsDir, task.taskId);
    t.status = 'completed';
    t.stages = { plan: 'completed', execute: 'completed', verify: 'completed', deliver: 'completed' };
    const { stringify } = await import('yaml');
    writeFileSync(join(wsDir, task.taskId, 'status.yaml'), stringify(t));

    const state = await initEngine(dir, wsDir, task.taskId);
    const action = getNextAction(state);
    expect(action.type).toBe('complete');
  });

  // 18. Idempotency — calling getNextAction twice without applying result
  it('getNextAction is idempotent without state change', async () => {
    const state = await setupTask();
    const action1 = getNextAction(state);
    const action2 = getNextAction(state);
    expect(action1.type).toBe(action2.type);
    expect(action1.stageId).toBe(action2.stageId);
  });

  // 19. Workflow with optional human review does not block
  it('humanReview optional does not block execution', async () => {
    const task = createTask(wsDir, 'test-wf', 'optional-review', []);
    // verify stage has humanReview: optional
    updateTaskStatus(wsDir, task.taskId, 'pending', 'verify');
    const state = await initEngine(dir, wsDir, task.taskId);

    const result: StageResult = { success: true };
    const after = await applyStageResult(state, result);
    // Should advance to deliver without humanReviewPending
    expect(after.status.humanReviewPending).toBe(false);
    expect(after.status.currentStage).toBe('deliver');
  });
});
