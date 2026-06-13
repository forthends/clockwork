# AGENTS.md 深度洞察报告

> 报告日期：2026-06-13
> 来源：https://agents.md 官方站点、GitHub 仓库、社区分析与行业报道

---

## 一、概述

**AGENTS.md** 是一个开放、轻量的 Markdown 格式标准，用于为 AI 编码代理（coding agents）提供项目级上下文指令。它被称为 **"给 AI 代理看的 README"**——正如 README.md 面向人类贡献者，AGENTS.md 面向 AI 编码工具。

- **官方站点**: https://agents.md
- **GitHub 仓库**: https://github.com/openai/agents.md
- **监管机构**: Linux 基金会下属 Agentic AI Foundation (AAIF)
- **发布时间**: 2025 年 8 月由 OpenAI 提出，2025 年 12 月捐赠给 Linux 基金会
- **采用规模**: 60,000+ GitHub 仓库已采用，20+ 编码代理工具原生支持

---

## 二、核心理念

### 为什么需要 AGENTS.md？

| 文件 | 读者 | 内容定位 |
|------|------|----------|
| README.md | 人类开发者 | 项目介绍、快速上手、贡献指南 |
| AGENTS.md | AI 编码代理 | 构建命令、测试流程、编码约束、项目架构 |

**设计原则**：
- 为代理提供一个**可预测的、专门的**指令位置
- 保持 README 简洁，面向人类
- 补充而非替代现有文档
- 开放格式，不绑定任何厂商

---

## 三、规范定义

AGENTS.md 的规范极其简洁：

> 一个纯 Markdown 文件，放置在仓库根目录的 `AGENTS.md`，无强制结构、无 YAML frontmatter、无 schema。

### 层级规则
- 根目录 AGENTS.md 适用于整个项目
- 支持子目录嵌套 AGENTS.md（monorepo 场景）
- **就近原则**：离被编辑文件最近的 AGENTS.md 优先级最高
- OpenAI 自身仓库包含 88 个嵌套 AGENTS.md 文件
- Codex 默认文件大小上限为 32 KiB

### 与用户指令的优先级
1. 用户聊天中的显式指令（最高优先级）
2. 最近的 AGENTS.md 文件
3. 根目录 AGENTS.md 文件

---

## 四、建议内容结构（六大高价值模块）

### 1. 构建与测试命令
```markdown
## Build & Test
- Build: `pnpm build`
- Test all: `pnpm test --run --no-color`
- Single test: `pnpm vitest run path/to/file.test.ts`
- Lint: `pnpm eslint --fix path/to/file.ts`
- Typecheck: `pnpm tsc --noEmit`
```
**要点**：精确、可复制粘贴的命令，包含必要标志位。

### 2. 代码风格规则
仅列出与语言/框架默认风格**不同的**规则（代理已默认了解 Prettier、PEP 8 等标准约定）：
```markdown
## Code Style
- Named exports only, no default exports
- Server Components by default
- Tailwind for styling — no CSS modules
```

### 3. 项目结构
描述目录的**职责**而非文件清单：
```markdown
## Architecture
- /src/api/       Route handlers (thin, delegate to services)
- /src/services/  Business logic
- /src/models/    Database models
- /src/lib/       Utilities, DB client
```

### 4. 测试说明
```markdown
## Testing
- Factory Boy for test data, never fixtures
- No mocking the database — use test database
- Add or update tests for code you change
```

### 5. Git 工作流
```markdown
## Git
- Branch: `feature/<slug>` or `bugfix/<slug>`
- Commits: Conventional commits (`feat:`, `fix:`, `chore:`)
- PR title: `[<project_name>] <Title>`
```

### 6. 禁区/边界
代理**绝不能触碰**的内容：
```markdown
## Do Not Touch
- Never modify files in /generated/
- Never commit .env files
- /legacy/ uses sync code intentionally — do not convert
- src/lib/billing/* (PCI scope)
```

---

## 五、编写最佳实践

### DO（应该做）
- 使用**要点和代码块**（不要写段落散文）
- 使用**文件级命令**（`eslint path/to/file.ts` 而非全项目构建）
- 标注好的/坏的示例文件：Prefer `Projects.tsx` over `Admin.tsx`
- 保持文件在 **20-60 行**，不超过 100-200 行
- 用**渐进式披露**链接到深层文档
- 描述**能力**而非文件路径（文件路径会过时）
- 使用强调标记（IMPORTANT、NEVER、YOU MUST）可**可测量地提高遵守率**
- 添加"遇到困难时"的逃生口：Ask a clarifying question or propose a plan

### DON'T（不应该做）
- 写引言、结论或客套话
- 使用 "You should..." 或 "Remember to..."
- 硬编码文件路径（快速过时）
- 创建"命令墙"——代理会跳过的长串 DO NOT 列表
- 复制 README 已有的内容
- 复制 linter/formatter 配置中已有的规则
- 写代理已知道的明显指令（"write clean code"）

### 何时不添加内容
- 代理已经自动做了（先测试验证）
- 一次性的偶发事件（用 lint 规则或 CI 检查解决）
- 上游文档可链接到的内容
- 其他文件已覆盖的内容

---

## 六、研究与数据证据

**普林斯顿大学对照实验**（10 个仓库，124 个 PR）：

| 指标 | 改善幅度 |
|------|----------|
| 运行时间中位数 | **减少 28.6%** |
| Token 使用中位数 | **减少 16.6%** |
| 输出 Token 数 | 从 2,925 降至 2,440 |

**关键发现**：
- **人工编写的** AGENTS.md 效果显著优于 LLM 自动生成的版本
- LLM 自动生成的 AGENTS.md 反而可能**降低任务成功率并增加 23% 的成本**
- 建议从小开始，逐步迭代完善

---

## 七、生态系统

### 兼容的编码代理工具（20+）

| 工具 | 开发者 | 支持方式 |
|------|--------|----------|
| Codex | OpenAI | 原生主格式 |
| Claude Code | Anthropic | 同时读取 CLAUDE.md 和 AGENTS.md |
| GitHub Copilot | Microsoft | 原生支持（回退） |
| Cursor | Cursor | 原生支持 |
| Gemini CLI | Google | 需配置 |
| Jules | Google | 原生支持 |
| Aider | — | 需配置 `.aider.conf.yml` |
| Windsurf | Cognition | 原生支持 |
| Devin | Cognition | 原生支持 |
| Zed | — | 原生支持 |
| Factory | — | 原生支持 |
| Warp | — | 原生支持 |
| VS Code | Microsoft | 原生支持 |
| Amp | — | 原生支持 |
| Junie | JetBrains | 原生支持 |
| Goose | Block | 原生支持 |
| Kilo Code | — | 支持 |
| RooCode | — | 支持 |
| Augment Code | — | 支持 |
| Semgrep | — | 支持 |

### 同类格式对比

| 格式 | 路径 | 所有者 | 范围 |
|------|------|--------|------|
| **AGENTS.md** | 仓库根目录（支持嵌套） | Linux Foundation / AAIF | 跨工具开放标准 |
| **CLAUDE.md** | 仓库根目录 + `~/.claude/` + 嵌套 | Anthropic | Claude Code 专有 |
| **.cursor/rules/\*.mdc** | `.cursor/rules/` 目录 | Cursor | Cursor 专有，支持 glob 作用域 |
| **SKILL.md** | `~/.claude/skills/<name>/` | Anthropic | 任务范围技能格式 |
| **.github/copilot-instructions.md** | `.github/` 目录 | GitHub/Microsoft | Copilot 专有 |

### 迁移与兼容策略

**如果只选一个格式，选 AGENTS.md。** 实用建议：

```bash
# 从 CLAUDE.md 迁移：让 CLAUDE.md 引用 AGENTS.md
# CLAUDE.md 只需一行：
@AGENTS.md

# 从其他格式迁移：
mv AGENT.md AGENTS.md && ln -s AGENTS.md AGENT.md
```

对于 Cursor 用户：根目录保留 AGENTS.md（确保其他代理可用），使用 `.cursor/rules/` 存放 Cursor 专属的 glob 作用域覆盖。

---

## 八、治理与行业格局

### Agentic AI Foundation (AAIF)

2025 年 12 月 9 日，Linux 基金会宣布成立 **Agentic AI Foundation**，同时托管三个创始项目：

| 项目 | 贡献者 | 用途 |
|------|--------|------|
| AGENTS.md | OpenAI | AI 代理项目指令标准 |
| MCP (Model Context Protocol) | Anthropic | AI 模型与工具/数据的连接协议 |
| goose | Block | 开源本地优先 AI 代理框架 |

### 治理结构
- AAIF 作为 Linux 基金会的定向基金运作
- **Governing Board** 负责战略投资、预算分配、成员资格和新项目审批
- 各项目保持**完全的技术自主权**
- 确保**供应商中立性**和**长期独立性**

### 主要成员
- **Platinum**（理事会席位）：AWS、Anthropic、Block、Bloomberg、Cloudflare、Google、Microsoft、OpenAI
- **Gold**：Cisco、Datadog、Docker、Ericsson、IBM、JetBrains、Okta、Oracle、Salesforce、SAP、Shopify、Snowflake 等
- **Silver**：Hugging Face、SUSE、Uber、Zapier、Elastic 等

---

## 九、关键洞察

1. **行业正在收敛**：经过 2024-2025 年的碎片化阶段（每个工具都有自己的指令文件格式），2026 年 AGENTS.md 已成为事实上的跨工具标准。

2. **极简即能力**：AGENTS.md 的"无 schema"设计是其最大优势——任何工具都能解析，任何贡献者都能编写。较短的 20-60 行文件比较长的文件表现更好。

3. **上下文预算至关重要**：每行内容都在竞争代理的注意力。只写代理默认不知道的内容，删除重复和冗余。

4. **人工编写优于自动生成**：普林斯顿的研究数据明确表明，人工编写的 AGENTS.md 效果更好。LLM 自动生成的文件可能导致更差的结果。

5. **开放治理降低风险**：Linux 基金会的监管确保没有单一厂商控制这个日益重要的基础设施标准。这显著降低了供应商锁定风险。

6. **嵌套能力为 monorepo 而生**：OpenAI 自身 88 个嵌套 AGENTS.md 的模式证明了大规模项目中的实用性。

7. **与 MCP 形成互补生态**：AGENTS.md 告诉代理"这个项目怎么工作"，MCP 告诉代理"如何与外部系统交互"。两者共同构成代理基础设施的核心。

---

## 十、快速启动模板

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
- /src/app/          App Router pages
- /src/components/   React components (named exports)
- /src/lib/          Utilities, DB client
- /src/actions/      Server actions (all mutations here)

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

---

## 信息来源

- [AGENTS.md 官方网站](https://agents.md)
- [AGENTS.md GitHub 仓库](https://github.com/openai/agents.md)
- [AGENTS.md vs CLAUDE.md vs Cursor Rules 对比 (2026)](https://codersera.com/blog/agents-md-vs-claude-md-vs-cursor-rules-comparison-2026/)
- [Builder.io: Improve your AI code output with AGENTS.md](https://www.builder.io/blog/agents-md)
- [Rimusz Blog: Unlocking the Power of AI Coding Agents with AGENTS.md](https://rimusz.net/unlocking-the-power-of-ai-coding-agents-a-deep-dive-into-openais-agents-md-format/)
- [Linux Foundation 宣布成立 Agentic AI Foundation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- [InfoQ: AGENTS.md Emerges as Open Standard for AI Coding Agents](https://www.infoq.com/news/2025/08/agents-md/)
- [MorphLLM: AGENTS.md & SKILL.md Complete Guide (2026)](https://www.morphllm.com/agents-md-guide)
