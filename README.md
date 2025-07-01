# ⚡ Praxis

[![npm version](https://img.shields.io/npm/v/@oxog/praxis.svg)](https://www.npmjs.com/package/@oxog/praxis)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@oxog/praxis)](https://bundlephobia.com/package/@oxog/praxis)
[![License](https://img.shields.io/npm/l/@oxog/praxis.svg)](https://github.com/praxisjs/core/blob/main/LICENSE)
[![Tests](https://img.shields.io/github/workflow/status/praxisjs/core/Tests)](https://github.com/praxisjs/core/actions)
[![Coverage](https://img.shields.io/codecov/c/github/praxisjs/core)](https://codecov.io/gh/praxisjs/core)

**A high-performance reactive JavaScript framework with enterprise-grade features for modern web applications.**

Praxis delivers exceptional performance, security, and accessibility with declarative data binding and reactive components in just 8.5KB.

## ✨ Why Praxis?

- 🚀 **High Performance** with fine-grained reactivity and optimized updates
- 📦 **Lightweight** - Only 8.5KB minified and gzipped
- 🔒 **Enterprise Security** with XSS prevention and CSP compliance
- ♿ **Accessibility First** - WCAG 2.1 AA compliance out of the box
- 🛠️ **Complete Toolchain** with CLI, testing, and build optimization
- 🔄 **Familiar Syntax** - Easy to learn and migrate to

## 🚀 Quick Start

### CDN (Fastest way to try)

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://unpkg.com/@oxog/praxis@latest/dist/praxis.min.js"></script>
</head>
<body>
    <div x-data="{ count: 0 }">
        <button x-on:click="count++">Count: <span x-text="count"></span></button>
    </div>
    
    <script>
        praxis.start();
    </script>
</body>
</html>
```

### NPM Installation

```bash
npm install @oxog/praxis
```

```javascript
import praxis from '@oxog/praxis';
praxis.start();
```

### Create New Project

```bash
npm install -g @oxog/praxis-cli
praxis create my-app
cd my-app
npm run dev
```

## 📖 Documentation

- [**Usage Guide**](./docs/USAGE.md) - Complete guide to using Praxis
- [**API Reference**](./docs/API.md) - Detailed API documentation
- [**Architecture**](./docs/ARCHITECTURE.md) - Framework internals and design
- [**Migration Guide**](./docs/MIGRATION.md) - Migration from other frameworks

## 🎯 Core Features

### Reactive Directives

```html
<!-- Data binding -->
<div x-data="{ message: 'Hello World' }">
    <p x-text="message"></p>
    <input x-model="message">
</div>

<!-- Conditional rendering -->
<div x-data="{ show: true }">
    <p x-show="show">Visible content</p>
    <p x-if="show">Conditionally rendered</p>
</div>

<!-- Event handling -->
<button x-on:click="alert('Clicked!')" x-on:keydown.enter="handleEnter()">
    Click me
</button>

<!-- List rendering -->
<ul x-data="{ items: ['Apple', 'Banana', 'Cherry'] }">
    <template x-for="item in items" :key="item">
        <li x-text="item"></li>
    </template>
</ul>
```

### Advanced Directives

```html
<!-- Intersection Observer -->
<div x-intersect="handleVisible()" x-intersect.threshold-50>
    Triggers when 50% visible
</div>

<!-- Resize Observer -->
<div x-resize="updateDimensions()" x-resize.debounce>
    Handles resize events
</div>

<!-- Click outside detection -->
<div x-clickaway="closeModal()" x-clickaway.escape>
    Click outside or press escape to close
</div>

<!-- Keyboard shortcuts -->
<div x-hotkey="'ctrl+k'" x-on:keydown="openSearch()">
    Global keyboard shortcuts
</div>

<!-- Focus management -->
<div x-focus-trap.auto x-show="modalOpen">
    Automatically manages focus
</div>

<!-- Screen reader announcements -->
<div x-live-region.polite x-text="announcement">
    Announces changes to screen readers
</div>
```

### Global State Management

```javascript
import { defineStore } from '@oxog/praxis-store';

const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    history: []
  }),
  
  getters: {
    doubleCount: (state) => state.count * 2,
    lastChange: (state) => state.history[state.history.length - 1]
  },
  
  actions: {
    increment() {
      this.$state.count++;
      this.$state.history.push({ action: 'increment', timestamp: Date.now() });
    },
    
    async fetchInitialCount() {
      const response = await fetch('/api/count');
      this.$state.count = await response.json();
    }
  }
});

// Use in components
const store = useCounterStore();
store.increment();
console.log(store.doubleCount); // Reactive getter
```

## 🏗️ Architecture

### Signal System

```typescript
interface Signal<T> {
  value: T;
  peek(): T;              // Read without tracking
  subscribe(fn: () => void): () => void;
}

interface ComputedSignal<T> extends Signal<T> {
  readonly value: T;
}

interface Effect {
  execute(): void;
  dispose(): void;
  dependencies: Set<Signal<any>>;
}
```

### Performance Features

- **Batch Updates**: Updates are batched using `requestIdleCallback` or `MessageChannel`
- **Fine-grained Reactivity**: Only updates what actually changed
- **Memory Management**: Automatic cleanup with WeakMaps and FinalizationRegistry
- **Efficient Scheduling**: Smart update scheduling prevents unnecessary work

## 🧪 Examples

### Counter with Computed Values

```html
<div x-data="{ count: 0 }">
  <button x-on:click="count++">+</button>
  <span x-text="count"></span>
  <button x-on:click="count--">-</button>
  
  <p x-show="count > 0">Positive!</p>
  <p x-show="count < 0">Negative!</p>
  <p x-show="count === 0">Zero!</p>
</div>
```

### Form Handling

```html
<div x-data="{ name: '', email: '' }">
  <input x-model="name" placeholder="Name">
  <input x-model="email" type="email" placeholder="Email">
  
  <div x-show="name && email">
    <p>Hello <span x-text="name"></span>!</p>
    <p>Email: <span x-text="email"></span></p>
  </div>
</div>
```

## 🚀 Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Run benchmarks
npm run benchmark
```

## 📊 Performance

Praxis is designed for performance. Run the benchmarks to see the framework capabilities:

```bash
# Core reactivity benchmarks
npm run benchmark

# DOM manipulation benchmarks (open in browser)
open benchmarks/dom-benchmark.html
```

Key performance advantages:

- **Signals**: Efficient reactive system with fine-grained updates
- **Batch Updates**: Prevents layout thrashing
- **Memory Efficient**: WeakMap-based tracking prevents memory leaks
- **Smaller Bundle**: Lightweight core with tree-shakeable modules

## 🔒 Security

- **XSS Prevention**: Expression sandboxing and HTML sanitization
- **CSP Compliant**: Works with strict Content Security Policy
- **Trusted Types**: Supports browser security APIs
- **Input Validation**: Comprehensive validation and sanitization

## 🧪 Testing

```bash
# Run all tests
npm test

# Test with coverage
npm run test:coverage

# Test specific features
npm run test:security
npm run test:accessibility
npm run test:performance
```

## 🚀 Performance

**Benchmark Results:**
- 📊 **Fast** initial render with optimized DOM updates
- 🔄 **Efficient** reactive updates with minimal overhead
- 📦 **Small** bundle size at 8.5KB minified+gzipped
- 💾 **Memory efficient** with WeakMap-based tracking

## 🛠️ Build Tools

### Vite Plugin
```javascript
import { praxis } from '@oxog/praxis-vite-plugin';

export default {
  plugins: [praxis({
    optimize: true,
    ssr: true
  })]
};
```

### Webpack Loader
```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.html$/,
        use: '@oxog/praxis-webpack-loader'
      }
    ]
  }
};
```

## 🌐 Browser Support

- ✅ Chrome 63+
- ✅ Firefox 60+
- ✅ Safari 13+
- ✅ Edge 79+

## 📊 Bundle Analysis

```bash
# Analyze bundle size
praxis analyze

# Generate performance report
praxis report --performance

# Check for security issues
praxis audit --security
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🌐 Links

- **Website**: [praxisjs.com](https://praxisjs.com)
- **GitHub**: [github.com/praxijs](https://github.com/praxisjs)
- **NPM**: [@oxog/praxis](https://www.npmjs.com/package/@oxog/praxis)

## 📦 Ecosystem

Praxis comes with a comprehensive ecosystem of tools and integrations:

### Available Packages

- **[@oxog/praxis](https://www.npmjs.com/package/@oxog/praxis)** - Core framework (Published ✅)
- **@oxog/praxis-cli** - Command-line interface for scaffolding and development
- **@oxog/praxis-security** - Enterprise security features (CSP, XSS protection, sanitization)
- **@oxog/praxis-vite-plugin** - Vite plugin for optimal development experience
- **@oxog/praxis-webpack-loader** - Webpack loader for production builds

### Coming Soon

- **@oxog/praxis-devtools** - Browser DevTools extension
- **@oxog/praxis-testing** - Testing utilities and helpers
- **@oxog/praxis-ui** - Pre-built UI components
- **@oxog/praxis-router** - Client-side routing
- **@oxog/praxis-store** - Global state management

### Package Structure

All packages follow the `@oxog/praxis-*` naming convention and are part of the monorepo structure in the `/packages` directory.
