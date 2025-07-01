#!/bin/bash

# PraxisJS Release Script
# Automated NPM package publishing with comprehensive checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_NAME="@oxog/praxis"
REGISTRY="https://registry.npmjs.org/"

echo -e "${BLUE}⚡ PraxisJS Release Pipeline${NC}"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# Check if logged into NPM
if ! npm whoami > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Not logged into NPM. Please run 'npm login' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ NPM authenticated as: $(npm whoami)${NC}"

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Working directory not clean. Commit your changes first.${NC}"
    git status --short
    exit 1
fi

echo -e "${GREEN}✅ Working directory clean${NC}"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Current version: ${CURRENT_VERSION}${NC}"

# Check if version exists on NPM
if npm view $PACKAGE_NAME@$CURRENT_VERSION version > /dev/null 2>&1; then
    echo -e "${RED}❌ Version ${CURRENT_VERSION} already exists on NPM${NC}"
    echo -e "${YELLOW}💡 Update the version in package.json before releasing${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Version ${CURRENT_VERSION} is new${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci

# Run type checking
echo -e "${BLUE}🔍 Type checking...${NC}"
npm run typecheck

# Run linting
echo -e "${BLUE}🧹 Linting code...${NC}"
npm run lint

# Format check
echo -e "${BLUE}🎨 Checking code formatting...${NC}"
npm run format:check

# Build the project
echo -e "${BLUE}🔨 Building project...${NC}"
npm run build

# Run comprehensive tests
echo -e "${BLUE}🧪 Running tests...${NC}"
npm run test

# Run security tests
echo -e "${BLUE}🔒 Running security tests...${NC}"
npm run test:security

# Run accessibility tests  
echo -e "${BLUE}♿ Running accessibility tests...${NC}"
npm run test:accessibility

# Run performance tests
echo -e "${BLUE}⚡ Running performance tests...${NC}"
npm run test:performance

# Check bundle size
echo -e "${BLUE}📏 Checking bundle size...${NC}"
npm run size

# Generate documentation
echo -e "${BLUE}📚 Generating documentation...${NC}"
npm run docs:build

# Verify build outputs exist
REQUIRED_FILES=(
    "dist/praxis.js"
    "dist/praxis.esm.js" 
    "dist/praxis.min.js"
    "dist/index.d.ts"
    "README.md"
    "LICENSE"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing required file: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required files present${NC}"

# Check bundle sizes
MAIN_SIZE=$(stat -f%z "dist/praxis.min.js" 2>/dev/null || stat -c%s "dist/praxis.min.js" 2>/dev/null)
ESM_SIZE=$(stat -f%z "dist/praxis.esm.js" 2>/dev/null || stat -c%s "dist/praxis.esm.js" 2>/dev/null)

MAIN_SIZE_KB=$((MAIN_SIZE / 1024))
ESM_SIZE_KB=$((ESM_SIZE / 1024))

echo -e "${BLUE}📊 Bundle sizes:${NC}"
echo "  - Minified UMD: ${MAIN_SIZE_KB}KB"
echo "  - ES Module: ${ESM_SIZE_KB}KB"

if [ $MAIN_SIZE_KB -gt 10 ]; then
    echo -e "${YELLOW}⚠️  Warning: Minified bundle is larger than 10KB${NC}"
fi

# Show package contents
echo -e "${BLUE}📋 Package contents:${NC}"
npm pack --dry-run

# Final confirmation
echo ""
echo -e "${YELLOW}🚀 Ready to publish ${PACKAGE_NAME}@${CURRENT_VERSION}${NC}"
echo -e "${YELLOW}📊 Package size: ~$((MAIN_SIZE_KB + ESM_SIZE_KB))KB total${NC}"
echo ""

read -p "Do you want to proceed with publishing? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📦 Release cancelled${NC}"
    exit 0
fi

# Publish to NPM
echo -e "${BLUE}🚀 Publishing to NPM...${NC}"

if npm publish --access public; then
    echo -e "${GREEN}🎉 Successfully published ${PACKAGE_NAME}@${CURRENT_VERSION}!${NC}"
    
    # Create git tag
    echo -e "${BLUE}🏷️  Creating git tag...${NC}"
    git tag "v${CURRENT_VERSION}"
    git push origin "v${CURRENT_VERSION}"
    
    # Show success information
    echo ""
    echo -e "${GREEN}✅ Release Complete!${NC}"
    echo "=================================="
    echo -e "${BLUE}📦 Package:${NC} ${PACKAGE_NAME}@${CURRENT_VERSION}"
    echo -e "${BLUE}🔗 NPM:${NC} https://www.npmjs.com/package/${PACKAGE_NAME}"
    echo -e "${BLUE}🏷️  Tag:${NC} v${CURRENT_VERSION}"
    echo ""
    echo -e "${BLUE}📥 Install with:${NC}"
    echo "  npm install ${PACKAGE_NAME}"
    echo "  yarn add ${PACKAGE_NAME}"
    echo ""
    echo -e "${BLUE}🌐 CDN:${NC}"
    echo "  https://unpkg.com/${PACKAGE_NAME}@${CURRENT_VERSION}/dist/praxis.min.js"
    echo "  https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${CURRENT_VERSION}/dist/praxis.min.js"
    
else
    echo -e "${RED}❌ Failed to publish package${NC}"
    exit 1
fi