#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { startCommand } from './commands/start.js';
import { resumeCommand } from './commands/resume.js';
import { reviewCommand } from './commands/review.js';
import { repoCommand } from './commands/repo.js';
import { knowledgeCommand } from './commands/knowledge.js';
import { skillCommand } from './commands/skill.js';
import { webCommand } from './commands/web.js';

const program = new Command();

program
  .name('clockwork')
  .description('AI collaboration governance framework for agile teams')
  .version('0.1.0');

program.addCommand(initCommand());
program.addCommand(startCommand());
program.addCommand(statusCommand());
program.addCommand(resumeCommand());
program.addCommand(reviewCommand());
program.addCommand(repoCommand());
program.addCommand(knowledgeCommand());
program.addCommand(skillCommand());
program.addCommand(webCommand());

process.on('SIGINT', () => {
  console.log('\nInterrupted. Use `clockwork resume <task-id>` to recover.');
  process.exit(1);
});

program.parse();
