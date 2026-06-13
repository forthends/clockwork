# Clockwork Onboard — 交互式工作空间初始化向导

> 版本 0.1 | 2026-06-13 | 设计阶段

## 1. 问题与目标

### 1.1 现状

- `clockwork init` 创建项目骨架，但配置是硬编码默认值
- 用户需对照 quickstart.md 手动执行：init → submodule add → 配置调整 → 知识库生成
- 缺乏程序化引导，新用户学习成本高

### 1.2 目标

新增 `clockwork onboard` 交互式向导命令，替代 `init` 作为用户入口，引导用户逐步完成工作空间初始化。

- 四阶段 wizard + 进度条风格
- 交互式收集配置（项目名、IDE、模型等）
- 循环式仓库导入
- 引导式知识库生成（复用 P1 `knowledge generate`）
- 完整配置检查 + 常见问题自动修复

## 2. 设计

### 2.1 整体流程

```
clockwork onboard
  ├─ Stage 1: 项目骨架 —— 交互配置 → 创建目录/模板/配置
  ├─ Stage 2: 仓库导入 —— 循环式 git submodule add
  ├─ Stage 3: 知识库生成 —— 引导用户使用 knowledge-keeper skill
  └─ Stage 4: 配置检查 —— 验证完整性 + 自动修复
```

进度显示：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Clockwork Onboard — 工作空间初始化向导

  [1/4] 项目骨架      ... 进行中
  [2/4] 仓库导入      ○ 待开始
  [3/4] 知识库生成    ○ 待开始
  [4/4] 配置检查      ○ 待开始
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**与 `init` 的关系：** `clockwork init` 保留为静默命令供脚本化使用。`onboard` 是用户入口。内部提取 `createProject()` 函数，二者共享核心创建逻辑。

### 2.2 Stage 1: 项目骨架

交互式收集配置后创建项目。

```
项目名称 (默认: my-project):
>

IDE 选择:
  1. claude-code (默认)
  2. cursor
  3. codex
>

默认 AI 模型:
  1. sonnet (默认)
  2. opus
  3. haiku
>

Web 工作台端口 (默认: 4200):
>
```

确认后执行：

1. 创建项目目录
2. 写入 `.clockwork/config.yaml`（用户选择覆盖默认值）
3. 创建目录结构
4. 复制内置模板
5. 设置 `.claude/skills/`

每个输入有默认值，用户直接按 Enter 即接受默认值。

**实现要点：**

- 使用 Node.js `readline` 模块实现交互式提问
- 提取 `init.ts` 中的创建逻辑为 `createProject(targetPath, config)` 函数
- `init` 和 `onboard` 都通过 `createProject` 创建项目

### 2.3 Stage 2: 仓库导入

循环式交互添加 git submodule。

```
━━━━ Stage 2/4: 仓库导入 ━━━━

仓库 URL (或按 Enter 跳过):
> https://github.com/org/backend.git

子目录名称 (默认: backend):
>

正在添加 backend...
✓ 已添加: repos/backend

还要添加更多仓库吗? (y/N):
>
```

**行为：**

- 允许跳过（直接按 Enter），稍后可用 `clockwork repo add` 添加
- 复用 `repo.ts` 中的 URL 验证逻辑（`GIT_URL_RE` 正则）
- 每个仓库 clone 完成后立即显示结果
- 跳过所有仓库时显示提示
- 至少添加一个仓库后，自动执行 `git submodule update --init`

### 2.4 Stage 3: 知识库生成

引导式手动触发，复用 P1 的 `knowledge generate` 上下文逻辑。

```
━━━━ Stage 3/4: 知识库生成 ━━━━

已导入的仓库:
  1. backend
  2. frontend

要为哪个仓库生成知识库?
  1. backend
  2. frontend
  3. 全部
  4. 跳过
>
```

**行为：**

- 无仓库或选择跳过时，提示稍后可用 `clockwork knowledge generate --repo <name>`
- 只有 1 个仓库时跳过仓库选择，直接为该仓库准备上下文
- 选择"全部"时依次为每个仓库准备上下文
- 每个仓库打印 Claude Code 调用指令，不强制等待

### 2.5 Stage 4: 配置检查

完整检查项目完整性，常见问题自动修复。

```
━━━━ Stage 4/4: 配置检查 ━━━━

检查项目完整性...

  ✓ .clockwork/config.yaml
  ✓ agents/ (4 个 agent)
  ✓ skills/ (7 个 skill)
  ✓ knowledge/ (索引正常)
  ✓ workflows/ (3 个工作流)
  ✓ repos/ (2 个仓库)
  ✓ workspace/
  ✓ .claude/skills/ (已同步)
```

**检查项与修复策略：**

| 检查项               | 检测方式                                                          | 自动修复                                     |
| -------------------- | ----------------------------------------------------------------- | -------------------------------------------- |
| config.yaml          | 文件存在 + YAML 可解析                                            | 缺失时用默认配置重建                         |
| 必要目录             | agents/, skills/, knowledge/, workflows/, repos/, workspace/ 存在 | 缺失时 `mkdir -p` 创建                       |
| 知识库索引           | `knowledge/index.yaml` 存在且有效                                 | 缺失/损坏时运行 `buildIndex` 重建            |
| .claude/skills/      | 存在且与 `skills/` 内容一致                                       | 过期/缺失时从 `skills/` 重新同步             |
| git submodule        | `git submodule status` 检查                                       | 未初始化时运行 `git submodule update --init` |
| agent frontmatter    | 每个 agent .md 文件的 YAML frontmatter 可解析                     | ⚠ 仅警告，需手动修复                         |
| skill SKILL.md       | 每个 skill 目录下 SKILL.md 的 frontmatter 可解析                  | ⚠ 仅警告，需手动修复                         |
| workflow frontmatter | 每个 workflow .md 文件的 YAML frontmatter 可解析                  | ⚠ 仅警告，需手动修复                         |

## 3. 文件变更清单

| 操作 | 文件                                 | 说明                                       |
| ---- | ------------------------------------ | ------------------------------------------ |
| 新增 | `cli/src/commands/onboard.ts`        | onboard 命令实现（交互式向导）             |
| 修改 | `cli/src/commands/init.ts`           | 提取 `createProject()` 函数供 onboard 复用 |
| 修改 | `cli/src/index.ts`                   | 注册 onboard 命令                          |
| 新增 | `cli/tests/commands/onboard.test.ts` | onboard 命令测试                           |
| 修改 | `cli/tests/commands/init.test.ts`    | 适配 createProject 重构                    |

## 4. 技术要点

**交互式输入：** 使用 `readline/promises` API（Node.js >= 17），处理 Ctrl+C 中断。

**进度显示：** 使用 chalk 控制台颜色和 Unicode 字符（`✓` `○` `━`）。

**命令依赖：** onboard 内部调用 `git submodule add` 和 `git submodule status`，复用 `repo.ts` 的 URL 验证，复用 `knowledge-indexer.ts` 的索引重建，复用 `init.ts` 的模板复制逻辑。

## 5. 测试策略

- 模拟用户输入流测试交互式流程（通过 stdin 管道传入预设输入）
- 测试默认值行为（所有问题直接按 Enter）
- 测试错误路径：无效 URL、网络错误、磁盘空间不足
- 验证最终产物：目录结构、config.yaml 内容、模板文件、知识库索引
