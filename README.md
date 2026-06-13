# Clockwork

AI collaboration governance framework for agile development teams.

## Overview

Clockwork adds a governance layer on top of your IDE's native AI agent capabilities. Define Agent roles, Skills, Knowledge, and Workflows to transform "just write code" into structured, auditable, collaborative development.

## Quick Start

See the full walkthrough in **[docs/quickstart.md](docs/quickstart.md)** — from installation to your first AI-driven feature delivery in 10 steps.

```bash
# 1. Initialize a Clockwork project
npx tsx cli/src/index.ts init my-project && cd my-project

# 2. Add your code repository
git submodule add https://github.com/your-org/your-repo.git repos/your-repo

# 3. Start a feature development task
echo "Add user registration" | npx tsx cli/src/index.ts start feature-dev --slug user-registration --repo your-repo

# 4. Execute in Claude Code
# /clockwork:workflow-runner task-001-user-registration

# 5. Review and approve via web dashboard
npx tsx cli/src/index.ts web
```

## Architecture

```
clockwork/
├── agents/       Agent role definitions (Planner, Implementer, Reviewer, Debugger)
├── skills/       Task-specific skills (TDD, Code Review, Debugging, etc.)
├── knowledge/    Project knowledge base (AGENTS.md + indexed entries)
├── workflows/    Multi-agent workflow definitions (feature-dev, bug-fix, incident-response)
├── repos/        Your code repositories (git submodule)
├── workspace/    Task artifacts and agent outputs
├── cli/          CLI tool source
└── workbench/    Web dashboard source
```

## Development

```bash
# Install dependencies
cd cli && npm install
cd ../workbench && npm install

# Run tests
cd cli && npm test

# Build workbench
cd workbench && npm run build
```

## License

MIT
