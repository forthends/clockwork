# Clockwork v0.2.0 — 全面审计报告

**审计日期**: 2026-06-13
**版本**: v0.2.0
**审计范围**: 147 个文件，10 条 CLI 命令，7 个 API 端点，5 个 Web 页面，23 个测试文件

---

## 项目概览

Clockwork 是一个 AI 协作治理框架，通过在 IDE AI Agent 之上叠加 Agent 角色定义、技能（Skills）、知识库（Knowledge）和工作流（Workflows）来将非结构化的 AI 编程转化为结构化、可审计的协作开发流程。

---

## 一、架构设计评估

### 1.1 整体分层（良好）

```
cli/         命令入口 + Express API 服务器
workbench/   React SPA 仪表盘
agents/      Agent 角色定义（Markdown + YAML frontmatter）
workflows/   多 Agent 工作流定义
skills/      Agent 技能定义（SKILL.md 格式）
knowledge/   语义知识库（Markdown + YAML index）
workspace/   运行时文件状态（YAML）
```

分层清晰，关注点分离合理。CLI 与 Workbench 通过 REST API 通信，符合常见模式。

### 1.2 核心架构缺陷

| #   | 问题                       | 严重度   | 说明                                                                                                                                                                                                                         |
| --- | -------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **无程序化工作流引擎**     | **致命** | `skills/workflow-runner/SKILL.md` 是一份人工操作手册，不是可执行代码。工作流执行完全依赖人类在 Claude Code 中手动遵循指令。框架声称"编排 Agent"但实际上只是生成 prompt，没有调度、状态机推进、Agent 间数据传递的程序化执行。 |
| 2   | **CLI 与服务器耦合**       | **高**   | Express 服务器代码（`server.ts`）嵌入在 CLI 包中，通过 `clockwork web` 启动。服务器无优雅关闭、无健康检查、无守护进程模式。                                                                                                  |
| 3   | **文件状态存储无原子性**   | **高**   | `workspace.ts` 所有操作都是读-修改-写 YAML 文件，无事务保证。并发写入会导致数据丢失。文件锁机制（`lock.ts`）是 TOCTOU 竞态条件，不是真正的原子锁。                                                                           |
| 4   | **深度绑定 Claude Code**   | **中**   | 尽管 `config.yaml` 有 `ide.primary` 字段，但代码中硬编码了 `.claude/skills/` 路径、CC 专属的 SKILL.md 格式、以及 CC 的 Agent tool 调用语法。`context-builder.ts` 生成的结构也是 CC Agent 特定的。                            |
| 5   | **知识库检索是关键词匹配** | **中**   | `extractKeywords()` 做简单的停用词过滤 + Set 去重，没有 TF-IDF、嵌入向量搜索或相关性排序。`maxEntriesPerQuery` 截断前不排序，结果是随机的。                                                                                  |
| 6   | **模板冻结机制**           | **低**   | 模板在 `init` 时复制到项目中，之后不再更新。如果 Clockwork 升级了 workflow/agent/skill 模板，已有项目不会受益。                                                                                                              |

### 1.3 技术栈选择评价

| 选择                        | 评价                                  |
| --------------------------- | ------------------------------------- |
| TypeScript strict + ESM     | 正确，类型安全基础扎实                |
| commander.js (CLI)          | 成熟稳健，选择正确                    |
| Express (API)               | 轻量适合 MVP，但缺乏内置验证/文档生成 |
| React 18 + Vite (Workbench) | 现代高效，正确选择                    |
| marked + highlight.js       | GFM 支持完善                          |
| YAML (配置/状态)            | 可读性好，但不适合并发写入            |
| vitest                      | 快速现代，选择正确                    |
| pnpm workspaces             | monorepo 管理高效                     |

---

## 二、功能完整性评估

### 2.1 已实现功能

| 功能                          | 状态 | 完成度 |
| ----------------------------- | ---- | ------ |
| CLI 命令体系（10 条）         | 完成 | 90%    |
| 4 个 Agent 角色定义           | 完成 | 100%   |
| 3 个 Workflow 定义            | 完成 | 100%   |
| 7 个 Skill 定义               | 完成 | 100%   |
| Express API 服务器（7 端点）  | 完成 | 85%    |
| Web 工作台 5 页面             | 完成 | 80%    |
| 知识库索引与查询              | 完成 | 75%    |
| 任务创建/状态管理             | 完成 | 85%    |
| 审查批准/驳回                 | 完成 | 80%    |
| 错误恢复（锁/重试/超时/中断） | 完成 | 70%    |
| 自动构建与分发                | 完成 | 85%    |

### 2.2 关键缺失

| #   | 缺失功能               | 影响                                                                                    |
| --- | ---------------------- | --------------------------------------------------------------------------------------- |
| 1   | **程序化工作流执行器** | 核心价值主张未实现。用户必须手动在 CC 中按照 workflow-runner 技能的文字指令一步步操作。 |
| 2   | **知识条目 CRUD**      | 只能读取和索引知识条目，无法通过 CLI 或 Web UI 创建/修改/删除。                         |
| 3   | **实时更新**           | Web 工作台无轮询或 WebSocket，需手动刷新页面。                                          |
| 4   | **任务进度可视化**     | 无甘特图、时间线、阶段耗时统计等可视化。                                                |
| 5   | **搜索功能**           | Web 工作台无全局搜索。知识浏览器仅有分类筛选。                                          |
| 6   | **Web 端状态修改**     | Web 工作台是只读的（除审查操作外），无法在 Web 端创建任务或修改状态。                   |
| 7   | **统计与报告**         | 无任务吞吐量、阶段耗时、Agent 成功率等度量指标。                                        |
| 8   | **工作流自定义界面**   | 无法在 Web UI 中创建或编辑工作流。                                                      |

---

## 三、代码质量审计

### 3.1 关键问题

**`cli/src/index.ts:16` — 版本号硬编码错误**

```typescript
program.name('clockwork').version('0.1.0'); // 应为 '0.2.0'
```

**`cli/src/config.ts` vs `cli/src/commands/init.ts` — 重复且不一致的默认配置**

`config.ts` 包含 `cli: { lockTTLMinutes: 30 }`，但 `init.ts` 的 `DEFAULT_CONFIG` 缺少 `cli` 键，导致新建项目无 `lockTTLMinutes` 配置。

**`cli/src/context-builder.ts:18` — 知识检索基于 Agent 描述文本而非任务需求**

```typescript
const keywords = extractKeywords(agent.description + ' ' + agent.capabilities.join(' '));
```

这用 Agent 自身的描述来搜索知识库，而不是用任务的实际需求，导致检索结果与任务无关。

**`cli/src/workspace.ts:9-14` — 任务计数器脆弱**

```typescript
const match = t.taskId.match(/task-(\d+)/);
if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
```

如果手动创建了格式异常的任务目录，会静默产生错误计数。

**`cli/src/server.ts:66` — 路径遍历风险**

```typescript
app.get('/api/knowledge/:entryPath(*)', (req, res) => {
  const filePath = join(knowledgeDir, req.params.entryPath);
```

`join()` 在一定程度上阻止了 `../` 攻击，但没有额外的路径验证确保结果文件仍在 `knowledgeDir` 内。

### 3.2 代码风格一致性

| 方面              | 状态                                     |
| ----------------- | ---------------------------------------- |
| 命名规范          | 一致使用 camelCase/PascalCase/kebab-case |
| 模块导出          | 全部命名导出，无 default export          |
| TypeScript strict | 全部启用                                 |
| 代码格式          | Prettier + ESLint + pre-commit hooks     |
| 行内样式 vs CSS   | Workbench 混用行内样式和 global.css      |

### 3.3 错误处理模式

- **CLI 命令**: 普遍使用 `process.exit(1)` 直接退出 — 适合 CLI 但不利于测试和复用
- **静默吞错**: `lock.ts:43-44` `catch {}`、`knowledge-indexer.ts:27` `catch {}`、`workspace.ts:93` `catch { return null }`
- **无结构化错误**: 没有自定义错误类型，所有错误都是字符串匹配
- **API 错误响应**: 格式不一致 — 有的返回 `{ error: string }`，有的返回 `{ error: String(e) }`

---

## 四、用户体验评估

### 4.1 CLI 体验（良好）

| 方面     | 评价                                |
| -------- | ----------------------------------- |
| 命令设计 | 清晰，符合直觉                      |
| 输出格式 | chalk 颜色编码一致，有分层（✓/⚠/✗） |
| 错误信息 | 基本友好，提供示例                  |
| 输入验证 | 正则验证 + 清晰的错误提示           |
| 管道支持 | `start` 支持 stdin，设计良好        |
| 恢复流程 | `resume` 命令 + 超时处理 = 完整     |

### 4.2 Web 工作台体验（基础）

| 方面          | 评价                                              |
| ------------- | ------------------------------------------------- |
| 视觉设计      | 暗色主题统一，排版清晰                            |
| 导航          | 侧边栏 Tasks / Knowledge 两级                     |
| 任务看板      | 三列 Kanban 布局，简洁有效                        |
| Markdown 渲染 | 完整的 GFM + 代码语法高亮                         |
| 交互反馈      | 审批有状态提示，但缺少加载骨架屏                  |
| 响应式设计    | 无（硬编码 `grid-template-columns: 1fr 1fr 1fr`） |
| 空状态        | 有空状态提示                                      |
| 键盘导航      | 无键盘快捷键                                      |

### 4.3 Workbench 前端具体问题

1. **`App.tsx:13`** — 根路径重定向硬编码 `<Navigate to="/tasks" replace />`，如果 Workbench 部署在子路径下会失效
2. **`api.ts`** — 所有 `fetch` 无超时/重试、无 AbortController
3. **`KnowledgeDetail`** — 使用 `useParams` 解构 `entryPath`，但 `App.tsx` 路由定义为 splat (`*`)，参数名不匹配

---

## 五、测试评估

### 5.1 测试统计

| 类别               | 文件数 | 覆盖情况                                                                 |
| ------------------ | ------ | ------------------------------------------------------------------------ |
| CLI 单元测试       | 7      | workspace, lock, config, context-builder, knowledge-indexer, frontmatter |
| CLI 命令测试       | 5      | start, status, init, repo, cleanup                                       |
| CLI 集成测试       | 2      | workflow 全链路, API 端点                                                |
| CLI E2E 测试       | 3      | feature-dev, bug-fix, incident-response                                  |
| Workbench 组件测试 | 4      | TaskBoard, TaskDetail, ReviewActions, MarkdownViewer                     |
| Demo 项目测试      | 2      | todos CRUD, validators                                                   |
| **总计**           | **23** |                                                                          |

### 5.2 测试缺口

| 缺口                                               | 严重度 |
| -------------------------------------------------- | ------ |
| resume 命令无单元测试                              | 中     |
| skill 命令无测试                                   | 中     |
| web 命令无测试                                     | 中     |
| knowledge 命令无测试                               | 中     |
| Workbench API 层无测试                             | 中     |
| Workbench 测试全部 mock API — 无集成测试           | 中     |
| E2E 测试使用 `tsx` 而非编译后的 CLI — 不测真实产物 | 中     |
| 无性能/负载测试                                    | 低     |
| 无无障碍测试                                       | 低     |
| config.ts 无测试                                   | 低     |
| 知识库详情页无测试                                 | 低     |

---

## 六、安全性评估

| #   | 问题                                                                                                                  | 严重度 |
| --- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **路径遍历**: `/api/knowledge/:entryPath(*)` 虽然 `path.join()` 提供了基本保护，但缺少显式的路径包含检查              | **高** |
| 2   | **Shell 注入风险**: `repo add` 中使用 `execSync` 拼接用户提供的 URL，虽经过正则验证但应使用 `execFileSync` 或参数数组 | **中** |
| 3   | **无 CORS 配置**: Express 未配置 CORS 中间件，跨域行为不可控                                                          | **中** |
| 4   | **无请求体大小限制**: Express 使用默认 body-parser（100kb limit 存在但没有显式配置）                                  | **低** |
| 5   | **无速率限制**: API 端点无任何速率限制                                                                                | **低** |
| 6   | **HTTP only**: 无 HTTPS/TLS 支持                                                                                      | **低** |

---

## 七、优化路线图总览

### P0 — 核心能力补全（使产品可用）

1. **实现程序化工作流引擎** — 将 SKILL.md 文本指令转化为 TypeScript 状态机，实现在 CC 中通过 Agent tool 实际调度子 Agent
2. **修复路径遍历漏洞** (`server.ts:66`) — 添加显式的路径包含验证
3. **修复知识检索逻辑** (`context-builder.ts:18`) — 基于任务需求而非 Agent 描述来检索知识

### P1 — 功能完善（提升可靠性）

4. 知识条目 CRUD（CLI + API + Web）
5. 任务状态存储升级（YAML → SQLite）
6. Web 实时更新（轮询 → SSE/WebSocket）
7. 解除 Claude Code 深度绑定（ide-adapter 接口）

### P2 — 用户体验提升（打磨产品）

8. Web 工作台增强（全局搜索、任务创建表单、响应式设计、骨架屏）
9. 任务统计仪表盘
10. 测试补全（resume/skill/web/knowledge 命令测试、Workbench 集成测试）

### P3 — 架构升级（长期投资）

11. 插件系统
12. 多 IDE 适配器正式支持
13. 结构化日志
14. API 版本化
15. 模板版本管理

---

## 八、总结评分

| 维度       | 评分     | 说明                                                                   |
| ---------- | -------- | ---------------------------------------------------------------------- |
| 架构设计   | ⭐⭐⭐⭐ | 分层清晰，但核心引擎缺失、深度绑定单 IDE                               |
| 功能完整性 | ⭐⭐⭐   | 骨架完整，但核心编排功能未实现                                         |
| 代码质量   | ⭐⭐⭐   | TypeScript strict + lint 到位，但静默吞错、重复代码、TOCTOU 等问题存在 |
| 用户体验   | ⭐⭐⭐   | CLI 体验不错，Web 基础可用但交互有限                                   |
| 测试覆盖   | ⭐⭐⭐   | 文件覆盖广，但测试深度不够、mock 过度、缺关键命令测试                  |
| 安全性     | ⭐⭐     | 路径遍历、shell 注入、无安全中间件                                     |
| 文档       | ⭐⭐⭐⭐ | README + quickstart + AGENTS.md 完善，中文文档完整                     |

**综合评分: 3.0/5.0** — 一个有清晰愿景和合理骨架的 MVP，但核心价值主张（AI Agent 编排）尚未以程序化方式实现。P0 和 P1 的改进是达到生产可用状态的关键路径。
