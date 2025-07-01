#!/bin/bash

# NPM Token-based Publishing Script for PraxisJS
# This script will use the provided NPM token to publish the package

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}⚡ PraxisJS NPM Publishing Script${NC}"
echo "====================================="

# Check if NPM_TOKEN is provided
if [ -z "$NPM_TOKEN" ]; then
    echo -e "${RED}❌ Error: NPM_TOKEN environment variable is required${NC}"
    echo -e "${YELLOW}💡 Usage: NPM_TOKEN=your_token_here ./scripts/publish-npm.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ NPM Token provided${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found package.json${NC}"

# Set NPM registry and token
echo -e "${BLUE}🔧 Configuring NPM...${NC}"
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
echo "registry=https://registry.npmjs.org/" >> ~/.npmrc

# Verify NPM authentication
if npm whoami > /dev/null 2>&1; then
    echo -e "${GREEN}✅ NPM authenticated as: $(npm whoami)${NC}"
else
    echo -e "${RED}❌ Failed to authenticate with NPM${NC}"
    exit 1
fi

# Get package info
PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

echo -e "${BLUE}📦 Package: ${PACKAGE_NAME}@${PACKAGE_VERSION}${NC}"

# Check if version already exists
if npm view "$PACKAGE_NAME@$PACKAGE_VERSION" version > /dev/null 2>&1; then
    echo -e "${RED}❌ Version ${PACKAGE_VERSION} already exists on NPM${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Version ${PACKAGE_VERSION} is new${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci

# Run comprehensive tests
echo -e "${BLUE}🧪 Running all tests...${NC}"

echo -e "${BLUE}  🔍 Type checking...${NC}"
npm run typecheck

echo -e "${BLUE}  🧹 Linting...${NC}"
npm run lint

echo -e "${BLUE}  🎨 Format checking...${NC}"
npm run format:check

echo -e "${BLUE}  🧪 Unit tests...${NC}"
npm run test

echo -e "${BLUE}  🔒 Security tests...${NC}"
npm run test:security

echo -e "${BLUE}  ♿ Accessibility tests...${NC}"
npm run test:accessibility

echo -e "${BLUE}  ⚡ Performance tests...${NC}"
npm run test:performance

echo -e "${GREEN}✅ All tests passed${NC}"

# Build the project
echo -e "${BLUE}🔨 Building project...${NC}"
npm run build

# Verify build outputs
REQUIRED_FILES=(
    "dist/praxis.js"
    "dist/praxis.esm.js"
    "dist/praxis.min.js"
    "dist/index.d.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing required file: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All build files present${NC}"

# Check bundle sizes
echo -e "${BLUE}📏 Checking bundle sizes...${NC}"
npm run size

# Show what will be published
echo -e "${BLUE}📋 Package contents preview:${NC}"
npm pack --dry-run

# Calculate total package size
TOTAL_SIZE=$(npm pack --dry-run | grep "total files:" | awk '{print $6}')
echo -e "${BLUE}📊 Total package size: ${TOTAL_SIZE}${NC}"

# Final confirmation
echo ""
echo -e "${YELLOW}🚀 Ready to publish ${PACKAGE_NAME}@${PACKAGE_VERSION}${NC}"
echo ""

# Publish to NPM (no interaction needed with token)
echo -e "${BLUE}🚀 Publishing to NPM...${NC}"

if npm publish --access public; then
    echo ""
    echo -e "${GREEN}🎉 Successfully published ${PACKAGE_NAME}@${PACKAGE_VERSION}!${NC}"
    
    # Show success information
    echo "====================================="
    echo -e "${BLUE}📦 Package:${NC} ${PACKAGE_NAME}@${PACKAGE_VERSION}"
    echo -e "${BLUE}🔗 NPM:${NC} https://www.npmjs.com/package/${PACKAGE_NAME}"
    echo ""
    echo -e "${BLUE}📥 Install with:${NC}"
    echo "  npm install ${PACKAGE_NAME}"
    echo "  yarn add ${PACKAGE_NAME}"
    echo ""
    echo -e "${BLUE}🌐 CDN URLs:${NC}"
    echo "  https://unpkg.com/${PACKAGE_NAME}@${PACKAGE_VERSION}/dist/praxis.min.js"
    echo "  https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${PACKAGE_VERSION}/dist/praxis.min.js"
    echo ""
    echo -e "${BLUE}📖 Documentation:${NC}"
    echo "  https://praxis.com"
    echo "  https://docs.praxis.com"
    echo ""
    echo -e "${GREEN}✨ Package is now live on NPM!${NC}"
    
else
    echo -e "${RED}❌ Failed to publish package${NC}"
    exit 1
fi

# Cleanup NPM config
echo -e "${BLUE}🧹 Cleaning up...${NC}"
rm -f ~/.npmrc

echo -e "${GREEN}✅ Cleanup complete${NC}"