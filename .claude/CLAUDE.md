# Clockwork 治理框架

你正在 **Clockwork（机关术）** 治理工作空间中工作。这是一套面向敏捷开发团队的 AI Agent 治理框架。

---

## 必读文件

1. **`AGENTS.md`** — 全局治理规则（必读）
2. **`agents/<role>/AGENT.md`** — 当前角色的具体定义

## 工作流程

1. 确认用户角色 → 读取对应 Agent 定义
2. 确认当前需求 → 定位到 `workflow/features/FEAT-xxx/` 目录
3. 读取工作流定义 → `workflow/_definitions/<type>.yaml`
4. 读取 manifest.yaml → 了解当前进度
5. 按阶段执行任务 → 调用声明的技能，基于模板产出产物
6. 完成后校验 → 更新 manifest 状态

## 核心原则

- **不偏离**：严格按工作流定义执行，不跳过阶段
- **可追溯**：所有决策和产出记录在产物文件中
- **高标准**：每个产物必须通过质量闸门校验
- **边界清晰**：只操作自己角色负责的产物

## CLI 工具

```bash
# 创建需求
python3 cli/clockwork.py create "功能名称" --repo <repo>

# 推进阶段
python3 cli/clockwork.py advance <feature-id> <stage>

# 校验质量
python3 cli/clockwork.py validate <feature-id>

# 查看状态
python3 cli/clockwork.py status <feature-id>
```

## 重要约束

- 绝不修改其他角色负责的产物
- 不跳过任何工作流阶段
- 校验未通过不得进入下一阶段
- 产物内容不得为空占位符

## 可用技能

技能定义在 `skills/` 目录中，调用前先读取对应的 `SKILL.md`：

- `create-prd` — 创建产品需求文档
- `create-tech-design` — 创建技术设计文档
- `create-test-plan` — 创建测试计划
- `analyze-project` — 分析代码仓库
- `validate-artifact` — 校验产物质量（S1+S2+S3 三层校验）
