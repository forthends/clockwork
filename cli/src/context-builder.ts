import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { parseFrontmatter } from './frontmatter.js';
import { loadIndex, queryIndex } from './knowledge-indexer.js';
import { loadConfig } from './config.js';
import { AgentFrontmatter, AgentContext } from './types.js';

export async function buildAgentContext(
  projectRoot: string,
  agentName: string,
  inputs: Record<string, string>,
): Promise<AgentContext> {
  const config = loadConfig(projectRoot);
  const agentPath = join(projectRoot, config.agents.dir, `${agentName}.md`);
  const { frontmatter: agent, body } = parseFrontmatter<AgentFrontmatter>(agentPath);

  const index = loadIndex(join(projectRoot, config.knowledge.dir));
  const primaryText = Object.values(inputs).join(' ');
  const secondaryText = agent.description + ' ' + agent.capabilities.join(' ');
  const keywords = extractKeywords(primaryText + ' ' + primaryText + ' ' + secondaryText);
  const knowledgeEntries = queryIndex(index, {
    tags: keywords,
    maxResults: config.knowledge.maxEntriesPerQuery,
  });

  return {
    agentName: agent.name,
    role: agent.role,
    capabilities: agent.capabilities,
    boundaries: agent.boundaries,
    instructions: body,
    skills: agent.skills || [],
    inputs,
    knowledgeEntries,
  };
}

export function saveContextPackage(workspaceDir: string, taskId: string, context: AgentContext): string {
  const ctxDir = join(workspaceDir, taskId, 'agent-context');
  mkdirSync(ctxDir, { recursive: true });
  const filePath = join(ctxDir, `${context.agentName}.json`);
  writeFileSync(filePath, JSON.stringify(context, null, 2));
  return filePath;
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'and',
    'or',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'shall',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'use',
    'when',
    'how',
    'what',
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/);
  return [...new Set(words.filter((w) => w.length > 2 && !stopWords.has(w)))];
}
