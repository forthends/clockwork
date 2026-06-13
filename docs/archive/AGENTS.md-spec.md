# AGENTS.md 文件格式规范

> 版本 1.1 | 2026-06-13

## 1. 概述

### 1.1 什么是 AGENTS.md

AGENTS.md 是一个开放、轻量的 Markdown 文件格式，用于向 AI coding agent 提供项目级指令和上下文。它是仓库中一个可预测的、专供 agent 使用的入口文件。

**历史**：2025 年 8 月由 OpenAI 提出，2025 年 12 月捐赠给 Linux 基金会下属 Agentic AI Foundation (AAIF)。截至 2026 年中，已有 60,000+ GitHub 仓库采用，20+ 编码代理工具原生支持。行业正从各工具自有指令格式（CLAUDE.md、.cursor/rules/、copilot-instructions.md）向 AGENTS.md 收敛。

### 1.2 定位

| 文件        | 受众            | 内容倾向                               |
| ----------- | --------------- | -------------------------------------- |
| `README.md` | 人类开发者      | 项目简介、快速上手、贡献指南           |
| `AGENTS.md` | AI coding agent | 构建命令、测试步骤、代码规范、安全约束 |

两者互补而非替代。AGENTS.md 承载那些对人不必要的细节（如 agent 特有命令、lint/test 的具体执行方式），保持 README 简洁。

### 1.3 设计目标

- **开放**：标准 Markdown，无私有扩展，任何 agent 均可消费
- **简单**：无强制 schema，无必填字段，创建成本趋近于零
- **可预测**：固定文件名、固定发现机制，agent 无需猜测
- **可组合**：支持 monorepo 中的嵌套结构，子项目可覆盖或追加父级配置

### 1.4 适用范围

本规范定义：

- AGENTS.md 文件的命名、位置、编码和格式
- Agent 的发现、加载、解析机制
- 多文件场景下的优先级与冲突解决

本规范不定义：

- Agent 内部如何处理解析后的指令（由各 agent 实现决定）
- 具体推荐哪些章节（见第 5 节最佳实践，非规范性内容）

---

## 2. 文件规范

### 2.1 文件名

```
AGENTS.md
```

- **必须**为 `AGENTS.md`（大小写敏感）
- 扩展名 `.md` 表示其内容为标准 Markdown

### 2.2 位置

AGENTS.md 可出现在仓库中的任意目录层级：

- **根目录**：`/AGENTS.md` —— 作用于整个仓库
- **子目录**：`/packages/<name>/AGENTS.md` —— 作用于该子包及其子树
- **嵌套**：同时存在多级文件时，适用优先级规则（见第 4 节）

### 2.3 格式

文件内容**必须**是合法的 [CommonMark](https://commonmark.org/) Markdown。

```
# AGENTS.md

## 构建命令
- 安装依赖: `pnpm install`
- 启动开发服务: `pnpm dev`

## 代码规范
- TypeScript strict 模式
- 单引号，无分号
```

- 无强制字段或结构
- 无 frontmatter 要求
- 章节标题、列表、代码块等使用标准 Markdown 语法
- Agent 将整份文件解析为结构化文本，提取可操作的指令

### 2.4 编码

文件**必须**以 UTF-8 编码，无 BOM。

### 2.5 大小

| 指标     | 建议值                            | 说明                                                |
| -------- | --------------------------------- | --------------------------------------------------- |
| 行数     | 20–60 行（理想），≤200 行（上限） | 较短的文件表现更好；每行都在竞争 agent 的上下文预算 |
| 字节数   | ≤32 KiB（Codex 默认上限）         | 其他 agent 可能有不同限制，32 KiB 是安全基线        |
| 嵌套拆分 | 单文件接近上限时按子目录拆分      | 超大型仓库通过多层嵌套 AGENTS.md 保持每个文件精简   |

普林斯顿大学对照实验表明，人工编写的短文件比 LLM 自动生成的冗长文件效果显著更好（见第 8 节）。

---

## 3. 发现与加载

### 3.1 查找策略

Agent 在处理文件时，按以下顺序查找 AGENTS.md：

1. 从**当前编辑文件所在目录**开始
2. 沿目录树**向上**查找，直至仓库根目录
3. 找到的第一个（最接近编辑文件的）AGENTS.md 即为生效文件

```
示例仓库结构：

/
├── AGENTS.md              ← A
├── packages/
│   ├── web/
│   │   └── AGENTS.md      ← B
│   └── core/
│       └── AGENTS.md      ← C
└── src/
    └── utils/
        └── AGENTS.md      ← D
```

若 agent 编辑 `/packages/web/src/App.tsx`：

- 查找路径：`/packages/web/src/` → `/packages/web/`（命中 B）
- 生效文件：B（`/packages/web/AGENTS.md`）

### 3.2 全局配置

若 agent 实现支持全局 AGENTS.md（用户级或系统级），全局文件的优先级低于项目级文件。即：项目级 > 全局级。

### 3.3 加载时机

Agent **应在**以下时机加载 AGENTS.md：

- 会话初始化时（仓库范围内）
- 切换工作目录时（不同子包间切换）
- 用户显式要求重新加载时

Agent **不应**每次读取文件时重新解析 AGENTS.md。实现应对已解析的 AGENTS.md 进行合理缓存，会话生命周期内复用。

### 3.4 向后兼容

为兼容早期的 `AGENT.md`（单数形式）命名，agent **应支持**以下任意一种迁移路径：

- 仓库中有 `AGENTS.md` 时直接使用
- 仓库中只有 `AGENT.md` 时，将其视为 AGENTS.md 处理
- 两者同时存在时，优先使用 `AGENTS.md`

Agent 可建议用户通过符号链接保持兼容：

```bash
mv AGENT.md AGENTS.md && ln -s AGENTS.md AGENT.md
```

---

## 4. 优先级与冲突解决

### 4.1 嵌套优先级

当同一个文件操作涉及多个层级的 AGENTS.md 时，**最近文件优先**：

```
文件被编辑位置    →    生效的 AGENTS.md
────────────────────────────────────────────
/packages/web/src/App.tsx   →   /packages/web/AGENTS.md
/packages/web/README.md     →   /packages/web/AGENTS.md
/src/utils/helper.ts        →   /src/utils/AGENTS.md（若存在）
/src/utils/helper.ts        →   /AGENTS.md（若 src/utils/ 下不存在）
```

Agent 实现**可以**选择合并多层配置（继承父级后被子级覆盖），但这不是强制要求。最小合规实现只需加载最近的一个 AGENTS.md。

### 4.2 用户指令覆盖

用户在对话中给出的**显式指令始终优先**于 AGENTS.md 中的任何内容。

```
优先级链（从高到低）：

1. 用户在当前对话中的显式指令
2. 当前有效范围内最近的 AGENTS.md
3. 祖先目录中的 AGENTS.md（若 agent 实现了合并）
4. Agent 默认行为
```

示例：若 AGENTS.md 指定 "使用 `npm test`"，但用户说 "用 `pnpm test`"，agent 必须使用 `pnpm test`。

### 4.3 指令冲突处理

当同一文件受多层 AGENTS.md 影响且 agent 实现了合并策略时：

- **同键冲突**（如构建命令）：子级覆盖父级
- **列表型冲突**（如 lint 规则）：子级追加到父级之后
- **布尔型冲突**（如是否允许自动提交）：子级覆盖父级

Agent 应将最终合并结果告知用户或写入日志，确保透明度。

---

## 5. 推荐内容结构

以下结构为最佳实践建议，**非规范性要求**。仓库可根据自身需要调整。

### 5.1 项目概述

```markdown
## 项目概述

- 项目名称：my-service
- 技术栈：Go + PostgreSQL
- 单体仓库，无子包
```

为 agent 提供理解项目边界和上下文所需的最小信息。

### 5.2 包管理器声明

```markdown
## Package Manager

Use **pnpm**: `pnpm install`, `pnpm dev`, `pnpm test`
```

明确声明项目使用的包管理器，这是 agent 最容易出错的地方之一。

### 5.3 构建与运行命令

```markdown
## Build & Test

- Build: `pnpm build`
- Test all: `pnpm test --run --no-color`
- Single file test: `pnpm vitest run path/to/file.test.ts`
- Lint: `pnpm eslint --fix path/to/file.ts`
- Typecheck: `pnpm tsc --noEmit`
```

**关键模式**：使用**文件级命令**而非全项目命令。`eslint --fix path/to/file.ts` 优于 `npm run lint`——agent 可在保存文件后立即验证，无需等待全项目构建。命令必须精确、可复制粘贴，包含必要的标志位（如 `--no-color`、`--noEmit`）。

### 5.4 测试命令

```markdown
## 测试

- 运行全部测试：`go test ./...`
- 运行单个包测试：`go test ./pkg/user`
- 运行带覆盖率的测试：`go test -cover ./...`
- CI 中还需运行集成测试：`go test -tags=integration ./...`
```

Agent 应自动执行此处列出的测试命令，并在测试失败时尝试修复。

### 5.5 代码风格

仅列出与语言/框架**默认约定不同的**规则。Agent 已默认了解 Prettier、PEP 8、gofmt 等标准约定，无需重复。

```markdown
## Code Style

- Named exports only, no default exports
- Server Components by default
- Tailwind for styling — no CSS modules
```

切勿复制 linter/formatter 配置中已有的规则，这会制造冗余和漂移风险。

### 5.6 项目架构

描述目录的**职责**而非文件清单。文件路径会快速过时；agent 通过读取目录树即可了解文件位置。

```markdown
## Architecture

- /src/api/ Route handlers (thin, delegate to services)
- /src/services/ Business logic
- /src/models/ Database models
- /src/lib/ Utilities, DB client
```

### 5.7 测试说明

```markdown
## Testing

- Factory Boy for test data, never fixtures
- No mocking the database — use test database
- Add or update tests for code you change
```

### 5.8 Git 工作流

```markdown
## Git

- Branch: `feature/<slug>` or `bugfix/<slug>`
- Commits: Conventional commits (`feat:`, `fix:`, `chore:`)
- PR title: `[<project_name>] <Title>`
```

### 5.9 安全注意事项

```markdown
## Security

- 不得在代码中硬编码密钥
- 用户输入必须经过校验和清理
- SQL 查询使用参数化，禁止字符串拼接
- 涉及认证的改动需通过安全审查
```

### 5.10 禁区（Do Not Touch）

明确列出 agent **绝对不能触碰**的文件或目录：

```markdown
## Do Not Touch

- Never modify files in /generated/
- Never commit .env files
- /legacy/ uses sync code intentionally — do not convert
- src/lib/billing/\* (PCI scope)
```

### 5.11 逃生口（When Stuck）

为 agent 提供遇到困难时的标准退避策略：

```markdown
## When Stuck

- Ask a clarifying question, propose a plan, or open a draft PR
```

这防止 agent 在卡住时反复尝试错误方案，浪费 token 和时间。

### 5.12 Monorepo 补充说明

```markdown
## Monorepo

- `/packages/api` — GraphQL 服务，使用 Apollo
- `/packages/web` — React SPA，使用 Vite
- 跨包子包引用通过 workspace 协议
```

---

## 6. 编写最佳实践

以下规则来自社区实践和研究数据，帮助编写高效的 AGENTS.md。

### 6.1 应该做（DO）

#### 使用要点和代码块，不写散文

Agent 解析的是结构化指令，不是叙事性段落。引言、结论、客套话一律删除。

```markdown
# 差

Welcome to our project! We're excited to have you contribute. Below you'll find...

# 好

## Build & Test

- Build: `pnpm build`
- Test: `pnpm test`
```

#### 使用强调标记

`IMPORTANT`、`NEVER`、`YOU MUST` 等标记**可测量地提高 agent 的遵守率**。普林斯顿研究表明，有强调标记的指令被遵守的概率显著更高。

```markdown
- NEVER commit .env files
- IMPORTANT: all mutations through server actions
```

#### 使用文件级命令

```markdown
# 差

- Lint: `npm run lint`

# 好

- Lint: `pnpm eslint --fix path/to/file.ts`
- Typecheck: `pnpm tsc --noEmit path/to/file.ts`
```

#### 描述能力而非文件路径

文件路径会过时。描述目录的职责，agent 可以通过读取目录树自行了解文件位置。

```markdown
# 差

- /src/utils/format.ts — formatting helpers
- /src/utils/http.ts — HTTP client wrapper

# 好

- /src/utils/ — Shared utilities (formatting, HTTP, date math)
```

#### 标注参考示例

```markdown
- Prefer `Projects.tsx` over `Admin.tsx` as the pattern to follow
```

#### 使用渐进式披露

将深层文档链接到外部，不在 AGENTS.md 中内联。

```markdown
- Auth flow: see /docs/auth.md for detailed sequence diagram
```

#### 从 20 行开始，逐步迭代

从小文件开始，观察 agent 行为后按需补充。人工迭代的 AGENTS.md 效果远优于一次性 LLM 生成的大文件。

### 6.2 不应该做（DON'T）

| 禁止                               | 原因                                                  |
| ---------------------------------- | ----------------------------------------------------- |
| 写引言、结论或客套话               | 消耗上下文预算，无信息增量                            |
| "You should..."、"Remember to..."  | 冗余措辞，降低指令密度                                |
| 硬编码文件路径                     | 文件路径快速过时，维护负担                            |
| 创建"命令墙"（长串 DO NOT）        | Agent 倾向于跳过大段否定列表                          |
| 复制 README 已有内容               | 两个文件各自维护，产生漂移                            |
| 复制 linter/formatter 配置中的规则 | Agent 已通过工具配置获取这些规则                      |
| 写 agent 已知的明显指令            | "write clean code"、"use best practices" 无实际约束力 |

### 6.3 何时不添加内容

满足以下任一条件，**不要**写入 AGENTS.md：

- Agent 已经自动做了（先观察测试，再决定是否需要显式声明）
- 一次性偶发事件（用 lint 规则或 CI 检查解决）
- 上游文档可链接到的内容
- 其他文件（README、CONTRIBUTING.md、linter 配置）已覆盖的内容

> **核心原则**：每行内容都在竞争 agent 的注意力。只写 agent 默认不知道的内容。

---

## 7. Agent 实现指南

### 7.1 解析方式

Agent **应**将 AGENTS.md 内容按标准 Markdown 解析。实现建议：

- 将 `#` 标题识别为章节边界
- 将 `- ` 列表项识别为指令条目
- 将 `` `code` `` 内联代码和 ` ``` ` 围栏代码块识别为可执行命令或代码片段
- 将纯文本段落识别为上下文描述

Agent 不必实现完整的 Markdown 渲染引擎。提取结构化指令的准确度取决于各实现的工程权衡。

### 7.2 指令执行

Agent 在处理任务**应**：

1. 解析 AGENTS.md 中列出的构建、测试、lint 等可编程检查
2. 在任务完成前**主动执行**这些检查
3. 检查失败时**尝试修复**并重新验证
4. 修复失败时**告知用户**，不静默跳过

对于非可执行指令（如代码风格描述、安全约束），agent **应**在生成或修改代码时遵守。

### 7.3 告知义务

Agent **应**在处理任务开始时简要提及正在遵循的 AGENTS.md（如 "已加载 `/packages/web/AGENTS.md`"），让用户知道哪些指令正在生效。

### 7.4 缓存

Agent **应**在会话生命周期内缓存已解析的 AGENTS.md 内容。文件发生变更时（可通过文件系统监听或用户通知）应重新解析。

### 7.5 兼容性要求

| 特性                          | 要求级别 |
| ----------------------------- | -------- |
| 发现并加载最近 AGENTS.md      | **必须** |
| 用户指令覆盖文件指令          | **必须** |
| 自动执行文件中列出的测试/lint | **建议** |
| 支持嵌套合并                  | **可选** |
| 兼容 `AGENT.md` 历史命名      | **建议** |
| 加载全局级 AGENTS.md          | **可选** |
| 变更检测与重新加载            | **可选** |

---

## 8. 研究证据

普林斯顿大学对照实验（10 个仓库，124 个 PR）量化了 AGENTS.md 的实际效果：

| 指标               | 改善幅度            |
| ------------------ | ------------------- |
| 任务运行时间中位数 | **减少 28.6%**      |
| Token 使用中位数   | **减少 16.6%**      |
| 输出 Token 数      | 从 2,925 降至 2,440 |

**关键发现**：

- **人工编写的** AGENTS.md 效果显著优于 LLM 自动生成的版本
- LLM 自动生成的 AGENTS.md 反而可能**降低任务成功率并增加 23% 的成本**
- 建议从小文件开始（20 行以内），通过观察 agent 实际行为逐步迭代

---

## 9. 生态与治理

### 9.1 治理结构

AGENTS.md 由 [Agentic AI Foundation (AAIF)](https://aaif.io) 管理，AAIF 作为 Linux 基金会的定向基金运作。

2025 年 12 月 9 日，Linux 基金会宣布成立 AAIF，同时托管三个创始项目：

| 项目                         | 贡献者    | 用途                         |
| ---------------------------- | --------- | ---------------------------- |
| **AGENTS.md**                | OpenAI    | AI 代理项目指令标准          |
| MCP (Model Context Protocol) | Anthropic | AI 模型与工具/数据的连接协议 |
| Goose                        | Block     | 开源本地优先 AI 代理框架     |

AGENTS.md 与 MCP 形成互补：AGENTS.md 告诉代理"这个项目怎么工作"，MCP 告诉代理"如何与外部系统交互"。

**治理特点**：

- Governing Board 负责战略投资、预算和成员资格
- 各项目保持完全的技术自主权
- 确保供应商中立性和长期独立性

**主要成员（Platinum 级，拥有理事会席位）**：AWS、Anthropic、Block、Bloomberg、Cloudflare、Google、Microsoft、OpenAI

### 9.2 与同类格式对比

| 格式                            | 路径                             | 所有者                  | 范围                          |
| ------------------------------- | -------------------------------- | ----------------------- | ----------------------------- |
| **AGENTS.md**                   | 仓库根目录（支持嵌套）           | Linux Foundation / AAIF | 跨工具开放标准                |
| CLAUDE.md                       | 仓库根目录 + `~/.claude/` + 嵌套 | Anthropic               | Claude Code 专有              |
| .cursor/rules/\*.mdc            | `.cursor/rules/` 目录            | Cursor                  | Cursor 专有，支持 glob 作用域 |
| SKILL.md                        | `~/.claude/skills/<name>/`       | Anthropic               | 任务级技能格式（渐进式披露）  |
| .github/copilot-instructions.md | `.github/` 目录                  | GitHub/Microsoft        | Copilot 专有                  |

**注意**：Claude Code 同时读取 CLAUDE.md 和 AGENTS.md。如果只能维护一个文件，选择 AGENTS.md——它的覆盖范围最广。

### 9.3 迁移策略

从其他格式迁移到 AGENTS.md：

```bash
# 从 AGENT.md（单数形式）迁移
mv AGENT.md AGENTS.md && ln -s AGENTS.md AGENT.md

# 从 CLAUDE.md 迁移：让 CLAUDE.md 引用 AGENTS.md
# CLAUDE.md 只需一行：
@AGENTS.md
```

对于 Cursor 用户：根目录保留 AGENTS.md（确保其他代理可用），使用 `.cursor/rules/` 存放 Cursor 专属的 glob 作用域覆盖。

### 9.4 兼容的编码代理工具

| 工具           | 开发者    | 支持方式                                      |
| -------------- | --------- | --------------------------------------------- |
| Codex          | OpenAI    | 原生主格式                                    |
| Claude Code    | Anthropic | 同时读取 CLAUDE.md 和 AGENTS.md               |
| GitHub Copilot | Microsoft | 原生支持                                      |
| Cursor         | Cursor    | 原生支持                                      |
| Gemini CLI     | Google    | 需配置 `.gemini/settings.json`                |
| Jules          | Google    | 原生支持                                      |
| Aider          | —         | 需配置 `.aider.conf.yml`（`read: AGENTS.md`） |
| Windsurf       | Cognition | 原生支持                                      |
| Devin          | Cognition | 原生支持                                      |
| Zed            | —         | 原生支持                                      |
| Factory        | —         | 原生支持                                      |
| Warp           | —         | 原生支持                                      |
| VS Code        | Microsoft | 原生支持                                      |
| Amp            | —         | 原生支持                                      |
| Junie          | JetBrains | 原生支持                                      |
| Goose          | Block     | 原生支持                                      |
| Kilo Code      | —         | 支持                                          |
| RooCode        | —         | 支持                                          |
| Augment Code   | —         | 支持                                          |
| Semgrep        | —         | 支持                                          |
| OpenCode       | —         | 支持                                          |
| Phoenix        | —         | 支持                                          |
| Ona            | —         | 支持                                          |
| UiPath         | UiPath    | 支持                                          |

### 9.5 快速启动模板

```markdown
# Project Name — Agent Guide

[一句话描述项目]

## Package Manager

Use **pnpm**: `pnpm install`, `pnpm dev`, `pnpm test`

## Build & Test

- Build: `pnpm build`
- Test all: `pnpm test`
- Single file test: `pnpm vitest run path/to/file.test.ts`
- Lint: `pnpm eslint --fix path/to/file.ts`
- Typecheck: `pnpm tsc --noEmit path/to/file.ts`

## Architecture

- /src/app/ App Router pages
- /src/components/ React components (named exports)
- /src/lib/ Utilities, DB client
- /src/actions/ Server actions (all mutations here)

## Code Style

- Server Components by default
- Named exports only (except page.tsx, layout.tsx)
- Tailwind for styling — no CSS modules

## Rules

- Mutations through server actions, not API routes
- All DB access through ORM in server components
- Run typecheck before committing
- Never commit .env files

## When Stuck

- Ask a clarifying question, propose a plan, or open a draft PR
```
