#!/usr/bin/env node

// PraxisJS Standalone Compiler CLI

import { Command } from 'commander';
import { CoralCompiler, CompilerOptions } from './compiler.js';
import { generateOptimizationReport } from './optimizer/optimizer.js';
import fs from 'fs/promises';
import path from 'path';
import glob from 'glob';
import chalk from 'chalk';

const program = new Command();

interface CLIOptions {
  output?: string;
  mode?: 'development' | 'production';
  optimize?: boolean;
  minify?: boolean;
  sourcemap?: boolean;
  watch?: boolean;
  verbose?: boolean;
  report?: boolean;
  ssr?: boolean;
  config?: string;
}

program
  .name('praxis-compile')
  .description('PraxisJS Template Compiler')
  .version('1.0.0');

program
  .command('compile <input>')
  .description('Compile praxis templates')
  .option('-o, --output <dir>', 'Output directory', 'dist')
  .option('-m, --mode <mode>', 'Compilation mode (development|production)', 'production')
  .option('--optimize', 'Enable optimizations', true)
  .option('--no-optimize', 'Disable optimizations')
  .option('--minify', 'Minify output', true)
  .option('--no-minify', 'Disable minification')
  .option('--sourcemap', 'Generate source maps', false)
  .option('-w, --watch', 'Watch for changes', false)
  .option('-v, --verbose', 'Verbose output', false)
  .option('-r, --report', 'Generate optimization report', false)
  .option('--ssr', 'Enable SSR compilation', false)
  .option('-c, --config <file>', 'Configuration file')
  .action(async (input: string, options: CLIOptions) => {
    try {
      await compileCommand(input, options);
    } catch (error) {
      console.error(chalk.red('Compilation failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('dev <input>')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('--host <host>', 'Server host', 'localhost')
  .action(async (input: string, options: { port: string; host: string }) => {
    try {
      await devCommand(input, options);
    } catch (error) {
      console.error(chalk.red('Dev server failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('analyze <input>')
  .description('Analyze template complexity and optimization opportunities')
  .action(async (input: string) => {
    try {
      await analyzeCommand(input);
    } catch (error) {
      console.error(chalk.red('Analysis failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

async function compileCommand(input: string, options: CLIOptions) {
  const config = await loadConfig(options.config);
  const compilerOptions = mergeOptions(config, options);
  
  if (options.verbose) {
    console.log(chalk.blue('PraxisJS Compiler'));
    console.log(chalk.gray(`Input: ${input}`));
    console.log(chalk.gray(`Output: ${options.output}`));
    console.log(chalk.gray(`Mode: ${options.mode}`));
  }
  
  const files = await getInputFiles(input);
  
  if (files.length === 0) {
    throw new Error(`No files found matching pattern: ${input}`);
  }
  
  if (options.verbose) {
    console.log(chalk.gray(`Found ${files.length} file(s) to compile`));
  }
  
  const compiler = new CoralCompiler(compilerOptions);
  const results = [];
  
  for (const file of files) {
    if (options.verbose) {
      console.log(chalk.gray(`Compiling: ${file}`));
    }
    
    const source = await fs.readFile(file, 'utf-8');
    const result = compiler.compile(source, file);
    
    if (result.errors.length > 0) {
      console.error(chalk.red(`Errors in ${file}:`));
      result.errors.forEach(error => {
        console.error(chalk.red(`  ${error.message}`));
      });
      continue;
    }
    
    if (result.warnings.length > 0 && options.verbose) {
      console.warn(chalk.yellow(`Warnings in ${file}:`));
      result.warnings.forEach(warning => {
        console.warn(chalk.yellow(`  ${warning.message}`));
      });
    }
    
    results.push({ file, result });
  }
  
  // Write output files
  await writeResults(results, options);
  
  // Generate reports
  if (options.report) {
    await generateReports(results, options);
  }
  
  if (options.watch) {
    startWatcher(files, compiler, options);
  }
  
  console.log(chalk.green(`✓ Compiled ${results.length} file(s) successfully`));
}

async function devCommand(input: string, options: { port: string; host: string }) {
  const express = await import('express');
  const chokidar = await import('chokidar');
  const WebSocket = await import('ws');
  
  const app = express.default();
  const server = require('http').createServer(app);
  const wss = new WebSocket.WebSocketServer({ server });
  
  const compiler = new CoralCompiler({
    codegen: { mode: 'development', minify: false },
    optimize: { aggressive: false }
  });
  
  // Serve static files
  app.use(express.default.static('.'));
  
  // Handle praxis template requests
  app.get('*.praxis', async (req, res) => {
    try {
      const filePath = path.join(process.cwd(), req.path);
      const source = await fs.readFile(filePath, 'utf-8');
      const result = compiler.compile(source, filePath);
      
      if (result.errors.length > 0) {
        res.status(500).json({ errors: result.errors });
        return;
      }
      
      res.setHeader('Content-Type', 'application/javascript');
      res.send(result.code);
    } catch (error) {
      res.status(404).send('File not found');
    }
  });
  
  // WebSocket for hot reload
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
    });
  });
  
  // Watch for file changes
  const watcher = chokidar.watch(input, { ignored: /node_modules/ });
  
  watcher.on('change', async (filePath) => {
    console.log(chalk.blue(`File changed: ${filePath}`));
    
    try {
      const source = await fs.readFile(filePath, 'utf-8');
      const result = compiler.compile(source, filePath);
      
      // Notify clients
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'file-changed',
            file: filePath,
            code: result.code,
            errors: result.errors
          }));
        }
      });
    } catch (error) {
      console.error(chalk.red(`Error recompiling ${filePath}:`), error);
    }
  });
  
  server.listen(parseInt(options.port), options.host, () => {
    console.log(chalk.green(`Dev server running at http://${options.host}:${options.port}`));
  });
}

async function analyzeCommand(input: string) {
  const { analyzeTemplateComplexity } = await import('./optimizer/optimizer.js');
  
  const files = await getInputFiles(input);
  
  if (files.length === 0) {
    throw new Error(`No files found matching pattern: ${input}`);
  }
  
  console.log(chalk.blue('Template Analysis Report'));
  console.log(chalk.blue('='.repeat(25)));
  
  for (const file of files) {
    const source = await fs.readFile(file, 'utf-8');
    const compiler = new CoralCompiler();
    const result = compiler.compile(source, file);
    
    if (result.errors.length > 0) {
      console.log(chalk.red(`\n${file}: Compilation failed`));
      continue;
    }
    
    const analysis = analyzeTemplateComplexity(result.ast);
    
    console.log(chalk.cyan(`\n${file}:`));
    console.log(`  Nodes: ${analysis.nodeCount}`);
    console.log(`  Directives: ${analysis.directiveCount}`);
    console.log(`  Dynamic nodes: ${analysis.dynamicNodeCount}`);
    console.log(`  Static nodes: ${analysis.staticNodeCount}`);
    console.log(`  Max depth: ${analysis.maxDepth}`);
    
    const staticRatio = (analysis.staticNodeCount / analysis.nodeCount) * 100;
    console.log(`  Static ratio: ${staticRatio.toFixed(1)}%`);
    
    if (staticRatio < 50) {
      console.log(chalk.yellow('  ⚠ Low static content ratio - consider optimizations'));
    } else {
      console.log(chalk.green('  ✓ Good static content ratio'));
    }
    
    if (result.optimization) {
      console.log(chalk.gray('\n  Optimization impact:'));
      console.log(chalk.gray(`    Reduction: ${result.optimization.stats.reductionPercentage.toFixed(1)}%`));
      console.log(chalk.gray(`    Hoisted: ${result.optimization.stats.hoistedNodes} nodes`));
    }
  }
}

async function getInputFiles(input: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(input, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
}

async function loadConfig(configPath?: string): Promise<CompilerOptions> {
  if (!configPath) {
    // Try to find default config files
    const defaultConfigs = ['praxis.config.js', 'praxis.config.json'];
    
    for (const config of defaultConfigs) {
      try {
        await fs.access(config);
        configPath = config;
        break;
      } catch {
        // Config file doesn't exist
      }
    }
  }
  
  if (!configPath) {
    return {};
  }
  
  try {
    if (configPath.endsWith('.json')) {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } else {
      // JavaScript config
      const config = await import(path.resolve(configPath));
      return config.default || config;
    }
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not load config file ${configPath}`));
    return {};
  }
}

function mergeOptions(config: CompilerOptions, cliOptions: CLIOptions): CompilerOptions {
  return {
    ...config,
    codegen: {
      mode: cliOptions.mode,
      minify: cliOptions.minify,
      sourceMaps: cliOptions.sourcemap,
      ssr: cliOptions.ssr,
      ...config.codegen
    },
    optimize: {
      ...config.optimize,
      aggressive: cliOptions.optimize && cliOptions.mode === 'production'
    }
  };
}

async function writeResults(results: Array<{ file: string; result: any }>, options: CLIOptions) {
  const outputDir = options.output!;
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  for (const { file, result } of results) {
    const outputFile = path.join(outputDir, path.basename(file, path.extname(file)) + '.js');
    await fs.writeFile(outputFile, result.code);
    
    if (options.sourcemap && result.map) {
      await fs.writeFile(outputFile + '.map', JSON.stringify(result.map));
    }
  }
}

async function generateReports(results: Array<{ file: string; result: any }>, options: CLIOptions) {
  const reportDir = path.join(options.output!, 'reports');
  await fs.mkdir(reportDir, { recursive: true });
  
  for (const { file, result } of results) {
    if (result.optimization) {
      const report = generateOptimizationReport(result.optimization);
      const reportFile = path.join(reportDir, path.basename(file, path.extname(file)) + '.report.txt');
      await fs.writeFile(reportFile, report);
    }
  }
}

function startWatcher(files: string[], compiler: CoralCompiler, options: CLIOptions) {
  const chokidar = require('chokidar');
  
  console.log(chalk.blue('Watching for changes...'));
  
  const watcher = chokidar.watch(files, {
    ignored: /node_modules/,
    persistent: true
  });
  
  watcher.on('change', async (filePath: string) => {
    console.log(chalk.blue(`File changed: ${filePath}`));
    
    try {
      const source = await fs.readFile(filePath, 'utf-8');
      const result = compiler.compile(source, filePath);
      
      if (result.errors.length > 0) {
        console.error(chalk.red(`Errors in ${filePath}:`));
        result.errors.forEach(error => {
          console.error(chalk.red(`  ${error.message}`));
        });
        return;
      }
      
      await writeResults([{ file: filePath, result }], options);
      console.log(chalk.green(`✓ Recompiled ${filePath}`));
      
    } catch (error) {
      console.error(chalk.red(`Error recompiling ${filePath}:`), error);
    }
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nCompilation interrupted'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\nCompilation terminated'));
  process.exit(0);
});

program.parse();