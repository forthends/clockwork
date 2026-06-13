import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { ClockworkConfig, UserConfig } from './types.js';

const DEFAULT_CONFIG: ClockworkConfig = {
  project: { name: 'clockwork-project' },
  ide: { primary: 'claude-code' },
  agents: { dir: 'agents/', defaultModel: 'sonnet' },
  knowledge: { dir: 'knowledge/', index: 'knowledge/index.yaml', maxEntriesPerQuery: 5 },
  workflows: { dir: 'workflows/' },
  repos: { dir: 'repos/' },
  workspace: { dir: 'workspace/' },
  web: { port: 4200, host: 'localhost' },
  cli: { lockTTLMinutes: 30 },
};

export function loadConfig(projectRoot: string): ClockworkConfig {
  const configPath = join(projectRoot, '.clockwork', 'config.yaml');
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}. Run 'clockwork init' first.`);
  }
  const raw = readFileSync(configPath, 'utf8');
  const userConfig = parseYaml(raw) as Partial<ClockworkConfig>;
  return deepMerge(DEFAULT_CONFIG, userConfig);
}

function deepMerge<T>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override as object) as (keyof T)[]) {
    if (isObject(base[key]) && isObject(override[key])) {
      result[key] = deepMerge(
        base[key] as Record<string, unknown>,
        override[key] as Record<string, unknown>,
      ) as T[keyof T];
    } else if (override[key] !== undefined) {
      result[key] = override[key];
    }
  }
  return result;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function loadUserConfig(projectRoot: string): UserConfig | null {
  const userPath = join(projectRoot, '.clockwork', 'user.yaml');
  if (!existsSync(userPath)) return null;
  try {
    const raw = readFileSync(userPath, 'utf8');
    const parsed = parseYaml(raw) as { user?: UserConfig };
    return parsed?.user || null;
  } catch {
    return null;
  }
}

export function saveUserConfig(projectRoot: string, user: UserConfig): void {
  const userPath = join(projectRoot, '.clockwork', 'user.yaml');
  writeFileSync(userPath, stringifyYaml({ user }));
}
