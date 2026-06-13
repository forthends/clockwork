# Clockwork MVP 补全设计

> 版本 1.0 | 2026-06-13 | 设计阶段

## 1. 背景与目标

Clockwork v0.2.0 已完成框架骨架：4 个 Agent 定义、6 个 Skill、3 个 Workflow、9 个 CLI 命令、Express 服务器 + 7 API、Web 工作台 4 页面、核心模块单元测试。

**当前核心问题**：Workflow Runner 未在 Claude Code 中真实执行过，端到端链路从未验证，无构建分发流程，错误恢复未实现，Workbench 交互不完整。

**目标**：补齐上述缺口，使框架达到可用的 MVP 版本。

## 2. 实施策略：两轮迭代

### 第一轮：骨架可用

完成后可全局安装 CLI + 跑通一条完整工作流。

1. Demo 项目 + 知识库
2. 构建与分发
3. 端到端验证
4. 基础错误恢复

### 第二轮：加固完善

基于第一轮反馈加固，完成后测试齐全、错误可恢复、Workbench 可读性达标。

5. 集成测试全覆盖
6. 完整错误恢复
7. Markdown 渲染增强
8. 知识库详情页

---

## 3. 第一轮设计

### 3.1 Demo 项目：repos/demo-todo

在 `repos/demo-todo/` 下创建最小化 Express + TypeScript 后端项目：

```
repos/demo-todo/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Express 入口，4 个路由
│   ├── models.ts         # Todo 类型 + 内存存储
│   └── validators.ts     # 请求校验
└── tests/
    └── todos.test.ts     # 基础 CRUD 测试
```

API 端点：
- `GET /api/v1/todos` — 获取列表
- `POST /api/v1/todos` — 创建条目
- `PATCH /api/v1/todos/:id` — 更新状态
- `DELETE /api/v1/todos/:id` — 删除条目

#### 知识库重写

用 demo-todo 的真实约定替换 3 条虚构知识：

| 文件 | 核心内容 |
|------|---------|
| `knowledge/architecture/api-conventions.md` | RESTful 设计、JSON 响应格式、状态码规范、分页约定 |
| `knowledge/business/domain-model.md` | Todo 实体字段、状态枚举(todo/in_progress/done)、业务约束 |
| `knowledge/design-system/components.md` | 工程规范：命名约定、文件结构、错误处理模式 |

### 3.2 构建与分发

#### 顶层 package.json（npm workspaces）

```json
{
  "name": "clockwork",
  "private": true,
  "workspaces": ["cli", "workbench"],
  "scripts": {
    "install:all": "npm install --workspaces",
    "build": "npm run build --workspaces",
    "build:cli": "npm run build -w cli",
    "build:workbench": "npm run build -w workbench",
    "test": "npm run test --workspaces",
    "dev:cli": "npm run dev -w cli",
    "dev:workbench": "npm run dev -w workbench"
  }
}
```

#### CLI 全局安装

- `cli/package.json` 添加 `"bin": { "clockwork": "./dist/index.js" }`
- `cli/tsconfig.json` 调整 outDir 编译输出
- `npm link` 后在任意目录可用 `clockwork` 命令

#### Workbench 自动构建

`clockwork web` 启动时检测 `workbench/dist/` 是否存在，不存在则自动执行 `npm run build -w workbench`。

#### 改动的文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `package.json` (根) | 新建 | workspaces + 统一脚本 |
| `cli/package.json` | 修改 | 加 bin + build 脚本 |
| `cli/tsconfig.json` | 修改 | 调整 outDir |
| `cli/src/commands/web.ts` | 修改 | 添加 workbench 自动构建检测 |

### 3.3 端到端验证

以给 demo-todo 添加"优先级排序"功能为例，执行 feature-dev 全链路：

1. `clockwork init demo-todo-project` — 初始化 Clockwork 项目
2. `clockwork start feature-dev --slug priority-sort --repo demo-todo` — CLI 创建任务，生成 Planner 上下文包
3. 在 CC 中执行 `/clockwork:workflow-runner` — Planner 生成 SPEC + PLAN → 人类审核
4. `clockwork review --approve` → 继续执行 → Implementer TDD 编码 → Reviewer 审查
5. 验证产物：SPEC.md、PLAN.md、REVIEW.md 内容合理，代码变更通过测试

**验证检查清单：**

| 检查项 | 验证方式 |
|--------|---------|
| CLI 可全局调用 | `which clockwork` 返回路径 |
| init 创建完整骨架 | 目录结构 + config.yaml 内容校验 |
| start 生成正确上下文包 | workspace/ 中 agent-context JSON 完整性 |
| status 反映真实状态 | 阶段进度 + 审查状态与实际一致 |
| review --approve 解锁下一阶段 | humanReviewPending 状态切换 |
| review --reject 回退 | 阶段标记 failed，resume 可用 |
| web 服务正常启动 | Workbench 自动构建 + API 响应正常 |
| Workflow Runner 子Agent调度 | CC 中实际调度，产物正确写入 workspace |

### 3.4 基础错误恢复

#### 错误分类与处理

| 错误类型 | 触发条件 | 处理策略 | 实现位置 |
|---------|---------|---------|---------|
| Agent 超时 | 单阶段执行超过配置的超时 | 自动终止 → 标记 failed → 写入超时日志 → 提示 resume | `workspace.ts`、`workflow-runner/SKILL.md` |
| 重试耗尽 | 阶段失败次数 >= maxRetries | 标记 failed → 任务暂停 → 退避策略 2^n 分钟（2→4→8） | `workspace.ts` |
| 并发冲突 | 两个进程同时操作同一任务文件 | 文件锁：写入前创建 .lock → 写入后删除 → 获取不到锁等待+重试（最多3次，间隔500ms） | `cli/src/lock.ts` (新建) |
| SIGINT 中断 | 用户 Ctrl+C 或被 kill | 捕获信号 → 阶段状态+产物写入 recovery/ → 标记 interrupted → resume 从恢复点继续 | `cli/src/index.ts`、`workspace.ts` |

#### 状态机扩展

```typescript
// 任务状态新增
status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'interrupted'

// 阶段状态新增
stages: { plan: 'pending' | 'in_progress' | 'completed' | 'failed' | 'interrupted' }

// 新增阶段元数据
stageMeta: { plan: { retryCount: 0, maxRetries: 0, startedAt: '', timeoutMs: 600000 } }
```

#### 改动的文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `cli/src/lock.ts` | 新建 | 文件锁工具：acquireLock/releaseLock/withLock |
| `cli/src/workspace.ts` | 修改 | 增加重试计数、超时检测、recovery 存档、中断状态 |
| `cli/src/commands/resume.ts` | 修改 | 支持从 interrupted 状态恢复，读取 recovery 存档 |
| `skills/workflow-runner/SKILL.md` | 修改 | 增加超时检测、重试退避、中断处理流程 |

---

## 4. 第二轮设计

### 4.1 集成测试全覆盖

#### CLI 测试

| 文件 | 状态 | 覆盖 |
|------|------|------|
| `cli/tests/commands/repo.test.ts` | 缺失 | repo add/status 命令 |
| `cli/tests/integration/workflow.test.ts` | 缺失 | init → start → status → review 全链路 |
| `cli/tests/integration/api.test.ts` | 缺失 | 7 个 REST 端点请求/响应验证 |

#### Workbench 测试（vitest + @testing-library/react + jsdom）

| 文件 | 覆盖 |
|------|------|
| `workbench/tests/TaskBoard.test.tsx` | 任务看板渲染、列数据、空状态 |
| `workbench/tests/TaskDetail.test.tsx` | 任务详情渲染、产物列表 |
| `workbench/tests/ReviewActions.test.tsx` | 审批按钮交互、驳回原因输入 |
| `workbench/tests/MarkdownViewer.test.tsx` | GFM 各语法渲染验证 |

#### 工作流 E2E 测试

| 文件 | 覆盖 |
|------|------|
| `cli/tests/e2e/feature-dev.test.ts` | feature-dev 完整状态转换 |
| `cli/tests/e2e/bug-fix.test.ts` | bug-fix 完整状态转换 |
| `cli/tests/e2e/incident-response.test.ts` | incident-response 完整状态转换 |

### 4.2 完整错误恢复

在第一轮基础上补齐：

- **Agent 超时自动终止**：workspace.ts 中增加定时器，超时后自动标记 failed
- **重试退避**：2^n 分钟递增，状态记录在 stageMeta 中
- **并发写入检测**：lock.ts 提供文件锁机制，所有 workspace 写入操作包裹 withLock()
- **SIGINT 信号捕获**：CLI 入口注册 process.on('SIGINT', handler)，中断前写 recovery 存档

### 4.3 Markdown 渲染增强

引入 **marked** + **highlight.js** 替换当前简易实现：

```typescript
import { marked } from 'marked';
import hljs from 'highlight.js';

marked.setOptions({
  gfm: true,
  breaks: false,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});
```

覆盖语法：代码块（语法高亮）、表格、链接、图片、引用块、粗体/斜体/删除线、嵌套列表、任务列表、水平线。

### 4.4 知识库详情页

`/knowledge/:entryId` 新增 KnowledgeDetail 页面：

- 完整 Markdown 内容渲染
- 元数据展示（分类、标签、状态、更新时间）
- 状态切换按钮（draft ↔ active ↔ archived）
- 返回知识列表链接

改动：
- `KnowledgeBrowser.tsx` — 列表项改为链接
- `KnowledgeDetail.tsx` — 新建详情页
- `App.tsx` — 添加路由
- `api.ts` — 新增 `fetchEntry(id)` 调用
- `cli/src/server.ts` — 新增 `GET /api/knowledge/:id` 端点

---

## 5. 技术栈

| 层 | 技术 |
|---|------|
| CLI | Node.js/TypeScript, commander.js, Express |
| Workbench | React 18, Vite, TypeScript, react-router-dom |
| Markdown | marked + highlight.js |
| 测试 | vitest, @testing-library/react, jsdom, supertest |
| 文件锁 | 自建 cli/src/lock.ts（不引入外部依赖） |

## 6. 不改动的范围

- 不新增 Agent 角色或 Workflow 类型
- 不修改现有 Workflow 的阶段定义
- 不引入数据库 — 继续使用文件协议
- 不扩展 IDE 适配器（仅 Claude Code）
- 不引入用户认证系统
