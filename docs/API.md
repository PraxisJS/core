# PraxisJS API Reference

Complete API documentation for PraxisJS framework.

## Table of Contents

- [Core API](#core-api)
- [Signals & Reactivity](#signals--reactivity)
- [Directives](#directives)
- [Store Management](#store-management)
- [Plugin System](#plugin-system)
- [Testing Utilities](#testing-utilities)
- [Build Tools](#build-tools)
- [Configuration](#configuration)

## Core API

### `praxis`

The main PraxisJS instance.

#### `praxis.init(options?)`

Initializes PraxisJS and scans the document for components.

```typescript
interface InitOptions {
  root?: Element;           // Root element to scan (default: document.body)
  prefix?: string;          // Directive prefix (default: 'x-')
  debug?: boolean;          // Enable debug mode
  security?: SecurityConfig; // Security configuration
}

praxis.init({
  root: document.getElementById('app'),
  debug: process.env.NODE_ENV === 'development'
});
```

#### `praxis.start()`

Manually starts the reactivity system.

```typescript
praxis.start();
```

#### `praxis.stop()`

Stops the reactivity system and cleans up.

```typescript
praxis.stop();
```

#### `praxis.nextTick(callback)`

Executes callback after the next DOM update cycle.

```typescript
praxis.nextTick(() => {
  // DOM has been updated
  console.log('Updated!');
});

// Promise-based
await praxis.nextTick();
```

#### `praxis.version`

Current PraxisJS version.

```typescript
console.log(praxis.version); // "1.0.0"
```

### Component Management

#### `praxis.data(name, factory)`

Registers a global component factory.

```typescript
praxis.data('UserProfile', () => ({
  user: null,
  async loadUser() {
    this.user = await api.getUser();
  }
}));
```

#### `praxis.component(element)`

Gets the component instance for an element.

```typescript
const component = praxis.component(document.getElementById('my-component'));
console.log(component.data);
```

#### `praxis.reactive(obj)`

Makes an object reactive.

```typescript
const reactive = praxis.reactive({
  count: 0,
  increment() { this.count++; }
});
```

## Signals & Reactivity

### `signal(value)`

Creates a reactive signal.

```typescript
interface Signal<T> {
  value: T;
  peek(): T;
  subscribe(fn: () => void): () => void;
}

const count = signal(0);
const name = signal('John');

// Get value (tracked)
console.log(count.value);

// Get value (untracked)
console.log(count.peek());

// Set value
count.value = 5;

// Subscribe to changes
const unsubscribe = count.subscribe(() => {
  console.log('Count changed:', count.value);
});
```

### `computed(fn)`

Creates a computed signal.

```typescript
interface ComputedSignal<T> extends Signal<T> {
  readonly value: T;
}

const count = signal(10);
const doubled = computed(() => count.value * 2);

console.log(doubled.value); // 20
count.value = 5;
console.log(doubled.value); // 10
```

### `effect(fn)`

Creates an effect that runs when dependencies change.

```typescript
interface Effect {
  execute(): void;
  dispose(): void;
  dependencies: Set<Signal<any>>;
}

const count = signal(0);

const cleanup = effect(() => {
  console.log('Count is:', count.value);
});

// Clean up when done
cleanup.dispose();
```

### `batch(fn)`

Batches multiple signal updates.

```typescript
const count = signal(0);
const name = signal('');

batch(() => {
  count.value = 10;
  name.value = 'John';
  // Only one update cycle
});
```

### `untrack(fn)`

Runs function without tracking dependencies.

```typescript
const a = signal(1);
const b = signal(2);

const result = computed(() => {
  const aValue = a.value; // tracked
  const bValue = untrack(() => b.value); // not tracked
  return aValue + bValue;
});
```

## Directives

### Built-in Directives

#### `x-data`

```typescript
interface DataDirective {
  expression: string;
  value: any;
  cleanup?: () => void;
}
```

#### `x-show`

```typescript
interface ShowDirective {
  expression: string;
  value: boolean;
  transition?: boolean;
}
```

#### `x-if`

```typescript
interface IfDirective {
  expression: string;
  value: boolean;
  template: HTMLTemplateElement;
}
```

#### `x-for`

```typescript
interface ForDirective {
  expression: string;
  items: any[];
  key?: string;
  template: HTMLTemplateElement;
}
```

#### `x-on`

```typescript
interface OnDirective {
  event: string;
  expression: string;
  modifiers: string[];
  handler: (event: Event) => void;
}

// Event modifiers
'.prevent'    // event.preventDefault()
'.stop'       // event.stopPropagation()
'.once'       // addEventListener with { once: true }
'.passive'    // addEventListener with { passive: true }
'.capture'    // addEventListener with { capture: true }
'.self'       // Only trigger if event.target === element
'.window'     // Listen on window
'.document'   // Listen on document
'.debounce'   // Debounce handler (300ms default)
'.throttle'   // Throttle handler (100ms default)
```

#### `x-model`

```typescript
interface ModelDirective {
  expression: string;
  modifiers: string[];
  type: 'text' | 'number' | 'checkbox' | 'radio' | 'select';
}

// Modifiers
'.number'     // Convert to number
'.trim'       // Trim whitespace
'.lazy'       // Update on change instead of input
'.debounce'   // Debounce updates
```

#### `x-bind`

```typescript
interface BindDirective {
  attribute: string;
  expression: string;
  value: any;
}
```

### Custom Directives

#### `praxis.directive(name, handler)`

Registers a custom directive.

```typescript
interface DirectiveHandler {
  (element: Element, directive: DirectiveInfo, component: Component): void | (() => void);
}

interface DirectiveInfo {
  expression: string;
  value: any;
  modifiers: string[];
  argument?: string;
}

praxis.directive('tooltip', (el, { value, modifiers }) => {
  const tooltip = new Tooltip(el, {
    content: value,
    placement: modifiers.includes('top') ? 'top' : 'bottom'
  });
  
  return () => tooltip.destroy();
});
```

#### Advanced Directive Example

```typescript
praxis.directive('draggable', (el, { expression, modifiers }, component) => {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  
  const handleMouseDown = (e: MouseEvent) => {
    isDragging = true;
    startX = e.clientX - el.offsetLeft;
    startY = e.clientY - el.offsetTop;
    
    if (expression) {
      component.evaluateExpression(expression, { 
        $event: e, 
        $dragging: true 
      });
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const x = e.clientX - startX;
    const y = e.clientY - startY;
    
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  };
  
  const handleMouseUp = (e: MouseEvent) => {
    isDragging = false;
    
    if (expression) {
      component.evaluateExpression(expression, { 
        $event: e, 
        $dragging: false 
      });
    }
  };
  
  el.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  // Cleanup function
  return () => {
    el.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
});
```

## Store Management

### `defineStore(name, config)`

Creates a store.

```typescript
interface StoreConfig<T> {
  state(): T;
  getters?: Record<string, (state: T) => any>;
  actions?: Record<string, (this: StoreInstance<T>, ...args: any[]) => any>;
}

interface StoreInstance<T> {
  $state: T;
  $patch(updates: Partial<T>): void;
  $reset(): void;
  $subscribe(callback: (state: T) => void): () => void;
  $dispose(): void;
}

const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    history: []
  }),
  
  getters: {
    doubleCount: (state) => state.count * 2,
    hasHistory: (state) => state.history.length > 0
  },
  
  actions: {
    increment() {
      this.$state.count++;
      this.$state.history.push({ action: 'increment', time: Date.now() });
    },
    
    async fetchInitialCount() {
      const response = await fetch('/api/count');
      const data = await response.json();
      this.$state.count = data.count;
    },
    
    reset() {
      this.$reset();
    }
  }
});

// Usage
const store = useCounterStore();
store.increment();
console.log(store.doubleCount);

// Subscribe to changes
const unsubscribe = store.$subscribe((state) => {
  console.log('State changed:', state);
});
```

### Global Store Access

```typescript
// In components
x-data="{
  get count() { return useCounterStore().count; },
  increment() { useCounterStore().increment(); }
}"

// Magic property
praxis.magic('$store', () => (name: string) => {
  return getStore(name);
});

// Usage: $store('counter').count
```

## Plugin System

### `praxis.plugin(plugin, options?)`

Registers a plugin.

```typescript
interface Plugin {
  name: string;
  install(praxis: PraxisJSInstance, options?: any): void;
}

const myPlugin: Plugin = {
  name: 'my-plugin',
  
  install(praxis, options = {}) {
    // Add magic properties
    praxis.magic('$myMagic', () => ({
      helper: (value: string) => value.toUpperCase()
    }));
    
    // Add directives
    praxis.directive('my-directive', (el, directive) => {
      // Implementation
    });
    
    // Add global methods
    praxis.global('myGlobalMethod', () => {
      // Implementation
    });
  }
};

praxis.plugin(myPlugin, { option: 'value' });
```

### Magic Properties

#### `praxis.magic(name, factory)`

Adds magic properties available in expressions.

```typescript
praxis.magic('$http', () => ({
  async get(url: string) {
    const response = await fetch(url);
    return response.json();
  },
  
  async post(url: string, data: any) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
}));

// Usage in templates
// x-data="{ users: [] }"
// x-init="users = await $http.get('/api/users')"
```

#### Built-in Magic Properties

```typescript
// $el - Current element
$el: Element

// $refs - Reference to x-ref elements
$refs: { [key: string]: Element }

// $event - Current event (in event handlers)
$event: Event

// $watch - Watch reactive properties
$watch(expression: string, callback: (value: any) => void): () => void

// $nextTick - Wait for next update cycle
$nextTick(callback?: () => void): Promise<void>

// $dispatch - Dispatch custom events
$dispatch(name: string, data?: any): void

// $store - Access stores
$store(name: string): StoreInstance<any>
```

## Testing Utilities

### `@oxog/praxis-testing`

```typescript
import { mount, fireEvent, screen } from '@oxog/praxis-testing';

describe('Counter Component', () => {
  test('increments count', async () => {
    const { component } = mount(`
      <div x-data="{ count: 0 }">
        <span x-text="count" data-testid="count"></span>
        <button x-on:click="count++" data-testid="increment">+</button>
      </div>
    `);
    
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    
    await fireEvent.click(screen.getByTestId('increment'));
    
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(component.count).toBe(1);
  });
});
```

### Testing API

```typescript
interface MountOptions {
  props?: Record<string, any>;
  global?: {
    plugins?: Plugin[];
    stubs?: Record<string, any>;
  };
}

interface MountResult {
  component: any;
  element: Element;
  unmount(): void;
  rerender(template?: string): void;
}

// Mount component
mount(template: string, options?: MountOptions): MountResult

// Fire events
fireEvent.click(element: Element): Promise<void>
fireEvent.input(element: Element, value: string): Promise<void>
fireEvent.keyDown(element: Element, key: string): Promise<void>

// Queries
screen.getByTestId(id: string): Element
screen.getByText(text: string): Element
screen.getByRole(role: string): Element
screen.queryByTestId(id: string): Element | null

// Wait utilities
waitFor(callback: () => void, options?: { timeout?: number }): Promise<void>
waitForElementToBeRemoved(element: Element): Promise<void>

// Mocks
createMockStore(name: string, initialState: any): StoreInstance
mockDirective(name: string, implementation: Function): void
```

## Build Tools

### Vite Plugin

```typescript
import { praxis } from '@oxog/praxis-vite-plugin';

export default {
  plugins: [
    praxis({
      // Optimize templates at build time
      optimize: true,
      
      // Enable SSR
      ssr: true,
      
      // Transform options
      transform: {
        // Include additional file types
        include: ['**/*.html', '**/*.praxis'],
        
        // Exclude patterns
        exclude: ['node_modules/**'],
        
        // Preprocessing
        preprocess: (content: string, id: string) => {
          // Custom preprocessing
          return content;
        }
      },
      
      // Development options
      dev: {
        // Enable hot reload
        hmr: true,
        
        // Debug mode
        debug: true
      }
    })
  ]
};
```

### Webpack Loader

```typescript
module.exports = {
  module: {
    rules: [
      {
        test: /\.html$/,
        use: {
          loader: '@oxog/praxis-webpack-loader',
          options: {
            optimize: true,
            extractCSS: true,
            publicPath: '/assets/'
          }
        }
      }
    ]
  }
};
```

### CLI API

```typescript
import { build, dev, analyze } from '@oxog/praxis-cli';

// Programmatic build
await build({
  input: 'src/main.js',
  output: 'dist/',
  optimize: true,
  sourcemap: true
});

// Development server
await dev({
  port: 3000,
  host: 'localhost',
  open: true
});

// Bundle analysis
const report = await analyze({
  input: 'dist/main.js',
  format: 'json'
});
```

## Configuration

### Global Configuration

```typescript
interface CoralConfig {
  debug: boolean;
  prefix: string;
  delimiters: [string, string];
  security: SecurityConfig;
  performance: PerformanceConfig;
}

interface SecurityConfig {
  csp: boolean;
  trustedTypes: boolean;
  sanitizeHTML: boolean;
  allowUnsafeExpressions: boolean;
}

interface PerformanceConfig {
  batchUpdates: boolean;
  scheduleUpdates: 'sync' | 'async' | 'idle';
  enableProfiling: boolean;
  warnSlowComponents: boolean;
}

// Configure globally
praxis.config({
  debug: true,
  prefix: 'data-',
  security: {
    csp: true,
    trustedTypes: true,
    sanitizeHTML: true
  },
  performance: {
    scheduleUpdates: 'idle',
    enableProfiling: true
  }
});
```

### Environment Variables

```bash
# Development
CORAL_DEBUG=true
CORAL_PERFORMANCE_PROFILING=true

# Production
CORAL_OPTIMIZE=true
CORAL_MINIFY=true
CORAL_CSP=true
```

### TypeScript Support

```typescript
// praxis.d.ts
declare module '@oxog/praxis' {
  interface Component {
    // Add custom component properties
    customMethod(): void;
  }
  
  interface MagicProperties {
    // Add custom magic properties
    $myMagic: {
      helper(value: string): string;
    };
  }
}

// Usage with full type safety
const component = praxis.component<{
  count: number;
  increment(): void;
}>(element);

component.count; // number
component.increment(); // void
```

This API reference covers the complete PraxisJS API. For implementation examples and best practices, see the [Usage Guide](./USAGE.md).