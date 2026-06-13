# Clockwork 快速上手指南

## 1. 环境准备

- Node.js >= 20
- Git
- Claude Code（一期支持的 IDE）

## 2. 安装与初始化

```bash
# 进入 Clockwork 项目目录
cd clockwork

# 安装 CLI 依赖
cd cli && npm install && cd ..

# 验证 CLI 可用
npx tsx cli/src/index.ts --help
```

## 3. 创建第一个项目

```bash
# 在工作目录下初始化一个 Clockwork 项目
npx tsx cli/src/index.ts init my-project
cd my-project
```

这将在 `my-project/` 下创建完整的项目骨架：

```
my-project/
├── .clockwork/config.yaml   # 项目配置
├── agents/                  # 空目录，等待添加 Agent 定义
├── skills/                  # 空目录，等待添加 Skill
├── knowledge/               # 知识库（含 AGENTS.md）
├── workflows/               # 空目录，等待添加 Workflow
├── repos/                   # 代码仓库挂载点
└── workspace/               # 任务工作空间
```

## 4. 添加代码仓库

```bash
# 以 git submodule 方式挂载你的项目代码
git submodule add https://github.com/your-org/your-repo.git repos/your-repo
```

支持挂载多个仓库（如前端 + 后端），Agent 会在指定的 submodule 中工作。

## 5. 启动第一个任务

以"功能开发"为例，使用内置的 `feature-dev` 工作流：

```bash
# 方式一：通过管道传入需求
echo "实现用户注册功能：邮箱+密码注册，发送验证邮件" | \
  npx tsx cli/src/index.ts start feature-dev \
    --slug user-registration \
    --repo your-repo

# 方式二：直接在命令行指定需求
npx tsx cli/src/index.ts start feature-dev \
  --slug user-registration \
  --repo your-repo \
  --requirements "实现用户注册功能：邮箱+密码注册，发送验证邮件"
```

CLI 将创建任务工作空间，生成 Planner Agent 的上下文包，并提示下一步操作：

```
✓ Task created: task-001-user-registration
  Workflow: feature-dev
  Stage: plan (planner)
  Workspace: workspace/task-001-user-registration
  ⚠ Human review required after 'plan' stage

Next: Start Claude Code and run:
  /clockwork:workflow-runner task-001-user-registration
```

## 6. 在 Claude Code 中执行 Agent

启动 Claude Code，激活 workflow-runner 技能并执行任务：

```
/clockwork:workflow-runner task-001-user-registration
```

Workflow Runner 将按照 feature-dev 工作流的阶段顺序依次执行：

1. **Plan 阶段**：Planner Agent 分析需求，生成 SPEC.md 和 PLAN.md，向人类提问澄清模糊点
2. **Implement 阶段**（人类审核通过后）：Implementer Agent 按 PLAN 逐任务 TDD 编码
3. **Review 阶段**：Reviewer Agent 审查代码变更，输出审查报告
4. **Deliver 阶段**：框架汇总产物，更新知识库

每个阶段的人类审核行为由 Workflow 定义中的 `human_review` 字段控制。

## 7. 查看任务状态

```bash
# 查看所有任务
npx tsx cli/src/index.ts status --project my-project

# 查看特定任务详情
npx tsx cli/src/index.ts status task-001-user-registration --project my-project
```

## 8. 审核 Agent 产物

```bash
# 通过 CLI 审核
npx tsx cli/src/index.ts review task-001-user-registration --project my-project --approve

# 或者通过 Web 工作台审核
npx tsx cli/src/index.ts web --project my-project
# 打开浏览器访问 http://localhost:4200
```

## 9. 使用 Web 工作台

```bash
npx tsx cli/src/index.ts web --project my-project
```

Web 工作台提供四个页面：

| 页面 | 路由 | 功能 |
|------|------|------|
| 任务看板 | /tasks | 按状态分列展示所有任务（进行中/待审核/已完成） |
| 任务详情 | /tasks/:id | 查看产物文档，Markdown 渲染 |
| 审核操作 | /tasks/:id/review | 非技术用户审核 Agent 产物，一键通过/驳回 |
| 知识库 | /knowledge | 浏览项目知识条目，按分类和标签筛选 |

## 10. 管理知识与技能

```bash
# 更新知识索引（扫描 knowledge/ 目录中的 .md 文件）
npx tsx cli/src/index.ts knowledge update --project my-project

# 列出可用技能
npx tsx cli/src/index.ts skill list --project my-project
```

## 内置工作流一览

| 工作流 | 命令 | 适用场景 |
|--------|------|---------|
| feature-dev | `start feature-dev --slug <name>` | 新功能开发（plan → implement → review → deliver） |
| bug-fix | `start bug-fix --slug <name>` | BUG 修复（diagnose → fix → verify → deliver） |
| incident-response | `start incident-response --slug <name>` | 线上故障排查（triage → diagnose → mitigate → postmortem） |

## 内置 Agent 一览

| Agent | 角色 | 关联 Skill |
|-------|------|-----------|
| planner | 需求分析 + 技术设计 | brainstorming, writing-plans |
| implementer | TDD 编码实现 | test-driven-development, systematic-debugging |
| reviewer | 代码审查 | code-review |
| debugger | 根因分析与修复 | systematic-debugging |

## 下一步

- 在 `agents/` 目录下自定义 Agent 角色
- 在 `skills/` 目录下添加自定义 Skill
- 在 `knowledge/` 目录下沉淀项目知识（业务规则、架构文档、设计系统）
- 在 `workflows/` 目录下定义自定义工作流
