#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function getPackages() {
  const packagesDir = path.join(__dirname, '..', 'packages');
  const packages = [];
  
  if (!fs.existsSync(packagesDir)) {
    return packages;
  }
  
  const dirs = fs.readdirSync(packagesDir).filter(dir => {
    const pkgPath = path.join(packagesDir, dir, 'package.json');
    return fs.existsSync(pkgPath);
  });
  
  for (const dir of dirs) {
    const pkgPath = path.join(packagesDir, dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    if (!pkg.private) {
      packages.push({
        name: pkg.name,
        version: pkg.version,
        path: path.join(packagesDir, dir),
        packageJson: pkg
      });
    }
  }
  
  return packages;
}

function getPublishedVersion(packageName) {
  try {
    const info = exec(`npm view ${packageName} version`).trim();
    return info;
  } catch (error) {
    return null; // Package not published yet
  }
}

function needsPublish(pkg) {
  const publishedVersion = getPublishedVersion(pkg.name);
  
  if (!publishedVersion) {
    log(`📦 ${pkg.name} has never been published`, 'yellow');
    return true;
  }
  
  if (publishedVersion !== pkg.version) {
    log(`📦 ${pkg.name} needs publish: ${publishedVersion} -> ${pkg.version}`, 'yellow');
    return true;
  }
  
  log(`✓ ${pkg.name}@${pkg.version} is up to date`, 'green');
  return false;
}

async function publishPackage(pkg) {
  log(`\n🚀 Publishing ${pkg.name}@${pkg.version}...`, 'magenta');
  
  try {
    // Run tests if available
    if (pkg.packageJson.scripts?.test) {
      log('Running tests...', 'cyan');
      execSync('npm test', { cwd: pkg.path, stdio: 'inherit' });
      log('✓ Tests passed', 'green');
    }
    
    // Run build if available
    if (pkg.packageJson.scripts?.build) {
      log('Building package...', 'cyan');
      execSync('npm run build', { cwd: pkg.path, stdio: 'inherit' });
      log('✓ Build successful', 'green');
    }
    
    // Publish
    log('Publishing to npm...', 'cyan');
    execSync('npm publish --access public', { cwd: pkg.path, stdio: 'inherit' });
    log(`✓ Successfully published ${pkg.name}@${pkg.version}`, 'green');
    
    return true;
  } catch (error) {
    log(`✗ Failed to publish ${pkg.name}: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 Praxis CI Publisher', 'magenta');
  log('=====================\n', 'magenta');
  
  // Parse arguments
  const args = process.argv.slice(2);
  const shouldPublishAll = args.includes('--all');
  const packagesArg = args.find(arg => arg.startsWith('--packages='));
  const specificPackages = packagesArg ? packagesArg.split('=')[1].split(',') : [];
  
  // Get packages
  const allPackages = getPackages();
  
  if (allPackages.length === 0) {
    log('No packages found to publish', 'yellow');
    process.exit(0);
  }
  
  // Filter packages to publish
  let packagesToPublish = allPackages;
  
  if (!shouldPublishAll && specificPackages.length > 0) {
    packagesToPublish = allPackages.filter(pkg => 
      specificPackages.includes(pkg.name) || 
      specificPackages.includes(pkg.name.split('/').pop())
    );
  }
  
  // Check which packages need publishing
  const packagesNeedingPublish = packagesToPublish.filter(pkg => needsPublish(pkg));
  
  if (packagesNeedingPublish.length === 0) {
    log('\n✓ All packages are up to date!', 'green');
    process.exit(0);
  }
  
  log(`\n📦 Found ${packagesNeedingPublish.length} package(s) to publish:`, 'cyan');
  packagesNeedingPublish.forEach(pkg => {
    log(`  - ${pkg.name}@${pkg.version}`, 'blue');
  });
  
  // Publish packages
  const results = {
    success: [],
    failed: []
  };
  
  for (const pkg of packagesNeedingPublish) {
    const success = await publishPackage(pkg);
    if (success) {
      results.success.push(`${pkg.name}@${pkg.version}`);
    } else {
      results.failed.push(`${pkg.name}@${pkg.version}`);
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
    process.exit(1);
  }
  
  // Output for GitHub Actions
  if (process.env.CI) {
    console.log(`::set-output name=published_packages::${results.success.join(', ')}`);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`\n✗ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});

// Run
main().catch(error => {
  log(`\n✗ Error: ${error.message}`, 'red');
  process.exit(1);
});