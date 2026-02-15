#!/usr/bin/env node
import { Command } from 'commander';
import { databaseCommand } from './commands/database.js';

const program = new Command();

program
  .name('forgebase-cli')
  .description('CLI tool for ForgeBase')
  .version('0.0.1');

program.addCommand(databaseCommand);

program.parse();
