#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { version } from '../package.json';

// Main CLI program
const program = new Command();

program
  .name('praxis')
  .description('CLI tool for Praxis framework - scaffold projects, manage components, and more')
  .version(version);

// Add commands
program
  .command('init')
  .description('Initialize a new Praxis project')
  .action(() => {
    console.log(chalk.blue('Initializing new Praxis project...'));
    // TODO: Implement project initialization
  });

program
  .command('create <type> <name>')
  .description('Create a new component, store, or service')
  .action((type: string, name: string) => {
    console.log(chalk.green(`Creating ${type}: ${name}`));
    // TODO: Implement creation logic
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

export { program };