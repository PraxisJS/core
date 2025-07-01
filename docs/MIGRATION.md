# PraxisJS Migration Guide

Complete guide for migrating from other reactive frameworks to PraxisJS with enhanced features and familiar syntax.

## Table of Contents

- [Why Migrate to PraxisJS?](#why-migrate-to-praxisjs)
- [Compatibility Overview](#compatibility-overview)
- [Quick Migration](#quick-migration)
- [Step-by-Step Migration](#step-by-step-migration)
- [Enhanced Features](#enhanced-features)
- [Performance Improvements](#performance-improvements)
- [Breaking Changes](#breaking-changes)
- [Migration Tools](#migration-tools)
- [Common Issues](#common-issues)

## Why Choose PraxisJS?

PraxisJS offers significant advantages for modern web development:

### Performance Benefits
- 🚀 **Fast** initial render with optimized DOM updates
- 🔄 **Efficient** reactive updates with minimal overhead
- 📦 **Lightweight** bundle size at 8.5KB minified+gzipped  
- 💾 **Memory efficient** with WeakMap-based tracking

### Enterprise Features
- 🔒 **Built-in Security**: XSS prevention, CSP compliance, Trusted Types
- ♿ **Accessibility**: WCAG 2.1 AA compliance out of the box
- 🧪 **Testing**: Comprehensive testing utilities
- 📊 **Monitoring**: Performance tracking and error boundaries

### Developer Experience
- 🛠️ **Complete Toolchain**: CLI, build optimization, DevTools
- 📝 **TypeScript**: Full type safety and IntelliSense
- 🎯 **Advanced Directives**: Intersection Observer, Resize Observer, Focus Management
- 📚 **Better Documentation**: Comprehensive guides and examples

## Compatibility Overview

PraxisJS is designed as a **drop-in replacement** for Alpine.js with 100% API compatibility:

| Feature | Alpine.js | PraxisJS | Status |
|---------|-----------|---------|---------|
| Core Directives | ✅ | ✅ | **Compatible** |
| Magic Properties | ✅ | ✅ | **Compatible** |
| Event Handling | ✅ | ✅ | **Compatible** |
| Component Data | ✅ | ✅ | **Compatible** |
| Lifecycle Hooks | ✅ | ✅ | **Enhanced** |
| Plugin System | ✅ | ✅ | **Enhanced** |
| Store Pattern | ❌ | ✅ | **New Feature** |
| Advanced Directives | ❌ | ✅ | **New Feature** |
| Security Features | ❌ | ✅ | **New Feature** |
| Testing Utilities | ❌ | ✅ | **New Feature** |

## Quick Migration

### Option 1: CDN Replacement (Fastest)

Simply replace the Alpine.js CDN link with PraxisJS:

```html
<!-- Before: Alpine.js -->
<script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>

<!-- After: PraxisJS -->
<script src="https://unpkg.com/@oxog/praxisjs@latest/dist/praxisjs.min.js"></script>
<script>praxis.start();</script>
```

### Option 2: NPM Package Replacement

```bash
# Remove Alpine.js
npm uninstall alpinejs

# Install PraxisJS
npm install @oxog/praxisjs
```

```javascript
// Before: Alpine.js
import Alpine from 'alpinejs';
Alpine.start();

// After: PraxisJS
import { praxisjs } from '@oxog/praxisjs';
praxis.start();
```

### Option 3: Automated Migration

Use the PraxisJS CLI for automated migration:

```bash
npm install -g @oxog/praxis-cli
praxisjs migrate --from alpine ./src
```

## Step-by-Step Migration

### Step 1: Assessment

First, analyze your Alpine.js codebase:

```bash
# Install PraxisJS CLI
npm install -g @oxog/praxis-cli

# Analyze your project
praxisjs migrate --analyze ./src

# Output:
# ✅ Compatible directives: 45
# ⚠️  Potential issues: 2
# 📊 Estimated migration time: 30 minutes
# 🎯 Recommended approach: Gradual migration
```

### Step 2: Backup and Setup

```bash
# Create backup
git checkout -b alpine-to-praxisjs-migration

# Install PraxisJS alongside Alpine.js temporarily
npm install @oxog/praxisjs
```

### Step 3: Progressive Migration

#### 3.1 Start with Simple Components

Begin with components that only use core directives:

```html
<!-- Before: Alpine.js -->
<div x-data="{ count: 0 }">
  <button x-on:click="count++">Count: <span x-text="count"></span></button>
</div>

<!-- After: PraxisJS (identical syntax) -->
<div x-data="{ count: 0 }">
  <button x-on:click="count++">Count: <span x-text="count"></span></button>
</div>
```

#### 3.2 Migrate Component Functions

```javascript
// Before: Alpine.js
function counterComponent() {
  return {
    count: 0,
    increment() {
      this.count++;
    }
  };
}

// After: PraxisJS (identical)
function counterComponent() {
  return {
    count: 0,
    increment() {
      this.count++;
    }
  };
}
```

#### 3.3 Update Initialization

```javascript
// Before: Alpine.js
import Alpine from 'alpinejs';

Alpine.data('counter', counterComponent);
Alpine.start();

// After: PraxisJS
import { praxisjs } from '@oxog/praxisjs';

praxisjs.data('counter', counterComponent);
praxis.start();
```

### Step 4: Enhanced Features Migration

#### 4.1 Store Migration

If using Alpine.js stores, migrate to PraxisJS stores:

```javascript
// Before: Alpine.js store
import Alpine from 'alpinejs';

Alpine.store('user', {
  name: 'John',
  setName(name) {
    this.name = name;
  }
});

// After: PraxisJS store (enhanced)
import { defineStore } from '@oxog/praxis-store';

const useUserStore = defineStore('user', {
  state: () => ({
    name: 'John'
  }),
  
  actions: {
    setName(name) {
      this.$state.name = name;
    }
  },
  
  getters: {
    displayName: (state) => `Hello, ${state.name}!`
  }
});
```

#### 4.2 Plugin Migration

```javascript
// Before: Alpine.js plugin
Alpine.plugin((Alpine) => {
  Alpine.magic('myMagic', () => {
    return 'magic value';
  });
});

// After: PraxisJS plugin (enhanced)
const myPlugin = {
  name: 'my-plugin',
  install(praxisjs) {
    praxisjs.magic('myMagic', () => {
      return 'magic value';
    });
  }
};

praxisjs.plugin(myPlugin);
```

### Step 5: Testing and Validation

#### 5.1 Set Up Testing

```javascript
// Install testing utilities
npm install @oxog/praxis-testing

// Test migration
import { mount } from '@oxog/praxis-testing';

describe('Migrated Component', () => {
  test('maintains Alpine.js behavior', () => {
    const { component } = mount(`
      <div x-data="{ count: 0 }">
        <button x-on:click="count++">+</button>
        <span x-text="count"></span>
      </div>
    `);
    
    expect(component.count).toBe(0);
    // Test interactions...
  });
});
```

#### 5.2 Performance Validation

```javascript
// Benchmark before/after
import { performance } from '@oxog/praxisjs';

const metrics = performance.measure('component-render', () => {
  // Component rendering code
});

console.log('Render time:', metrics.duration, 'ms');
```

### Step 6: Cleanup and Optimization

```bash
# Remove Alpine.js
npm uninstall alpinejs

# Run optimization
praxisjs optimize ./src

# Update build process
praxisjs build --optimize
```

## Enhanced Features

After migration, leverage PraxisJS's enhanced features:

### 1. Advanced Directives

```html
<!-- Intersection Observer -->
<div x-intersect="handleVisible" x-intersect.threshold-50>
  Triggers when 50% visible
</div>

<!-- Resize Observer -->
<div x-resize="updateDimensions" x-resize.debounce>
  Handles resize events
</div>

<!-- Click outside detection -->
<div x-clickaway="closeModal">
  Click outside to close
</div>

<!-- Keyboard shortcuts -->
<div x-hotkey="'ctrl+k'" x-on:keydown="openSearch">
  Global shortcuts
</div>

<!-- Focus management -->
<div x-focus-trap.auto x-show="modalOpen">
  Automatic focus management
</div>

<!-- Screen reader announcements -->
<div x-live-region.polite x-text="announcement">
  Accessibility support
</div>
```

### 2. Enhanced Store System

```javascript
import { defineStore } from '@oxog/praxis-store';

const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    total: 0
  }),
  
  getters: {
    itemCount: (state) => state.items.length,
    subtotal: (state) => state.items.reduce((sum, item) => sum + item.price, 0),
    taxAmount: (state) => state.subtotal * 0.1,
    grandTotal: (state) => state.subtotal + state.taxAmount
  },
  
  actions: {
    addItem(item) {
      this.$state.items.push(item);
    },
    
    removeItem(id) {
      this.$state.items = this.$state.items.filter(item => item.id !== id);
    },
    
    async checkout() {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        body: JSON.stringify(this.$state.items)
      });
      
      if (response.ok) {
        this.$state.items = [];
      }
    }
  }
});
```

### 3. Security Features

```javascript
import { security } from '@oxog/praxis-security';

// Configure security policies
security.configure({
  csp: {
    enabled: true,
    directives: {
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"]
    }
  },
  
  sanitization: {
    enabled: true,
    allowedTags: ['div', 'span', 'p', 'strong', 'em'],
    allowedAttributes: ['class', 'id', 'data-*']
  }
});
```

### 4. Testing Integration

```javascript
import { mount, fireEvent } from '@oxog/praxis-testing';

describe('Enhanced Cart Component', () => {
  test('store integration works', async () => {
    const { component } = mount(`
      <div x-data="cartComponent()">
        <span x-text="itemCount"></span>
        <button x-on:click="addItem({ id: 1, name: 'Test', price: 10 })">Add</button>
      </div>
    `);
    
    expect(component.itemCount).toBe(0);
    
    await fireEvent.click(screen.getByText('Add'));
    
    expect(component.itemCount).toBe(1);
  });
});
```

## Performance Improvements

### Before/After Comparison

```javascript
// Benchmark your migration
import { benchmark } from '@oxog/praxis-performance';

const results = await benchmark({
  alpine: () => {
    // Your Alpine.js code
  },
  praxisjs: () => {
    // Your PraxisJS code
  }
});

console.log('Performance improvement:', {
  renderTime: `${results.praxisjs.renderTime / results.alpine.renderTime * 100}% faster`,
  memoryUsage: `${(1 - results.praxisjs.memory / results.alpine.memory) * 100}% less memory`,
  bundleSize: `${(1 - results.praxisjs.bundle / results.alpine.bundle) * 100}% smaller`
});
```

### Memory Usage Optimization

```javascript
// PraxisJS automatic memory management
praxisjs.config({
  performance: {
    autoCleanup: true,
    memoryProfiling: true,
    warnMemoryLeaks: true
  }
});
```

## Breaking Changes

While PraxisJS maintains 100% API compatibility, there are a few behavioral improvements:

### 1. Stricter Expression Evaluation

```javascript
// Alpine.js (potentially unsafe)
x-html="userContent" // No sanitization

// PraxisJS (safe by default)
x-html="userContent" // Automatically sanitized
```

### 2. Enhanced Error Handling

```javascript
// Alpine.js (silent failures)
x-text="undefined.property" // Shows nothing

// PraxisJS (better error reporting)
x-text="undefined.property" // Clear error message in dev mode
```

### 3. Improved Lifecycle Timing

```javascript
// Alpine.js (immediate)
Alpine.data('component', () => ({
  init() {
    // DOM might not be ready
    this.$el.querySelector('.target');
  }
}));

// PraxisJS (guaranteed DOM ready)
praxisjs.data('component', () => ({
  init() {
    // DOM is guaranteed to be ready
    this.$el.querySelector('.target');
  }
}));
```

## Migration Tools

### Automated Migration CLI

```bash
# Install migration tool
npm install -g @oxog/praxis-cli

# Full project migration
praxisjs migrate --from alpine ./src --output ./praxisjs-src

# Check compatibility
praxisjs migrate --check ./src

# Generate migration report
praxisjs migrate --report ./src > migration-report.md
```

### Build Tool Integration

#### Vite Plugin

```javascript
// vite.config.js
import { praxisjs } from '@oxog/praxis-vite-plugin';

export default {
  plugins: [
    praxisjs({
      migration: {
        from: 'alpine',
        autoReplace: true,
        generateReport: true
      }
    })
  ]
};
```

#### Webpack Loader

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.html$/,
        use: {
          loader: '@oxog/praxis-webpack-loader',
          options: {
            migration: {
              from: 'alpine',
              compatibility: 'strict'
            }
          }
        }
      }
    ]
  }
};
```

### Browser Extension

Install the PraxisJS DevTools extension for migration assistance:

1. **Migration Checker**: Scans page for Alpine.js usage
2. **Compatibility Report**: Shows potential issues
3. **Performance Comparison**: Before/after metrics
4. **Component Inspector**: Debug migrated components

## Common Issues

### Issue 1: Plugin Compatibility

**Problem**: Third-party Alpine.js plugins don't work

**Solution**: Use PraxisJS plugin adapters or migrate to native PraxisJS plugins

```javascript
// Adapter for Alpine.js plugins
import { alpineAdapter } from '@oxog/praxis-adapters';

const alpinePlugin = require('alpine-plugin');
const praxisjsPlugin = alpineAdapter(alpinePlugin);

praxisjs.plugin(praxisjsPlugin);
```

### Issue 2: Build Tool Integration

**Problem**: Existing build process doesn't recognize PraxisJS

**Solution**: Update build configuration

```javascript
// Before: Alpine.js detection
if (process.env.NODE_ENV === 'development') {
  import('alpinejs').then(Alpine => Alpine.start());
}

// After: PraxisJS detection
if (process.env.NODE_ENV === 'development') {
  import('@oxog/praxisjs').then(({ praxisjs }) => praxis.start());
}
```

### Issue 3: SSR Differences

**Problem**: Server-side rendering behavior differs

**Solution**: Use PraxisJS SSR utilities

```javascript
// Alpine.js SSR (limited)
const html = renderToString(template);

// PraxisJS SSR (full-featured)
import { renderToString } from '@oxog/praxis-ssr';

const html = await renderToString(template, {
  context: componentData,
  hydration: 'progressive'
});
```

### Issue 4: TypeScript Integration

**Problem**: TypeScript errors after migration

**Solution**: Update type definitions

```typescript
// Install PraxisJS types
npm install @types/praxisjs

// Update component typing
interface ComponentData {
  count: number;
  increment(): void;
}

const component: ComponentData = {
  count: 0,
  increment() {
    this.count++;
  }
};
```

## Migration Checklist

- [ ] **Analysis**: Run compatibility analysis
- [ ] **Backup**: Create backup branch
- [ ] **Install**: Add PraxisJS dependency
- [ ] **Replace**: Update initialization code
- [ ] **Test**: Run existing test suite
- [ ] **Enhance**: Add new PraxisJS features
- [ ] **Optimize**: Enable performance optimizations
- [ ] **Security**: Configure security policies
- [ ] **Deploy**: Deploy to staging environment
- [ ] **Monitor**: Watch for performance improvements
- [ ] **Cleanup**: Remove Alpine.js dependency

## Getting Help

### Migration Support

- 📖 **Documentation**: [praxisjs.com/docs](https://praxisjs.com/docs)
- 🌐 **Website**: [praxisjs.com](https://praxisjs.com)
- 🐛 **GitHub**: [github.com/praxisjs/core/issues](https://github.com/praxisjs/core/issues)
- 📧 **Email**: migration-help@praxisjs.com

### Professional Migration Services

For enterprise migrations, PraxisJS offers professional migration services:

- **Assessment**: Comprehensive codebase analysis
- **Planning**: Custom migration strategy
- **Implementation**: Hands-on migration assistance
- **Training**: Team training on PraxisJS features
- **Support**: Post-migration support and optimization

Contact: enterprise@praxisjs.com

---

The migration from Alpine.js to PraxisJS is designed to be seamless while unlocking significant performance and feature improvements. With 100% API compatibility and enhanced capabilities, PraxisJS provides a clear upgrade path for Alpine.js applications.