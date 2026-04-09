# 校验产物质量

---

## 技能信息

- **技能名称**：校验产物质量
- **技能标识**：`validate-artifact`
- **一句话说明**：读取工作流定义中的 validation 规则，自动校验产物是否符合质量闸门标准
- **适用角色**：PM / Developer / Tester / Reviewer（所有角色通用）

---

## 触发条件

当以下条件满足时，应调用本技能：

- 某个阶段的产物编写完成，需要进行质量校验
- 产物修改后需要重新校验
- 流程推进前的最后检查

---

## 前置条件

调用本技能前，必须确保：

1. 产物文件已创建并保存到 `workflow/features/FEAT-<id>-<name>/` 目录
2. 工作流定义文件存在于 `workflow/_definitions/` 目录

---

## 执行步骤

1. **读取工作流定义**：
   - 读取 `workflow/features/FEAT-<id>-<name>/manifest.yaml` 获取 workflow 名称
   - 读取 `workflow/_definitions/<workflow>.yaml` 获取当前阶段的 validation 规则

2. **提取校验规则**：
   - 定位当前阶段的 `outputs[].validation` 字段
   - 提取 `required_sections`（必需章节列表）
   - 提取 `custom_rules`（自定义规则列表）

3. **执行 required_sections 校验**：
   - 读取产物文件内容
   - 检查每个 required_section 是否存在于文档中
   - 检查已存在的章节内容是否为空（不能仅有标题无内容）
   - 记录缺失或空白的章节

4. **执行 custom_rules 校验**：
   - 逐条审查自定义规则
   - 判断产物是否满足每条规则
   - 记录未满足的规则及原因

5. **生成校验报告**：

   ```
   === 质量校验报告 ===
   产物: <文件名>
   阶段: <阶段名>
   校验时间: <时间>
   
   [必需章节校验]
   ✅ overview — 已包含
   ✅ user_stories — 已包含
   ❌ acceptance_criteria — 缺失或内容为空
   
   [自定义规则校验]
   ✅ <规则 1> — 满足
   ❌ <规则 2> — 不满足，原因: <具体原因>
   
   校验结果: 通过 / 未通过
   未通过项: <列出需要修正的项>
   ```

6. **更新 manifest 状态**：
   - **校验通过**：设置当前阶段 `validation_passed: true`，`status: completed`，记录 `completed_at` 和 `artifacts`
   - **校验未通过**：保持 `status: in_progress`，不设置 `validation_passed`，在 `notes` 中记录校验失败原因

---

## 输入

| 输入 | 来源 | 说明 |
|------|------|------|
| 待校验产物 | `workflow/features/FEAT-<id>-<name>/<artifact>.md` | 需要校验的产物文件 |
| 工作流定义 | `workflow/_definitions/<workflow>.yaml` | 包含 validation 规则 |
| 实例状态 | `workflow/features/FEAT-<id>-<name>/manifest.yaml` | 当前流程状态 |

---

## 输出

| 输出 | 形式 | 说明 |
|------|------|------|
| 校验报告 | 控制台输出 | 展示校验结果和未通过项 |
| manifest 更新 | 文件更新 | 更新阶段状态和校验结果 |

---

## 注意事项

- 校验必须严格按照工作流定义中的规则执行，不得放宽标准
- 校验未通过时，必须给出具体的修正指引，而不仅是指出问题
- 同一产物可多次校验，直到通过为止
- 校验通过是流程推进到下一阶段的必要条件
