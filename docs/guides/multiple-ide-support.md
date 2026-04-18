# 多 AI 编程工具支持

Clockwork 框架主要为 Cursor IDE 设计，但可以通过适配层支持其他 AI 编程工具。

---

## 工具支持矩阵

| 工具 | 支持程度 | 说明 |
|------|----------|------|
| **Cursor** | ⭐⭐⭐ 原生支持 | `.cursor/rules/clockwork.mdc` + `alwaysApply: true` |
| **Claude Code** | ⭐⭐⭐ 高度兼容 | `.claude/CLAUDE.md` + 软链接技能 |
| **GitHub Copilot** | ⭐⭐ 部分支持 | `.github/copilot-instructions.md` 简化规则 |
| **VS Code Copilot** | ⭐⭐ 部分支持 | 同 GitHub Copilot |
| **Cline** | ⭐ 有限支持 | 仅基础提示注入 |

---

## Claude Code 适配

### 目录结构

```
clockwork/
├── .claude/                  # Claude Code 配置
│   ├── CLAUDE.md             # 全局治理规则入口
│   └── skills/ → ../skills/  # 软链接到 Clockwork 技能
```

### CLAUDE.md 内容

```markdown
# Clockwork 治理框架

你正在 Clockwork 工作空间中工作。这是一套 AI Agent 治理框架。

## 核心文件

1. **AGENTS.md** — 全局治理规则（必读）
2. **agents/<role>/AGENT.md** — 当前角色的具体定义

## 工作流程

1. 确认用户角色 → 读取对应 Agent 定义
2. 确认当前需求 → 定位到 workflow/features/FEAT-xxx/
3. 读取工作流定义 → workflow/_definitions/<type>.yaml
4. 读取 manifest.yaml → 了解当前进度
5. 按阶段执行任务 → 调用技能，产出产物
6. 完成后校验 → 更新 manifest 状态

## 核心原则

- 不偏离：严格按工作流定义执行
- 可追溯：决策和产出记录在产物文件中
- 高标准：产物必须通过质量闸门校验

## 重要约束

- 绝不修改其他角色负责的产物
- 不跳过任何工作流阶段
- 校验未通过不得进入下一阶段
```

### 手动链接技能

```bash
# Claude Code 不支持 alwaysApply
# 每次对话开始时，需要先读取 CLAUDE.md

# 软链接技能（可选）
ln -s ../skills .claude/skills
```

---

## GitHub Copilot / VS Code Copilot 适配

### 目录结构

```
clockwork/
└── .github/
    └── copilot-instructions.md  # Copilot 指令文件
```

### copilot-instructions.md 内容

```markdown
# Clockwork 治理规则

你在一个使用 Clockwork 治理框架的项目中工作。

## 工作空间规范

- 需求实例位于 workflow/features/FEAT-xxx/ 目录
- 每个需求有 manifest.yaml 记录工作流状态
- 产物必须基于 workflow/_templates/ 中的模板创建

## 角色与职责

- **PM**: 产品经理，负责需求定义
- **Developer**: 开发者，负责技术设计和代码实现
- **Tester**: 测试工程师，负责测试计划
- **Reviewer**: 代码评审

## 工作流阶段

feature-development 工作流：
1. requirements (需求定义) — PM
2. tech_design (技术设计) — Developer
3. implementation (代码实现) — Developer
4. testing (测试计划) — Tester
5. review (代码评审) — Reviewer

## 质量标准

- 所有产物必须包含必需章节
- 章节内容不得为空占位符
- 校验未通过不得推进阶段

## 产物模板

- PRD: workflow/_templates/prd.md
- 技术设计: workflow/_templates/tech-design.md
- 测试计划: workflow/_templates/test-plan.md
```

### 限制

- Copilot 不理解 YAML 格式的工作流定义
- 无法自动执行 validate-artifact 技能
- 只能作为基础提示，实际治理依赖人工监督

---

## Cline 适配

Cline 使用 `~/.clinerules` 或项目根目录的 `.clinerules` 文件。

```markdown
# Clockwork 治理规则

你工作在 Clockwork AI Agent 治理框架中。

规则：
- 读取 AGENTS.md 了解全局规范
- 遵循工作流阶段顺序
- 产物必须基于模板创建
- 不跳过校验流程
```

---

## 推荐做法

### 1. 以 Cursor 为主要工具

Cursor 的 `alwaysApply: true` 机制是当前最强大的规则强制执行方式。

### 2. Claude Code 作为备选

Claude Code 的 Skills 系统与 Clockwork 高度兼容，可以软链接技能目录。

### 3. Copilot 用于基础提示

`.github/copilot-instructions.md` 只能提供最基础的规则提示，不能替代完整的治理机制。

---

## 迁移检查清单

如果需要在其他工具中使用 Clockwork：

- [ ] 创建对应工具的规则文件
- [ ] 将 AGENTS.md 的核心规则迁移到规则文件
- [ ] 测试规则是否生效
- [ ] 确认技能系统是否工作
- [ ] 验证 CLI 工具是否正常运行
