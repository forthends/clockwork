# Clockwork

AI collaboration governance framework for agile development teams.

## Overview

Clockwork adds a governance layer on top of your IDE's native AI agent capabilities. Define Agent roles, Skills, Knowledge, and Workflows to transform "just write code" into structured, auditable, collaborative development.

**Current version: 0.2.0** — MVP with global CLI, programmatic workflow engine, error recovery, and web dashboard.

## Quick Start

See the full walkthrough in **[docs/quickstart.md](docs/quickstart.md)**.

```bash
# 1. Install globally
npm install --workspaces && npm run build && npm link

# 2. Initialize a Clockwork project
clockwork init my-project && cd my-project

# 3. Add your code repository
git submodule add https://github.com/your-org/your-repo.git repos/your-repo

# 4. Start a feature development task
clockwork start feature-dev --slug user-registration --repo your-repo \
  --requirements "Add user registration with email verification"

# 5. Execute in Claude Code
# /clockwork:workflow-runner task-001-user-registration

# 6. Review and approve via web dashboard
clockwork web
```

## Architecture

```
clockwork/
├── agents/         Agent role definitions (Planner, Implementer, Reviewer, Debugger)
├── skills/         Task-specific skills (TDD, Code Review, Debugging, Workflow Runner, etc.)
├── knowledge/      Project knowledge base (AGENTS.md + indexed entries)
├── workflows/      Multi-agent workflow definitions (feature-dev, bug-fix, incident-response)
├── repos/          Your code repositories (git submodule)
│   └── demo-todo/  Demo Express+TypeScript Todo API for testing
├── workspace/      Task artifacts and agent outputs
├── cli/            CLI tool (Node.js/TypeScript, commander.js)
│   └── src/
│       └── workflow-engine.ts  Deterministic workflow state machine
└── workbench/      Web dashboard (React/Vite)
```

## Features

### Four Agent Roles

| Agent       | Role                                     | Skills                                        |
| ----------- | ---------------------------------------- | --------------------------------------------- |
| Planner     | Technical design & requirements analysis | brainstorming, writing-plans                  |
| Implementer | TDD-driven code implementation           | test-driven-development, systematic-debugging |
| Reviewer    | Code review & quality assurance          | code-review                                   |
| Debugger    | Root cause analysis & bug fixing         | systematic-debugging                          |

### Three Workflows

| Workflow          | Stages                                    | Use Case                            |
| ----------------- | ----------------------------------------- | ----------------------------------- |
| feature-dev       | plan → implement → review → deliver       | New feature development             |
| bug-fix           | diagnose → fix → verify → deliver         | Bug fixing with root cause analysis |
| incident-response | triage → diagnose → mitigate → postmortem | Production incident response        |

### CLI Commands

| Command                      | Description                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `clockwork init [path]`      | Initialize a new Clockwork project                                                |
| `clockwork start <workflow>` | Create a new task, build agent context, and validate engine (with `--auto-start`) |
| `clockwork status [task-id]` | List all tasks or show task details                                               |
| `clockwork resume <task-id>` | Resume a paused, failed, or interrupted task                                      |
| `clockwork review <task-id>` | Approve or reject task stages                                                     |
| `clockwork repo add <url>`   | Add a git submodule repository                                                    |
| `clockwork repo status`      | Show repository status                                                            |
| `clockwork knowledge update` | Rebuild knowledge index                                                           |
| `clockwork skill list`       | List available skills                                                             |
| `clockwork web`              | Start the web dashboard (auto-builds workbench)                                   |

### Web Dashboard

| Page              | Route               | Function                                          |
| ----------------- | ------------------- | ------------------------------------------------- |
| Task Board        | `/tasks`            | Kanban-style task overview by status              |
| Task Detail       | `/tasks/:id`        | Task metadata, stage progress, artifact viewer    |
| Task Review       | `/tasks/:id/review` | Approve/reject agent outputs                      |
| Knowledge Browser | `/knowledge`        | Browse and filter knowledge entries               |
| Knowledge Detail  | `/knowledge/:path`  | View full knowledge entry with markdown rendering |

### Workflow Engine

The workflow engine (`cli/src/workflow-engine.ts`) is a deterministic TypeScript state machine that drives workflow execution. It manages stage transitions, retry logic with exponential backoff, timeout detection, human review gates, and recovery from interrupted state. The workflow-runner skill acts as a thin Claude Code adapter — it calls the engine to decide what to do next, dispatches sub-agents when instructed, and reports results back.

### Error Recovery

- **Programmatic engine** — Workflow state machine manages retries, timeouts, and stage transitions deterministically
- **File locking** — Prevents concurrent task state corruption
- **Interrupted state** — SIGINT triggers recovery snapshot, `resume` restores from checkpoint
- **Retry with backoff** — Failed stages retry with 2^n minute exponential backoff (1m → 2m → 4m → … → 60m cap)
- **Timeout protection** — Stages auto-terminate after configurable timeout (default 10 min)

## Development

```bash
# One-time setup
npm install --workspaces
npm run build

# Run all tests
npm test

# Run CLI tests only
npm run test -w cli

# Run workbench tests only
npm run test -w workbench

# Start workbench dev server
npm run dev:workbench -w workbench
```

## Demo Project

`repos/demo-todo/` is a minimal Express + TypeScript Todo API you can use to test Clockwork workflows:

```bash
cd repos/demo-todo && npm install && npm test
```

Endpoints: `GET/POST /api/v1/todos`, `GET/PATCH/DELETE /api/v1/todos/:id`

## License

MIT
