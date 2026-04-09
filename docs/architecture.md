# Clockwork 架构说明

---

## 设计理念

Clockwork（机关术）是一个面向敏捷开发团队的 AI Agent 治理框架。它解决的核心问题是：

- **质量参差不齐**：不同角色使用 AI Agent 产出内容缺乏统一标准
- **无统一工作流**：各角色各自为战，缺乏结构化的流程定义
- **信息传递磨损**：上下游协作中，关键信息在口头传递中丢失或失真

Clockwork 通过三大核心机制来解决这些问题：**逻辑齿轮**（Logic Gears）提供固定执行路径，**质量调速器**（Quality Governors）内置校验闸门，**持久脉冲**（Persistent Pulse）支持长周期任务的断点续做。

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Clockwork 治理工作空间                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  .cursor/rules/clockwork.mdc                         │   │
│  │  (Cursor 自动加载入口 → 指向 AGENTS.md)              │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                           │
│                 ▼                                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AGENTS.md — 全局治理规则                             │   │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐  │   │
│  │  │工作空间  │ │产物输出  │ │工作流  │ │协作边界   │  │   │
│  │  │结构认知  │ │规范      │ │感知    │ │规则       │  │   │
│  │  └─────────┘ └──────────┘ └────────┘ └───────────┘  │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                           │
│     ┌───────────┼───────────────────────┐                   │
│     ▼           ▼                       ▼                   │
│  ┌────────┐ ┌──────────┐ ┌──────────────────────┐          │
│  │agents/ │ │skills/   │ │workflow/             │          │
│  │角色定义│ │技能定义  │ │                      │          │
│  │        │ │          │ │ _definitions/ (法律) │          │
│  │analyst │ │create-prd│ │ _templates/  (标准) │          │
│  │ pm     │ │create-td │ │ _schemas/    (约束) │          │
│  │ dev    │ │create-tp │ │ features/    (案件) │          │
│  │ tester │ │analyze   │ │                      │          │
│  │ review │ │validate  │ │                      │          │
│  └────────┘ └──────────┘ └──────────────────────┘          │
│                                                             │
│  ┌──────────┐  ┌──────────┐                                 │
│  │  docs/   │  │  repos/  │                                 │
│  │ 文档中心 │  │ 代码仓库 │←── Analyst 扫描生成项目简介     │
│  │projects/ │  │          │                                 │
│  └──────────┘  └──────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 三大支柱详解

### 1. Logic Gears（逻辑齿轮）

**载体**：`workflow/_definitions/*.yaml`

逻辑齿轮定义了每个工作流的阶段顺序、角色绑定和输入输出关系。Agent 不能跳过阶段，不能越权操作，不能产出未声明的产物。

```
[需求定义] → [技术设计] → [代码实现] → [测试计划] → [代码评审]
    PM          Developer     Developer     Tester       Reviewer
```

关键约束：
- 阶段按序执行，不可跳跃
- 每个阶段绑定唯一的 Agent 角色
- 输入必须来自已声明的上游阶段产物
- 输出必须符合模板结构

### 2. Quality Governors（质量调速器）

**载体**：`workflow/_definitions/*.yaml` 中的 `validation` 字段 + `workflow/_templates/`

质量调速器通过两层机制保障产出质量：

- **结构校验**：通过 `required_sections` 确保产物包含所有必要章节
- **自定义规则**：通过 `custom_rules` 执行业务层面的质量检查

校验流程：
1. 产物完成 → 调用 `validate-artifact` 技能
2. 读取工作流 YAML 中对应阶段的 validation 规则
3. 逐项检查 → 生成校验报告
4. 全部通过 → 更新 manifest → 允许流转到下一阶段
5. 未通过 → 修正 → 重新校验

### 3. Persistent Pulse（持久脉冲）

**载体**：`workflow/features/FEAT-xxx/manifest.yaml`

持久脉冲解决的是 AI Agent 在长周期任务中的上下文丢失问题：

- `manifest.yaml` 记录了完整的工作流进度状态
- Agent 在新的对话中可以通过读取 manifest 恢复上下文
- 每个阶段的完成状态、产物列表、校验结果都被持久化
- 即使中断也能从断点续做，而非从头开始

---

## 数据流

### Feature 开发流程的数据流

```
                                        ┌────────────────┐
┌──────────────────┐   扫描代码仓库     │  repos/        │
│ Analyst Agent    │◄──────────────────│  <repo-name>   │
│                  │                   └────────────────┘
│ 产出: overview.md│──► docs/projects/<repo-name>/overview.md
└──────────────────┘    (供所有下游阶段引用)
         │
         │ 项目简介作为上下文
         ▼
用户需求描述
    │
    ▼
┌──────────────────┐     读取模板      ┌────────────────┐
│ PM Agent         │◄────────────────►│ _templates/    │
│ (requirements)   │                  │ prd.md         │
│                  │                  └────────────────┘
│ 产出: prd.md     │
└────────┬─────────┘
         │ prd.md 作为输入
         ▼
┌──────────────────┐     读取模板      ┌────────────────┐
│ Developer Agent  │◄────────────────►│ _templates/    │
│ (tech_design)    │                  │ tech-design.md │
│                  │                  └────────────────┘
│ 产出: tech-design│
└────────┬─────────┘
         │ tech-design 作为输入
         ▼
┌──────────────────┐
│ Developer Agent  │
│ (implementation) │
│                  │
│ 产出: repos/ 代码│
└────────┬─────────┘
         │ prd + tech-design 作为输入
         ▼
┌──────────────────┐     读取模板      ┌────────────────┐
│ Tester Agent     │◄────────────────►│ _templates/    │
│ (testing)        │                  │ test-plan.md   │
│                  │                  └────────────────┘
│ 产出: test-plan  │
└────────┬─────────┘
         │ tech-design + code 作为输入
         ▼
┌──────────────────┐
│ Reviewer Agent   │
│ (review)         │
│                  │
│ 产出: 评审报告   │
└──────────────────┘
```

---

## 扩展机制

### 添加新角色

1. 在 `agents/` 下创建新目录
2. 基于 `agents/_template/AGENT.md` 模板定义角色
3. 在工作流 YAML 中引用新角色

### 添加新技能

1. 在 `skills/` 下创建新目录
2. 基于 `skills/_template/SKILL.md` 模板定义技能
3. 在 Agent 定义和工作流 YAML 中引用新技能

### 添加新工作流

1. 基于 `workflow/_schemas/workflow.schema.yaml` 的结构创建新的 YAML 定义
2. 保存到 `workflow/_definitions/` 目录
3. 按需添加对应的产物模板到 `workflow/_templates/`

### 添加代码仓库

1. 使用 git submodule 将代码仓库挂载到 `repos/` 下：
   ```bash
   git submodule add <repo-url> repos/<repo-name>
   ```
2. 请 Analyst 角色分析仓库，生成 `docs/projects/<repo-name>/overview.md`
3. 工作流中的 implementation 阶段产物在 `repos/<repo-name>` 中产出
