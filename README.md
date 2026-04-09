![Clockwork Banner](logo.png)

# ⚙️ Clockwork (机关术) 

> **The Governance Layer for AI Agents.**
> **为 AI Agent 打造的治理层。**

Inspired by the precision of ancient mechanical arts, **Clockwork** brings order to the chaos of LLM outputs. It transforms unpredictable AI behaviors into a synchronized, high-quality production line.

受古代精密机关术的启发，**Clockwork** 旨在为混乱的 LLM 输出注入秩序。它将不可预测的 AI 行为转变为同步、高效且高质量的生产流水线。

---

### 🗝️ Core Pillars | 核心支柱

*   **Logic Gears (逻辑齿轮)**  
    *EN:* Define strict execution paths that Agents cannot deviate from.  
    *CN:* 定义严丝合缝的执行路径，确保 Agent 绝不偏离预设轨道。

*   **Quality Governors (质量调速器)**  
    *EN:* Built-in validation gates to ensure every output meets your "Gold Standard."  
    *CN:* 内置校验闸门，确保每一项产出都符合你的"黄金标准"。

*   **Persistent Pulse (持久脉冲)**  
    *EN:* Designed for continuous, long-running agentic tasks without quality decay.  
    *CN:* 专为长周期、持续运行的 Agent 任务设计，有效防止产出质量衰减。

---

## 🚀 Getting Started | 快速开始

### 环境要求

- [Cursor IDE](https://cursor.com) — 本框架专为 Cursor 设计

### 使用方式

1. **克隆本仓库** 作为项目治理工作空间：
   ```bash
   git clone <your-clockwork-repo-url> my-project
   cd my-project
   ```

2. **用 Cursor 打开** 工作空间，治理规则会自动加载（通过 `.cursor/rules/clockwork.mdc`）

3. **告诉 Agent 你的角色**（PM / Developer / Tester / Reviewer），Agent 会自动读取对应的角色定义

4. **创建或进入需求实例**，在 `workflow/features/FEAT-xxx/` 下按工作流推进

### 目录结构

```
clockwork/
├── agents/          # 角色 Agent 定义
├── skills/          # 可复用技能
├── workflow/        # 工作流定义与需求产物
├── docs/            # 项目文档与质量标准
├── repos/           # 代码仓库（git submodule）
├── AGENTS.md        # 全局 Agent 治理规则
└── README.md        # 本文件
```

详细的架构说明请参阅 [`docs/architecture.md`](docs/architecture.md)，快速上手指南请参阅 [`docs/guides/quick-start.md`](docs/guides/quick-start.md)。

---

## 📜 License

[MIT](LICENSE) © 2026 forthends
