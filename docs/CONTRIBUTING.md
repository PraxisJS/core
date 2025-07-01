# Contributing to PraxisJS

Thank you for your interest in contributing to PraxisJS! This guide will help you get started with contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Documentation](#documentation)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)
- [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A GitHub account

### Quick Start

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/praxisjs.git
   cd praxisjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

## Development Setup

### Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Configure for development
NODE_ENV=development
CORAL_DEBUG=true
CORAL_PERFORMANCE_PROFILING=true
```

### IDE Setup

#### VS Code (Recommended)

Install the recommended extensions:
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- PraxisJS Language Support

#### Configuration

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Project Structure

```
praxisjs/
├── src/                     # Source code
│   ├── core/               # Core reactivity system
│   │   ├── signal.ts       # Signal implementation
│   │   ├── effect.ts       # Effect system
│   │   ├── component.ts    # Component management
│   │   └── scheduler.ts    # Update scheduling
│   ├── directives/         # Directive implementations
│   │   ├── core.ts        # Core directives
│   │   ├── advanced.ts    # Advanced directives
│   │   └── base.ts        # Base directive interface
│   ├── dom/               # DOM utilities
│   ├── store/             # State management
│   ├── security/          # Security features
│   ├── compiler/          # Template compilation
│   └── testing/           # Testing utilities
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # End-to-end tests
│   └── performance/      # Performance benchmarks
├── docs/                 # Documentation
├── examples/             # Example applications
├── tools/                # Development tools
│   ├── cli/             # CLI implementation
│   ├── vite-plugin/     # Vite plugin
│   └── webpack-loader/  # Webpack loader
└── benchmarks/          # Performance benchmarks
```

## Development Workflow

### 1. Choose an Issue

- Check the [issue tracker](https://github.com/praxis-js/core/issues)
- Look for issues labeled `good first issue` for beginners
- Comment on the issue to let others know you're working on it

### 2. Create a Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 3. Development

#### Core Development

When working on core features:

```typescript
// Example: Adding a new directive
// src/directives/my-directive.ts

import { Directive, DirectiveBinding } from './base';

export const MyDirective: Directive = {
  name: 'my-directive',
  priority: 100,
  
  bind(el: Element, binding: DirectiveBinding, component: Component) {
    // Implementation
  },
  
  update(el: Element, binding: DirectiveBinding, component: Component) {
    // Update logic
  },
  
  unbind(el: Element, binding: DirectiveBinding, component: Component) {
    // Cleanup
  }
};
```

#### Testing During Development

```bash
# Run specific test file
npm test -- my-directive.test.ts

# Run tests in watch mode
npm run test:watch

# Run performance benchmarks
npm run benchmark
```

### 4. Documentation

Update documentation for any user-facing changes:

```bash
# Update API documentation
npm run docs:api

# Update usage examples
npm run docs:examples

# Build documentation
npm run docs:build
```

## Testing

### Test Types

#### Unit Tests

```typescript
// tests/unit/directives/my-directive.test.ts
import { mount } from '@praxisjs/testing';
import { MyDirective } from '../../../src/directives/my-directive';

describe('MyDirective', () => {
  test('should handle basic functionality', async () => {
    const { component, element } = mount(`
      <div x-my-directive="value">Content</div>
    `, {
      data: { value: 'test' }
    });
    
    expect(element.textContent).toBe('test');
  });
});
```

#### Integration Tests

```typescript
// tests/integration/component-lifecycle.test.ts
import { praxisjs } from '../../src/praxisjs';

describe('Component Lifecycle', () => {
  test('should call lifecycle hooks in correct order', async () => {
    const calls: string[] = [];
    
    const component = praxisjs.component(() => ({
      init() { calls.push('init'); },
      mounted() { calls.push('mounted'); },
      updated() { calls.push('updated'); },
      destroyed() { calls.push('destroyed'); }
    }));
    
    // Test lifecycle...
    expect(calls).toEqual(['init', 'mounted']);
  });
});
```

#### E2E Tests

```typescript
// tests/e2e/showcase.test.ts
import { test, expect } from '@playwright/test';

test('showcase application works correctly', async ({ page }) => {
  await page.goto('/examples/showcase-app/');
  
  // Test counter functionality
  await page.click('[data-testid="increment"]');
  await expect(page.locator('[data-testid="count"]')).toHaveText('1');
});
```

#### Performance Tests

```typescript
// tests/performance/reactivity.bench.ts
import { benchmark } from '../utils/benchmark';
import { signal, computed, effect } from '../../src/core/signal';

benchmark('Signal Performance', () => {
  const count = signal(0);
  const doubled = computed(() => count.value * 2);
  
  return {
    'signal update': () => {
      count.value++;
    },
    'computed evaluation': () => {
      return doubled.value;
    }
  };
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run performance benchmarks
npm run benchmark

# Run tests in CI mode
npm run test:ci
```

## Documentation

### Types of Documentation

1. **API Documentation**: Generated from TypeScript comments
2. **Usage Guides**: Hand-written guides in `/docs`
3. **Examples**: Working examples in `/examples`
4. **README**: Project overview and quick start

### Writing Documentation

#### API Documentation

Use TSDoc comments for API documentation:

```typescript
/**
 * Creates a reactive signal with the given initial value.
 * 
 * @param initialValue - The initial value for the signal
 * @returns A reactive signal
 * 
 * @example
 * ```typescript
 * const count = signal(0);
 * console.log(count.value); // 0
 * count.value = 5;
 * console.log(count.value); // 5
 * ```
 */
export function signal<T>(initialValue: T): Signal<T> {
  return new SignalImpl(initialValue);
}
```

#### Usage Guides

Follow this structure for guides:

```markdown
# Guide Title

Brief introduction explaining what this guide covers.

## Prerequisites

What the reader should know before starting.

## Step-by-Step Instructions

### Step 1: Title
Clear explanation with code examples.

### Step 2: Title
Continue with next step.

## Common Issues

Problems users might encounter and solutions.

## Next Steps

What to read/learn next.
```

#### Examples

Create complete, working examples:

```html
<!-- examples/feature-name/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Feature Name Example</title>
  <script src="../../dist/praxisjs.min.js"></script>
</head>
<body>
  <div x-data="exampleComponent()">
    <!-- Example implementation -->
  </div>
  
  <script>
    function exampleComponent() {
      return {
        // Component logic
      };
    }
    
    praxis.start();
  </script>
</body>
</html>
```

## Code Style

### TypeScript Guidelines

#### Naming Conventions

```typescript
// Classes: PascalCase
class ComponentManager {}

// Functions/Variables: camelCase
function createComponent() {}
const componentData = {};

// Constants: SCREAMING_SNAKE_CASE
const DEFAULT_PRIORITY = 100;

// Types/Interfaces: PascalCase
interface DirectiveConfig {}
type ComponentData = {};

// Files: kebab-case
// component-manager.ts
// directive-parser.ts
```

#### Code Organization

```typescript
// 1. Imports (external first, then internal)
import { EventEmitter } from 'events';
import { Signal } from './signal';

// 2. Types and interfaces
interface ComponentOptions {
  data?: any;
  methods?: any;
}

// 3. Constants
const DEFAULT_OPTIONS: ComponentOptions = {};

// 4. Implementation
export class Component {
  // Implementation
}

// 5. Default export (if applicable)
export default Component;
```

#### Error Handling

```typescript
// Use custom error classes
class CoralError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CoralError';
  }
}

// Provide helpful error messages
function validateExpression(expression: string): void {
  if (!expression.trim()) {
    throw new CoralError(
      'Expression cannot be empty. Please provide a valid JavaScript expression.',
      'INVALID_EXPRESSION'
    );
  }
}
```

### Formatting

The project uses Prettier for code formatting:

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Linting

ESLint configuration enforces code quality:

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

## Submitting Changes

### 1. Commit Guidelines

Follow conventional commit format:

```
type(scope): description

body (optional)

footer (optional)
```

Examples:
```bash
feat(directives): add x-intersect directive
fix(core): resolve memory leak in effect cleanup
docs(api): update signal documentation
test(integration): add component lifecycle tests
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding/updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

### 2. Pull Request Process

#### Before Submitting

```bash
# Make sure all tests pass
npm test

# Run linting
npm run lint

# Format code
npm run format

# Build successfully
npm run build

# Update documentation
npm run docs:build
```

#### PR Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Documentation
- [ ] API documentation updated
- [ ] Usage guide updated
- [ ] Examples added/updated

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] No breaking changes (or documented)
```

#### Review Process

1. **Automated Checks**: CI runs tests, linting, and builds
2. **Code Review**: Maintainers review code quality and design
3. **Testing**: Changes are tested in various environments
4. **Documentation**: Ensure documentation is complete and accurate
5. **Approval**: Two maintainer approvals required for merge

### 3. After Submission

- **Respond to Feedback**: Address review comments promptly
- **Keep Updated**: Rebase on main if conflicts arise
- **Be Patient**: Reviews may take a few days
- **Follow Up**: Check CI status and resolve any failures

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

### Communication

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Website**: [praxisjs.com](https://praxisjs.com)
- **Email**: Private concerns to maintainers@praxisjs.com

### Recognition

Contributors are recognized in:
- **CONTRIBUTORS.md**: List of all contributors
- **Release Notes**: Major contributions highlighted
- **Hall of Fame**: Outstanding contributors featured

### Getting Help

If you're stuck or need guidance:

1. **Check Documentation**: Often answers are in the docs
2. **Search Issues**: Someone may have had the same question
3. **Ask in Discussions**: Community can provide help
4. **Visit Website**: [praxisjs.com](https://praxisjs.com) for resources
5. **Tag Maintainers**: For urgent issues, tag @maintainers

## Release Process

### Versioning

PraxisJS follows [Semantic Versioning](https://semver.org/):

- **Major** (x.0.0): Breaking changes
- **Minor** (0.x.0): New features, backward compatible
- **Patch** (0.0.x): Bug fixes, backward compatible

### Release Schedule

- **Patch releases**: As needed for critical fixes
- **Minor releases**: Monthly feature releases
- **Major releases**: Quarterly breaking changes

---

Thank you for contributing to PraxisJS! Your contributions help make reactive web development better for everyone.