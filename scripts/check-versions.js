#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
        path: path.join(packagesDir, dir)
      });
    }
  }
  
  return packages;
}

function getPublishedVersion(packageName) {
  try {
    return execSync(`npm view ${packageName} version`, { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

function main() {
  const packages = getPackages();
  const changes = [];
  
  for (const pkg of packages) {
    const publishedVersion = getPublishedVersion(pkg.name);
    
    if (!publishedVersion || publishedVersion !== pkg.version) {
      changes.push({
        name: pkg.name,
        oldVersion: publishedVersion || 'unpublished',
        newVersion: pkg.version
      });
    }
  }
  
  // Set outputs for GitHub Actions
  if (process.env.CI) {
    console.log(`::set-output name=has_changes::${changes.length > 0}`);
    
    if (changes.length > 0) {
      const changelog = changes.map(c => 
        `- ${c.name}: ${c.oldVersion} → ${c.newVersion}`
      ).join('\n');
      
      console.log(`::set-output name=changelog::${changelog}`);
      console.log(`::set-output name=version::${new Date().toISOString().split('T')[0]}`);
    }
  }
  
  // Print summary
  if (changes.length > 0) {
    console.log('📦 Packages with version changes:');
    changes.forEach(c => {
      console.log(`  - ${c.name}: ${c.oldVersion} → ${c.newVersion}`);
    });
  } else {
    console.log('✓ All packages are up to date');
  }
}

main();