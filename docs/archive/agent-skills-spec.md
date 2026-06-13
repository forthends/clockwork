# Agent Skill 开发规范 (SPEC)

## 1. 概述

Agent Skill 是一种轻量级、开放格式的标准，用于扩展 AI Agent 的能力。一个技能就是一个包含 `SKILL.md` 文件的目录，该文件提供元数据（`name` 和 `description`）和指令，告诉 Agent 如何执行特定任务。

技能通过**渐进式披露（progressive disclosure）**加载，分三个阶段：

| 阶段 | 加载内容 | 时机 | Token 成本 |
|------|---------|------|-----------|
| 发现（Discovery） | `name` + `description` | 会话启动时 | ~50-100 tokens/skill |
| 激活（Activation） | 完整 `SKILL.md` 内容 | 任务匹配技能描述时 | <5000 tokens（推荐） |
| 执行（Execution） | 脚本、参考文件、资源 | 指令引用时按需加载 | 各不相同 |

---

## 2. 目录结构

```
skill-name/
├── SKILL.md          # 必需：元数据 + 指令
├── scripts/          # 可选：可执行代码
├── references/       # 可选：参考文档
├── assets/           # 可选：模板、资源文件
├── evals/            # 可选：评测用例
└── ...               # 任意附加文件或目录
```

### 2.1 技能存放位置

Agent 从以下路径扫描技能目录：

| 范围 | 路径 | 用途 |
|------|------|------|
| 项目级 | `<project>/.agents/skills/` | 跨客户端互操作（约定） |
| 项目级 | `<project>/.<client>/skills/` | 特定客户端原生位置 |
| 用户级 | `~/.agents/skills/` | 跨客户端互操作（约定） |
| 用户级 | `~/.<client>/skills/` | 特定客户端原生位置 |

命名冲突时：项目级技能覆盖用户级技能。

---

## 3. SKILL.md 格式规范

`SKILL.md` 文件必须包含 YAML frontmatter 后跟 Markdown 正文。

### 3.1 Frontmatter 字段

| 字段 | 必需 | 约束 |
|------|------|------|
| `name` | 是 | 最长 64 字符。仅允许小写字母、数字和连字符。不能以连字符开头或结尾，不能有连续连字符。必须与父目录名匹配。 |
| `description` | 是 | 最长 1024 字符。非空。描述技能做什么以及何时使用。 |
| `license` | 否 | 许可证名称或指向捆绑许可证文件的引用。 |
| `compatibility` | 否 | 最长 500 字符。指示环境要求（目标产品、系统包、网络访问等）。 |
| `metadata` | 否 | 任意键值映射，用于附加元数据。键名建议保持唯一以避免冲突。 |
| `allowed-tools` | 否 | 空格分隔的预批准工具列表。（实验性） |

**最小示例：**

```markdown
---
name: my-skill
description: 描述此技能做什么以及何时使用
---

# 指令内容
```

**完整示例：**

```markdown
---
name: pdf-processing
description: 提取 PDF 文本、填写表单、合并文件。当需要处理 PDF 时使用。
license: Apache-2.0
compatibility: Requires Python 3.11+
metadata:
  author: example-org
  version: "1.0"
allowed-tools: Bash(git:*) Bash(jq:*) Read
---

# PDF 处理

## 提取文本
使用 pdfplumber 进行文本提取...
```

### 3.2 `name` 字段详细规则

- 长度 1-64 字符
- 仅允许 Unicode 小写字母数字字符（a-z, 0-9）和连字符（-）
- 不能以连字符开头或结尾
- 不能包含连续连字符（`--`）
- 必须使用 NFKC 归一化
- 必须与父目录名匹配

```
✅ pdf-processing
✅ data-analysis  
✅ code-review
✅ 技能          # 国际化支持
✅ мой-навык     # 俄语支持
❌ PDF-Processing  # 大写不允许
❌ -pdf            # 不能以连字符开头
❌ pdf--processing # 不能有连续连字符
❌ my_skill        # 下划线不允许
```

### 3.3 `description` 字段最佳实践

- 使用祈使句式："当...时使用此技能"而非"此技能做..."
- 关注用户意图而非实现细节
- 包含具体关键词帮助 Agent 识别相关任务
- 显式列出技能适用的上下文

```yaml
# 良好
description: >
  分析 CSV 和表格数据文件——计算汇总统计、添加派生列、
  生成图表和清理杂乱数据。当用户有 CSV、TSV 或 Excel 文件
  并希望探索、转换或可视化数据时使用此技能，即使他们
  没有明确提及"CSV"或"分析"。

# 差
description: 帮助处理 PDF。
```

### 3.4 正文内容

Frontmatter 之后的 Markdown 正文包含技能指令，无格式限制。推荐包含：
- 逐步指令
- 输入输出示例
- 常见边缘情况

**约束：**
- `SKILL.md` 控制在 500 行以内
- 指令内容控制在 5000 tokens 以内
- 详细的参考资料移至 `references/` 目录下的独立文件中

---

## 4. 可选目录规范

### 4.1 `scripts/` — 可执行代码

存放 Agent 可运行的可执行脚本。脚本应：
- 自包含或清晰声明依赖
- 包含有用的错误消息
- 优雅处理边缘情况
- 避免交互式提示（Agent 运行在非交互式 shell 中）
- 实现 `--help` 输出
- 优先使用结构化输出（JSON、CSV、TSV）
- 将诊断信息输出到 stderr，数据输出到 stdout

**自包含脚本示例（Python PEP 723）：**

```python
# /// script
# dependencies = [
#   "beautifulsoup4>=4.12,<5",
# ]
# ///

from bs4 import BeautifulSoup

html = '<html><body><h1>Welcome</h1></body></html>'
print(BeautifulSoup(html, "html.parser").find("h1").get_text())
```

运行方式：`uv run scripts/extract.py`

### 4.2 `references/` — 参考文档

存放 Agent 按需读取的附加文档：
- `REFERENCE.md` — 详细技术参考
- `FORMS.md` — 表单模板或结构化数据格式
- 领域特定文件（`finance.md`、`legal.md` 等）

保持单个参考文件聚焦。文件引用应从技能根目录使用相对路径。

### 4.3 `assets/` — 静态资源

存放静态资源：
- 模板（文档模板、配置模板）
- 图片（图表、示例）
- 数据文件（查找表、schema）

---

## 5. 渐进式披露与文件引用

### 5.1 三层加载模型

```
                    ┌──────────────────────────┐
  第 1 层：元数据    │  name + description      │  ← 会话启动时全部加载
                    ├──────────────────────────┤
  第 2 层：指令      │  SKILL.md 完整正文       │  ← 技能激活时加载
                    ├──────────────────────────┤
  第 3 层：资源      │  scripts/references/     │  ← 指令引用时按需加载
                    └──────────────────────────┘
```

### 5.2 文件引用约定

使用从技能根目录开始的相对路径：

```markdown
详见[参考指南](references/REFERENCE.md)

运行提取脚本：
scripts/extract.py
```

文件引用保持在 `SKILL.md` 一级深度以内，避免深层嵌套引用链。

---

## 6. 技能开发工作流

### 6.1 创建技能

1. **从真实经验出发**：在实际对话中完成任务，提取可复用的模式
2. **综合现有资料**：从内部文档、API 规范、配置文件、代码审查注释中提取
3. **结构化内容**：遵循目录规范，编写 `SKILL.md`

### 6.2 核心原则

- **添加 Agent 缺乏的内容，省略 Agent 已知的内容**：不解释 HTTP 是什么，但说明项目特定的 API 约定
- **设计一致的工作单元**：技能范围太窄导致多个技能需同时加载，太广则难以精确激活
- **适度详细**：简洁的分步指导配合工作示例优于详尽文档
- **提供默认方案而非菜单**：选择一个默认工具/方法，简要提及替代方案
- **偏重流程而非声明**：教 Agent "如何处理一类问题"而非"为特定场景输出什么"

### 6.3 指令模式

**陷阱提醒（Gotchas）：**

```markdown
## 注意事项

- `users` 表使用软删除。查询必须包含 `WHERE deleted_at IS NULL`
- 用户 ID 在数据库中是 `user_id`，在认证服务中是 `uid`，在计费 API 中是 `accountId`
- `/health` 端点即使数据库断开也返回 200。使用 `/ready` 检查完整服务健康状态
```

**检查清单：**

```markdown
## 工作流

进度：
- [ ] 步骤 1：分析表单（运行 `scripts/analyze_form.py`）
- [ ] 步骤 2：创建字段映射（编辑 `fields.json`）
- [ ] 步骤 3：验证映射（运行 `scripts/validate_fields.py`）
- [ ] 步骤 4：填写表单（运行 `scripts/fill_form.py`）
- [ ] 步骤 5：验证输出（运行 `scripts/verify_output.py`）
```

**验证循环：**

```markdown
## 编辑工作流

1. 进行编辑
2. 运行验证：`python scripts/validate.py output/`
3. 如果验证失败：
   - 查看错误消息
   - 修复问题
   - 重新运行验证
4. 仅在验证通过后继续
```

**计划-验证-执行：**

对于批处理或破坏性操作，让 Agent 创建结构化的中间计划，对照真实数据源进行验证，然后再执行。

### 6.4 通过真实执行迭代改进

1. 对真实任务运行技能
2. 将结果反馈回创建过程
3. 询问：什么触发了误报？遗漏了什么？什么可以删减？

阅读 Agent 执行轨迹而不仅仅是最终输出——如果 Agent 在无效步骤上浪费时间，常见原因包括指令太模糊、指令不适用于当前任务，或提供了太多选项而没有明确的默认值。

---

## 7. 描述优化

### 7.1 触发评估

技能的 `description` 字段是 Agent 决定是否激活技能的主要机制。优化过程：

1. **设计评估查询**：约 20 个查询——10 个应该触发，10 个不应该触发。应包含"近似误报"（共享关键词但实际需要不同东西的查询）
2. **多次运行**：每个查询运行 3 次（模型行为非确定性），计算触发率
3. **训练/验证分割**：60% 训练集用于指导改进，40% 验证集用于检查泛化能力

### 7.2 优化循环

```
评估 → 识别失败 → 修改描述 → 重复（通常 5 次迭代足够）
```

- 如果应触发查询失败：描述可能太窄，扩大范围
- 如果不应触发查询误触发：描述可能太宽，增加特定性
- 避免添加失败查询中的特定关键词（这是过拟合）

---

## 8. 输出质量评测

### 8.1 测试用例结构

```json
{
  "skill_name": "my-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "用户的真实查询...",
      "expected_output": "成功输出的可读描述",
      "files": ["evals/files/input.csv"],
      "assertions": [
        "输出包含有效的 JSON",
        "图表有标记的坐标轴",
        "报告包含至少 3 条建议"
      ]
    }
  ]
}
```

### 8.2 评测流程

```
迭代 N/
├── eval-1/
│   ├── with_skill/outputs/    # 有技能时的输出
│   ├── without_skill/outputs/ # 基线输出
│   ├── timing.json            # tokens + 耗时
│   └── grading.json           # 断言评估结果
├── eval-2/
│   └── ...
├── benchmark.json             # 聚合统计
└── feedback.json              # 人工评审反馈
```

### 8.3 评分原则

- 每个断言给出 PASS/FAIL 及具体证据
- 证据应引用或引用输出内容，而不仅仅是陈述意见
- 移除在两种配置中始终通过的断言（无区分度）
- 调查在两种配置中始终失败的断言（断言可能有问题）
- 关注有技能通过但无技能失败的断言（技能真正产生价值的地方）

### 8.4 Delta 分析

```
pass_rate 提升 + 耗时增加 + tokens 增加 = 技能价值评估
```

技能如果使用 2 倍 tokens 但仅提升 2 个百分点，则可能不值得。

---

## 9. 脚本设计原则

### 9.1 核心要求

| 原则 | 说明 |
|------|------|
| 非交互式 | 通过 CLI 标志/环境变量/stdin 接收所有输入，绝不阻塞等待 TTY 输入 |
| `--help` 文档 | Agent 学习脚本接口的主要方式，包含描述、可用标志和使用示例 |
| 有用的错误消息 | 说明哪里出错、期望什么、尝试什么 |
| 结构化输出 | JSON/CSV/TSV 优先于自由格式文本 |
| 数据与诊断分离 | 结构化数据到 stdout，进度/警告/诊断到 stderr |

### 9.2 高级考虑

- **幂等性**："如不存在则创建"优于"创建，如重复则失败"
- **输入验证**：使用枚举和闭集，拒绝模糊输入并给出清晰错误
- **试运行支持**：对于破坏性操作提供 `--dry-run` 标志
- **有意义的退出码**：不同类型失败使用不同退出码
- **可预测的输出大小**：注意 Agent 框架可能截断超过阈值（10K-30K 字符）的输出

---

## 10. 客户端实现指南

### 10.1 技能发现

在会话启动时，扫描技能目录中每个包含 `SKILL.md`（严格此名称）的子目录：

- 跳过 `.git/` 和 `node_modules/` 等目录
- 设置合理的扫描边界（最大深度 4-6 层，最多 2000 个目录）
- 项目级技能覆盖用户级技能（名称冲突时）
- 考虑对不可信项目目录的门控信任检查

### 10.2 SKILL.md 解析

1. 找到开头 `---` 和结尾 `---` 分隔符
2. 解析两者之间的 YAML 块，提取必需和可选字段
3. 结尾 `---` 之后的所有内容（trim 后）为技能正文

**宽松验证策略：**
- 名称不匹配父目录名 → 警告，仍然加载
- 名称超过 64 字符 → 警告，仍然加载
- 描述缺失或为空 → 跳过（描述对发现至关重要）
- YAML 完全不可解析 → 跳过

### 10.3 技能目录构建

生成 `<available_skills>` 块供模型发现：

```xml
<available_skills>
  <skill>
    <name>pdf-processing</name>
    <description>提取 PDF 文本、填写表单、合并文件。当处理 PDF 时使用。</description>
    <location>/home/user/.agents/skills/pdf-processing/SKILL.md</location>
  </skill>
</available_skills>
```

### 10.4 技能激活

两种模式：
- **文件读取激活**：模型使用标准文件读取工具读取 `SKILL.md` 路径
- **专用工具激活**：注册 `activate_skill` 工具（名称参数约束为已知技能列表）

### 10.5 上下文管理

- 从上下文清理中**保护技能内容**（技能指令是持久的行为指导）
- **去重激活**：跟踪已激活的技能，避免重复注入
- 自动将技能目录加入文件访问白名单，避免对捆绑资源的每步权限确认

---

## 11. 验证工具

使用 `skills-ref` 参考库验证技能：

```bash
# 验证技能
skills-ref validate ./my-skill

# 读取技能属性（JSON 输出）
skills-ref read-properties ./my-skill

# 生成 <available_skills> XML
skills-ref to-prompt ./my-skill ./another-skill
```

### 11.1 验证内容

- `SKILL.md` 文件存在性
- YAML frontmatter 格式正确性
- `name` 字段格式和目录名匹配
- `description` 字段存在性和长度（≤1024）
- `compatibility` 字段长度（≤500）
- 仅有允许的字段存在于 frontmatter 中
- 国际化（Unicode）名称支持，NFKC 归一化

---

## 12. 安全与信任

### 12.1 信任模型

- **项目级技能**可能来自不可信仓库（如新克隆的开源项目）
- 考虑仅在用户将项目文件夹标记为"受信任"后加载项目级技能
- 用户级技能和内置技能通常被认为是受信任的

### 12.2 `allowed-tools` 字段

实验性字段，允许技能声明所需的预批准工具：

```yaml
allowed-tools: Bash(git:*) Bash(jq:*) Read
```

对该字段的支持在不同 Agent 实现中可能有所不同。

### 12.3 权限允许列表

自动将技能目录加入文件访问白名单，使模型可以在无需用户逐次确认的情况下读取捆绑资源。

---

## 13. 参考资源

- 官方站点：https://agentskills.io
- 规范：https://agentskills.io/specification
- 示例技能：https://github.com/anthropics/skills
- 源码仓库：https://github.com/agentskills/agentskills
- Discord 社区：https://discord.gg/MKPE9g8aUy

---

*本规范基于 Agent Skills 开源标准（Apache 2.0 / CC-BY-4.0），综合源码实现与官方文档编写。*
