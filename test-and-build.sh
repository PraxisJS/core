#!/bin/bash

# PraxisJS Complete Test and Build Script
# This script runs all tests and builds the package ready for NPM publishing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}⚡ PraxisJS Test & Build Pipeline${NC}"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found package.json${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Check TypeScript configuration
echo -e "${BLUE}🔍 Type checking...${NC}"
if npm run typecheck; then
    echo -e "${GREEN}✅ TypeScript check passed${NC}"
else
    echo -e "${RED}❌ TypeScript check failed${NC}"
    exit 1
fi

# Check code formatting
echo -e "${BLUE}🎨 Checking code formatting...${NC}"
if npm run format:check; then
    echo -e "${GREEN}✅ Code formatting is correct${NC}"
else
    echo -e "${YELLOW}⚠️  Code formatting issues found. Auto-fixing...${NC}"
    npm run format
    echo -e "${GREEN}✅ Code formatting fixed${NC}"
fi

# Run linting
echo -e "${BLUE}🧹 Linting code...${NC}"
if npm run lint; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${YELLOW}⚠️  Linting issues found. Attempting auto-fix...${NC}"
    npm run lint:fix || true
    echo -e "${YELLOW}💡 Please review and fix remaining linting issues${NC}"
fi

# Run unit tests
echo -e "${BLUE}🧪 Running unit tests...${NC}"
if npm run test; then
    echo -e "${GREEN}✅ Unit tests passed${NC}"
else
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
fi

# Run security tests
echo -e "${BLUE}🔒 Running security tests...${NC}"
if npm run test:security; then
    echo -e "${GREEN}✅ Security tests passed${NC}"
else
    echo -e "${RED}❌ Security tests failed${NC}"
    exit 1
fi

# Run accessibility tests
echo -e "${BLUE}♿ Running accessibility tests...${NC}"
if npm run test:accessibility; then
    echo -e "${GREEN}✅ Accessibility tests passed${NC}"
else
    echo -e "${RED}❌ Accessibility tests failed${NC}"
    exit 1
fi

# Run performance tests
echo -e "${BLUE}⚡ Running performance tests...${NC}"
if npm run test:performance; then
    echo -e "${GREEN}✅ Performance tests passed${NC}"
else
    echo -e "${RED}❌ Performance tests failed${NC}"
    exit 1
fi

# Generate test coverage report
echo -e "${BLUE}📊 Generating coverage report...${NC}"
npm run test:coverage

# Build the project
echo -e "${BLUE}🔨 Building project...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Check bundle sizes
echo -e "${BLUE}📏 Checking bundle sizes...${NC}"
if npm run size; then
    echo -e "${GREEN}✅ Bundle sizes are within limits${NC}"
else
    echo -e "${YELLOW}⚠️  Bundle sizes may be too large${NC}"
fi

# Verify all required files are present
echo -e "${BLUE}🔍 Verifying build outputs...${NC}"
REQUIRED_FILES=(
    "dist/praxis.js"
    "dist/praxis.esm.js"
    "dist/praxis.min.js"
    "dist/index.d.ts"
    "README.md"
    "LICENSE"
)

ALL_FILES_PRESENT=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing required file: $file${NC}"
        ALL_FILES_PRESENT=false
    else
        echo -e "${GREEN}✅ Found: $file${NC}"
    fi
done

if [ "$ALL_FILES_PRESENT" = false ]; then
    echo -e "${RED}❌ Some required files are missing${NC}"
    exit 1
fi

# Show package info
PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

echo ""
echo -e "${GREEN}🎉 All tests and build completed successfully!${NC}"
echo "============================================="
echo -e "${BLUE}📦 Package:${NC} ${PACKAGE_NAME}@${PACKAGE_VERSION}"
echo ""

# Show file sizes
echo -e "${BLUE}📊 Build Statistics:${NC}"
if [ -f "dist/praxis.min.js" ]; then
    MIN_SIZE=$(wc -c < "dist/praxis.min.js" | awk '{print int($1/1024)}')
    echo -e "  Minified UMD: ${MIN_SIZE}KB"
fi

if [ -f "dist/praxis.esm.js" ]; then
    ESM_SIZE=$(wc -c < "dist/praxis.esm.js" | awk '{print int($1/1024)}')
    echo -e "  ES Module: ${ESM_SIZE}KB"
fi

if [ -f "dist/praxis.js" ]; then
    UMD_SIZE=$(wc -c < "dist/praxis.js" | awk '{print int($1/1024)}')
    echo -e "  UMD: ${UMD_SIZE}KB"
fi

echo ""
echo -e "${BLUE}📦 Package Contents:${NC}"
npm pack --dry-run | head -20

echo ""
echo -e "${GREEN}✅ Package is ready for publishing!${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "  1. Review the build outputs in the 'dist' directory"
echo "  2. Test the package locally: npm pack && npm install praxis-*.tgz"
echo "  3. When ready to publish, provide your NPM token:"
echo "     NPM_TOKEN=your_token ./scripts/publish-npm.sh"
echo ""
echo -e "${BLUE}🌐 Resources:${NC}"
echo "  📖 Documentation: ./docs/"
echo "  🧪 Test Results: ./coverage/"
echo "  📦 Build Output: ./dist/"