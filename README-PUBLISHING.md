# 📦 Praxis Publishing Guide

This guide explains how to publish Praxis packages.

## 🚀 Quick Start

### Publish All Packages
```bash
npm run release:packages
```

### Publish Specific Package
```bash
cd packages/[package-name]
npm publish --access public
```

## 📋 Prerequisites

1. **NPM Authentication**
   ```bash
   npm login
   npm whoami  # Verify login
   ```

2. **Clean Working Directory**
   ```bash
   git status  # Should be clean
   ```

3. **Latest Code**
   ```bash
   git pull origin main
   ```

## 🔄 Automated Publishing

### Local Publishing Script
The interactive script guides you through publishing:
```bash
npm run release:packages
```

Features:
- ✅ Runs tests automatically
- ✅ Checks for version conflicts
- ✅ Builds packages before publish
- ✅ Dry-run before actual publish
- ✅ Interactive package selection

### GitHub Actions CI/CD
Automatic publishing on push to main:

1. **Setup NPM Token**
   - Get token from npm: `npm token create`
   - Add to GitHub: Settings → Secrets → `NPM_TOKEN`

2. **Trigger Publishing**
   - Push to main branch (auto)
   - Manual trigger via GitHub Actions tab

## 📦 Package Structure

```
packages/
├── cli/              # @oxog/praxis-cli
├── security/         # @oxog/praxis-security  
├── vite-plugin/      # @oxog/praxis-vite-plugin
└── webpack-loader/   # @oxog/praxis-webpack-loader
```

## 🏷️ Versioning

### Version Bump
```bash
# In package directory
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

### Lerna Version (All Packages)
```bash
lerna version patch
lerna version minor
lerna version major
```

## 📝 Publishing Checklist

Before publishing, ensure:

- [ ] Tests pass: `npm test`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Version bumped in package.json
- [ ] CHANGELOG updated
- [ ] Documentation updated
- [ ] No security vulnerabilities: `npm audit`

## 🛠️ Manual Publishing

### Individual Package
```bash
cd packages/[package-name]
npm test
npm run build
npm publish --access public
```

### All Packages with Lerna
```bash
lerna publish --access public
```

## 🐛 Troubleshooting

### Authentication Issues
```bash
npm logout
npm login
npm whoami
```

### Version Already Exists
```bash
# Check published versions
npm view @oxog/praxis-[package] versions

# Bump version
npm version patch
```

### Build Failures
```bash
# Clean and rebuild
npm run clean
npm run build
```

### Permission Denied
```bash
# Check package access
npm access ls-packages

# Grant access (owner only)
npm access grant read-write [username] @oxog/praxis-[package]
```

## 🔐 Security

1. **Use NPM Token** - Never commit tokens
2. **2FA Required** - Enable on npm account
3. **Audit Before Publish** - `npm audit fix`
4. **Sign Commits** - Use GPG signing

## 📊 Post-Publish

After publishing:

1. **Verify on NPM**
   ```bash
   npm view @oxog/praxis-[package]
   ```

2. **Test Installation**
   ```bash
   npm install @oxog/praxis-[package]
   ```

3. **Update Documentation**
   - README badges
   - Version references
   - Migration guides

4. **Create GitHub Release**
   ```bash
   gh release create v[version]
   ```

## 🚨 Emergency Unpublish

If needed (within 72 hours):
```bash
npm unpublish @oxog/praxis-[package]@[version]
```

**Warning**: Unpublishing is discouraged. Use `npm deprecate` instead:
```bash
npm deprecate @oxog/praxis-[package]@[version] "Security issue, please upgrade"
```