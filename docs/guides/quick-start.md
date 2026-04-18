# 快速上手指南

---

## 前置条件

- 已安装 [Cursor IDE](https://cursor.com)
- Python 3.8+（用于 CLI 工具）
- 已克隆 Clockwork 工作空间仓库

---

## 第一步：安装 CLI 工具（推荐）

Clockwork CLI 可以自动化管理需求实例、推进阶段、执行质量校验。

```bash
cd /path/to/clockwork
pip install pyyaml
chmod +x cli/clockwork.py
```

验证安装：

```bash
python cli/clockwork.py --help
```

---

## 第二步：用 Cursor 打开工作空间

```bash
cd /path/to/clockwork
cursor .
```

打开后，Cursor 会自动加载 `.cursor/rules/clockwork.mdc` 中的治理规则。

---

## 第三步：创建需求实例

### 方式 A：使用 CLI（推荐）

```bash
python cli/clockwork.py create "用户注册功能" --repo my-app
```

CLI 会自动：
- 分配 FEAT 编号（FEAT-001, FEAT-002...）
- 创建 `workflow/features/FEAT-xxx-user-registration/` 目录
- 生成包含所有阶段状态的 `manifest.yaml`
- 将第一个阶段设为 `in_progress`

### 方式 B：让 Agent 帮你创建

> "请帮我创建一个新需求：用户注册功能，对应代码仓库 my-app。"

Agent 会调用 CLI 或手动创建目录结构。

### 方式 C：手动创建

```bash
mkdir -p workflow/features/FEAT-002-user-registration
```

然后运行 CLI 初始化 manifest：

```bash
python cli/clockwork.py create "用户注册功能" --repo my-app --workflow feature-development
# 手动创建目录后，直接编辑 manifest.yaml
```

---

## 第四步：按工作流推进

### 查看需求状态

```bash
# 查看单个需求
python cli/clockwork.py status FEAT-001

# 查看所有需求
python cli/clockwork.py status
```

### PM：需求定义阶段

1. 确认当前阶段是 `requirements`（可用 `clockwork status` 查看）
2. 告诉 Agent：
   > "我是产品经理，要定义 FEAT-001 的需求。"
3. Agent 会：
   - 读取 `workflow/_templates/prd.md` 模板
   - 询问你需求细节
   - 生成 PRD 文档到 `workflow/features/FEAT-xxx/prd.md`

4. 完成后校验质量：
   ```bash
   python cli/clockwork.py validate FEAT-001
   ```

5. 校验通过后推进到下一阶段：
   ```bash
   python cli/clockwork.py advance FEAT-001 tech_design
   ```

### Developer：技术设计阶段

1. 确认当前阶段是 `tech_design`
2. 告诉 Agent：
   > "我是开发者，要做 FEAT-001 的技术设计。"
3. Agent 会：
   - 读取 `workflow/features/FEAT-xxx/prd.md` 作为输入
   - 调用 `create-tech-design` 技能
   - 基于模板生成技术设计文档

4. 校验并推进：
   ```bash
   python cli/clockwork.py validate FEAT-001
   python cli/clockwork.py advance FEAT-001 implementation
   ```

### Developer：代码实现阶段

1. 在 `repos/<repo-name>/` 中的代码仓库内实现功能
2. 遵循提交规范（基于 `workflow/_templates/implementation-checklist.md`）：
   - 分支命名：`feature/FEAT-xxx-description`
   - Commit Message：`feat(scope): description`
   - PR/MR 必须关联需求编号
3. 创建实现清单：
   ```bash
   # 基于模板创建实现清单
   cp workflow/_templates/implementation-checklist.md \
      workflow/features/FEAT-xxx/implementation-checklist.md
   ```
4. 填写清单中的任务、提交记录、代码规范自检
5. 校验并推进：
   ```bash
   python cli/clockwork.py validate FEAT-001
   python cli/clockwork.py advance FEAT-001 testing
   ```

### Tester：测试计划阶段

1. 告诉 Agent：
   > "我是测试工程师，要写 FEAT-001 的测试计划。"
2. Agent 会：
   - 读取 PRD 和技术设计作为输入
   - 调用 `create-test-plan` 技能
   - 生成测试计划文档

3. 校验并推进：
   ```bash
   python cli/clockwork.py validate FEAT-001
   python cli/clockwork.py advance FEAT-001 review
   ```

### Reviewer：代码评审阶段

1. 告诉 Agent：
   > "我是评审员，要做 FEAT-001 的代码评审。"
2. Agent 会：
   - 读取技术设计和实现清单
   - 生成评审意见（标注级别：阻塞/建议）
3. 评审通过后手动标记完成

---

## 质量校验

### 校验层级

| 层级 | 校验内容 | 失败后果 |
|------|----------|----------|
| **S1 - 结构校验** | 必需章节是否完整 | 阻塞 |
| **S2 - 内容校验** | 章节内容是否有实质意义 | 阻塞 |
| **S3 - 引用校验** | 上游产物引用是否准确 | 阻塞 |

### 校验报告示例

```
╔══════════════════════════════════════════════════════════╗
║                    质量校验报告                           ║
╠══════════════════════════════════════════════════════════╣
║ 产物: prd.md                                             ║
║ 阶段: requirements (需求定义)                             ║
║ 需求: FEAT-001 用户注册功能                               ║
╠══════════════════════════════════════════════════════════╣
║ [S1] 结构校验 — ✅ 通过                                   ║
║ [S2] 内容校验 — ✅ 通过                                   ║
║ [S3] 引用校验 — ✅ 通过                                   ║
╠══════════════════════════════════════════════════════════╣
║ 总体结果: ✅ 通过                                         ║
╚══════════════════════════════════════════════════════════╝
```

### 校验失败示例

```
╠══════════════════════════════════════════════════════════╣
║ [S2] 内容校验 — ❌ 未通过                                 ║
║                                                              ║
║   ❌ acceptance_criteria                                    ║
║      规则: ac_actionable                                    ║
║      问题: AC-3 缺少"操作"字段                              ║
║      修正指引: 请在 AC-3 中补充"操作"字段                     ║
╠══════════════════════════════════════════════════════════╣
║ 总体结果: ❌ 未通过 (1 项待修复)                           ║
╚══════════════════════════════════════════════════════════╝
```

---

## 添加代码仓库

### 添加新的 git submodule

```bash
git submodule add https://github.com/your-org/your-repo.git repos/your-repo
```

### 让 Analyst 分析仓库

> "请分析 repos/your-repo 代码仓库，生成项目简介。"

Analyst 会：
- 扫描技术栈和依赖
- 分析目录结构和模块划分
- 生成 `docs/projects/your-repo/overview.md`

---

## 常见问题

### Q: 可以跳过某个阶段吗？

不可以。Clockwork 的核心理念是通过固定执行路径保证质量。如果确实不需要某个阶段，应该定义一个新的工作流（在 `workflow/_definitions/` 中）。

### Q: 对话中断了怎么办？

新的对话中，Agent 会读取 `manifest.yaml` 恢复上下文。告诉 Agent：

> "我是开发者，FEAT-001 当前在 tech_design 阶段，请继续技术设计工作。"

### Q: 如何使用并行工作流？

使用 `feature-development-parallel` 工作流，测试和实现可以并行：

```bash
python cli/clockwork.py create "功能名" --repo my-app --workflow feature-development-parallel
```

### Q: 如何处理 Bug 修复？

使用 bugfix 工作流：

```bash
python cli/clockwork.py create "登录缺陷修复" --repo my-app --workflow bugfix
```

### Q: 如何扩展新的角色或技能？

参考：
- `agents/_template/AGENT.md` — 角色定义模板
- `skills/_template/SKILL.md` — 技能定义模板
- [架构文档](../architecture.md)

### Q: CLI 报 "ModuleNotFoundError: No module named 'yaml'"

需要安装 PyYAML：

```bash
pip install pyyaml
```

---

## 校验规则速查

### PRD (prd.md)

| 规则 | 说明 |
|------|------|
| `ac_actionable` | 验收标准必须包含"操作"和"预期结果" |
| `ac_verifiable` | 验收标准必须可客观验证 |
| `story_complete` | 用户故事必须三要素完整（作为/我想要/以便）|
| `scope_boundary` | 必须明确包含/不包含边界 |

### 技术设计 (tech-design.md)

| 规则 | 说明 |
|------|------|
| `has_api_contract` | API 设计必须有端点和请求/响应定义 |
| `has_data_model` | 数据模型必须有实体或表结构 |
| `no_impl_details` | 架构设计不得包含实现代码 |

### 测试计划 (test-plan.md)

| 规则 | 说明 |
|------|------|
| `has_test_cases` | 必须有具体测试用例 |
| `case_traceable` | 用例必须可追溯到验收标准 |
