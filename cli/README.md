# Clockwork CLI

AI Agent 治理框架的命令行工具。

## 安装

```bash
# 安装依赖
pip install pyyaml

# 添加可执行权限
chmod +x cli/clockwork.py

# 符号链接到 PATH（可选）
ln -s $(pwd)/cli/clockwork.py /usr/local/bin/clockwork
```

## 命令

### create — 创建新需求

```bash
clockwork create "功能名称" [options]
```

**选项**:
- `--repo <name>` — 代码仓库名称
- `--workflow <type>` — 工作流类型（默认: feature-development）

**示例**:
```bash
clockwork create "Backlog 删除功能" --repo agilehub
```

---

### advance — 推进阶段

```bash
clockwork advance <feature-id> <stage>
```

**示例**:
```bash
clockwork advance FEAT-001 tech_design
```

---

### validate — 校验产物

```bash
clockwork validate <feature-id>
```

执行 S1+S2+S3 三层质量校验。

**示例**:
```bash
clockwork validate FEAT-001
```

---

### status — 查看状态

```bash
clockwork status [feature-id]
```

省略 feature-id 查看所有需求状态。

**示例**:
```bash
clockwork status FEAT-001
clockwork status  # 显示所有
```

---

### list — 需求列表

```bash
clockwork list
```

---

### context — 解析工作流上下文

```bash
clockwork context <feature-id>
```

解析 `<repo-name>` 等变量，显示实际的文件路径。

**示例**:
```bash
clockwork context FEAT-001
```

---

### init — 初始化工作空间

```bash
clockwork init
```

## 工作流阶段

**feature-development** 工作流阶段顺序：

1. `requirements` — 需求定义
2. `tech_design` — 技术设计
3. `implementation` — 代码实现
4. `testing` — 测试计划
5. `review` — 代码评审
