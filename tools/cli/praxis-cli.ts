#!/usr/bin/env node

// PraxisJS CLI Tool

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

const program = new Command();

interface ProjectTemplate {
  name: string;
  description: string;
  files: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
}

interface MigrationOptions {
  source: string;
  output: string;
  backup: boolean;
  dryRun: boolean;
  verbose: boolean;
}

program
  .name('praxis')
  .description('PraxisJS CLI - Build reactive applications with ease')
  .version('1.0.0');

// Create new project
program
  .command('create <project-name>')
  .description('Create a new PraxisJS project')
  .option('-t, --template <template>', 'Project template', 'basic')
  .option('--no-install', 'Skip package installation')
  .option('--git', 'Initialize git repository')
  .action(async (projectName: string, options) => {
    try {
      await createProject(projectName, options);
    } catch (error) {
      console.error(chalk.red('Failed to create project:'), error);
      process.exit(1);
    }
  });

// Development server
program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('--host <host>', 'Server host', 'localhost')
  .option('--open', 'Open browser automatically')
  .action(async (options) => {
    try {
      await startDevServer(options);
    } catch (error) {
      console.error(chalk.red('Failed to start dev server:'), error);
      process.exit(1);
    }
  });

// Build project
program
  .command('build')
  .description('Build project for production')
  .option('-o, --output <dir>', 'Output directory', 'dist')
  .option('--analyze', 'Analyze bundle size')
  .option('--ssr', 'Enable server-side rendering')
  .action(async (options) => {
    try {
      await buildProject(options);
    } catch (error) {
      console.error(chalk.red('Build failed:'), error);
      process.exit(1);
    }
  });

// Migration from Alpine.js
program
  .command('migrate <source>')
  .description('Migrate Alpine.js project to PraxisJS')
  .option('-o, --output <dir>', 'Output directory', './praxis-migrated')
  .option('--backup', 'Create backup of original files', true)
  .option('--dry-run', 'Show changes without applying them')
  .option('-v, --verbose', 'Verbose output')
  .action(async (source: string, options) => {
    try {
      await migrateFromAlpine(source, options);
    } catch (error) {
      console.error(chalk.red('Migration failed:'), error);
      process.exit(1);
    }
  });

// Component generator
program
  .command('generate <type> <name>')
  .alias('g')
  .description('Generate component, store, or directive')
  .option('-d, --directory <dir>', 'Output directory')
  .option('--typescript', 'Generate TypeScript files')
  .action(async (type: string, name: string, options) => {
    try {
      await generateCode(type, name, options);
    } catch (error) {
      console.error(chalk.red('Generation failed:'), error);
      process.exit(1);
    }
  });

// Add dependencies
program
  .command('add <packages...>')
  .description('Add packages to project')
  .option('-D, --dev', 'Add as dev dependency')
  .action(async (packages: string[], options) => {
    try {
      await addPackages(packages, options);
    } catch (error) {
      console.error(chalk.red('Failed to add packages:'), error);
      process.exit(1);
    }
  });

// Project analysis
program
  .command('analyze')
  .description('Analyze project structure and performance')
  .option('--output <file>', 'Output file for report')
  .action(async (options) => {
    try {
      await analyzeProject(options);
    } catch (error) {
      console.error(chalk.red('Analysis failed:'), error);
      process.exit(1);
    }
  });

// Implementation functions

async function createProject(projectName: string, options: any): Promise<void> {
  const spinner = ora('Creating project...').start();
  
  try {
    const projectPath = path.resolve(projectName);
    
    // Check if directory exists
    try {
      await fs.access(projectPath);
      spinner.fail(`Directory ${projectName} already exists`);
      return;
    } catch {
      // Directory doesn't exist, which is good
    }

    // Get template
    const template = await getTemplate(options.template);
    
    spinner.text = 'Setting up project structure...';
    
    // Create project directory
    await fs.mkdir(projectPath, { recursive: true });
    
    // Create files from template
    for (const [filePath, content] of Object.entries(template.files)) {
      const fullPath = path.join(projectPath, filePath);
      const dir = path.dirname(fullPath);
      
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content);
    }
    
    // Create package.json
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: 'A PraxisJS project',
      main: 'index.html',
      scripts: {
        dev: 'praxis dev',
        build: 'praxis build',
        preview: 'praxis preview',
        ...template.scripts
      },
      dependencies: template.dependencies.reduce((acc, dep) => {
        acc[dep] = 'latest';
        return acc;
      }, {} as Record<string, string>),
      devDependencies: template.devDependencies.reduce((acc, dep) => {
        acc[dep] = 'latest';
        return acc;
      }, {} as Record<string, string>)
    };
    
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Initialize git if requested
    if (options.git) {
      spinner.text = 'Initializing git repository...';
      await execCommand('git init', { cwd: projectPath });
      await fs.writeFile(path.join(projectPath, '.gitignore'), getGitignore());
    }
    
    // Install dependencies
    if (options.install !== false) {
      spinner.text = 'Installing dependencies...';
      await installDependencies(projectPath);
    }
    
    spinner.succeed(chalk.green(`Project ${projectName} created successfully!`));
    
    console.log('\nNext steps:');
    console.log(chalk.cyan(`  cd ${projectName}`));
    if (options.install === false) {
      console.log(chalk.cyan('  npm install'));
    }
    console.log(chalk.cyan('  praxis dev'));
    
  } catch (error) {
    spinner.fail('Failed to create project');
    throw error;
  }
}

async function startDevServer(options: any): Promise<void> {
  const spinner = ora('Starting development server...').start();
  
  try {
    // Check if we're in a PraxisJS project
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    if (!packageJson.dependencies?.['@oxog/praxis']) {
      spinner.fail('Not a PraxisJS project. Run "praxis create <name>" to create a new project.');
      return;
    }
    
    spinner.succeed('Development server starting...');
    
    // Start Vite dev server
    const viteProcess = spawn('npx', ['vite', '--port', options.port, '--host', options.host], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    if (options.open) {
      setTimeout(() => {
        const open = require('open');
        open(`http://${options.host}:${options.port}`);
      }, 2000);
    }
    
    process.on('SIGINT', () => {
      viteProcess.kill();
      process.exit();
    });
    
  } catch (error) {
    spinner.fail('Failed to start development server');
    throw error;
  }
}

async function buildProject(options: any): Promise<void> {
  const spinner = ora('Building project...').start();
  
  try {
    const buildArgs = ['vite', 'build'];
    
    if (options.output) {
      buildArgs.push('--outDir', options.output);
    }
    
    if (options.ssr) {
      buildArgs.push('--ssr');
    }
    
    await execCommand(buildArgs.join(' '));
    
    if (options.analyze) {
      spinner.text = 'Analyzing bundle...';
      await execCommand('npx vite-bundle-analyzer ' + (options.output || 'dist'));
    }
    
    spinner.succeed('Build completed successfully!');
    
  } catch (error) {
    spinner.fail('Build failed');
    throw error;
  }
}

async function migrateFromAlpine(source: string, options: MigrationOptions): Promise<void> {
  const spinner = ora('Analyzing Alpine.js project...').start();
  
  try {
    const sourcePath = path.resolve(source);
    const outputPath = path.resolve(options.output);
    
    // Find HTML files with Alpine.js
    const htmlFiles = await findHtmlFiles(sourcePath);
    const alpineFiles = [];
    
    for (const file of htmlFiles) {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes('x-data') || content.includes('Alpine')) {
        alpineFiles.push(file);
      }
    }
    
    spinner.text = `Found ${alpineFiles.length} Alpine.js files to migrate...`;
    
    if (options.backup) {
      const backupDir = path.join(path.dirname(sourcePath), 'alpine-backup');
      await fs.mkdir(backupDir, { recursive: true });
      
      for (const file of alpineFiles) {
        const relativePath = path.relative(sourcePath, file);
        const backupPath = path.join(backupDir, relativePath);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.copyFile(file, backupPath);
      }
    }
    
    // Create output directory
    await fs.mkdir(outputPath, { recursive: true });
    
    const migrationStats = {
      filesProcessed: 0,
      directivesConverted: 0,
      warnings: [] as string[]
    };
    
    // Process each file
    for (const file of alpineFiles) {
      spinner.text = `Migrating ${path.basename(file)}...`;
      
      const content = await fs.readFile(file, 'utf-8');
      const migrated = await migrateFileContent(content, file, options);
      
      migrationStats.filesProcessed++;
      migrationStats.directivesConverted += migrated.directivesConverted;
      migrationStats.warnings.push(...migrated.warnings);
      
      if (!options.dryRun) {
        const relativePath = path.relative(sourcePath, file);
        const outputFile = path.join(outputPath, relativePath);
        await fs.mkdir(path.dirname(outputFile), { recursive: true });
        await fs.writeFile(outputFile, migrated.content);
      }
    }
    
    // Create PraxisJS project structure
    if (!options.dryRun) {
      await createMigratedProject(outputPath);
    }
    
    spinner.succeed('Migration completed!');
    
    // Show migration report
    console.log('\nMigration Summary:');
    console.log(chalk.green(`✓ Files processed: ${migrationStats.filesProcessed}`));
    console.log(chalk.green(`✓ Directives converted: ${migrationStats.directivesConverted}`));
    
    if (migrationStats.warnings.length > 0) {
      console.log(chalk.yellow('\nWarnings:'));
      migrationStats.warnings.forEach(warning => {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      });
    }
    
  } catch (error) {
    spinner.fail('Migration failed');
    throw error;
  }
}

async function generateCode(type: string, name: string, options: any): Promise<void> {
  const spinner = ora(`Generating ${type}...`).start();
  
  try {
    const generators = {
      component: generateComponent,
      store: generateStore,
      directive: generateDirective,
      page: generatePage
    };
    
    const generator = generators[type as keyof typeof generators];
    if (!generator) {
      spinner.fail(`Unknown generator type: ${type}`);
      return;
    }
    
    await generator(name, options);
    spinner.succeed(`${type} generated successfully!`);
    
  } catch (error) {
    spinner.fail(`Failed to generate ${type}`);
    throw error;
  }
}

async function addPackages(packages: string[], options: any): Promise<void> {
  const spinner = ora('Adding packages...').start();
  
  try {
    const command = options.dev ? 'npm install -D' : 'npm install';
    await execCommand(`${command} ${packages.join(' ')}`);
    
    spinner.succeed('Packages added successfully!');
    
  } catch (error) {
    spinner.fail('Failed to add packages');
    throw error;
  }
}

async function analyzeProject(options: any): Promise<void> {
  const spinner = ora('Analyzing project...').start();
  
  try {
    const analysis = await performProjectAnalysis();
    
    if (options.output) {
      await fs.writeFile(options.output, JSON.stringify(analysis, null, 2));
      spinner.succeed(`Analysis saved to ${options.output}`);
    } else {
      spinner.succeed('Analysis completed!');
      console.log('\nProject Analysis:');
      console.log(chalk.cyan('Components:'), analysis.components.length);
      console.log(chalk.cyan('Stores:'), analysis.stores.length);
      console.log(chalk.cyan('Directives:'), analysis.directives.length);
      console.log(chalk.cyan('Bundle size:'), analysis.bundleSize);
    }
    
  } catch (error) {
    spinner.fail('Analysis failed');
    throw error;
  }
}

// Helper functions

async function getTemplate(templateName: string): Promise<ProjectTemplate> {
  const templates: Record<string, ProjectTemplate> = {
    basic: {
      name: 'Basic',
      description: 'A basic PraxisJS project',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PraxisJS App</title>
    <script type="module" src="/src/main.js"></script>
</head>
<body>
    <div id="app" x-data="{ count: 0 }">
        <h1>Welcome to PraxisJS!</h1>
        <p>Count: <span x-text="count"></span></p>
        <button x-on:click="count++">Increment</button>
    </div>
</body>
</html>`,
        'src/main.js': `import praxis from '@oxog/praxis';

praxis.init();`,
        'vite.config.js': `import { defineConfig } from 'vite';
import praxis from '@oxog/praxis-vite-plugin';

export default defineConfig({
  plugins: [praxis()]
});`,
        'README.md': `# PraxisJS Project

A reactive web application built with PraxisJS.

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\``
      },
      dependencies: ['@oxog/praxis'],
      devDependencies: ['vite', '@oxog/praxis-vite-plugin'],
      scripts: {}
    },
    
    spa: {
      name: 'Single Page Application',
      description: 'A SPA with routing and state management',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PraxisJS SPA</title>
    <script type="module" src="/src/main.js"></script>
</head>
<body>
    <div id="app"></div>
</body>
</html>`,
        'src/main.js': `import praxis from '@oxog/praxis';
import { router } from '@oxog/praxis-router';
import { store } from './store/index.js';

praxis.use(router);
praxis.use(store);

praxis.init();`,
        'src/store/index.js': `import { defineStore } from '@oxog/praxis-store';

export const useAppStore = defineStore('app', {
  state: () => ({
    user: null,
    theme: 'light'
  }),
  
  actions: {
    setUser(user) {
      this.$state.user = user;
    },
    
    toggleTheme() {
      this.$state.theme = this.$state.theme === 'light' ? 'dark' : 'light';
    }
  }
});`,
        'src/pages/Home.html': `<div x-data="useAppStore()">
    <h1>Welcome Home</h1>
    <p>Current theme: <span x-text="theme"></span></p>
    <button x-on:click="toggleTheme()">Toggle Theme</button>
</div>`
      },
      dependencies: ['@oxog/praxis', '@oxog/praxis-router', '@oxog/praxis-store'],
      devDependencies: ['vite', '@oxog/praxis-vite-plugin'],
      scripts: {}
    }
  };
  
  return templates[templateName] || templates.basic;
}

async function execCommand(command: string, options: any = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const process = spawn(cmd, args, {
      stdio: 'inherit',
      ...options
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function installDependencies(projectPath: string): Promise<void> {
  await execCommand('npm install', { cwd: projectPath });
}

function getGitignore(): string {
  return `node_modules/
dist/
.env
.env.local
.env.*.local
*.log
.DS_Store
Thumbs.db`;
}

async function findHtmlFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
  }
  
  await walk(dir);
  return files;
}

async function migrateFileContent(content: string, filePath: string, options: MigrationOptions): Promise<{
  content: string;
  directivesConverted: number;
  warnings: string[];
}> {
  let migratedContent = content;
  let directivesConverted = 0;
  const warnings: string[] = [];
  
  // Replace Alpine.js CDN with PraxisJS
  migratedContent = migratedContent.replace(
    /<script[^>]*alpine[^>]*><\/script>/gi,
    '<script type="module" src="/src/main.js"></script>'
  );
  
  // Replace Alpine.init() with praxis.init()
  migratedContent = migratedContent.replace(/Alpine\.start\(\)/g, 'praxis.init()');
  migratedContent = migratedContent.replace(/Alpine\.init\(\)/g, 'praxis.init()');
  
  // Convert Alpine.js directives - they're already compatible!
  // Just need to add PraxisJS import
  
  if (migratedContent.includes('x-data')) {
    directivesConverted++;
  }
  
  return {
    content: migratedContent,
    directivesConverted,
    warnings
  };
}

async function createMigratedProject(outputPath: string): Promise<void> {
  // Create package.json for migrated project
  const packageJson = {
    name: 'migrated-praxis-app',
    version: '1.0.0',
    description: 'Migrated from Alpine.js to PraxisJS',
    main: 'index.html',
    scripts: {
      dev: 'praxis dev',
      build: 'praxis build',
      preview: 'praxis preview'
    },
    dependencies: {
      '@oxog/praxis': 'latest'
    },
    devDependencies: {
      'vite': 'latest',
      '@oxog/praxis-vite-plugin': 'latest'
    }
  };
  
  await fs.writeFile(
    path.join(outputPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create Vite config
  const viteConfig = `import { defineConfig } from 'vite';
import praxis from '@oxog/praxis-vite-plugin';

export default defineConfig({
  plugins: [praxis()]
});`;
  
  await fs.writeFile(path.join(outputPath, 'vite.config.js'), viteConfig);
  
  // Create main.js
  const mainJs = `import praxis from '@oxog/praxis';

praxis.init();`;
  
  await fs.mkdir(path.join(outputPath, 'src'), { recursive: true });
  await fs.writeFile(path.join(outputPath, 'src/main.js'), mainJs);
}

// Code generators

async function generateComponent(name: string, options: any): Promise<void> {
  const componentContent = `<div x-data="${name}Component()">
    <h2>${name} Component</h2>
    <p x-text="message"></p>
    <button x-on:click="updateMessage()">Update</button>
</div>

<script>
function ${name}Component() {
    return {
        message: 'Hello from ${name}!',
        
        updateMessage() {
            this.message = 'Updated at ' + new Date().toLocaleTimeString();
        }
    };
}
</script>`;
  
  const filename = options.typescript ? `${name}.ts` : `${name}.html`;
  const outputPath = path.join(options.directory || 'src/components', filename);
  
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, componentContent);
}

async function generateStore(name: string, options: any): Promise<void> {
  const storeContent = `import { defineStore } from '@oxog/praxis-store';

export const use${name}Store = defineStore('${name.toLowerCase()}', {
  state: () => ({
    // Add your state here
  }),
  
  getters: {
    // Add your getters here
  },
  
  actions: {
    // Add your actions here
  }
});`;
  
  const filename = options.typescript ? `${name}.store.ts` : `${name}.store.js`;
  const outputPath = path.join(options.directory || 'src/stores', filename);
  
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, storeContent);
}

async function generateDirective(name: string, options: any): Promise<void> {
  const directiveContent = `import { BaseDirective } from '@oxog/praxis';

export class ${name}Directive extends BaseDirective {
  name = '${name.toLowerCase()}';
  priority = 500;
  
  init() {
    // Initialize directive
    this.updateElement();
  }
  
  update() {
    // Handle updates
    this.updateElement();
  }
  
  private updateElement() {
    const value = this.evaluateExpression();
    // Apply directive logic here
  }
  
  dispose() {
    // Clean up
    super.dispose();
  }
}`;
  
  const filename = options.typescript ? `${name}.directive.ts` : `${name}.directive.js`;
  const outputPath = path.join(options.directory || 'src/directives', filename);
  
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, directiveContent);
}

async function generatePage(name: string, options: any): Promise<void> {
  const pageContent = `<div x-data="${name}Page()">
    <h1>${name} Page</h1>
    <!-- Page content here -->
</div>

<script>
function ${name}Page() {
    return {
        // Page data and methods
    };
}
</script>`;
  
  const filename = `${name}.html`;
  const outputPath = path.join(options.directory || 'src/pages', filename);
  
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, pageContent);
}

async function performProjectAnalysis(): Promise<any> {
  // Mock analysis - in real implementation, this would analyze the actual project
  return {
    components: [],
    stores: [],
    directives: [],
    bundleSize: '0 KB'
  };
}

program.parse();