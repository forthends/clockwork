# 创建技术设计文档

---

## 技能信息

- **技能名称**：创建技术设计文档
- **技能标识**：`create-tech-design`
- **一句话说明**：基于 PRD 和模板，创建结构化的技术设计文档，涵盖架构、API 和数据模型
- **适用角色**：Developer

---

## 触发条件

当以下条件满足时，应调用本技能：

- 工作流进入 `tech_design` 阶段
- 需要将产品需求转化为技术实现方案

---

## 前置条件

调用本技能前，必须确保：

1. `requirements` 阶段已完成（manifest.yaml 中 status 为 `completed`）
2. PRD 文档 `workflow/features/FEAT-<id>-<name>/prd.md` 已存在且通过校验
3. 已读取工作流定义了解 `tech_design` 阶段的输出要求

---

## 执行步骤

1. **读取上游产物**：读取 `prd.md`，逐条理解用户故事和验收标准
2. **读取模板**：读取 `workflow/_templates/tech-design.md` 获取文档结构
3. **设计架构**（architecture 章节）：
   - 确定整体技术方案和架构选型
   - 绘制架构图，展示模块关系和数据流
   - 划分模块职责，说明技术选型理由
   - 记录关键设计决策及备选方案对比
4. **设计 API**（api_design 章节）：
   - 为每个功能点定义 API 接口
   - 包含：方法、路径、参数、请求体、响应体、错误码
   - 确保接口设计覆盖 PRD 中所有用户故事
5. **设计数据模型**（data_model 章节）：
   - 定义数据实体及字段
   - 标注字段类型、约束和索引
   - 绘制实体关系图
6. **规划实现**：
   - 拆分实现任务并预估工时
   - 识别技术风险和缓解措施
7. **保存文件**：将完成的技术设计保存到 `workflow/features/FEAT-<id>-<name>/tech-design.md`

---

## 输入

| 输入 | 来源 | 说明 |
|------|------|------|
| PRD 文档 | `workflow/features/FEAT-<id>-<name>/prd.md` | 产品需求和验收标准 |
| 技术设计模板 | `workflow/_templates/tech-design.md` | 文档结构模板 |
| 工作流定义 | `workflow/_definitions/feature.yaml` | 了解 validation 校验规则 |

---

## 输出

| 输出 | 路径 | 说明 |
|------|------|------|
| 技术设计文档 | `workflow/features/FEAT-<id>-<name>/tech-design.md` | 完整的技术设计方案 |

---

## 质量检查

完成技术设计后，对照以下清单自检：

- [ ] architecture 章节是否包含方案说明和架构图
- [ ] 每个设计决策是否说明了选择理由
- [ ] api_design 是否覆盖了 PRD 中的所有功能点
- [ ] 每个 API 接口是否包含完整的请求/响应定义
- [ ] data_model 是否包含所有实体和字段说明
- [ ] 实体间关系是否清晰
- [ ] 技术风险是否已识别
- [ ] 对 PRD 中有疑问的部分是否标注了 `[待确认]`

完成自检后，调用 `validate-artifact` 技能进行正式校验。
