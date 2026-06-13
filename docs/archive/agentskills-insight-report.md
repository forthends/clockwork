# Agent Skills 深度洞察报告

> 报告日期：2026-06-13
> 来源：https://agentskills.io 官方站点、规范文档、社区分析与行业报道

---

## 一、概述

**Agent Skills** 是一个开放、轻量的格式标准，用于为 AI agent 赋予专业技能和领域知识。它由 Anthropic 原创开发并作为开放标准发布，现已获得大量 agent 产品的广泛采用。

Skill 的核心是一个包含 `SKILL.md` 文件的目录。该文件包含元数据（`name` 和 `description`，至少）和指令，告诉 agent 如何执行特定任务。Skill 还可附带脚本、参考材料、模板和其他资源。

- **官方站点**: https://agentskills.io
- **GitHub 仓库**: https://github.com/agentskills/agentskills
- **原创开发者**: Anthropic
- **采用规模**: 40+ agent 客户端原生支持
- **开放治理**: 社区驱动开发，Apache 2.0 许可

---

## 二、核心理念

### 为什么需要 Agent Skills？

Agent 越来越强大，但往往缺乏可靠完成实际工作所需的上下文。Skill 通过将程序性知识和公司/团队/用户特定上下文打包到可移植、版本控制的文件夹中来解决这个问题。

**Skill 赋予 agent 的能力**：

- **领域专业知识**：将专业知识（从法律审查流程到数据分析管道再到演示文稿格式化）捕获为可重复使用的指令和资源
- **可重复的工作流程**：将多步骤任务转化为一致、可审计的程序
- **跨产品复用**：构建一次 skill，可在任何支持 skills 的 agent 中使用

### 与 AGENTS.md 的关系

| 维度 | AGENTS.md | Agent Skills |
|------|-----------|-------------|
| **作用域** | 项目级 | 任务级 |
| **内容** | 项目构建、测试、规范、约束 | 特定任务的执行步骤、脚本、参考资源 |
| **粒度** | 一个文件描述整个项目 | 一个目录封装一个能力 |
| **加载方式** | Agent 启动时发现，编辑文件时生效 | 渐进式披露（名称/描述 → 全文 → 资源） |
| **可移植性** | 绑定到仓库 | 跨仓库、跨项目复用 |

两者互补：AGENTS.md 告诉 agent"这个项目怎么工作"，Agent Skills 告诉 agent"如何完成某类特定任务"。

---

## 三、格式规范

### 目录结构

```
skill-name/
├── SKILL.md          # 必需：元数据 + 指令
├── scripts/          # 可选：可执行代码
├── references/       # 可选：文档
├── assets/           # 可选：模板、资源
└── ...               # 任何附加文件或目录
```

### SKILL.md 前页元数据（Frontmatter）

SKILL.md 文件必须以 YAML frontmatter 开头，后跟 Markdown 正文。

| 字段 | 必需 | 约束 |
|------|------|------|
| `name` | 是 | 最多 64 字符。仅小写字母、数字和连字符。不得以连字符开头或结尾，不得包含连续连字符。必须匹配父目录名。 |
| `description` | 是 | 最多 1024 字符。非空。描述 skill 的功能和使用场景。 |
| `license` | 否 | 许可证名称或对捆绑许可证文件的引用。 |
| `compatibility` | 否 | 最多 500 字符。指示环境要求（预期产品、所需系统包、网络访问等）。 |
| `metadata` | 否 | 任意键值映射，用于附加元数据。 |
| `allowed-tools` | 否 | 空格分隔的预批准工具字符串。实验性功能。 |

#### 最小示例

```markdown
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

#### 完整示例

```markdown
---
name: pdf-processing
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
license: Apache-2.0
compatibility: Requires Python 3.14+ and uv
metadata:
  author: example-org
  version: "1.0"
---
```

### 正文内容

Frontmatter 之后的 Markdown 正文包含 skill 指令，**无格式限制**。推荐包含：
- 分步指令
- 输入和输出示例
- 常见边缘情况

建议保持主文件在 **500 行以内**、**5000 token 以下**。将详细参考材料移至单独文件。

---

## 四、渐进式披露（Progressive Disclosure）

这是 Agent Skills 最核心的架构设计。Agent 通过**三级加载**策略管理上下文：

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: DISCOVERY（发现）                                    │
│ 加载内容：name + description                                 │
│ 时机：会话启动时                                              │
│ Token 成本：~50-100 tokens/skill                             │
│ → Agent 知道有哪些 skill 可用，但尚未加载指令                  │
├─────────────────────────────────────────────────────────────┤
│ Tier 2: ACTIVATION（激活）                                   │
│ 加载内容：完整 SKILL.md 正文                                  │
│ 时机：任务匹配 skill description 时                          │
│ Token 成本：<5000 tokens（建议）                              │
│ → Agent 获得执行任务的完整指令                                │
├─────────────────────────────────────────────────────────────┤
│ Tier 3: EXECUTION（执行）                                    │
│ 加载内容：scripts/、references/、assets/ 中的文件              │
│ 时机：指令引用时                                              │
│ Token 成本：按需                                              │
│ → Agent 加载所需的附加资源                                    │
└─────────────────────────────────────────────────────────────┘
```

这意味着一个安装了 20 个 skill 的 agent 不需要预先支付 20 套完整指令的 token 成本——只有实际在会话中使用的 skill 才会被完全加载。

---

## 五、Skill 的存储位置

| 范围 | 路径 | 用途 |
|------|------|------|
| 项目级（客户端原生） | `<project>/.<client>/skills/` | 客户端专有位置 |
| 项目级（跨客户端） | `<project>/.agents/skills/` | 跨客户端互操作 |
| 用户级（客户端原生） | `~/.<client>/skills/` | 客户端专有位置 |
| 用户级（跨客户端） | `~/.agents/skills/` | 跨客户端互操作 |

`.agents/skills/` 已成为跨客户端 skill 共享的广泛约定。虽然规范未强制要求 skill 目录的存放位置，但扫描 `.agents/skills/` 意味着其他兼容客户端安装的 skill 可自动互见。

部分实现还扫描 `.claude/skills/` 以保持向后兼容。

---

## 六、编写最佳实践

### 6.1 从真实经验出发

**常见陷阱**：用 LLM 生成 skill 而不提供领域特定上下文——结果产生模糊的通用程序，而非有价值的特定指导。

**有效方式**：
- **从实际操作中提取**：在对话中与 agent 完成真实任务，然后提取可复用的模式
- **从现有项目资产合成**：内部文档、runbook、API 规范、代码审查评论、问题追踪器
- **用实际执行来迭代**：将 skill 运行在真实任务上，观察结果，修正

### 6.2 明智地使用上下文

一旦 skill 激活，其完整 `SKILL.md` 正文将加载到 agent 的上下文窗口中。每个 token 都在竞争 agent 的注意力。

- **添加 agent 缺乏的内容，省略它已知的内容**。不需要解释 PDF 是什么或 HTTP 如何工作
- **设计一致性单元**：过窄需要多个 skill 同时加载（开销和潜在冲突），过宽难以精确激活
- **使用渐进式披露拆分大型 skill**：将详细参考材料移至 `references/`，告诉 agent 何时加载它们

### 6.3 校准控制力

**给予自由度**：当多种方法可行且任务容忍变化时。解释*为什么*可能比刚性指令更有效。

```markdown
## Code review process
1. Check all database queries for SQL injection
2. Verify authentication checks on every endpoint
3. Look for race conditions in concurrent code paths
```

**保持指令性**：当操作脆弱、需保持一致或必须遵循特定序列时。

```markdown
## Database migration
Run exactly this sequence:
python scripts/migrate.py --verify --backup
Do not modify the command or add additional flags.
```

**提供默认值而非菜单**：选择一个默认工具/方法，简要提及替代方案，而非将它们作为平等选项呈现。

### 6.4 偏好程序而非声明

Skill 应教会 agent *如何处理*一类问题，而非为特定实例*生成什么*。

```markdown
# 差 — 仅对此确切任务有用
Join the `orders` table to `customers` on `customer_id`, filter where
`region = 'EMEA'`, and sum the `amount` column.

# 好 — 对任何分析查询都适用的可复用方法
1. Read the schema from `references/schema.yaml`
2. Join tables using the `_id` foreign key convention
3. Apply any filters from the user's request as WHERE clauses
4. Aggregate numeric columns and format as a markdown table
```

### 6.5 有效指令的模式

| 模式 | 用法 | 示例 |
|------|------|------|
| **陷阱（Gotchas）** | 违反合理假设的环境特定事实 | "users 表使用软删除。查询必须包含 `WHERE deleted_at IS NULL`" |
| **模板** | 指定 agent 的输出格式 | 报告结构模板、字段映射模板 |
| **检查清单** | 多步骤工作流中跟踪进度 | `[ ] Step 1 → [ ] Step 2 → [ ] Step 3` |
| **验证循环** | 指示 agent 在继续之前验证其工作 | "运行验证脚本 → 查看错误 → 修复 → 重新验证 → 继续" |
| **计划-验证-执行** | 批处理或破坏性操作 | "创建计划 → 验证计划 → 执行" |
| **捆绑脚本** | 将重复逻辑提取为经测试的脚本 | 避免 agent 在每次运行时重新发明相同的逻辑 |

---

## 七、Skill 评估体系

Agent Skills 规范提供了一套完整的评估（eval）方法论，用于系统化地测试和优化 skill。

### 7.1 测试用例结构

```json
{
  "id": 1,
  "prompt": "用户的真实消息",
  "expected_output": "成功样子的可读描述",
  "files": ["evals/files/input.csv"]
}
```

### 7.2 评估循环

```
┌──────────────────────────────────────┐
│ 1. 设计测试用例（2-3 个起步）          │
│ 2. 运行：有 skill vs 无 skill（基线）  │
│ 3. 编写断言，分级输出                  │
│ 4. 聚合结果，分析模式                  │
│ 5. 人工审查输出                        │
│ 6. 根据信号迭代 skill                  │
│ 7. 重复直到满意度或不再有意义的改进      │
└──────────────────────────────────────┘
```

### 7.3 关键指标

| 指标 | 含义 |
|------|------|
| **通过率（Pass rate）** | 有/无 skill 的断言通过率差异 |
| **时间增量（Delta time）** | skill 增加（或减少）的执行时间 |
| **Token 增量（Delta tokens）** | skill 增加（或减少）的 token 使用量 |

一个使通过率提高 50 个百分点但只增加 13 秒和 1700 token 的 skill 可能值得。将 token 使用量翻倍仅换来 2 个百分点改进的 skill 可能不值得。

### 7.4 描述优化

Skill 的 `description` 字段是激活的**唯一机制**。一个描述不佳的 skill 不会被激活。

优化循环：
1. 设计约 20 个触发/非触发查询
2. 多次运行每个查询（建议 3 次），计算触发率
3. 分成训练集（60%）和验证集（40%）以避免过拟合
4. 根据训练集失败改进描述
5. 用验证集检查泛化能力
6. 选择验证通过率最高的迭代版本

---

## 八、客户端实现指南

为 agent 添加 Skill 支持需实现五个步骤：

### 8.1 发现（Discovery）

扫描项目级和用户级 skill 目录，查找包含 `SKILL.md` 的子目录。

关键规则：
- 跳过 `.git/` 和 `node_modules/` 等目录
- 设置合理边界（最大深度 4-6 层，最多 2000 个目录）
- 项目级 skill 覆盖用户级（同名冲突时）
- 考虑对不可信项目的 skill 进行信任检查

### 8.2 解析（Parsing）

从 `SKILL.md` 提取 YAML frontmatter 和 Markdown 正文。

解析建议：
- 对格式错误的 YAML 宽容处理（如处理未引号的冒号）
- 名称不匹配目录名 → 警告但加载
- 名称超过 64 字符 → 警告但加载
- 描述缺失或为空 → 跳过该 skill
- YAML 完全无法解析 → 跳过该 skill

### 8.3 披露（Disclosure）

以紧凑格式（XML/JSON/Markdown 列表）向模型展示可用 skill 目录，每个约 50-100 token。同时包含行为指令，告诉模型何时以及如何使用 skill。

### 8.4 激活（Activation）

两种模式：
- **文件读取激活**：模型使用标准文件读取工具读取 `SKILL.md`。最简单的方法。
- **专用工具激活**：注册专用工具（如 `activate_skill`），可控制返回内容、包裹结构化标签、列出资源、执行权限。

用户也可通过斜杠命令显式激活 skill。

### 8.5 上下文管理

- **保护 skill 内容**：上下文压缩时排除 skill 内容
- **去重激活**：同一 skill 不重复加载
- **权限白名单**：允许读取 skill 目录中的文件而不触发权限确认

---

## 九、脚本设计指南

### 9.1 一次性命令 vs 捆绑脚本

| 场景 | 方法 | 示例 |
|------|------|------|
| 现有包已满足需求 | 在 SKILL.md 中直接引用 | `uvx ruff@0.8.0 check .` |
| 复杂或可复用逻辑 | 在 `scripts/` 中捆绑脚本 | `python scripts/validate.py` |

建议锁定版本（`ruff@0.8.0`）以确保可复现性。

### 9.2 自包含脚本

多个语言支持内联依赖声明：

| 语言 | 机制 | 示例工具 |
|------|------|----------|
| Python | PEP 723 内联脚本元数据 | `uv run` |
| TypeScript/JavaScript | npm/jsr 导入说明符 | `deno run` |
| Bun | 运行时自动安装包 | `bun run` |
| Ruby | `bundler/inline` | `ruby` |

### 9.3 Agent 友好的脚本设计

| 原则 | 说明 |
|------|------|
| **避免交互式提示** | Agent 在非交互 shell 中运行，无法响应 TTY 提示 |
| **用 --help 记录用法** | 这是 agent 了解脚本接口的主要方式 |
| **编写有帮助的错误消息** | 说明错在哪里、期望什么、尝试什么 |
| **使用结构化输出** | JSON/CSV 可被 agent 和标准工具消费 |
| **stdout 放数据，stderr 放诊断** | 保持关注点分离 |
| **支持幂等性** | Agent 可能重试命令 |
| **支持 --dry-run** | 对破坏性操作尤为重要 |
| **有意义的退出码** | 不同失败类型使用不同退出码 |

---

## 十、生态系统

### 10.1 兼容客户端（40+）

| 客户端 | 开发者 | 类型 |
|--------|--------|------|
| Claude Code | Anthropic | 终端 coding agent |
| Claude | Anthropic | AI 对话平台 |
| OpenAI Codex | OpenAI | 终端 coding agent |
| GitHub Copilot | Microsoft | IDE 编码助手 |
| VS Code | Microsoft | 代码编辑器 |
| Gemini CLI | Google | 终端 coding agent |
| Cursor | Cursor | AI 编辑器 |
| Junie | JetBrains | IntelliJ 平台 coding agent |
| Goose | Block | 开源可扩展 agent |
| Amp | — | 前沿 coding agent |
| Windsurf | Cognition | AI 编辑器 |
| Devin | Cognition | 自主 coding agent |
| Factory | — | AI 软件开发平台 |
| OpenCode | — | 开源 coding agent |
| OpenHands | — | 云 coding agent 平台 |
| Roo Code | — | IDE 中的 AI 开发团队 |
| Aider | — | 终端 AI 编码助手 |
| Zed | — | 高性能编辑器 |
| Warp | — | AI 终端 |
| Databricks Genie Code | Databricks | 数据工作 coding agent |
| Spring AI | VMware | Java AI 框架 |
| Mistral AI Vibe | Mistral | 终端编码助手 |
| TRAE | ByteDance | AI IDE |
| Qodo | — | 代码完整性平台 |
| Letta | — | 有状态 agent 平台 |
| Snowflake Cortex Code | Snowflake | 数据工程 agent |
| Laravel Boost | Laravel | Laravel 开发 skill 集合 |
| 等 | | |

### 10.2 与 MCP 的关系

Agent Skills 和 MCP（Model Context Protocol）都是 Agentic AI Foundation 孵化的关键标准：

- **Agent Skills** — 告诉 agent "如何工作"（程序性知识）
- **MCP** — 告诉 agent "如何连接"（工具和数据访问协议）
- **AGENTS.md** — 告诉 agent "这个项目怎么工作"（项目级上下文）

三者共同构成 Agent 基础设施的支柱。

### 10.3 `skill-creator` Skill

一个元层次的 skill，自动化 skill 的创建和评估：
- 运行评估
- 分级断言
- 聚合基准
- 提出描述优化建议
- 生成实时 HTML 报告

仓库：[https://github.com/anthropics/skills](https://github.com/anthropics/skills)

---

## 十一、关键洞察

1. **渐进式披露是最核心的设计决策**。它使 agent 能够接触大量 skill 而不消耗上下文预算——只有实际使用的 skill 才成本高昂。

2. **Skill 是 AGENTS.md 的任务级对应物**。AGENTS.md 定义*项目如何工作*——构建、测试、规范、约束。Agent Skills 定义*任务如何执行*——需要什么工具、遵循什么步骤、期望什么输入/输出。一个有良好 AGENTS.md 和多个 Skill 的仓库为 coding agent 提供了完整的工作指令。

3. **描述即接口**。Skill 的 `description` 字段是触发决策的唯一信号。一个写得不好的 description 意味着 skill 永远不会被激活。规范提供了系统的描述优化方法论（训练/验证拆分、触发率测试）。

4. **评估驱动的迭代是区分好 skill 和糟糕 skill 的关键**。运行"有 skill vs 无 skill"的对照实验，测量通过率、时间和 token 的增量，量化地证明了 skill 的价值（或不价值）。

5. **从真实经验出发，不要凭空编造**。最优价值的 skill 捕获了实际的专业知识——编码过程中实际做出的修正、项目中实际遇到的陷阱（gotchas）、团队实际遵循的实际约定。LLM 凭空生成的 skill 往往模糊且无效。

6. **上下文预算至关重要**。每个 token 都在竞争 agent 的注意力。省略 agent 已知的内容（HTTP 如何工作），省略标准约定（Prettier/PEP 8 规则），只写 agent 默认不知道的内容。

7. **`.agents/skills/` 已成为事实上的跨客户端约定**。虽然规范未强制，但该路径的广泛采用意味着一个客户端安装的 skill 会自动对其他兼容客户端可见。

8. **Agent Skills 生态覆盖范围超越 AGENTS.md**。AGENTS.md 专注 coding agent，而 Agent Skills 被更广泛类型的 agent 产品采用——从数据工程平台（Databricks）到医疗自动化平台（Agentman）到 Java 框架（Spring AI）。

9. **与 MCP 和 AGENTS.md 形成互补的 Agent 基础设施三角**。Skill 是"怎么做"，MCP 是"怎么连"，AGENTS.md 是"在哪里/什么规则"。

10. **脚本生态强调自包含和跨平台**。PEP 723（Python）、Deno 导入说明符、Bun 自动安装、bundler/inline——多种语言支持内联依赖声明，使 skill 脚本无需外部分发包文件即可运行。

---

## 十二、信息来源

- [Agent Skills 官方网站](https://agentskills.io)
- [Agent Skills 规范](https://agentskills.io/specification)
- [Agent Skills GitHub 仓库](https://github.com/agentskills/agentskills)
- [Anthropic Skills 示例仓库](https://github.com/anthropics/skills)
- [Agent Skills 客户端展示](https://agentskills.io/clients)
- [快速入门指南](https://agentskills.io/skill-creation/quickstart)
- [编写最佳实践](https://agentskills.io/skill-creation/best-practices)
- [Skill 评估方法](https://agentskills.io/skill-creation/evaluating-skills)
- [描述优化指南](https://agentskills.io/skill-creation/optimizing-descriptions)
- [客户端实现指南](https://agentskills.io/client-implementation/adding-skills-support)
