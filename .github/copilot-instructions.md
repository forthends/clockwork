# Clockwork 治理规则

你在一个使用 Clockwork AI Agent 治理框架的项目中工作。

## 项目结构

- `workflow/features/FEAT-xxx/` — 需求实例目录
- `workflow/features/FEAT-xxx/manifest.yaml` — 工作流状态记录
- `workflow/_templates/` — 产物模板目录
- `skills/` — 可用技能目录

## 角色与职责

- **PM**: 产品经理，负责需求定义，产出 prd.md
- **Developer**: 开发者，负责技术设计(tech-design.md)和代码实现
- **Tester**: 测试工程师，负责测试计划(test-plan.md)
- **Reviewer**: 代码评审员，负责评审报告

## 工作流阶段顺序

feature-development 工作流：
1. `requirements` — 需求定义 (PM)
2. `tech_design` — 技术设计 (Developer)
3. `implementation` — 代码实现 (Developer)
4. `testing` — 测试计划 (Tester)
5. `review` — 代码评审 (Reviewer)

## 产物模板

- PRD: `workflow/_templates/prd.md`
- 技术设计: `workflow/_templates/tech-design.md`
- 测试计划: `workflow/_templates/test-plan.md`

## 工作规范

- 基于模板创建产物，保持章节结构完整
- 章节内容不得为空占位符 `<...>`
- 不跳过任何工作流阶段
- 不修改其他角色负责的产物

## CLI 工具

```bash
python3 cli/clockwork.py create "功能名" --repo <repo>
python3 cli/clockwork.py advance <feature-id> <stage>
python3 cli/clockwork.py validate <feature-id>
python3 cli/clockwork.py status <feature-id>
```
