# Clockwork 快速上手指南

## 1. 环境准备

- Node.js >= 20
- Git
- Claude Code（当前支持的 IDE）

## 2. 安装

```bash
# 进入 Clockwork 项目目录
cd clockwork

# 一键安装所有依赖
npm install --workspaces

# 构建 CLI 和 Workbench
npm run build

# 全局注册 clockwork 命令
npm link

# 验证安装
clockwork --help
```

`clockwork` 命令现在可在任意目录使用。

## 3. 创建第一个项目

```bash
# 在工作目录下初始化 Clockwork 项目
clockwork init my-project
cd my-project
```

这将创建完整的项目骨架：

```
my-project/
├── .clockwork/config.yaml   # 项目配置
├── agents/                  # Agent 角色定义
├── skills/                  # Skill 能力定义
├── knowledge/               # 知识库
├── workflows/               # 工作流定义
├── repos/                   # 代码仓库挂载点
└── workspace/               # 任务工作空间
```

## 4. 添加代码仓库

```bash
# 以 git submodule 方式挂载项目代码
git submodule add https://github.com/your-org/your-repo.git repos/your-repo
```

支持挂载多个仓库（如前端 + 后端），Agent 会在指定的 submodule 中工作。

## 5. 启动第一个任务

以"功能开发"为例，使用内置的 `feature-dev` 工作流：

```bash
# 方式一：通过管道传入需求
echo "实现用户注册功能：邮箱+密码注册，发送验证邮件" | \
  clockwork start feature-dev \
    --slug user-registration \
    --repo your-repo

# 方式二：直接在命令行指定需求
clockwork start feature-dev \
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

在项目目录下启动 Claude Code：

```bash
cd my-project
claude
```

启动后，使用 `Skill` 工具激活 workflow-runner 并传入任务 ID：

```
使用 workflow-runner 技能，执行任务 task-001-user-registration
```

或者直接粘贴 `clockwork start` 输出的提示指令。CC 会自动从 `.claude/skills/` 目录发现 workflow-runner 技能（`clockwork init` 已自动配置）。

Workflow Runner 将按照 feature-dev 工作流的阶段顺序依次执行：

1. **Plan 阶段**：Planner Agent 分析需求，生成 SPEC.md 和 PLAN.md，向人类提问澄清模糊点
2. **Implement 阶段**（人类审核通过后）：Implementer Agent 按 PLAN 逐任务 TDD 编码
3. **Review 阶段**：Reviewer Agent 审查代码变更，输出审查报告
4. **Deliver 阶段**：框架汇总产物，更新知识库

每个阶段的人类审核行为由 Workflow 定义中的 `human_review` 字段控制。

## 7. 查看任务状态

```bash
# 查看所有任务
clockwork status

# 查看特定任务详情
clockwork status task-001-user-registration
```

## 8. 审核 Agent 产物

```bash
# 批准当前阶段，继续执行
clockwork review task-001-user-registration --approve

# 驳回并说明原因
clockwork review task-001-user-registration --reject "需求分析不够详细，需要补充边界情况"

# 通过 Web 工作台审核
clockwork web
# 打开浏览器访问 http://localhost:4200，在 /tasks/:id/review 页面操作
```

`clockwork web` 首次启动时如果 Workbench 未构建，会自动执行构建。

## 9. 任务错误恢复

```bash
# 任务中断后恢复执行
clockwork resume task-001-user-registration

# 支持恢复的状态：
# - interrupted: Ctrl+C 中断后，从 recovery 快照恢复
# - failed: 阶段失败后，检查重试次数并恢复
# - paused: 任务暂停后继续
```

框架内置的错误恢复机制：

| 保护机制 | 行为                                           |
| -------- | ---------------------------------------------- |
| 文件锁   | 防止两个进程同时操作同一任务文件               |
| 中断存档 | Ctrl+C 时自动保存 recovery 快照，resume 时恢复 |
| 重试退避 | 阶段失败后 2^n 分钟退避重试（2→4→8 分钟）      |
| 超时保护 | 单阶段默认 10 分钟超时，超时自动标记 failed    |

## 10. 使用 Web 工作台

```bash
clockwork web
```

Web 工作台提供五个页面：

| 页面     | 路由              | 功能                                                |
| -------- | ----------------- | --------------------------------------------------- |
| 任务看板 | /tasks            | 按状态分列展示所有任务（进行中/待审核/已完成）      |
| 任务详情 | /tasks/:id        | 查看任务元数据、阶段进度、产物文档（Markdown 渲染） |
| 审核操作 | /tasks/:id/review | 非技术用户审核 Agent 产物，一键通过/驳回            |
| 知识库   | /knowledge        | 浏览项目知识条目，按分类和标签筛选                  |
| 知识详情 | /knowledge/:path  | 查看完整知识条目内容，支持代码高亮、表格等 GFM 语法 |

## 11. 管理知识与技能

```bash
# 更新知识索引（扫描 knowledge/ 目录中的 .md 文件）
clockwork knowledge update

# 列出可用技能
clockwork skill list
```

## 内置工作流一览

| 工作流            | 命令                                    | 适用场景                                                  |
| ----------------- | --------------------------------------- | --------------------------------------------------------- |
| feature-dev       | `start feature-dev --slug <name>`       | 新功能开发（plan → implement → review → deliver）         |
| bug-fix           | `start bug-fix --slug <name>`           | BUG 修复（diagnose → fix → verify → deliver）             |
| incident-response | `start incident-response --slug <name>` | 线上故障排查（triage → diagnose → mitigate → postmortem） |

## 内置 Agent 一览

| Agent       | 角色                | 关联 Skill                                    |
| ----------- | ------------------- | --------------------------------------------- |
| planner     | 需求分析 + 技术设计 | brainstorming, writing-plans                  |
| implementer | TDD 编码实现        | test-driven-development, systematic-debugging |
| reviewer    | 代码审查            | code-review                                   |
| debugger    | 根因分析与修复      | systematic-debugging                          |

## Demo 项目

`repos/demo-todo/` 是一个最小化的 Express + TypeScript Todo API，用于测试 Clockwork 工作流：

```bash
cd repos/demo-todo && npm install && npm test   # 22 个测试
```

端点：`GET/POST /api/v1/todos`、`GET/PATCH/DELETE /api/v1/todos/:id`

## 下一步

- 在 `agents/` 目录下自定义 Agent 角色
- 在 `skills/` 目录下添加自定义 Skill
- 在 `knowledge/` 目录下沉淀项目知识（业务规则、架构文档、工程规范）
- 在 `workflows/` 目录下定义自定义工作流
- 使用 `repos/demo-todo` 作为测试目标熟悉工作流
