# PraxisJS Usage Guide

A comprehensive guide to using PraxisJS for building reactive web applications.

## Table of Contents

- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [Directive Reference](#directive-reference)
- [Advanced Features](#advanced-features)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

#### CDN (Quick Start)
```html
<script src="https://unpkg.com/@oxog/praxisjs@latest/dist/praxisjs.min.js"></script>
<script>
  praxis.start();
</script>
```

#### NPM
```bash
npm install @oxog/praxisjs
```

```javascript
import { praxisjs } from '@oxog/praxisjs';
praxis.start();
```

#### CLI (Recommended for new projects)
```bash
npm install -g @oxog/praxis-cli
praxisjs create my-app
cd my-app
npm run dev
```

### Your First Component

```html
<div x-data="{ count: 0, message: 'Hello PraxisJS!' }">
  <h1 x-text="message"></h1>
  <p>Count: <span x-text="count"></span></p>
  <button x-on:click="count++">Increment</button>
  <button x-on:click="count = 0">Reset</button>
</div>
```

## Core Concepts

### Reactivity System

PraxisJS uses a signals-based reactivity system for optimal performance:

```javascript
// Signals automatically track dependencies
const count = signal(0);
const doubled = computed(() => count.value * 2);

// Effects run when dependencies change
effect(() => {
  console.log('Count is:', count.value);
});

count.value = 5; // Logs: "Count is: 5"
```

### Component Lifecycle

```javascript
function MyComponent() {
  return {
    data: 'initial value',
    
    init() {
      // Called when component initializes
      console.log('Component initialized');
    },
    
    mounted() {
      // Called after DOM is ready
      this.setupEventListeners();
    },
    
    updated() {
      // Called after reactive updates
      this.syncWithAPI();
    },
    
    destroyed() {
      // Called when component is removed
      this.cleanup();
    }
  };
}
```

## Directive Reference

### Core Directives

#### x-data
Defines component state and methods:

```html
<!-- Simple state -->
<div x-data="{ name: 'John', age: 25 }">
  <p x-text="name"></p>
</div>

<!-- Component function -->
<div x-data="UserProfile()">
  <p x-text="displayName"></p>
</div>
```

#### x-text
Sets element text content:

```html
<div x-data="{ message: 'Hello World' }">
  <p x-text="message"></p>
  <p x-text="message.toUpperCase()"></p>
</div>
```

#### x-html
Sets element HTML content (sanitized):

```html
<div x-data="{ content: '<strong>Bold text</strong>' }">
  <div x-html="content"></div>
</div>
```

#### x-show
Toggles element visibility:

```html
<div x-data="{ visible: true }">
  <p x-show="visible">This can be hidden</p>
  <button x-on:click="visible = !visible">Toggle</button>
</div>
```

#### x-if
Conditionally renders elements:

```html
<div x-data="{ user: null }">
  <template x-if="user">
    <div>Welcome, <span x-text="user.name"></span>!</div>
  </template>
  <template x-if="!user">
    <button x-on:click="login()">Login</button>
  </template>
</div>
```

#### x-for
Renders lists:

```html
<div x-data="{ items: ['Apple', 'Banana', 'Orange'] }">
  <ul>
    <template x-for="item in items" :key="item">
      <li x-text="item"></li>
    </template>
  </ul>
</div>

<!-- With index -->
<template x-for="(item, index) in items" :key="index">
  <li>
    <span x-text="index + 1"></span>: 
    <span x-text="item"></span>
  </li>
</template>
```

#### x-on
Handles events:

```html
<div x-data="{ count: 0 }">
  <!-- Basic event -->
  <button x-on:click="count++">Click me</button>
  
  <!-- Event modifiers -->
  <form x-on:submit.prevent="handleSubmit()">
    <input x-on:keydown.enter="search()" x-on:keydown.escape="clear()">
  </form>
  
  <!-- Multiple events -->
  <div x-on:mouseenter="highlight = true" x-on:mouseleave="highlight = false">
    Hover me
  </div>
</div>
```

#### x-model
Two-way data binding:

```html
<div x-data="{ name: '', email: '', agree: false }">
  <!-- Text input -->
  <input type="text" x-model="name" placeholder="Name">
  
  <!-- Email input -->
  <input type="email" x-model="email" placeholder="Email">
  
  <!-- Checkbox -->
  <label>
    <input type="checkbox" x-model="agree">
    I agree to terms
  </label>
  
  <!-- Radio buttons -->
  <input type="radio" x-model="size" value="small" id="small">
  <input type="radio" x-model="size" value="large" id="large">
  
  <!-- Select -->
  <select x-model="country">
    <option value="us">United States</option>
    <option value="ca">Canada</option>
  </select>
</div>
```

#### x-bind
Binds attributes:

```html
<div x-data="{ disabled: false, color: 'blue' }">
  <!-- Single attribute -->
  <button x-bind:disabled="disabled">Submit</button>
  
  <!-- Multiple attributes -->
  <div x-bind="{ 
    class: color, 
    'data-value': someValue,
    style: 'color: ' + color 
  }">
    Styled element
  </div>
  
  <!-- Shorthand syntax -->
  <img :src="imageSrc" :alt="imageAlt">
</div>
```

### Advanced Directives

#### x-intersect
Intersection Observer integration:

```html
<div x-data="{ visible: false }">
  <div x-intersect="visible = true" 
       x-intersect.threshold-50
       x-intersect.margin-100px>
    <p x-show="visible">Now visible!</p>
  </div>
</div>
```

#### x-resize
Resize Observer integration:

```html
<div x-data="{ width: 0, height: 0 }">
  <div x-resize="({ width, height }) => { this.width = width; this.height = height; }"
       x-resize.debounce>
    <p>Size: <span x-text="width"></span>x<span x-text="height"></span></p>
  </div>
</div>
```

#### x-clickaway
Click outside detection:

```html
<div x-data="{ open: false }">
  <button x-on:click="open = true">Open Menu</button>
  <div x-show="open" x-clickaway="open = false">
    Menu content
  </div>
</div>
```

#### x-hotkey
Keyboard shortcuts:

```html
<div x-data="{ searchOpen: false }" 
     x-hotkey="'ctrl+k'" 
     x-on:keydown="searchOpen = true">
  <div x-show="searchOpen">Search dialog</div>
</div>
```

#### x-focus-trap
Focus management:

```html
<div x-data="{ modalOpen: false }">
  <div x-show="modalOpen" x-focus-trap.auto>
    <input type="text" placeholder="First input">
    <input type="text" placeholder="Second input">
    <button x-on:click="modalOpen = false">Close</button>
  </div>
</div>
```

#### x-live-region
Screen reader announcements:

```html
<div x-data="{ message: '' }">
  <button x-on:click="message = 'Button clicked!'">Click me</button>
  <div x-live-region.polite x-text="message"></div>
</div>
```

## Advanced Features

### Global Store Management

```javascript
import { defineStore } from '@oxog/praxis-store';

const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: null,
    preferences: {
      theme: 'light',
      language: 'en'
    }
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.currentUser,
    displayName: (state) => state.currentUser?.name || 'Guest',
    themeClass: (state) => `theme-${state.preferences.theme}`
  },
  
  actions: {
    async login(credentials) {
      const user = await api.login(credentials);
      this.$state.currentUser = user;
      this.loadPreferences();
    },
    
    logout() {
      this.$state.currentUser = null;
      this.$state.preferences = { theme: 'light', language: 'en' };
    },
    
    updateTheme(theme) {
      this.$state.preferences.theme = theme;
      this.savePreferences();
    }
  }
});

// Use in components
const userStore = useUserStore();
```

### Plugin System

```javascript
import { praxisjs } from '@oxog/praxisjs';

// Create a plugin
const myPlugin = {
  name: 'myPlugin',
  
  install(praxisjs, options) {
    // Add magic properties
    praxisjs.magic('$myUtil', () => {
      return {
        format: (value) => `Formatted: ${value}`,
        validate: (value) => value.length > 0
      };
    });
    
    // Add directive
    praxisjs.directive('my-directive', (el, { expression, value }) => {
      // Directive logic
    });
  }
};

// Register plugin
praxisjs.plugin(myPlugin, { option1: 'value' });
```

### Server-Side Rendering

```javascript
import { renderToString } from '@oxog/praxis-ssr';

const html = await renderToString(`
  <div x-data="{ message: 'Hello from SSR!' }">
    <h1 x-text="message"></h1>
  </div>
`, {
  // Server-side context
  data: { message: 'Server message' }
});
```

### Performance Optimization

```javascript
import { batch, lazy } from '@oxog/praxisjs';

// Batch multiple updates
batch(() => {
  state.prop1 = 'value1';
  state.prop2 = 'value2';
  state.prop3 = 'value3';
});

// Lazy loading
const LazyComponent = lazy(() => import('./HeavyComponent.js'));
```

## Best Practices

### Component Organization

```javascript
// ✅ Good: Organized component
function UserProfile() {
  return {
    // State
    user: null,
    loading: false,
    error: null,
    
    // Computed properties
    get displayName() {
      return this.user ? `${this.user.firstName} ${this.user.lastName}` : 'Guest';
    },
    
    get avatarUrl() {
      return this.user?.avatar || '/default-avatar.png';
    },
    
    // Lifecycle
    async init() {
      await this.loadUser();
    },
    
    // Methods
    async loadUser() {
      this.loading = true;
      try {
        this.user = await api.getCurrentUser();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    
    async updateUser(data) {
      try {
        this.user = await api.updateUser(data);
      } catch (error) {
        this.error = error.message;
      }
    }
  };
}
```

### Performance Tips

1. **Use computed properties for derived state:**
```javascript
// ✅ Good
get filteredItems() {
  return this.items.filter(item => item.active);
}

// ❌ Bad - recalculates on every render
x-text="items.filter(item => item.active).length"
```

2. **Debounce expensive operations:**
```javascript
async search() {
  clearTimeout(this.searchTimeout);
  this.searchTimeout = setTimeout(async () => {
    this.results = await api.search(this.query);
  }, 300);
}
```

3. **Use x-show vs x-if appropriately:**
```html
<!-- ✅ Use x-show for frequently toggled content -->
<div x-show="isVisible">Frequently toggled content</div>

<!-- ✅ Use x-if for conditionally rendered content -->
<template x-if="user.isAdmin">
  <AdminPanel />
</template>
```

### Security Considerations

1. **Always sanitize user input:**
```javascript
// PraxisJS automatically sanitizes x-html, but be careful with manual DOM manipulation
safeContent() {
  return praxis.sanitize(this.userInput);
}
```

2. **Use CSP headers:**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self';">
```

3. **Validate expressions:**
```javascript
// Use the built-in expression validator
const isValid = praxis.validateExpression('user.name');
```

## Troubleshooting

### Common Issues

**Component not initializing:**
```javascript
// ✅ Ensure praxis.start() is called
praxis.start();

// ✅ Check for JavaScript errors in console
// ✅ Verify x-data syntax is correct
```

**Reactivity not working:**
```javascript
// ❌ Don't reassign the entire data object
this.data = newData;

// ✅ Update properties individually
Object.assign(this, newData);
// or
this.property = newValue;
```

**Performance issues:**
```javascript
// ✅ Use batch updates for multiple changes
praxisjs.batch(() => {
  this.prop1 = value1;
  this.prop2 = value2;
});

// ✅ Use computed properties instead of complex expressions
// ✅ Implement proper key attributes for x-for
```

**Memory leaks:**
```javascript
// ✅ Clean up in destroyed lifecycle
destroyed() {
  this.cleanup();
  this.unsubscribe();
}
```

### Debug Tools

```javascript
// Enable debug mode
praxisjs.config.debug = true;

// Access component data
praxisjs.debug.getData(element);

// Monitor reactivity
praxisjs.debug.trackDependencies();

// Performance profiling
praxisjs.debug.profile('component-update', () => {
  // Code to profile
});
```

### Browser DevTools Integration

PraxisJS includes browser extension support for debugging:

1. Install PraxisJS DevTools extension
2. Open browser DevTools
3. Navigate to "PraxisJS" tab
4. Inspect component state, watch reactivity, and profile performance

For more advanced usage and examples, see the [API Reference](./API.md) and [Architecture Guide](./ARCHITECTURE.md).