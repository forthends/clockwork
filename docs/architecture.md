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
│  ┌────────┐ ┌──────────┐ ┌──────────────────────┐       │
│  │agents/ │ │skills/   │ │workflow/             │       │
│  │角色定义│ │技能定义  │ │                      │       │
│  │        │ │          │ │ _definitions/ (法律) │       │
│  │analyst │ │create-prd│ │ _templates/  (标准) │       │
│  │ pm     │ │create-td │ │ _schemas/    (约束) │       │
│  │ dev    │ │create-tp │ │ features/    (案件) │       │
│  │ tester │ │analyze   │ │                      │       │
│  │ review │ │validate  │ │                      │       │
│  └────────┘ └──────────┘ └──────────────────────┘       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐       │
│  │  docs/   │  │  repos/  │  │      cli/         │       │
│  │ 文档中心 │  │ 代码仓库 │  │  clockwork.py     │       │
│  │projects/ │  │          │  │ (命令行工具)      │       │
│  └──────────┘  └──────────┘  └────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## CLI 工具

**位置**：`cli/clockwork.py`

CLI 工具提供需求生命周期管理的自动化支持：

| 命令 | 功能 |
|------|------|
| `create` | 创建新需求实例，自动分配 FEAT 编号 |
| `advance` | 推进工作流阶段 |
| `validate` | 执行 S1+S2+S3 质量校验 |
| `status` | 查看需求状态 |
| `list` | 列出所有需求 |
| `context` | 解析 `<repo-name>` 等变量 |
| `init` | 初始化工作空间目录结构 |

---

## 三大支柱详解

### 1. Logic Gears（逻辑齿轮）

**载体**：`workflow/_definitions/*.yaml`

逻辑齿轮定义了每个工作流的阶段顺序、角色绑定和输入输出关系。Agent 不能跳过阶段，不能越权操作，不能产出未声明的产物。

#### 标准工作流（线性）

```
[需求定义] → [技术设计] → [代码实现] → [测试计划] → [代码评审]
    PM          Developer     Developer     Tester       Reviewer
```

#### 并行工作流

```
[需求定义] ──→ [技术设计]
    │
    └──────→ [代码实现] ←──────── [测试计划]
                              (并行)
                         ┌──────→ [代码评审]（需双方通过）
```

关键约束：
- 阶段按序执行，不可跳跃（除非使用并行工作流）
- 每个阶段绑定唯一的 Agent 角色
- 输入必须来自已声明的上游阶段产物
- 输出必须符合模板结构
- Gate 门控可定义阶段进入的前置条件

### 2. Quality Governors（质量调速器）

**载体**：`workflow/_definitions/*.yaml` 中的 `validation` 字段 + `workflow/_templates/`

质量调速器通过三层校验机制保障产出质量：

| 层级 | 校验类型 | 说明 |
|------|----------|------|
| **S1** | 结构校验 | `required_sections` 确保产物包含所有必要章节 |
| **S2** | 内容校验 | 章节内容非空占位符，领域规则验证 |
| **S3** | 引用校验 | 上游产物引用是否准确存在 |

#### S2 领域规则

**PRD 专用**：
- `ac_actionable`：验收标准包含操作和预期结果
- `ac_verifiable`：验收标准可客观验证
- `story_complete`：用户故事三要素完整
- `scope_boundary`：包含/不包含边界清晰

**技术设计专用**：
- `has_api_contract`：API 有端点和请求/响应定义
- `has_data_model`：数据模型有实体或表结构
- `no_impl_details`：架构设计不包含实现代码

**测试计划专用**：
- `has_test_cases`：有具体测试用例
- `case_traceable`：用例可追溯到验收标准

#### 校验流程

```
1. 产物完成 → 调用 validate-artifact 技能
2. 读取工作流 YAML 中对应阶段的 validation 规则
3. S1 检查 → S2 检查 → S3 检查（按顺序执行）
4. 全部通过 → 生成校验报告 → 更新 manifest
5. 未通过 → 报告具体问题和修正指引 → 修正后重新校验
```

### 3. Persistent Pulse（持久脉冲）

**载体**：`workflow/features/FEAT-xxx/manifest.yaml`

持久脉冲解决的是 AI Agent 在长周期任务中的上下文丢失问题：

- `manifest.yaml` 记录了完整的工作流进度状态
- Agent 在新的对话中可以通过读取 manifest 恢复上下文
- 每个阶段的完成状态、产物列表、校验结果都被持久化
- 即使中断也能从断点续做，而非从头开始

**manifest 结构**：

```yaml
feature_id: FEAT-001
name: Backlog 列表删除功能
workflow: feature-development
repo: agilehub
created_at: 2026-04-18
current_stage: tech_design

stages:
  requirements:
    status: completed
    started_at: 2026-04-18T10:00:00
    completed_at: 2026-04-18T11:30:00
    artifacts:
      - prd.md
    validation_passed: true
  tech_design:
    status: in_progress
    started_at: 2026-04-18T11:30:00
  implementation:
    status: pending
  testing:
    status: pending
  review:
    status: pending
```

---

## 工作流类型

### feature-development

标准功能开发流程，适用于新功能的完整开发周期。

### feature-development-parallel

支持并行的工作流，测试计划可与代码实现并行执行。

### bugfix

缺陷修复工作流，适用于已上线功能的缺陷修复：

```
[缺陷分析] → [修复实现] → [修复验证] → [修复评审]
   Developer    Developer       Tester        Reviewer
```

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
┌──────────────────┐     ┌────────────────────────┐
│ Developer Agent  │     │ _templates/            │
│ (implementation) │     │ implementation-checklist│
│                  │◄────│ (分支规范、提交规范)    │
│ 产出: repos/ 代码│     └────────────────────────┘
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

## 变量解析机制

工作流定义中的 `<repo-name>` 占位符在运行时解析：

**定义位置**：`manifest.yaml` 中的 `repo` 字段

**解析过程**：
1. CLI 读取 manifest 中的 `repo` 字段
2. 替换 `workflow/_definitions/*.yaml` 中的 `<repo-name>`
3. 验证解析后的路径是否存在

```bash
# 查看解析后的上下文路径
clockwork context FEAT-001
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

---

## Schema 约束

**位置**：`workflow/_schemas/workflow.schema.yaml`

工作流 YAML 必须遵循 Schema 定义，主要约束：

| 字段 | 约束 |
|------|------|
| `name` | 必填，唯一标识 |
| `stages` | 必填，列表顺序 = 执行顺序 |
| `stage.id` | 必填，snake_case |
| `stage.agent` | 必填，对应 agents/<agent>/AGENT.md |
| `stage.outputs` | 必填，即使 `template: null` 也需声明 |
| `stage_type` | 可选：sequential / parallel / conditional |
| `gate` | 条件表达式，进入阶段的前置条件 |

---

## 自定义规则（custom_rules）

```yaml
custom_rules:
  - rule: 提交信息必须包含需求编号
    check_type: git_commit
    pattern: "FEAT-\\d+"
    error_message: 提交信息必须包含需求编号 (FEAT-xxx)
  - rule: 所有实现任务必须标记为完成
    check_type: manual
```

| check_type | 说明 |
|------------|------|
| `file_exists` | 验证文件是否存在 |
| `content_pattern` | 验证内容匹配正则 |
| `git_commit` | 验证 git 提交符合规范 |
| `branch_naming` | 验证分支命名符合规范 |
| `reference_exists` | 验证引用存在 |
| `manual` | 需要人工检查 |
