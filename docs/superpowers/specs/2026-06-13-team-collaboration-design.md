# Clockwork 多人协作与阶段引导

> 版本 0.1 | 2026-06-13 | 设计阶段

## 1. 问题与目标

### 1.1 现状

- 工作流定义了 Agent 阶段，但未区分人类角色
- 无个人信息配置，无法标注产物署名
- 新成员加入项目无引导流程
- 敏捷团队的不同角色（PM/Developer/Tester）缺乏明确分工和产出物定义

### 1.2 目标

- 新增个人信息配置（`.clockwork/user.yaml`），与项目配置分离
- 新增角色驱动的工作流 `team-feature-dev`：requirements → design → implementation → testing → deliver
- `clockwork onboard` 自动检测项目状态，支持新成员加入
- 三个阶段导航角色：PM（需求定义）、Developer（技术设计 + 编码）、Tester（测试计划 + 缺陷跟踪）

## 2. 设计

### 2.1 配置文件拆分

| 文件                     | 内容     | 创建时机               | Git       |
| ------------------------ | -------- | ---------------------- | --------- |
| `.clockwork/config.yaml` | 项目配置 | `onboard` 阶段 1       | 提交      |
| `.clockwork/user.yaml`   | 个人配置 | `onboard` 个人信息采集 | gitignore |

**user.yaml 格式：**

```yaml
user:
  name: '张三'
  role: 'developer'
  email: 'zhangsan@example.com'
```

**角色定义：**

| role        | 职责                       | 产出物                        | 匹配阶段                |
| ----------- | -------------------------- | ----------------------------- | ----------------------- |
| `pm`        | 需求定义                   | PRD.md                        | requirements            |
| `developer` | 技术设计 + 编码实现        | SPEC.md + PLAN.md + 代码      | design + implementation |
| `tester`    | 测试计划 + 执行 + 缺陷跟踪 | TEST_PLAN.md + TEST_REPORT.md | testing                 |

### 2.2 角色驱动工作流

新增 `workflows/team-feature-dev.md`：

```yaml
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
```

**阶段流转：**

```
requirements ──(pm approved)──→ design
design ──(developer approved)──→ implementation
implementation ──(auto)──→ testing
testing ──(tester approved)──→ deliver
deliver ──(auto)──→ completed
```

**与 `feature-dev` 的关系：** `feature-dev` 保留供单人使用。`team-feature-dev` 是新增的多人协作工作流。

### 2.3 个人信息采集

`clockwork onboard` 启动时检测 `.clockwork/config.yaml` 是否已存在：

**场景 A：新项目（无 config.yaml）**

- 执行阶段 1-4（项目骨架 → 仓库导入 → 知识库生成 → 配置检查）
- 阶段 4 完成后，额外采集个人信息
- 写入 `.clockwork/user.yaml`

**场景 B：新成员加入（有 config.yaml，无 user.yaml）**

- 提示已检测到项目
- 跳过阶段 1-3
- 直接采集个人信息
- 写入 `.clockwork/user.yaml`
- 执行阶段 4 配置检查（验证个人环境就绪）

**场景 C：已配置（两者都有）**

- 显示当前用户信息
- 询问是否修改或退出

**个人配置交互：**

```
━━━━ 个人信息 ━━━━

你的姓名:
> 张三

你的角色:
  1. pm (产品经理)
  2. developer (开发者)
  3. tester (测试)
> 2

你的邮箱:
> zhangsan@example.com

确认信息:
  姓名: 张三
  角色: developer
  邮箱: zhangsan@example.com

确认? (Y/n):
```

### 2.4 模板和配置更新

**`.gitignore` 模板更新：** 增加 `.clockwork/user.yaml`

**`init.ts` 更新：** `createProject()` 中 `.gitignore` 写入包含 user.yaml 豁免规则

**`onboard.ts` 更新：** 入口增加 config.yaml 存在性检测，分流三种场景

**产物署名格式：** 知识条目 frontmatter 增加 `author` 字段：

```yaml
---
author: '张三 (developer)'
tags: [api, REST]
category: architecture
status: draft
updated: '2026-06-13'
scope: global
---
```

## 3. 文件变更清单

| 操作 | 文件                                          | 说明                        |
| ---- | --------------------------------------------- | --------------------------- |
| 新增 | `workflows/team-feature-dev.md`               | 角色驱动工作流定义          |
| 新增 | `cli/templates/workflows/team-feature-dev.md` | 工作流模板                  |
| 修改 | `cli/src/commands/onboard.ts`                 | 三种场景分流 + 个人信息采集 |
| 修改 | `cli/src/commands/init.ts`                    | .gitignore 包含 user.yaml   |
| 修改 | `cli/templates/knowledge/index.yaml`          | （如有修改）                |
| 新增 | `cli/tests/e2e/team-feature-dev.test.ts`      | 工作流端到端测试            |
| 修改 | `cli/tests/commands/onboard.test.ts`          | 个人信息采集测试            |

## 4. 类型系统更新

`cli/src/types.ts` 新增：

```typescript
export interface UserConfig {
  name: string;
  role: 'pm' | 'developer' | 'tester';
  email: string;
}
```

`WorkflowStage` 新增 `role` 字段：

```typescript
export interface WorkflowStage {
  // ... existing fields
  role?: 'pm' | 'developer' | 'tester';
}
```
