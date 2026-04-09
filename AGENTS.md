# Clockwork — 全局 Agent 治理规则

> 本文件是 Clockwork 治理框架的核心规则定义，所有 Agent 在本工作空间中工作时必须遵守以下约束。

---

## 1. 工作空间认知

你正在 **Clockwork（机关术）** 治理工作空间中工作。该工作空间为敏捷开发团队提供统一的 AI Agent 协作环境。

### 目录结构

```
clockwork/
├── agents/          # 角色 Agent 定义（Analyst / PM / Developer / Tester / Reviewer）
├── skills/          # 可复用技能定义
├── workflow/        # 工作流定义与需求产物
│   ├── _schemas/    # 工作流 YAML Schema
│   ├── _definitions/# 工作流定义文件
│   ├── _templates/  # 产物模板（黄金标准）
│   └── features/    # 需求实例及其产物
├── docs/            # 项目文档与质量标准
│   └── projects/    # 各代码仓库的项目简介（由 Analyst 生成）
├── repos/           # 代码仓库（git submodule）
├── AGENTS.md        # 本文件 — 全局治理规则
└── README.md        # 项目介绍
```

### 识别你的角色

在开始任何任务之前，你必须：

1. 确认当前用户的角色（Analyst / PM / Developer / Tester / Reviewer）
2. 读取 `agents/<role>/AGENT.md` 了解角色职责、约束和可用技能
3. 仅在自己角色职责范围内操作，不得越权

---

## 2. 工作流感知

### 读取工作流定义

所有任务必须在工作流框架内执行：

1. 读取 `workflow/_definitions/<workflow-type>.yaml` 了解流程定义
2. 识别当前所处的阶段（stage）
3. 读取该阶段声明的 `inputs`（上游产物）作为工作上下文
4. 按照该阶段声明的 `outputs` 要求产出符合规范的产物

### 管理需求实例

每个需求实例存放在 `workflow/features/FEAT-<id>-<name>/` 下：

- **manifest.yaml**：记录该需求的工作流状态，是持久脉冲的核心载体
- 产物文件（prd.md, tech-design.md 等）：各阶段的输出产物

### manifest.yaml 操作规范

- 开始一个阶段时：将该阶段 `status` 更新为 `in_progress`
- 完成一个阶段时：将该阶段 `status` 更新为 `completed`，记录 `completed_at` 和 `artifacts`
- 校验通过时：设置 `validation_passed: true`
- **永远不要跳过阶段**，必须按工作流定义的顺序推进

---

## 3. 产物输出规范

### 模板使用

所有产物必须基于 `workflow/_templates/` 中的模板创建：

- 保持模板定义的章节结构，不得随意删减必填章节
- 在模板的占位符处填写实际内容
- 可在模板结构基础上扩展额外章节

### 文件命名

- 产物文件名必须与工作流 YAML 中 `outputs.id` 一致
- 使用小写字母和连字符：`prd.md`, `tech-design.md`, `test-plan.md`

### 内容质量底线

- 所有产物必须使用中文撰写（除非该项目有其他语言要求）
- 章节内容不得为空或仅含占位符
- 涉及上游产物的引用必须准确，不得编造

---

## 4. 质量闸门（Quality Governors）

### 校验规则

每个阶段的 `validation` 字段定义了质量闸门：

- `required_sections`：产物必须包含的章节
- 其他自定义校验规则

### 校验流程

1. 产物完成后，调用 `validate-artifact` 技能进行校验
2. 校验通过后，更新 manifest.yaml 中的 `validation_passed: true`
3. 校验未通过时，必须修正后重新校验，不得跳过

---

## 5. 技能调用

### 可用技能

技能定义在 `skills/` 目录中，每个技能目录下包含 `SKILL.md`。

### 调用规范

- 仅调用当前阶段 `skills` 字段声明的技能
- 调用技能前，先读取对应的 `SKILL.md` 了解使用方式
- 技能执行结果应记录在产物中

---

## 6. 项目上下文

### 项目简介

`docs/projects/<repo-name>/overview.md` 包含由 Analyst 角色生成的项目简介，是所有角色了解代码仓库的核心参考资料。

### 引用规范

- 在需求定义、技术设计、测试计划等阶段，应优先读取项目简介了解现有系统
- 如果项目简介不存在，应先请求 Analyst 角色生成
- 引用项目简介中的信息时，确保与最新版本一致

---

## 7. 协作边界

### 角色隔离

- 每个 Agent 只操作自己角色负责的阶段产物
- 不得修改其他角色已完成的产物（只可读取作为输入）
- 对上游产物有疑问时，应在产物中标注待确认项，而非擅自修改

### 信息传递

- 上下游信息传递通过产物文件实现，不依赖口头约定
- 每个产物都是自包含的，包含足够的上下文让下游理解
- 关键决策和变更必须记录在产物中，确保可追溯
