# 快速上手指南

---

## 前置条件

- 已安装 [Cursor IDE](https://cursor.com)
- 已克隆 Clockwork 工作空间仓库

---

## 第一步：用 Cursor 打开工作空间

```bash
cd /path/to/clockwork
cursor .
```

打开后，Cursor 会自动加载 `.cursor/rules/clockwork.mdc` 中的治理规则。你无需手动配置任何东西。

---

## 第二步：告诉 Agent 你的角色

在 Cursor 的对话中，告诉 Agent 你是哪个角色：

> "我是产品经理，现在要开始定义一个新需求。"

Agent 会自动：
1. 读取 `AGENTS.md` 了解全局治理规则
2. 读取 `agents/pm/AGENT.md` 了解 PM 角色的职责和约束
3. 在角色范围内协助你工作

---

## 第三步：创建需求实例

### 方式 A：让 Agent 帮你创建

> "请帮我创建一个新需求：用户注册功能"

Agent 会按照工作流规范创建目录和初始化文件。

### 方式 B：手动创建

```bash
mkdir -p workflow/features/FEAT-002-user-login
```

然后创建 `manifest.yaml`：

```yaml
feature_id: FEAT-002
name: 用户登录功能
workflow: feature-development
created_at: 2026-04-09
current_stage: requirements

stages:
  requirements:
    status: in_progress
    artifacts: []
  tech_design:
    status: pending
    artifacts: []
  implementation:
    status: pending
    artifacts: []
  testing:
    status: pending
    artifacts: []
  review:
    status: pending
    artifacts: []
```

---

## 第四步：按工作流推进

### PM：需求定义

1. 描述你的需求，Agent 会调用 `create-prd` 技能
2. Agent 基于 `workflow/_templates/prd.md` 模板生成 PRD
3. 完成后自动校验质量
4. 校验通过 → manifest 中 `requirements` 设为 `completed`

### Developer：技术设计

1. 告诉 Agent 你是开发者，要做技术设计
2. Agent 读取 PRD 作为输入，调用 `create-tech-design` 技能
3. 基于 `workflow/_templates/tech-design.md` 模板生成技术设计文档
4. 校验通过 → manifest 中 `tech_design` 设为 `completed`

### Developer：代码实现

1. 在 `repos/` 中的代码仓库内实现功能
2. 代码提交信息关联需求编号
3. 完成后更新 manifest

### Tester：测试计划

1. 告诉 Agent 你是测试工程师
2. Agent 读取 PRD 和技术设计作为输入，调用 `create-test-plan` 技能
3. 基于 `workflow/_templates/test-plan.md` 模板生成测试计划
4. 校验通过 → manifest 中 `testing` 设为 `completed`

### Reviewer：代码评审

1. 告诉 Agent 你是评审员
2. Agent 读取技术设计文档和代码变更进行评审
3. 输出评审报告
4. 评审通过 → manifest 中 `review` 设为 `completed`

---

## 第五步：添加代码仓库

将实际的代码仓库作为 git submodule 挂载：

```bash
git submodule add https://github.com/your-org/your-repo.git repos/your-repo
```

工作流中的代码实现阶段在 `repos/your-repo` 中进行。

---

## 常见问题

### Q: 可以跳过某个阶段吗？

不可以。Clockwork 的核心理念是通过固定执行路径保证质量。如果确实不需要某个阶段，应该定义一个新的工作流（在 `workflow/_definitions/` 中）。

### Q: 如何处理需求变更？

回到对应阶段修改产物，重新通过质量校验，并评估对下游阶段的影响。变更必须记录在产物的变更记录中。

### Q: Agent 的对话中断了怎么办？

这正是 Persistent Pulse（持久脉冲）解决的问题。新的对话中，Agent 会读取 `manifest.yaml` 恢复上下文，从断点继续。

### Q: 如何扩展新的角色或技能？

参考 `agents/_template/AGENT.md` 和 `skills/_template/SKILL.md` 模板创建。详细说明见 [架构文档](../architecture.md)。
