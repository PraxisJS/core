#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe', ...options });
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function execWithOutput(command, options = {}) {
  try {
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    return false;
  }
}

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function getPackages() {
  const packagesDir = path.join(__dirname, '..', 'packages');
  const packages = [];
  
  // Get all packages
  const dirs = fs.readdirSync(packagesDir).filter(dir => {
    const pkgPath = path.join(packagesDir, dir, 'package.json');
    return fs.existsSync(pkgPath);
  });
  
  for (const dir of dirs) {
    const pkgPath = path.join(packagesDir, dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    packages.push({
      name: pkg.name,
      version: pkg.version,
      path: path.join(packagesDir, dir),
      private: pkg.private || false
    });
  }
  
  return packages;
}

async function checkNpmAuth() {
  try {
    const whoami = exec('npm whoami').trim();
    log(`✓ Authenticated as: ${whoami}`, 'green');
    return true;
  } catch (error) {
    log('✗ Not authenticated with npm', 'red');
    log('Please run: npm login', 'yellow');
    return false;
  }
}

async function runTests(packagePath) {
  log('\n📋 Running tests...', 'cyan');
  
  try {
    // Run tests
    const hasTests = fs.existsSync(path.join(packagePath, 'package.json')) && 
                    JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8')).scripts?.test;
    
    if (hasTests) {
      execWithOutput('npm test', { cwd: packagePath });
      log('✓ Tests passed', 'green');
    } else {
      log('⚠ No tests found', 'yellow');
    }
    
    return true;
  } catch (error) {
    log('✗ Tests failed', 'red');
    return false;
  }
}

async function runLint(packagePath) {
  log('\n🔍 Running linter...', 'cyan');
  
  try {
    const hasLint = fs.existsSync(path.join(packagePath, 'package.json')) && 
                    JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8')).scripts?.lint;
    
    if (hasLint) {
      execWithOutput('npm run lint', { cwd: packagePath });
      log('✓ Lint passed', 'green');
    } else {
      log('⚠ No lint script found', 'yellow');
    }
    
    return true;
  } catch (error) {
    log('✗ Lint failed', 'red');
    return false;
  }
}

async function buildPackage(packagePath) {
  log('\n🔨 Building package...', 'cyan');
  
  try {
    const hasBuild = fs.existsSync(path.join(packagePath, 'package.json')) && 
                     JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8')).scripts?.build;
    
    if (hasBuild) {
      execWithOutput('npm run build', { cwd: packagePath });
      log('✓ Build successful', 'green');
    } else {
      log('⚠ No build script found', 'yellow');
    }
    
    return true;
  } catch (error) {
    log('✗ Build failed', 'red');
    return false;
  }
}

async function checkGitStatus(packagePath) {
  try {
    const status = exec('git status --porcelain', { cwd: packagePath });
    if (status.trim()) {
      log('⚠ Uncommitted changes detected', 'yellow');
      const proceed = await question('Continue anyway? (y/n): ');
      return proceed.toLowerCase() === 'y';
    }
    return true;
  } catch (error) {
    // Not a git repo or git not available
    return true;
  }
}

async function getPublishedVersion(packageName) {
  try {
    const info = exec(`npm view ${packageName} version`);
    return info.trim();
  } catch (error) {
    return null; // Package not published yet
  }
}

async function publishPackage(pkg) {
  log(`\n📦 Publishing ${pkg.name}@${pkg.version}...`, 'magenta');
  
  // Check if already published
  const publishedVersion = await getPublishedVersion(pkg.name);
  if (publishedVersion === pkg.version) {
    log(`✓ ${pkg.name}@${pkg.version} is already published`, 'green');
    return true;
  }
  
  // Check git status
  const gitOk = await checkGitStatus(pkg.path);
  if (!gitOk) {
    log('⚠ Skipping due to git status', 'yellow');
    return false;
  }
  
  // Run tests
  const testsOk = await runTests(pkg.path);
  if (!testsOk) {
    const proceed = await question('Tests failed. Continue anyway? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      return false;
    }
  }
  
  // Run lint
  const lintOk = await runLint(pkg.path);
  if (!lintOk) {
    const proceed = await question('Lint failed. Continue anyway? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      return false;
    }
  }
  
  // Build package
  const buildOk = await buildPackage(pkg.path);
  if (!buildOk) {
    log('✗ Cannot publish without successful build', 'red');
    return false;
  }
  
  // Dry run first
  log('\n🧪 Running dry-run...', 'cyan');
  try {
    exec('npm publish --dry-run', { cwd: pkg.path });
    log('✓ Dry run successful', 'green');
  } catch (error) {
    log('✗ Dry run failed', 'red');
    console.error(error.message);
    return false;
  }
  
  // Confirm publish
  const confirm = await question(`\nPublish ${pkg.name}@${pkg.version}? (y/n): `);
  if (confirm.toLowerCase() !== 'y') {
    log('⚠ Skipped', 'yellow');
    return false;
  }
  
  // Publish
  try {
    execWithOutput('npm publish --access public', { cwd: pkg.path });
    log(`✓ Successfully published ${pkg.name}@${pkg.version}`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed to publish ${pkg.name}`, 'red');
    console.error(error.message);
    return false;
  }
}

async function main() {
  log('🚀 Praxis Package Publisher', 'magenta');
  log('==========================\n', 'magenta');
  
  // Check npm auth
  const isAuthenticated = await checkNpmAuth();
  if (!isAuthenticated) {
    process.exit(1);
  }
  
  // Get packages
  const packages = await getPackages();
  const publishablePackages = packages.filter(pkg => !pkg.private);
  
  log(`\nFound ${publishablePackages.length} publishable packages:`, 'cyan');
  publishablePackages.forEach(pkg => {
    log(`  - ${pkg.name}@${pkg.version}`, 'blue');
  });
  
  // Ask what to publish
  const choice = await question('\nWhat would you like to publish?\n1) All packages\n2) Select packages\n3) Exit\n\nChoice (1-3): ');
  
  let packagesToPublish = [];
  
  if (choice === '1') {
    packagesToPublish = publishablePackages;
  } else if (choice === '2') {
    log('\nSelect packages to publish:', 'cyan');
    for (let i = 0; i < publishablePackages.length; i++) {
      const pkg = publishablePackages[i];
      const publish = await question(`${i + 1}) Publish ${pkg.name}@${pkg.version}? (y/n): `);
      if (publish.toLowerCase() === 'y') {
        packagesToPublish.push(pkg);
      }
    }
  } else {
    log('\nExiting...', 'yellow');
    rl.close();
    return;
  }
  
  if (packagesToPublish.length === 0) {
    log('\nNo packages selected', 'yellow');
    rl.close();
    return;
  }
  
  // Publish packages
  log(`\n📦 Publishing ${packagesToPublish.length} package(s)...`, 'magenta');
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const pkg of packagesToPublish) {
    const success = await publishPackage(pkg);
    if (success) {
      results.success.push(pkg.name);
    } else {
      results.failed.push(pkg.name);
    }
  }
  
  // Summary
  log('\n📊 Summary', 'magenta');
  log('==========', 'magenta');
  
  if (results.success.length > 0) {
    log(`\n✓ Successfully published:`, 'green');
    results.success.forEach(name => log(`  - ${name}`, 'green'));
  }
  
  if (results.failed.length > 0) {
    log(`\n✗ Failed to publish:`, 'red');
    results.failed.forEach(name => log(`  - ${name}`, 'red'));
  }
  
  rl.close();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`\n✗ Unexpected error: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});

// Run
main().catch(error => {
  log(`\n✗ Error: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});