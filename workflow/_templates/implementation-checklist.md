# 代码实现清单

> **需求编号**：FEAT-xxx
> **需求名称**：`<需求名称>`
> **技术设计**：`<tech-design.md 的相对路径>`
> **开发者**：`<Developer 姓名>`
> **开始日期**：`<YYYY-MM-DD>`
> **完成日期**：`<YYYY-MM-DD>`

---

## 1. 分支与提交规范

### 分支命名

```
<type>/<feature-id>-<short-description>

示例:
feature/FEAT-001-backlog-delete
bugfix/FEAT-002-fix-login-error
hotfix/critical-security-patch
```

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>

示例:
feat(backlog): 添加 Backlog 列表删除功能

- 添加 DeleteBacklogController
- 添加 BacklogService.delete() 方法
- 添加 soft delete 逻辑

Closes FEAT-001
```

**Type 类型**：
| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（不影响功能） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具变更 |

### Pull Request 命名

```
[<feature-id>] <描述>

示例:
[FEAT-001] Backlog 列表删除功能
```

---

## 2. 实现任务清单

### 任务 1：`<任务名称>`

- [ ] **描述**：`<具体要实现的内容>`
- [ ] **对应 tech-design 章节**：`<tech-design.md 中的章节>`
- [ ] **涉及文件**：
  - `src/<file1>.php`
  - `src/<file2>.go`
- [ ] **完成标准**：
  - [ ] 单元测试通过
  - [ ] 代码符合项目规范
  - [ ] 无 TODO/FIXME 注释

### 任务 2：`<任务名称>`

- [ ] **描述**：`<具体要实现的内容>`
- [ ] **对应 tech-design 章节**：`<tech-design.md 中的章节>`
- [ ] **涉及文件**：
  - `<文件路径>`
- [ ] **完成标准**：
  - [ ] 单元测试通过
  - [ ] 代码符合项目规范

---

## 3. 代码规范检查

### 自检清单

完成每个任务后，逐项检查：

- [ ] **命名规范**：变量、函数、类命名符合项目惯例
- [ ] **单一职责**：每个函数不超过 50 行
- [ ] **无硬编码**：配置信息通过环境变量或配置文件管理
- [ ] **错误处理**：关键操作有 try-catch 或错误返回
- [ ] **日志记录**：重要操作有适当日志
- [ ] **安全检查**：
  - [ ] 无 SQL 拼接
  - [ ] 无敏感信息硬编码
  - [ ] 输入已校验
- [ ] **性能考虑**：
  - [ ] 无 N+1 查询问题
  - [ ] 大数据量操作有分页/流式处理

---

## 4. 提交记录

| 日期 | 提交信息 | 关联任务 | 备注 |
|------|---------|---------|------|
| `<YYYY-MM-DD>` | `<commit message>` | `<任务编号>` | `<备注>` |

---

## 5. 实现摘要

完成所有任务后，填写以下摘要：

### 变更文件清单

```
Modified:
- src/controllers/BacklogController.php
- src/services/BacklogService.php
- database/migrations/2026_04_18_add_deleted_at_to_backlogs.php

Added:
- src/models/Backlog.php (修改)

Deleted:
- (无)
```

### 关键变更说明

`<描述主要的代码变更，供 Reviewer 参考>`

### 测试验证

- [ ] 本地测试通过
- [ ] 关联的单元测试全部通过
- [ ] 手动验证步骤：
  1. `<验证步骤1>`
  2. `<验证步骤2>`

### 遗留问题

| 问题 | 影响 | 处理方案 |
|------|------|---------|
| `<问题描述>` | `<影响描述>` | `<处理方案>` 或 `[待解决]` |

---

## 6. Review 前置检查

进入 review 阶段前，确保：

- [ ] 所有实现任务已完成
- [ ] 实现摘要已填写
- [ ] 本地测试全部通过
- [ ] 代码已提交到远程分支
- [ ] PR/MR 已创建
- [ ] PR 描述包含：
  - [ ] 变更内容
  - [ ] 测试验证结果
  - [ ] 关联的 tech-design 章节
