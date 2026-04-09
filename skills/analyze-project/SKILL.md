# 分析项目代码仓库

---

## 技能信息

- **技能名称**：分析项目代码仓库
- **技能标识**：`analyze-project`
- **一句话说明**：深度扫描 `repos/` 下的代码仓库，提取技术栈、功能说明和模块划分，生成结构化的项目简介
- **适用角色**：Analyst

---

## 触发条件

当以下条件满足时，应调用本技能：

- 新的代码仓库被挂载到 `repos/` 下，需要生成项目简介
- 项目发生重大变更（如技术栈升级、模块重构），需要更新项目简介
- 其他角色 Agent 需要项目上下文，但对应的项目简介尚不存在

---

## 前置条件

调用本技能前，必须确保：

1. 目标代码仓库已存在于 `repos/<repo-name>/` 目录
2. `docs/projects/<repo-name>/` 目录已创建（如不存在则创建）

---

## 执行步骤

### 第一步：扫描依赖管理文件 → 提取技术栈

按语言类型查找并读取依赖管理文件：

| 语言/平台 | 文件 | 提取内容 |
|-----------|------|---------|
| Node.js | `package.json` | 运行时版本、dependencies、devDependencies、scripts |
| Java | `pom.xml` / `build.gradle` | JDK 版本、Spring Boot 版本、核心依赖 |
| Go | `go.mod` | Go 版本、module 名称、依赖列表 |
| Python | `pyproject.toml` / `requirements.txt` | Python 版本、核心依赖 |
| Rust | `Cargo.toml` | Rust edition、核心依赖 |
| .NET | `*.csproj` / `*.sln` | .NET 版本、NuGet 依赖 |

对提取到的依赖进行分类：
- **语言与运行时**：编程语言、运行时版本
- **核心框架**：Web 框架、ORM、状态管理等
- **基础设施**：数据库、缓存、消息队列、对象存储等
- **开发工具链**：构建工具、测试框架、Lint 工具等

### 第二步：扫描配置文件 → 提取运行时环境

读取以下文件（如存在）：
- `docker-compose.yml` / `Dockerfile` → 容器化方案和中间件依赖
- `.env.example` / `.env.template` → 需要的环境变量（不读取实际 `.env`）
- CI/CD 配置（`.github/workflows/`、`Jenkinsfile` 等）→ 构建和部署流程
- `nginx.conf` / 反向代理配置 → 部署架构

### 第三步：分析目录结构 → 提取模块划分

1. 列出项目顶层目录结构（2-3 层深度）
2. 识别核心源码目录（`src/`、`lib/`、`app/`、`cmd/` 等）
3. 对每个主要模块/目录：
   - 确定模块职责（基于目录名、文件内容）
   - 识别模块间依赖关系（基于 import/require 语句）
   - 标记核心模块和辅助模块

### 第四步：分析入口文件 → 提取功能概览

1. 找到应用入口（`main.*`、`app.*`、`index.*`）
2. 扫描路由定义（API endpoints、页面路由等）
3. 读取现有 `README.md`（如有）补充功能描述
4. 汇总为功能清单，按业务领域分组

### 第五步：生成项目简介

1. 读取模板 `workflow/_templates/project-overview.md`
2. 按模板结构填写各章节内容
3. 保存到 `docs/projects/<repo-name>/overview.md`

---

## 输入

| 输入 | 来源 | 说明 |
|------|------|------|
| 代码仓库 | `repos/<repo-name>/` | 待分析的完整代码仓库 |
| 项目简介模板 | `workflow/_templates/project-overview.md` | 文档结构模板 |

---

## 输出

| 输出 | 路径 | 说明 |
|------|------|------|
| 项目简介 | `docs/projects/<repo-name>/overview.md` | 结构化的项目简介文档 |

---

## 质量检查

完成项目简介后，对照以下清单自检：

- [ ] tech_stack 章节是否列出了所有主要技术组件及版本
- [ ] 技术栈信息是否来源于依赖管理文件（非猜测）
- [ ] project_features 章节是否涵盖了项目的核心功能
- [ ] 功能描述是否基于代码分析而非仅靠 README
- [ ] module_structure 章节是否包含目录结构图
- [ ] 每个模块的职责描述是否清晰
- [ ] 模块间依赖关系是否有标注
- [ ] 是否有敏感信息泄露（密码、API Key 等）
- [ ] 不确定的内容是否标注了 `[待确认]`

完成自检后，调用 `validate-artifact` 技能进行正式校验。

---

## 注意事项

- **绝不读取** `.env`、`credentials.json`、`secrets.*` 等包含敏感信息的文件
- 如果仓库过大，优先分析核心业务目录，辅助目录可简要概述
- 对于 monorepo，按子项目分别分析，在项目简介中分节描述
- 如果已存在项目简介，先读取旧版本，仅更新变化部分，在变更记录中注明
