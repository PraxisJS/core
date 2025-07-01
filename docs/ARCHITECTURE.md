# PraxisJS Architecture Guide

Deep dive into PraxisJS framework internals, design decisions, and architectural patterns.

## Table of Contents

- [Overview](#overview)
- [Reactivity System](#reactivity-system)
- [Component Architecture](#component-architecture)
- [Directive System](#directive-system)
- [DOM Management](#dom-management)
- [Memory Management](#memory-management)
- [Performance Optimizations](#performance-optimizations)
- [Security Architecture](#security-architecture)
- [Build Pipeline](#build-pipeline)
- [Extension Points](#extension-points)

## Overview

PraxisJS is built with performance, security, and developer experience as core principles. The architecture follows these key design patterns:

- **Signals-based Reactivity**: Fine-grained reactive updates using a signals pattern
- **Component-based Architecture**: Encapsulated, reusable components with lifecycle management
- **Directive-driven**: Declarative UI patterns through custom directives
- **Compile-time Optimization**: Template analysis and optimization during build
- **Security-first**: Built-in XSS prevention and CSP compliance

### Core Modules

```
src/
├── core/                 # Core reactivity and component system
│   ├── signal.ts        # Signals implementation
│   ├── effect.ts        # Effect system
│   ├── component.ts     # Component management
│   └── scheduler.ts     # Update scheduling
├── directives/          # Built-in and advanced directives
│   ├── core.ts         # Core directives (x-data, x-show, etc.)
│   ├── advanced.ts     # Advanced directives (x-intersect, etc.)
│   └── base.ts         # Base directive interface
├── dom/                 # DOM manipulation and utilities
│   ├── binding.ts      # DOM binding system
│   ├── diff.ts         # Virtual DOM diffing
│   └── events.ts       # Event handling
├── store/               # Global state management
│   ├── store.ts        # Store implementation
│   └── reactive.ts     # Reactive object creation
├── security/            # Security features
│   ├── security.ts     # Security manager
│   ├── sanitizer.ts    # HTML sanitization
│   └── csp.ts          # CSP integration
├── compiler/            # Template compilation
│   ├── parser.ts       # HTML/template parsing
│   ├── optimizer.ts    # Template optimization
│   └── codegen.ts      # Code generation
└── tools/               # Development and build tools
    ├── cli/            # Command line interface
    ├── vite-plugin/    # Vite integration
    └── webpack-loader/ # Webpack integration
```

## Reactivity System

### Signals Architecture

PraxisJS uses a signals-based reactivity system inspired by SolidJS and Vue 3.4, providing fine-grained reactive updates with automatic dependency tracking.

```typescript
// Core signal implementation
export class SignalImpl<T> implements Signal<T> {
  private _value: T;
  private observers = new Set<Effect>();
  private version = 0;

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get value(): T {
    // Register current observer for dependency tracking
    if (currentObserver && isTracking) {
      this.observers.add(currentObserver);
      currentObserver.dependencies.add(this);
    }
    return this._value;
  }

  set value(newValue: T) {
    if (newValue !== this._value) {
      this._value = newValue;
      this.version++;
      this.notifyObservers();
    }
  }

  private notifyObservers() {
    for (const observer of this.observers) {
      scheduler.schedule(observer);
    }
  }
}
```

### Dependency Tracking

```typescript
let currentObserver: Effect | null = null;
let isTracking = true;

export function track<T>(fn: () => T): T {
  const prevObserver = currentObserver;
  const prevTracking = isTracking;
  
  try {
    isTracking = true;
    return fn();
  } finally {
    currentObserver = prevObserver;
    isTracking = prevTracking;
  }
}

export function untrack<T>(fn: () => T): T {
  const prevTracking = isTracking;
  try {
    isTracking = false;
    return fn();
  } finally {
    isTracking = prevTracking;
  }
}
```

### Effect System

```typescript
export class EffectImpl implements Effect {
  dependencies = new Set<Signal<any>>();
  private cleanup?: () => void;
  private disposed = false;

  constructor(private fn: () => void) {
    this.execute();
  }

  execute() {
    if (this.disposed) return;
    
    this.cleanup?.();
    this.dependencies.clear();
    
    const prevObserver = currentObserver;
    currentObserver = this;
    
    try {
      this.cleanup = this.fn() || undefined;
    } finally {
      currentObserver = prevObserver;
    }
  }

  dispose() {
    this.cleanup?.();
    this.dependencies.clear();
    this.disposed = true;
  }
}
```

### Computed Signals

```typescript
export class ComputedSignalImpl<T> implements ComputedSignal<T> {
  private _value?: T;
  private _version = -1;
  private dependencies = new Set<Signal<any>>();
  
  constructor(private computation: () => T) {}

  get value(): T {
    if (this.needsUpdate()) {
      this.recompute();
    }
    
    // Register as dependency
    if (currentObserver) {
      currentObserver.dependencies.add(this);
    }
    
    return this._value!;
  }

  private needsUpdate(): boolean {
    return this.dependencies.some(dep => dep.version !== this._version);
  }

  private recompute() {
    const prevObserver = currentObserver;
    currentObserver = null;
    
    this.dependencies.clear();
    
    try {
      this._value = track(() => this.computation());
      this._version = getCurrentVersion();
    } finally {
      currentObserver = prevObserver;
    }
  }
}
```

## Component Architecture

### Component Lifecycle

Components in PraxisJS follow a predictable lifecycle with clear phases:

```typescript
interface ComponentLifecycle {
  init?(): void;        // Called when component is created
  mounted?(): void;     // Called when DOM is ready
  updated?(): void;     // Called after reactive updates
  destroyed?(): void;   // Called when component is removed
}

export class Component {
  private state: any;
  private effects: Effect[] = [];
  private cleanup: (() => void)[] = [];
  
  constructor(
    private element: Element,
    private dataFunction: () => any
  ) {
    this.initialize();
  }

  private initialize() {
    // Create reactive state
    this.state = reactive(this.dataFunction());
    
    // Call init lifecycle
    this.state.init?.();
    
    // Set up DOM bindings
    this.setupBindings();
    
    // Call mounted lifecycle
    queueMicrotask(() => {
      this.state.mounted?.();
    });
  }

  private setupBindings() {
    const directives = this.parseDirectives();
    
    for (const directive of directives) {
      const binding = this.createBinding(directive);
      this.effects.push(binding);
    }
  }

  dispose() {
    this.state.destroyed?.();
    this.effects.forEach(effect => effect.dispose());
    this.cleanup.forEach(fn => fn());
  }
}
```

### Reactive State Creation

```typescript
export function reactive<T extends object>(obj: T): T {
  const signals = new Map<string | symbol, Signal<any>>();
  
  return new Proxy(obj, {
    get(target, key) {
      if (typeof key === 'string' && !(key in signals)) {
        signals.set(key, signal(target[key]));
      }
      
      const s = signals.get(key);
      return s ? s.value : target[key];
    },
    
    set(target, key, value) {
      const s = signals.get(key);
      if (s) {
        s.value = value;
      } else {
        target[key] = value;
        signals.set(key, signal(value));
      }
      return true;
    }
  });
}
```

## Directive System

### Base Directive Interface

```typescript
export interface Directive {
  name: string;
  priority: number;
  
  bind?(el: Element, binding: DirectiveBinding, component: Component): void;
  update?(el: Element, binding: DirectiveBinding, component: Component): void;
  unbind?(el: Element, binding: DirectiveBinding, component: Component): void;
}

export interface DirectiveBinding {
  expression: string;
  value: any;
  oldValue?: any;
  argument?: string;
  modifiers: Record<string, boolean>;
}
```

### Directive Processing Pipeline

```typescript
export class DirectiveProcessor {
  private directives = new Map<string, Directive>();
  
  registerDirective(directive: Directive) {
    this.directives.set(directive.name, directive);
  }
  
  processElement(element: Element, component: Component) {
    const directives = this.parseDirectives(element);
    
    // Sort by priority
    directives.sort((a, b) => b.directive.priority - a.directive.priority);
    
    for (const { directive, binding } of directives) {
      this.bindDirective(element, directive, binding, component);
    }
  }
  
  private bindDirective(
    element: Element,
    directive: Directive,
    binding: DirectiveBinding,
    component: Component
  ) {
    // Create reactive effect for directive
    const effect = new EffectImpl(() => {
      const value = component.evaluateExpression(binding.expression);
      
      directive.bind?.(element, { ...binding, value }, component);
      
      return () => {
        directive.unbind?.(element, binding, component);
      };
    });
    
    component.addEffect(effect);
  }
}
```

### Core Directives Implementation

```typescript
// x-show directive
export const ShowDirective: Directive = {
  name: 'show',
  priority: 100,
  
  bind(el, { value }) {
    if (value) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }
};

// x-if directive
export const IfDirective: Directive = {
  name: 'if',
  priority: 200,
  
  bind(el, { value }) {
    const template = el as HTMLTemplateElement;
    const parent = template.parentNode!;
    const comment = document.createComment('x-if');
    
    if (value) {
      const clone = template.content.cloneNode(true);
      parent.insertBefore(clone, template);
    } else {
      parent.insertBefore(comment, template);
    }
  }
};

// x-for directive with virtual DOM diffing
export const ForDirective: Directive = {
  name: 'for',
  priority: 300,
  
  bind(el, { value, expression }) {
    const template = el as HTMLTemplateElement;
    const parent = template.parentNode!;
    const anchor = document.createComment('x-for');
    parent.insertBefore(anchor, template);
    
    let previousNodes: Node[] = [];
    
    const items = Array.isArray(value) ? value : [];
    const newNodes = this.renderItems(template, items, expression);
    
    // Diff and patch
    this.diffAndPatch(parent, anchor, previousNodes, newNodes);
    previousNodes = newNodes;
  },
  
  private renderItems(template: HTMLTemplateElement, items: any[], expression: string) {
    return items.map((item, index) => {
      const clone = template.content.cloneNode(true) as DocumentFragment;
      
      // Create item context
      const itemComponent = new Component(clone, () => ({
        [this.getItemName(expression)]: item,
        $index: index
      }));
      
      return clone;
    });
  },
  
  private diffAndPatch(
    parent: Node,
    anchor: Comment,
    oldNodes: Node[],
    newNodes: Node[]
  ) {
    // Simplified diffing algorithm
    const oldLength = oldNodes.length;
    const newLength = newNodes.length;
    
    // Remove extra nodes
    for (let i = newLength; i < oldLength; i++) {
      oldNodes[i].remove();
    }
    
    // Update/add nodes
    for (let i = 0; i < newLength; i++) {
      if (i < oldLength) {
        parent.replaceChild(newNodes[i], oldNodes[i]);
      } else {
        parent.insertBefore(newNodes[i], anchor);
      }
    }
  }
};
```

## DOM Management

### Virtual DOM Integration

While PraxisJS primarily uses direct DOM manipulation for performance, it includes a lightweight virtual DOM for complex list rendering:

```typescript
export interface VNode {
  type: string;
  props: Record<string, any>;
  children: VNode[];
  key?: string | number;
  element?: Element;
}

export class VirtualDOM {
  static diff(oldVNode: VNode, newVNode: VNode): Patch[] {
    const patches: Patch[] = [];
    
    if (oldVNode.type !== newVNode.type) {
      patches.push({ type: 'REPLACE', vnode: newVNode });
      return patches;
    }
    
    // Diff props
    const propPatches = this.diffProps(oldVNode.props, newVNode.props);
    patches.push(...propPatches);
    
    // Diff children
    const childPatches = this.diffChildren(oldVNode.children, newVNode.children);
    patches.push(...childPatches);
    
    return patches;
  }
  
  static patch(element: Element, patches: Patch[]) {
    for (const patch of patches) {
      switch (patch.type) {
        case 'REPLACE':
          this.replaceElement(element, patch.vnode);
          break;
        case 'UPDATE_PROPS':
          this.updateProps(element, patch.props);
          break;
        case 'REORDER':
          this.reorderChildren(element, patch.moves);
          break;
      }
    }
  }
}
```

### Event System

```typescript
export class EventManager {
  private static listeners = new WeakMap<Element, Map<string, EventListener>>();
  
  static addEventListener(
    element: Element,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) {
    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Map());
    }
    
    const elementListeners = this.listeners.get(element)!;
    
    // Remove existing listener
    if (elementListeners.has(event)) {
      const oldHandler = elementListeners.get(event)!;
      element.removeEventListener(event, oldHandler);
    }
    
    // Add new listener
    elementListeners.set(event, handler);
    element.addEventListener(event, handler, options);
  }
  
  static removeEventListener(element: Element, event: string) {
    const elementListeners = this.listeners.get(element);
    if (!elementListeners) return;
    
    const handler = elementListeners.get(event);
    if (handler) {
      element.removeEventListener(event, handler);
      elementListeners.delete(event);
    }
  }
  
  static cleanup(element: Element) {
    const elementListeners = this.listeners.get(element);
    if (!elementListeners) return;
    
    for (const [event, handler] of elementListeners) {
      element.removeEventListener(event, handler);
    }
    
    this.listeners.delete(element);
  }
}
```

## Memory Management

### Automatic Cleanup

PraxisJS implements comprehensive memory management to prevent leaks:

```typescript
export class MemoryManager {
  private static readonly registry = new FinalizationRegistry((cleanup: () => void) => {
    cleanup();
  });
  
  private static readonly componentRefs = new WeakMap<Element, WeakRef<Component>>();
  
  static registerComponent(element: Element, component: Component) {
    this.componentRefs.set(element, new WeakRef(component));
    
    this.registry.register(component, () => {
      // Cleanup when component is garbage collected
      EventManager.cleanup(element);
      this.componentRefs.delete(element);
    });
  }
  
  static getComponent(element: Element): Component | null {
    const ref = this.componentRefs.get(element);
    return ref?.deref() || null;
  }
  
  static cleanup() {
    // Force cleanup of all components
    for (const [element, ref] of this.componentRefs) {
      const component = ref.deref();
      if (component) {
        component.dispose();
      }
    }
  }
}
```

### WeakMap-based Dependency Tracking

```typescript
export class DependencyTracker {
  private static readonly dependencies = new WeakMap<Signal<any>, Set<Effect>>();
  private static readonly reverseDeps = new WeakMap<Effect, Set<Signal<any>>>();
  
  static addDependency(signal: Signal<any>, effect: Effect) {
    if (!this.dependencies.has(signal)) {
      this.dependencies.set(signal, new Set());
    }
    
    if (!this.reverseDeps.has(effect)) {
      this.reverseDeps.set(effect, new Set());
    }
    
    this.dependencies.get(signal)!.add(effect);
    this.reverseDeps.get(effect)!.add(signal);
  }
  
  static removeDependency(signal: Signal<any>, effect: Effect) {
    this.dependencies.get(signal)?.delete(effect);
    this.reverseDeps.get(effect)?.delete(signal);
  }
  
  static cleanup(effect: Effect) {
    const signals = this.reverseDeps.get(effect);
    if (signals) {
      for (const signal of signals) {
        this.dependencies.get(signal)?.delete(effect);
      }
      this.reverseDeps.delete(effect);
    }
  }
}
```

## Performance Optimizations

### Update Scheduling

PraxisJS uses sophisticated scheduling to optimize updates:

```typescript
export class Scheduler {
  private queue = new Set<Effect>();
  private flushing = false;
  private flushPromise: Promise<void> | null = null;
  
  schedule(effect: Effect) {
    this.queue.add(effect);
    this.flush();
  }
  
  private flush() {
    if (this.flushing) return;
    
    this.flushing = true;
    this.flushPromise = this.resolveScheduled().then(() => {
      this.flushing = false;
      this.flushPromise = null;
      
      // Process queue
      const effects = Array.from(this.queue);
      this.queue.clear();
      
      for (const effect of effects) {
        effect.execute();
      }
    });
  }
  
  private resolveScheduled(): Promise<void> {
    // Use different scheduling strategies based on environment
    if (typeof MessageChannel !== 'undefined') {
      return new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port2.onmessage = () => resolve();
        channel.port1.postMessage(null);
      });
    } else if (typeof requestIdleCallback !== 'undefined') {
      return new Promise(resolve => {
        requestIdleCallback(() => resolve());
      });
    } else {
      return Promise.resolve();
    }
  }
}
```

### Template Optimization

The compiler performs several optimizations:

```typescript
export class TemplateOptimizer {
  optimize(ast: ASTNode): OptimizedAST {
    return {
      staticNodes: this.hoistStatic(ast),
      dynamicBindings: this.extractDynamic(ast),
      optimizationHints: this.analyzePatterns(ast)
    };
  }
  
  private hoistStatic(ast: ASTNode): StaticNode[] {
    const static: StaticNode[] = [];
    
    this.traverse(ast, (node) => {
      if (this.isStatic(node)) {
        static.push(node);
        node.hoisted = true;
      }
    });
    
    return static;
  }
  
  private extractDynamic(ast: ASTNode): DynamicBinding[] {
    const bindings: DynamicBinding[] = [];
    
    this.traverse(ast, (node) => {
      if (node.type === 'directive' && this.isDynamic(node)) {
        bindings.push({
          expression: node.expression,
          dependencies: this.analyzeDependencies(node.expression),
          updateStrategy: this.determineStrategy(node)
        });
      }
    });
    
    return bindings;
  }
}
```

## Security Architecture

### Expression Sandboxing

```typescript
export class ExpressionSandbox {
  private static readonly allowedGlobals = new Set([
    'Math', 'Date', 'JSON', 'console', 'Object', 'Array'
  ]);
  
  private static readonly blockedPatterns = [
    /constructor/,
    /prototype/,
    /__proto__/,
    /eval/,
    /Function/,
    /import/,
    /require/
  ];
  
  static sanitizeExpression(expression: string): string {
    // Remove dangerous patterns
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(expression)) {
        throw new Error(`Unsafe expression: ${expression}`);
      }
    }
    
    return expression;
  }
  
  static createSafeContext(component: any): any {
    return new Proxy(component, {
      get(target, key) {
        if (typeof key === 'string' && key.startsWith('__')) {
          throw new Error(`Access to private property blocked: ${key}`);
        }
        
        return target[key];
      },
      
      has(target, key) {
        if (typeof key === 'string' && this.allowedGlobals.has(key)) {
          return true;
        }
        
        return key in target;
      }
    });
  }
}
```

### HTML Sanitization

```typescript
export class HTMLSanitizer {
  private static readonly allowedTags = new Set([
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'strong', 'em', 'code', 'pre'
  ]);
  
  private static readonly allowedAttributes = new Set([
    'class', 'id', 'data-*', 'aria-*', 'role'
  ]);
  
  static sanitize(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    this.sanitizeNode(doc.body);
    return doc.body.innerHTML;
  }
  
  private static sanitizeNode(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      // Check tag
      if (!this.allowedTags.has(element.tagName.toLowerCase())) {
        node.remove();
        return;
      }
      
      // Check attributes
      Array.from(element.attributes).forEach(attr => {
        if (!this.isAllowedAttribute(attr.name)) {
          element.removeAttribute(attr.name);
        }
      });
    }
    
    // Recursively sanitize children
    Array.from(node.childNodes).forEach(child => {
      this.sanitizeNode(child);
    });
  }
}
```

## Build Pipeline

### Template Compilation

```typescript
export class TemplateCompiler {
  compile(template: string, options: CompileOptions): CompiledTemplate {
    // Parse HTML into AST
    const ast = this.parser.parse(template);
    
    // Optimize AST
    const optimized = this.optimizer.optimize(ast);
    
    // Generate code
    const code = this.codegen.generate(optimized);
    
    return {
      code,
      ast: optimized,
      dependencies: this.extractDependencies(optimized),
      staticAssets: this.extractAssets(optimized)
    };
  }
  
  private extractDependencies(ast: OptimizedAST): string[] {
    const deps: string[] = [];
    
    for (const binding of ast.dynamicBindings) {
      deps.push(...binding.dependencies);
    }
    
    return [...new Set(deps)];
  }
}
```

### Code Generation

```typescript
export class CodeGenerator {
  generate(ast: OptimizedAST): string {
    const staticNodes = this.generateStatic(ast.staticNodes);
    const dynamicCode = this.generateDynamic(ast.dynamicBindings);
    
    return `
      // Static nodes (hoisted)
      ${staticNodes}
      
      // Component factory
      export function createComponent() {
        return {
          // Dynamic bindings
          ${dynamicCode}
        };
      }
    `;
  }
  
  private generateStatic(nodes: StaticNode[]): string {
    return nodes.map(node => 
      `const static${node.id} = ${this.nodeToCode(node)};`
    ).join('\n');
  }
  
  private generateDynamic(bindings: DynamicBinding[]): string {
    return bindings.map(binding => {
      const deps = binding.dependencies.join(', ');
      return `
        ${binding.name}: computed(() => {
          return ${binding.expression};
        }, [${deps}])
      `;
    }).join(',\n');
  }
}
```

## Extension Points

### Plugin Architecture

```typescript
export interface Plugin {
  name: string;
  version?: string;
  dependencies?: string[];
  
  install(praxis: CoralInstance, options?: any): void;
  uninstall?(): void;
}

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private installed = new Set<string>();
  
  register(plugin: Plugin) {
    this.plugins.set(plugin.name, plugin);
  }
  
  install(name: string, options?: any) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin not found: ${name}`);
    }
    
    // Check dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.installed.has(dep)) {
          throw new Error(`Missing dependency: ${dep}`);
        }
      }
    }
    
    plugin.install(praxis, options);
    this.installed.add(name);
  }
  
  uninstall(name: string) {
    const plugin = this.plugins.get(name);
    if (plugin && plugin.uninstall) {
      plugin.uninstall();
    }
    
    this.installed.delete(name);
  }
}
```

This architecture guide provides insight into PraxisJS's internal design and implementation. The framework is built with modularity, performance, and extensibility in mind, allowing developers to understand and extend its capabilities as needed.