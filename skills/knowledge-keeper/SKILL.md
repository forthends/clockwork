---
name: knowledge-keeper
description: >
  Generate structured knowledge base entries by analyzing code repositories.
  Walks through four categories (architecture, business, design-system,
  decisions) with user confirmation at each stage.
license: MIT
---

# Knowledge Keeper

Generate knowledge base entries from code repositories.

## Input

- `repo_path` (required): Path to the repository to analyze, e.g. `repos/my-service`
- `category` (optional): Specific category to generate. One of: `architecture`, `business`, `design-system`, `decisions`. If omitted, proceeds through all four in order. Note: `decisions` category uses findings from earlier phases — when requesting only `decisions`, run `architecture` + `business` + `design-system` first.

## Process

### Phase 1: Architecture Analysis

1. Read top-level config files: `package.json`, `tsconfig.json`, build config, linter config
2. Map directory structure — identify layering (src/, lib/, routes/, models/, etc.)
3. Identify API surface: route definitions, endpoint handlers, middleware chain
4. Identify data layer: schemas, entities, migrations, database-related files
5. Generate `knowledge/architecture/{topic}.md` covering:
   - Project structure overview
   - Tech stack inventory
   - API conventions (if applicable)
   - Data model overview (if applicable)
6. Present preview to user. Ask: "Does this architecture summary look accurate?"
7. If user approves, write to disk. If user provides corrections, revise and re-preview.

### Phase 2: Business Analysis

1. Scan for domain entity definitions: interfaces, types, classes named after business concepts
2. Identify state machines and status enums — trace transitions through the codebase
3. Find validation logic and business rule enforcement
4. Identify permission/authorization patterns
5. Generate `knowledge/business/{topic}.md` covering:
   - Domain entities and their fields
   - Business rules and invariants
   - Status/state lifecycles
6. Present preview. Ask: "Does this business domain summary look accurate?"
7. Confirm or revise as in Phase 1.

### Phase 3: Design System Analysis

1. Observe file naming patterns (kebab-case, PascalCase, etc.)
2. Observe code organization conventions (barrel exports, index files, feature folders)
3. Identify error handling patterns (try/catch placement, error types, HTTP error responses)
4. Review test file locations and naming (co-located vs separate, `.test.ts` vs `.spec.ts`)
5. Check TypeScript config strictness and type usage patterns
6. Generate `knowledge/design-system/{topic}.md` covering:
   - Naming and organization conventions
   - Error handling standards
   - Testing conventions
   - TypeScript rules
7. Present preview. Ask: "Do these engineering conventions look correct?"
8. Confirm or revise.

### Phase 4: Decisions Analysis

1. From the earlier phases, identify implicit decisions:
   - Framework choices (Express vs Fastify, etc.)
   - Architecture choices (layered vs hexagonal vs microservices)
   - Library choices (validation library, ORM, etc.)
2. Infer rationale from code organization (not speculation — describe what the code reveals)
3. Generate `knowledge/decisions/{topic}.md` covering:
   - Technology choices and their evidence
   - Architecture pattern choices and their evidence
   - Known tradeoffs visible in the code
4. Present preview. Ask: "Do these architecture decisions look accurate?"
5. Confirm or revise.

### Completion

After all categories are done, tell the user:

```
Knowledge generation complete. Run `clockwork knowledge update` to rebuild the index.
Review generated entries in knowledge/ and change `status: draft` to `active` after approval.
```

## Output

Knowledge entries are written to `knowledge/{category}/{topic}.md` with this format:

```yaml
---
tags: [tag1, tag2, tag3]
category: architecture
status: draft
updated: 'YYYY-MM-DD'
scope: global
---
# Topic Title

## Section

Content...
```

- `{topic}` is derived from the primary subject found (e.g., `api-conventions`, `domain-model`, `components`)
- Each entry starts with `status: draft` — human review required to change to `active`
- Tags are derived from technology names, patterns, and concepts identified in the code

## Constraints

- READ ONLY: Never modify any file outside `knowledge/`
- All generated entries MUST be written to `knowledge/{category}/` directories
- Every entry MUST have valid YAML frontmatter with tags, category, status, updated, scope
- Default status is `draft` — human must explicitly approve
- If a category has nothing meaningful to extract, say so and skip it
- Never fabricate information not present in the code
