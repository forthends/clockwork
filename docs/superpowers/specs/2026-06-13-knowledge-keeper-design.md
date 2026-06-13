# Clockwork Knowledge Keeper — 知识库 Agent & Skill 设计

> 版本 0.1 | 2026-06-13 | 设计阶段

## 1. 问题与目标

### 1.1 现状

- `clockwork init` 复制 3 条模板知识条目（API Conventions、Domain Model、Engineering Standards）到 `knowledge/`
- `clockwork knowledge update` 仅扫描已有 .md 文件重建索引，不生成新内容
- 用户初始化项目后，knowledge/ 目录几乎为空，不知道如何开始填充知识库
- 知识库的填充完全依赖人工手动编写

### 1.2 目标

新增一个知识库维护能力，支持：

1. 自动读取 `repos/` 目录下的代码仓库，分析生成结构化的知识条目
2. 覆盖全部四个分类：architecture、business、design-system、decisions
3. 分类型逐步确认（每完成一个分类暂停让用户审核，再继续下一个）
4. 三种触发方式：手动 Skill 调用、CLI 命令、工作流 deliver 阶段自动触发
5. 生成的条目默认 `status: draft`，需人工审核后改为 `active`

## 2. 设计

### 2.1 Agent 角色定义

新增 `agents/knowledge-keeper.md`：

```yaml
---
name: knowledge-keeper
description: >
  分析代码仓库生成结构化知识库条目。
  覆盖架构模式、业务实体与规则、工程规范、关键决策四个分类。
role: Knowledge Keeper
capabilities:
  - 项目结构与技术栈分析
  - 从代码中识别业务实体、状态机和领域规则
  - 工程规范与命名约定识别
  - 架构决策文档化
boundaries:
  - 只读代码，绝不修改源文件
  - 仅输出到 knowledge/ 目录
  - 生成条目默认 status: draft，需人工审核
  - 不凭空编造代码中不存在的业务上下文
input:
  required: [repo_path]
  optional: [category, knowledge_context]
output:
  - file: knowledge/{category}/{topic}.md
    description: 带 YAML frontmatter 的结构化知识条目
skills:
  - knowledge-keeper
model: sonnet
---
```

Agent 工作流程：

1. 读取 repo 目录结构和关键文件
2. 按指定 category 分析代码
3. 生成本 category 的知识条目（markdown + YAML frontmatter）
4. 向用户展示预览，等待确认
5. 用户确认后写入 `knowledge/{category}/`，进入下一 category
6. 全部完成后提醒用户运行 `clockwork knowledge update` 重建索引

### 2.2 Skill 定义

新增 `skills/knowledge-keeper/SKILL.md`，定义四阶段知识生成流程：

**阶段 1: architecture**

- 分析内容：项目结构、技术栈（package.json / tsconfig / build config）、API 路由与端点、中间件栈、数据模型（schema / entity / migration）、外部依赖与服务边界
- 输出：`knowledge/architecture/{topic}.md`

**阶段 2: business**

- 分析内容：业务实体定义（interface / type / class named after domain concepts）、状态机和状态转换逻辑、业务校验规则、权限与角色模型、领域事件
- 输出：`knowledge/business/{topic}.md`

**阶段 3: design-system**

- 分析内容：目录结构约定、命名规范、错误处理模式、测试策略与覆盖率约定、TypeScript 严格规则、代码组织约定
- 输出：`knowledge/design-system/{topic}.md`

**阶段 4: decisions**

- 分析内容：为什么选择特定库/框架、为什么采用某种架构分层、隐式架构假设（通过代码组织反推）、已知技术债务和权衡
- 输出：`knowledge/decisions/{topic}.md`

每个阶段完成后生成预览，用户确认或提出修改意见后进入下一阶段。如果某个分类没有可提取的新内容，跳过该分类并报告原因。

**知识条目输出格式：**

```markdown
---
tags: [tag1, tag2, tag3]
category: architecture
status: draft
updated: '2026-06-13'
scope: global
---

# Topic Title

## Section

Content...
```

### 2.3 CLI 命令

在 `knowledge` 子命令组下新增 `generate` 命令：

```
clockwork knowledge generate --repo <name> [--category <cat>]
```

**参数：**

| 参数               | 必需 | 说明                                                                                        |
| ------------------ | ---- | ------------------------------------------------------------------------------------------- |
| `--repo <name>`    | 是   | repos/ 下的仓库目录名                                                                       |
| `--category <cat>` | 否   | 仅生成指定分类：architecture / business / design-system / decisions。不指定则按顺序全部生成 |

**行为：**

1. 验证 `repos/<name>` 存在
2. 收集仓库元信息：文件树、package.json、tsconfig.json、目录结构
3. 加载已有知识库索引（提供给 agent 作为上下文，避免重复生成）
4. 构建 Agent 上下文包（复用 `context-builder.ts` 的逻辑）
5. 输出上下文包路径和下一步提示：

```
✓ Knowledge generation context prepared
  Agent: knowledge-keeper
  Repo:   <name>
  Category: architecture → business → design-system → decisions

Next: Start Claude Code and use the knowledge-keeper skill:
  Skill: knowledge-keeper
  Input:  repo_path=repos/<name>, category=all
```

**实现要点：**

- 在 `cli/src/commands/knowledge.ts` 中新增 `generate` 子命令
- 复用 `context-builder.ts` 的 `buildAgentContext()` 和 `saveContextPackage()` 函数
- 验证 repo 存在性和 knowledge/ 目录可写性

### 2.4 工作流集成

修改 `feature-dev` 和 `bug-fix` 的 deliver 阶段：

**当前状态：**

```yaml
- id: deliver
  agent: none
  actions:
    - summarize_artifacts
    - update_knowledge
```

**改为：**

```yaml
- id: deliver
  description: Summarize artifacts, update knowledge, notify for final approval
  agent: knowledge-keeper
  input:
    required: [SPEC.md, PLAN.md, code_changes]
  actions:
    - summarize_artifacts
    - generate_incremental_knowledge
    - update_knowledge_index
```

**`generate_incremental_knowledge` 行为：**

- 分析本次变更涉及的文件（通过 code_changes 或 git diff）
- 识别是否存在新实体、新 API 端点、新架构模式
- 如有新发现，生成增量知识条目（status: draft）
- 如无新发现，跳过（不强行输出）
- 非阻塞：即使跳过也不影响 deliver 阶段完成

**影响范围：**

| 文件                                 | 改动                              |
| ------------------------------------ | --------------------------------- |
| `workflows/feature-dev.md`           | deliver 阶段 agent + actions 更新 |
| `workflows/bug-fix.md`               | deliver 阶段 agent + actions 更新 |
| `templates/workflows/feature-dev.md` | 同步更新模板                      |
| `templates/workflows/bug-fix.md`     | 同步更新模板                      |

`incident-response` 的 postmortem 阶段首期不做修改。

## 3. 文件变更清单

| 操作 | 文件                                             | 说明                                    |
| ---- | ------------------------------------------------ | --------------------------------------- |
| 新增 | `agents/knowledge-keeper.md`                     | Agent 角色定义                          |
| 新增 | `skills/knowledge-keeper/SKILL.md`               | Skill 技能定义                          |
| 新增 | `cli/templates/agents/knowledge-keeper.md`       | 内置 Agent 模板（init 时复制）          |
| 新增 | `cli/templates/skills/knowledge-keeper/SKILL.md` | 内置 Skill 模板（init 时复制）          |
| 修改 | `cli/src/commands/knowledge.ts`                  | 新增 `generate` 子命令                  |
| 修改 | `cli/src/types.ts`                               | 新增 KnowledgeKeeper 相关类型（如需要） |
| 修改 | `workflows/feature-dev.md`                       | deliver 阶段更新                        |
| 修改 | `workflows/bug-fix.md`                           | deliver 阶段更新                        |
| 修改 | `cli/templates/workflows/feature-dev.md`         | 模板同步                                |
| 修改 | `cli/templates/workflows/bug-fix.md`             | 模板同步                                |
| 新增 | `cli/tests/commands/knowledge.test.ts`           | generate 命令测试                       |

## 4. 与后续子项目的关系

| 子项目                         | 依赖关系                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| P1: Knowledge Keeper（本设计） | —                                                            |
| P2: Onboard 命令               | 依赖 P1：onboard 中"知识库生成"阶段调用 `knowledge generate` |
| P3: 角色协作                   | 依赖 P1：协作上下文初始化时加载知识库为公共上下文            |
