#!/usr/bin/env python3
"""
Clockwork CLI — AI Agent 治理框架命令行工具

用法:
    clockwork <command> [options]

命令:
    create      创建新需求实例
    advance     推进工作流阶段
    validate    校验产物质量
    status      查看需求状态
    list        列出所有需求
    init        初始化工作空间

示例:
    clockwork create "Backlog 删除功能" --repo agilehub
    clockwork advance FEAT-001 tech_design
    clockwork validate FEAT-001
    clockwork status FEAT-001
    clockwork list
"""

import argparse
import sys
import os
import yaml
import re
from datetime import datetime
from pathlib import Path

# 工作空间根目录
WORKSPACE_ROOT = Path(__file__).parent.parent.resolve()
WORKFLOW_DIR = WORKSPACE_ROOT / "workflow"
FEATURES_DIR = WORKFLOW_DIR / "features"
REPOS_DIR = WORKSPACE_ROOT / "repos"
AGENTS_DIR = WORKSPACE_ROOT / "agents"
DEFINITIONS_DIR = WORKFLOW_DIR / "_definitions"
TEMPLATES_DIR = WORKFLOW_DIR / "_templates"

# 颜色输出
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def colorize(text, color):
    return f"{color}{text}{Colors.END}"

def success(text):
    return colorize(f"✅ {text}", Colors.GREEN)

def error(text):
    return colorize(f"❌ {text}", Colors.RED)

def warning(text):
    return colorize(f"⚠️ {text}", Colors.YELLOW)

def info(text):
    return colorize(f"ℹ️ {text}", Colors.BLUE)

# ============ 工具函数 ============

def get_next_feature_id():
    """获取下一个可用的 FEAT ID"""
    existing = list(FEATURES_DIR.glob("FEAT-*"))
    if not existing:
        return "FEAT-001"
    ids = []
    for d in existing:
        match = re.match(r"FEAT-(\d+)", d.name)
        if match:
            ids.append(int(match.group(1)))
    return f"FEAT-{max(ids) + 1:03d}"

def load_workflow_definition(workflow_name):
    """加载工作流定义"""
    for yml_file in DEFINITIONS_DIR.glob("*.yaml"):
        with open(yml_file, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            if data.get('name') == workflow_name:
                return data
    return None

def load_manifest(feature_path):
    """加载 manifest.yaml"""
    manifest_path = feature_path / "manifest.yaml"
    if not manifest_path.exists():
        return None
    with open(manifest_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

def save_manifest(feature_path, manifest):
    """保存 manifest.yaml"""
    manifest_path = feature_path / "manifest.yaml"
    with open(manifest_path, 'w', encoding='utf-8') as f:
        yaml.dump(manifest, f, allow_unicode=True, default_flow_style=False, sort_keys=False)

def find_feature_dir(feature_id):
    """根据 FEAT ID 查找需求目录"""
    # 精确匹配
    for d in FEATURES_DIR.glob(f"{feature_id}-*"):
        if d.is_dir():
            return d
    return None

def get_available_workflows():
    """获取所有可用工作流"""
    workflows = []
    for yml_file in DEFINITIONS_DIR.glob("*.yaml"):
        with open(yml_file, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            workflows.append({
                'name': data.get('name'),
                'description': data.get('description', '').strip().split('\n')[0],
                'file': yml_file.name
            })
    return workflows

def get_stage_order(workflow):
    """获取工作流的阶段顺序列表"""
    return [stage['id'] for stage in workflow.get('stages', [])]

def get_stage_info(workflow, stage_id):
    """获取指定阶段的信息"""
    for stage in workflow.get('stages', []):
        if stage['id'] == stage_id:
            return stage
    return None

# ============ 命令实现 ============

def cmd_create(args):
    """创建新需求实例"""
    feature_id = get_next_feature_id()
    feature_name = args.name

    # 验证 repo 是否存在
    repo_name = args.repo
    if repo_name:
        repo_path = REPOS_DIR / repo_name
        if not repo_path.exists():
            print(error(f"代码仓库不存在: {repo_path}"))
            print(f"请先使用 'git submodule add <url> repos/{repo_name}' 添加仓库")
            return 1
        repo_info = f"repo: {repo_name}"
    else:
        repo_info = "repo: null"

    # 解析工作流
    workflow_name = args.workflow or "feature-development"
    workflow = load_workflow_definition(workflow_name)
    if not workflow:
        print(error(f"未找到工作流: {workflow_name}"))
        print(f"可用工作流: {', '.join([w['name'] for w in get_available_workflows()])}")
        return 1

    # 创建目录
    feature_dir = FEATURES_DIR / f"{feature_id}-{feature_name.replace(' ', '-')}"
    feature_dir.mkdir(parents=True, exist_ok=True)

    # 生成 manifest
    manifest = {
        'feature_id': feature_id,
        'name': feature_name,
        'workflow': workflow_name,
        'repo': repo_name,
        'created_at': datetime.now().strftime('%Y-%m-%d'),
        'current_stage': workflow['stages'][0]['id'] if workflow['stages'] else None,
        'stages': {}
    }

    # 初始化各阶段状态
    for stage in workflow.get('stages', []):
        manifest['stages'][stage['id']] = {
            'status': 'pending'
        }

    # 第一个阶段设为 in_progress
    if manifest['stages']:
        first_stage_id = list(manifest['stages'].keys())[0]
        manifest['stages'][first_stage_id]['status'] = 'in_progress'
        manifest['stages'][first_stage_id]['started_at'] = datetime.now().strftime('%Y-%m-%d')
        manifest['current_stage'] = first_stage_id

    save_manifest(feature_dir, manifest)

    print(colorize(f"\n{'='*50}", Colors.BOLD))
    print(f"  {Colors.BOLD}需求创建成功{Colors.END}")
    print(colorize(f"{'='*50}\n", Colors.BOLD))
    print(f"  需求编号: {colorize(feature_id, Colors.GREEN)}")
    print(f"  需求名称: {colorize(feature_name, Colors.GREEN)}")
    print(f"  工作流:   {workflow_name}")
    print(f"  仓库:     {repo_name or '未指定'}")
    print(f"  目录:     {feature_dir.relative_to(WORKSPACE_ROOT)}")
    print(f"\n  当前阶段: {manifest['current_stage']}")
    print(f"\n  下一步:")
    print(f"    1. 进入目录: cd {feature_dir.relative_to(WORKSPACE_ROOT)}")
    print(f"    2. 基于模板创建产物")
    print(f"    3. 完成工作后: clockwork advance {feature_id} <stage>")

    return 0

def cmd_advance(args):
    """推进工作流阶段"""
    feature_dir = find_feature_dir(args.feature_id)
    if not feature_dir:
        print(error(f"未找到需求: {args.feature_id}"))
        return 1

    manifest = load_manifest(feature_dir)
    if not manifest:
        print(error(f"无效的需求目录"))
        return 1

    workflow = load_workflow_definition(manifest['workflow'])
    if not workflow:
        print(error(f"未找到工作流: {manifest['workflow']}"))
        return 1

    current_stage_id = manifest.get('current_stage')
    target_stage_id = args.stage

    # 解析目标阶段
    stage_order = get_stage_order(workflow)
    if target_stage_id not in stage_order:
        print(error(f"未知阶段: {target_stage_id}"))
        print(f"可用阶段: {', '.join(stage_order)}")
        return 1

    # 获取当前和目标阶段的索引
    current_idx = stage_order.index(current_stage_id) if current_stage_id in stage_order else -1
    target_idx = stage_order.index(target_stage_id)

    # 确定要更新的阶段范围
    if target_idx <= current_idx and current_stage_id:
        print(error(f"不能回退到已完成阶段: {target_stage_id}"))
        print(f"当前阶段: {current_stage_id}")
        return 1

    # 完成当前阶段（如有）
    if current_stage_id and current_idx < target_idx:
        manifest['stages'][current_stage_id]['status'] = 'completed'
        manifest['stages'][current_stage_id]['completed_at'] = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')

        # 收集该阶段的产物
        artifacts = []
        stage_info = get_stage_info(workflow, current_stage_id)
        if stage_info and 'outputs' in stage_info:
            for output in stage_info['outputs']:
                if output.get('template'):
                    artifact_name = f"{output['id']}.md"
                    if (feature_dir / artifact_name).exists():
                        artifacts.append(artifact_name)
        manifest['stages'][current_stage_id]['artifacts'] = artifacts

        print(success(f"阶段 {current_stage_id} → completed"))

    # 激活目标阶段
    manifest['stages'][target_stage_id]['status'] = 'in_progress'
    manifest['stages'][target_stage_id]['started_at'] = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    manifest['current_stage'] = target_stage_id

    save_manifest(feature_dir, manifest)

    print(colorize(f"\n{'='*50}", Colors.BOLD))
    print(f"  {Colors.BOLD}阶段推进成功{Colors.END}")
    print(colorize(f"{'='*50}\n", Colors.BOLD))
    print(f"  需求: {manifest['feature_id']} {manifest['name']}")
    print(f"  当前阶段: {colorize(target_stage_id, Colors.GREEN)}")

    # 打印阶段信息
    stage_info = get_stage_info(workflow, target_stage_id)
    if stage_info:
        print(f"\n  阶段说明: {stage_info.get('name', target_stage_id)}")
        if stage_info.get('skills'):
            print(f"  可用技能: {', '.join(stage_info['skills'])}")
        if stage_info.get('inputs'):
            print(f"  输入: {', '.join([i.get('from') for i in stage_info['inputs']])}")
        if stage_info.get('outputs'):
            outputs = [f"{o.get('id')}.md" for o in stage_info['outputs'] if o.get('template')]
            print(f"  输出: {', '.join(outputs)}")

    print(f"\n  下一步:")
    print(f"    clockwork validate {manifest['feature_id']}")
    print(f"    完成工作后: clockwork advance {manifest['feature_id']} <next_stage>")

    return 0

def cmd_validate(args):
    """校验产物质量"""
    feature_dir = find_feature_dir(args.feature_id)
    if not feature_dir:
        print(error(f"未找到需求: {args.feature_id}"))
        return 1

    manifest = load_manifest(feature_dir)
    if not manifest:
        print(error(f"无效的需求目录"))
        return 1

    workflow = load_workflow_definition(manifest['workflow'])
    if not workflow:
        print(error(f"未找到工作流: {manifest['workflow']}"))
        return 1

    current_stage_id = manifest.get('current_stage')
    if not current_stage_id:
        print(error("当前阶段未知"))
        return 1

    stage_info = get_stage_info(workflow, current_stage_id)
    if not stage_info:
        print(error(f"未知阶段: {current_stage_id}"))
        return 1

    print(colorize(f"\n{'='*50}", Colors.BOLD))
    print(f"  {Colors.BOLD}质量校验: {current_stage_id}{Colors.END}")
    print(colorize(f"{'='*50}\n", Colors.BOLD))

    passed_count = 0
    failed_count = 0
    warnings = []

    # S1: 结构校验
    print(f"[S1] {colorize('结构校验', Colors.BLUE)}")
    required_sections = []
    if 'outputs' in stage_info:
        for output in stage_info['outputs']:
            validation = output.get('validation', {})
            required_sections.extend(validation.get('required_sections', []))

    if not required_sections:
        print(f"  {info('本阶段无结构校验要求')}")
        passed_count += 1
    else:
        for section in required_sections:
            # 尝试在产物文件中查找该章节
            found = False
            for output in stage_info['outputs']:
                artifact_name = f"{output['id']}.md"
                artifact_path = feature_dir / artifact_name
                if artifact_path.exists():
                    with open(artifact_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # 检查章节是否存在（简化检查）
                        if section in content or section.replace('_', ' ') in content:
                            found = True
                            break
            if found:
                print(f"  {success(section)}")
                passed_count += 1
            else:
                print(f"  {error(f'{section} — 缺失')}")
                failed_count += 1

    # S2: 内容校验（简化版）
    print(f"\n[S2] {colorize('内容校验', Colors.BLUE)}")
    for output in stage_info['outputs']:
        artifact_name = f"{output['id']}.md"
        artifact_path = feature_dir / artifact_name
        if artifact_path.exists():
            with open(artifact_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # 检查占位符
                placeholders = re.findall(r'<[^>]+>', content)
                # 过滤掉可能是正常的 HTML/XML 标签
                meaningful_placeholders = [p for p in placeholders if not re.match(r'<[/]?\w+>', p)]
                if meaningful_placeholders:
                    print(f"  {error(f'{artifact_name} — 发现未填充占位符: {len(meaningful_placeholders)} 处')}")
                    failed_count += 1
                else:
                    # 检查内容长度
                    lines = [l.strip() for l in content.split('\n') if l.strip() and not l.strip().startswith('#')]
                    total_chars = sum(len(l) for l in lines)
                    if total_chars < 100:
                        print(f"  {warning(f'{artifact_name} — 内容较少 ({total_chars} 字符)')}")
                        warnings.append(artifact_name)
                    else:
                        print(f"  {success(f'{artifact_name} — 内容充实 ({total_chars} 字符)')}")
                        passed_count += 1
        else:
            print(f"  {error(f'{artifact_name} — 文件不存在')}")
            failed_count += 1

    # S3: 引用校验
    print(f"\n[S3] {colorize('引用校验', Colors.BLUE)}")
    inputs = stage_info.get('inputs', [])
    if not inputs:
        print(f"  {info('本阶段无上游输入，跳过')}")
    else:
        for inp in inputs:
            ref = inp.get('from', '')
            stage_id, output_id = ref.split('.')
            artifact_name = f"{output_id}.md"
            artifact_path = feature_dir / artifact_name
            if artifact_path.exists():
                print(f"  {success(f'{artifact_name} ← {ref}')}")
                passed_count += 1
            else:
                print(f"  {error(f'{artifact_name} ← {ref} (缺失)')}")
                failed_count += 1

    # 总结
    print(colorize(f"\n{'='*50}", Colors.BOLD))
    if failed_count == 0:
        print(f"  {Colors.GREEN}{Colors.BOLD}校验结果: 通过 ({passed_count} 项){Colors.END}")

        # 更新 manifest
        manifest['stages'][current_stage_id]['validation_passed'] = True
        manifest['stages'][current_stage_id]['artifacts'] = [
            f"{o['id']}.md" for o in stage_info.get('outputs', []) if o.get('template')
        ]
        save_manifest(feature_dir, manifest)
        print(f"  manifest 已更新: validation_passed = true")
    else:
        print(f"  {Colors.RED}{Colors.BOLD}校验结果: 未通过 ({failed_count} 项失败, {passed_count} 项通过){Colors.END}")
        print(f"\n  请修正上述问题后重新运行: clockwork validate {args.feature_id}")

    return 0 if failed_count == 0 else 1

def cmd_status(args):
    """查看需求状态"""
    if args.feature_id:
        feature_dir = find_feature_dir(args.feature_id)
        if not feature_dir:
            print(error(f"未找到需求: {args.feature_id}"))
            return 1

        manifests = [(feature_dir, load_manifest(feature_dir))]
    else:
        manifests = []
        for d in sorted(FEATURES_DIR.glob("FEAT-*")):
            if d.is_dir():
                manifest = load_manifest(d)
                if manifest:
                    manifests.append((d, manifest))

    if not manifests:
        print(info("暂无需求"))
        return 0

    for feature_dir, manifest in manifests:
        print(colorize(f"\n{'='*60}", Colors.BOLD))
        print(f"  {Colors.BOLD}{manifest['feature_id']}: {manifest['name']}{Colors.END}")
        print(colorize(f"{'='*60}", Colors.BOLD))

        print(f"  工作流: {manifest['workflow']}")
        print(f"  仓库:   {manifest.get('repo') or '未指定'}")
        print(f"  创建:   {manifest['created_at']}")
        print()

        workflow = load_workflow_definition(manifest['workflow'])
        stage_order = get_stage_order(workflow) if workflow else list(manifest['stages'].keys())

        for stage_id in stage_order:
            stage_data = manifest['stages'].get(stage_id, {})
            status = stage_data.get('status', 'unknown')

            if status == 'completed':
                icon = success("✓")
                completed_at = stage_data.get('completed_at', '')
                line = f"  {icon} {stage_id:20s} completed {completed_at}"
            elif status == 'in_progress':
                icon = colorize("●", Colors.YELLOW)
                started_at = stage_data.get('started_at', '')
                line = f"  {icon} {stage_id:20s} in_progress {started_at}"
            elif status == 'blocked':
                icon = error("✗")
                line = f"  {icon} {stage_id:20s} blocked"
            else:
                icon = colorize("○", Colors.BLUE)
                line = f"  {icon} {stage_id:20s} pending"

            print(line)

            # 显示 notes
            if stage_data.get('notes'):
                for note_line in stage_data['notes'].strip().split('\n'):
                    if note_line.strip():
                        print(f"      {note_line}")

        if workflow:
            next_stage = manifest.get('current_stage')
            print(f"\n  当前阶段: {next_stage}")

    return 0

def cmd_list(args):
    """列出所有需求"""
    features = []
    for d in sorted(FEATURES_DIR.glob("FEAT-*")):
        if d.is_dir():
            manifest = load_manifest(d)
            if manifest:
                features.append(manifest)

    if not features:
        print(info("暂无需求"))
        print(f"使用 'clockwork create \"需求名称\"' 创建第一个需求")
        return 0

    print(colorize(f"\n{'='*60}", Colors.BOLD))
    print(f"  {Colors.BOLD}Clockwork 需求列表{Colors.END}")
    print(colorize(f"{'='*60}\n", Colors.BOLD))

    print(f"  {'编号':<12} {'名称':<30} {'阶段':<15} {'状态'}")
    print(f"  {'-'*60}")

    for f in features:
        stage_order = []
        workflow = load_workflow_definition(f['workflow'])
        if workflow:
            stage_order = get_stage_order(workflow)

        current = f.get('current_stage', 'unknown')
        current_status = f['stages'].get(current, {}).get('status', 'unknown')

        status_color = Colors.GREEN if current_status == 'completed' else Colors.YELLOW if current_status == 'in_progress' else Colors.BLUE
        status_icon = "✓" if current_status == 'completed' else "●" if current_status == 'in_progress' else "○"

        print(f"  {f['feature_id']:<12} {f['name'][:28]:<30} {current:<15} {colorize(f'{status_icon} {current_status}', status_color)}")

    print(f"\n  共 {len(features)} 个需求")
    print(f"\n  使用 'clockwork status <id>' 查看详情")
    print(f"  使用 'clockwork create \"名称\"' 创建新需求")

    return 0

def cmd_init(args):
    """初始化工作空间"""
    # 检查必要目录
    dirs = ['agents', 'skills', 'workflow', 'docs', 'repos']
    for d in dirs:
        path = WORKSPACE_ROOT / d
        if not path.exists():
            path.mkdir(parents=True)
            print(info(f"创建目录: {d}"))

    # 检查必要文件
    if not (WORKSPACE_ROOT / "AGENTS.md").exists():
        print(warning("AGENTS.md 不存在，跳过"))

    # 检查 .cursor/rules
    cursor_rules = WORKSPACE_ROOT / ".cursor" / "rules" / "clockwork.mdc"
    if not cursor_rules.exists():
        print(warning("clockwork.mdc 不存在，请参考 docs/guides/ 创建"))

    print(success("\n工作空间初始化完成"))
    print(f"\n目录结构:")
    for d in dirs:
        exists = "✓" if (WORKSPACE_ROOT / d).exists() else "✗"
        print(f"  {success(exists) if exists == '✓' else error(exists)} {d}")

    print(f"\n下一步:")
    print(f"  1. 添加代码仓库: git submodule add <url> repos/<name>")
    print(f"  2. 创建需求: clockwork create \"功能名称\"")
    print(f"  3. 查看帮助: clockwork --help")

    return 0

def resolve_context_path(path_template, repo_name, feature_id=None):
    """解析上下文路径中的变量

    支持的变量:
    - <repo-name>: 代码仓库名称
    - <feature-id>: 需求编号 (可选)
    """
    result = path_template.replace('<repo-name>', repo_name or 'undefined')
    if feature_id:
        result = result.replace('<feature-id>', feature_id)
    return result

def cmd_context(args):
    """解析并显示工作流上下文路径"""
    feature_dir = find_feature_dir(args.feature_id)
    if not feature_dir:
        print(error(f"未找到需求: {args.feature_id}"))
        return 1

    manifest = load_manifest(feature_dir)
    if not manifest:
        print(error(f"无效的需求目录"))
        return 1

    workflow = load_workflow_definition(manifest['workflow'])
    if not workflow:
        print(error(f"未找到工作流: {manifest['workflow']}"))
        return 1

    repo_name = manifest.get('repo')
    feature_id = manifest.get('feature_id')

    print(colorize(f"\n{'='*60}", Colors.BOLD))
    print(f"  {Colors.BOLD}上下文路径解析: {feature_id}{Colors.END}")
    print(colorize(f"{'='*60}\n", Colors.BOLD))

    # 全局上下文
    context = workflow.get('context', [])
    if context:
        print(f"  {Colors.BOLD}全局上下文 (workflow context){Colors.END}")
        for path_template in context:
            resolved = resolve_context_path(path_template, repo_name, feature_id)
            # 检查文件是否存在
            resolved_path = WORKSPACE_ROOT / resolved
            exists = resolved_path.exists()
            icon = success("✓") if exists else error("✗")
            print(f"    {icon} {resolved}")
            if not exists and repo_name:
                print(f"      {warning('文件不存在，请确认 Analyst 已生成项目简介')}")
        print()

    # 当前阶段的上下文
    current_stage_id = manifest.get('current_stage')
    if current_stage_id:
        stage_info = get_stage_info(workflow, current_stage_id)
        if stage_info:
            print(f"  {Colors.BOLD}当前阶段: {current_stage_id}{Colors.END}")

            inputs = stage_info.get('inputs', [])
            if inputs:
                print(f"  输入产物:")
                for inp in inputs:
                    ref = inp.get('from', '')
                    stage_id, output_id = ref.split('.')
                    artifact_name = f"{output_id}.md"
                    artifact_path = feature_dir / artifact_name
                    exists = artifact_path.exists()
                    icon = success("✓") if exists else error("✗")
                    print(f"    {icon} {artifact_name} ← {ref}")

                    # 解析上下文路径中的变量
                    for ctx_path in context:
                        resolved = resolve_context_path(ctx_path, repo_name, feature_id)
                        if resolved.startswith(f"docs/projects/{repo_name}"):
                            exists_ctx = (WORKSPACE_ROOT / resolved).exists()
                            icon_ctx = success("✓") if exists_ctx else warning("○")
                            print(f"      {icon_ctx} {resolved}")
            else:
                print(f"    {info('无上游输入')}")

    return 0

# ============ 主程序 ============

def main():
    parser = argparse.ArgumentParser(
        description="Clockwork — AI Agent 治理框架命令行工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  clockwork create "Backlog 删除功能" --repo agilehub
  clockwork advance FEAT-001 tech_design
  clockwork validate FEAT-001
  clockwork status FEAT-001
  clockwork list
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    # create 命令
    parser_create = subparsers.add_parser('create', help='创建新需求实例')
    parser_create.add_argument('name', help='需求名称')
    parser_create.add_argument('--repo', help='代码仓库名称')
    parser_create.add_argument('--workflow', help='工作流类型 (默认: feature-development)')
    parser_create.set_defaults(func=cmd_create)

    # advance 命令
    parser_advance = subparsers.add_parser('advance', help='推进工作流阶段')
    parser_advance.add_argument('feature_id', help='需求编号 (如 FEAT-001)')
    parser_advance.add_argument('stage', help='目标阶段')
    parser_advance.set_defaults(func=cmd_advance)

    # validate 命令
    parser_validate = subparsers.add_parser('validate', help='校验产物质量')
    parser_validate.add_argument('feature_id', help='需求编号 (如 FEAT-001)')
    parser_validate.set_defaults(func=cmd_validate)

    # status 命令
    parser_status = subparsers.add_parser('status', help='查看需求状态')
    parser_status.add_argument('feature_id', nargs='?', help='需求编号 (省略则显示所有)')
    parser_status.set_defaults(func=cmd_status)

    # list 命令
    parser_list = subparsers.add_parser('list', help='列出所有需求')
    parser_list.set_defaults(func=cmd_list)

    # init 命令
    parser_init = subparsers.add_parser('init', help='初始化工作空间')
    parser_init.set_defaults(func=cmd_init)

    # context 命令
    parser_context = subparsers.add_parser('context', help='解析工作流上下文路径')
    parser_context.add_argument('feature_id', help='需求编号 (如 FEAT-001)')
    parser_context.set_defaults(func=cmd_context)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 0

    return args.func(args)

if __name__ == '__main__':
    sys.exit(main())
