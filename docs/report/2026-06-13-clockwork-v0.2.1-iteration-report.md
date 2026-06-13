# Clockwork v0.2.1 迭代实施报告

> 日期: 2026-06-13 | 基准: eef791c | HEAD: e5433c5 | 分支: release/v0.2.0

## 一、迭代概览

本次迭代完成了三个子项目（P1/P2/P3），共 20 个 commit，涉及 22 个文件（+3343/-77 行），测试从 92 条增长至 97 条，无回归。

| 子项目       | 目标                  | 关键交付                                              |
| ------------ | --------------------- | ----------------------------------------------------- |
| P1: 知识库   | 代码→知识条目自动生成 | agent + skill + `knowledge generate` CLI + 工作流集成 |
| P2: 引导命令 | 交互式工作空间初始化  | `clockwork onboard` 四阶段向导                        |
| P3: 角色协作 | 多人协作 + 角色分工   | `user.yaml` + `team-feature-dev` 工作流 + 三场景分流  |

## 二、P1: 知识库 Agent & Skill

### 交付内容

| 文件                                             | 类型 | 说明                                                |
| ------------------------------------------------ | ---- | --------------------------------------------------- |
| `agents/knowledge-keeper.md`                     | 新增 | Agent 角色定义（YAML frontmatter + 四分类分析指南） |
| `skills/knowledge-keeper/SKILL.md`               | 新增 | Skill 技能定义（四阶段架构/业务/规范/决策分析）     |
| `cli/templates/agents/knowledge-keeper.md`       | 新增 | Agent 模板（init 时复制）                           |
| `cli/templates/skills/knowledge-keeper/SKILL.md` | 新增 | Skill 模板（init 时复制）                           |
| `cli/src/commands/knowledge.ts`                  | 修改 | 新增 `generate` 子命令（--repo/--category 参数）    |
| `cli/tests/commands/knowledge.test.ts`           | 新增 | 4 条测试（无效仓库/有效仓库/分类筛选/无效分类）     |
| `workflows/feature-dev.md`                       | 修改 | deliver 阶段 action 更新                            |
| `workflows/bug-fix.md`                           | 修改 | deliver 阶段 action 更新                            |
| `cli/templates/workflows/feature-dev.md`         | 修改 | 模板同步                                            |
| `cli/templates/workflows/bug-fix.md`             | 修改 | 模板同步                                            |

### 命令

```bash
clockwork knowledge generate --repo <name> [--category <cat>]
```

## 三、P2: Onboard 引导命令

### 交付内容

| 文件                                 | 类型 | 说明                                   |
| ------------------------------------ | ---- | -------------------------------------- |
| `cli/src/commands/onboard.ts`        | 新增 | 四阶段交互式向导（517 行）             |
| `cli/src/commands/init.ts`           | 重构 | 提取 `createProject()` 供 onboard 复用 |
| `cli/src/index.ts`                   | 修改 | 注册 onboard 命令                      |
| `cli/tests/commands/onboard.test.ts` | 新增 | 5 条测试（场景 A/B/C）                 |

### 命令

```bash
clockwork onboard [path]   # 自动检测场景分流
```

### 场景路由

| 场景 | config.yaml | user.yaml | 行为                                                   |
| ---- | ----------- | --------- | ------------------------------------------------------ |
| A    | 不存在      | —         | 全流程：项目骨架→仓库导入→知识库生成→配置检查→个人信息 |
| B    | 存在        | 不存在    | 新成员加入：个人信息采集→配置检查                      |
| C    | 存在        | 存在      | 已配置：显示信息→可选修改                              |

## 四、P3: 角色协作

### 交付内容

| 文件                                          | 类型 | 说明                                                     |
| --------------------------------------------- | ---- | -------------------------------------------------------- |
| `cli/src/types.ts`                            | 修改 | 新增 `UserConfig` 接口，`WorkflowStage` 增加 `role` 字段 |
| `cli/src/config.ts`                           | 修改 | 新增 `loadUserConfig()`、`saveUserConfig()`              |
| `workflows/team-feature-dev.md`               | 新增 | 五阶段角色驱动工作流                                     |
| `cli/templates/workflows/team-feature-dev.md` | 新增 | 工作流模板                                               |
| `cli/src/commands/init.ts`                    | 修改 | .gitignore 排除 user.yaml                                |
| `cli/src/commands/onboard.ts`                 | 修改 | 三场景分流 + 个人信息采集                                |
| `cli/tests/commands/onboard.test.ts`          | 修改 | 场景 B/C 测试（+2 条）                                   |

### 角色定义

| 角色     | role 值     | 职责                       |
| -------- | ----------- | -------------------------- |
| 产品经理 | `pm`        | 需求定义 → PRD.md          |
| 开发者   | `developer` | 技术设计 + 编码实现        |
| 测试     | `tester`    | 测试计划 + 执行 + 缺陷跟踪 |

### team-feature-dev 工作流

```
requirements ──(pm)──→ design ──(developer)──→ implementation ──(auto)──→ testing ──(tester)──→ deliver
```

## 五、待优化问题

### 高优先级

**1. 工作流引擎未处理 `role` 字段**

`WorkflowStage.role` 已在类型系统和 `team-feature-dev` 工作流中定义，但 `workflow-engine.ts` 未读取或使用该字段。引擎无法根据当前用户的 role 判断该阶段是否可执行。例如 PM 角色的用户应被自动路由到 `requirements` 阶段，但目前所有人可见所有阶段。

**影响范围：** `cli/src/workflow-engine.ts`
**建议：** 引擎读取 `loadUserConfig()` → 对比 `stage.role` → 生成对应角色的阶段动作

---

**2. deliver 阶段 agent 设置为 `none`，增量知识生成未实现**

在 P1 实现过程中，因 workflow-agent 输入不匹配（deliver 需要 `SPEC.md`/`code_changes`，但 agent 期望 `repo_path`），将 deliver 的 `agent` 从 `knowledge-keeper` 回退为 `none`。`generate_incremental_knowledge` 和 `update_knowledge_index` action 是占位符，框架未实际执行它们。

**影响范围：** `workflows/feature-dev.md`、`workflows/bug-fix.md`、`skills/knowledge-keeper/SKILL.md`
**建议：** 在 knowledge-keeper skill 中增加"增量模式"章节，定义如何处理 `code_changes` 输入，然后恢复 `agent: knowledge-keeper`

---

**3. KnowledgeEntry 缺少 `author` 字段**

设计规格要求在知识条目 frontmatter 中增加 `author` 字段标注署名，但 `KnowledgeEntry` 类型和 `knowledge-indexer.ts` 均未实现。

**影响范围：** `cli/src/types.ts`、`cli/src/knowledge-indexer.ts`
**建议：** `KnowledgeEntry` 增加 `author?: string`，索引器在解析 frontmatter 时提取 author

---

### 中优先级

**4. team-feature-dev 无端到端测试**

`feature-dev`、`bug-fix`、`incident-response` 均有 e2e 测试文件，但 `team-feature-dev` 没有。

**影响范围：** `cli/tests/e2e/`
**建议：** 新增 `cli/tests/e2e/team-feature-dev.test.ts`

---

**5. `clockwork start` 未验证对 team-feature-dev 的支持**

start 命令根据工作流名称加载对应的 `.md` 文件。理论上它应能加载 `team-feature-dev`，但无测试验证该路径可用。

**影响范围：** `cli/src/commands/start.ts`、`cli/tests/commands/start.test.ts`
**建议：** 增加一条测试 `start team-feature-dev --slug <name> --repo <repo>`

---

**6. 用户角色验证不足**

`UserConfig.role` 被定义为 `'pm' | 'developer' | 'tester'`，但没有任何运行时校验确保用户在对应阶段操作时有正确的角色。工作流阶段指定了 `role`，但没有机制验证当前用户是否匹配。

**影响范围：** `cli/src/commands/review.ts`（审核命令）、`cli/src/workflow-engine.ts`
**建议：** 在阶段转换时检查 `user.yaml` 中的 role 是否与 `stage.role` 匹配，不匹配时给出警告

---

### 低优先级

**7. 角色枚举硬编码**

角色列表（pm/developer/tester）在多个文件中作为字符串字面量重复出现：`types.ts`、`onboard.ts`、`team-feature-dev.md`。增加新角色需要改多处。

**建议：** 在 types.ts 中导出 `ROLES` 常量和类型别名，其他文件引用

---

**8. onboard.ts 代码量较大（517 行）**

onboard.ts 是 CLI 命令中最大的文件，包含所有四个阶段的逻辑、场景路由、个人信息采集。相比之下 init.ts 约 130 行、knowledge.ts 约 120 行。

**建议：** 将各阶段逻辑拆分为独立模块：`onboard/stage1-project.ts`、`onboard/stage2-repos.ts` 等

---

**9. 个人信息采集不支持跳过电子邮件**

`collectPersonalInfo()` 中 email 可选但实际上 collectPersonalInfo 中 email 已经设为可选（默认空字符串）。确认行为一致即可。

---

**10. team-feature-dev 工作流说明仅中文**

`team-feature-dev.md` 的 markdown body 部分（Stage 1-5 说明）是中文，而 `feature-dev.md`、`bug-fix.md` 是英文。

**建议：** 统一为英文或中英双语

---

## 六、统计

| 指标           | 数值                                    |
| -------------- | --------------------------------------- |
| 总 commits     | 20                                      |
| 新增文件       | 12                                      |
| 修改文件       | 10                                      |
| 新增代码       | +3343 行                                |
| 删除代码       | -77 行                                  |
| CLI 测试       | 97 (20 文件)                            |
| Workbench 测试 | 22 (4 文件)                             |
| E2E 测试覆盖   | feature-dev, bug-fix, incident-response |
| 新增 E2E       | team-feature-dev (待补充)               |
