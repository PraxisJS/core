import { signal, Signal, setCurrentObserver, getCurrentObserver } from './signal.js';
import { effect, Effect } from './effect.js';
import { computed, ComputedSignal } from './computed.js';
import { scheduleUpdate } from './scheduler.js';

export interface WatchOptions {
  immediate?: boolean;
  flush?: 'pre' | 'post' | 'sync';
  deep?: boolean;
}

export interface WatchStopHandle {
  (): void;
}

// Advanced ref types
export interface Ref<T> extends Signal<T> {
  readonly __isRef: true;
}

export interface ShallowRef<T> extends Signal<T> {
  readonly __isShallowRef: true;
}

export interface ReadonlyRef<T> extends Omit<Signal<T>, 'value'> {
  readonly value: T;
  readonly __isReadonly: true;
}

// Ref implementation
class RefImpl<T> implements Ref<T> {
  public readonly __isRef = true;
  protected _value: T;
  protected subscribers = new Set<() => void>();

  constructor(value: T) {
    this._value = value;
  }

  get value(): T {
    if (getCurrentObserver()) {
      getCurrentObserver()!.dependencies.add(this);
    }
    return this._value;
  }

  set value(newValue: T) {
    if (this._value === newValue) return;
    this._value = newValue;
    this.notify();
  }

  peek(): T {
    return this._value;
  }

  subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  protected notify(): void {
    this.subscribers.forEach(fn => fn());
  }
}

class ShallowRefImpl<T> extends RefImpl<T> implements ShallowRef<T> {
  public readonly __isShallowRef = true;

  set value(newValue: T) {
    // Shallow ref only triggers on reference change, not deep changes
    if (this._value === newValue) return;
    this._value = newValue;
    this.notify();
  }
}

class ReadonlyRefImpl<T> implements ReadonlyRef<T> {
  public readonly __isReadonly = true;

  constructor(private source: Signal<T>) {}

  get value(): T {
    return this.source.value;
  }

  peek(): T {
    return this.source.peek();
  }

  subscribe(fn: () => void): () => void {
    return this.source.subscribe(fn);
  }
}

// Ref creation functions
export function ref<T>(value: T): Ref<T> {
  return new RefImpl(value);
}

export function shallowRef<T>(value: T): ShallowRef<T> {
  return new ShallowRefImpl(value);
}

export function readonly<T>(source: Signal<T>): ReadonlyRef<T> {
  return new ReadonlyRefImpl(source);
}

export function triggerRef(ref: Ref<any>): void {
  // Force trigger ref update even if value hasn't changed
  ref.subscribe(() => {})(); // This will trigger all subscribers
}

// Utility functions
export function isRef(value: any): value is Ref<any> {
  return value && typeof value === 'object' && value.__isRef === true;
}

export function isShallowRef(value: any): value is ShallowRef<any> {
  return value && typeof value === 'object' && value.__isShallowRef === true;
}

export function isReadonly(value: any): value is ReadonlyRef<any> {
  return value && typeof value === 'object' && value.__isReadonly === true;
}

export function unref<T>(ref: T | Ref<T>): T {
  return isRef(ref) ? ref.value : ref;
}

export function toRef<T, K extends keyof T>(object: T, key: K): Ref<T[K]> {
  const refImpl = ref(object[key]);
  
  // Keep ref in sync with object property
  const originalSet = refImpl.value;
  Object.defineProperty(refImpl, 'value', {
    get: () => object[key],
    set: (newValue) => {
      object[key] = newValue;
    }
  });
  
  return refImpl;
}

export function toRefs<T extends object>(object: T): {
  [K in keyof T]: Ref<T[K]>;
} {
  const refs = {} as any;
  
  for (const key in object) {
    refs[key] = toRef(object, key);
  }
  
  return refs;
}

// Advanced watchers
export function watchEffect(
  fn: () => void | (() => void),
  options: Omit<WatchOptions, 'immediate'> = {}
): WatchStopHandle {
  const cleanup = effect(() => {
    const result = fn();
    if (typeof result === 'function') {
      return result;
    }
  });

  return cleanup;
}

export function watch<T>(
  source: () => T,
  callback: (newValue: T, oldValue: T) => void,
  options: WatchOptions = {}
): WatchStopHandle;
export function watch<T>(
  source: Signal<T>,
  callback: (newValue: T, oldValue: T) => void,
  options: WatchOptions = {}
): WatchStopHandle;
export function watch<T>(
  source: Signal<T> | (() => T),
  callback: (newValue: T, oldValue: T) => void,
  options: WatchOptions = {}
): WatchStopHandle {
  let oldValue: T;
  let getter: () => T;

  if (typeof source === 'function') {
    getter = source;
  } else {
    getter = () => source.value;
  }

  // Get initial value
  if (options.immediate) {
    oldValue = getter();
    try {
      callback(oldValue, undefined as any);
    } catch (error) {
      console.error('Watch callback error:', error);
    }
  } else {
    oldValue = getter();
  }

  const cleanup = effect(() => {
    const newValue = getter();
    
    if (newValue !== oldValue || options.deep) {
      const prevOldValue = oldValue;
      oldValue = newValue;
      
      const executeCallback = () => {
        try {
          callback(newValue, prevOldValue);
        } catch (error) {
          console.error('Watch callback error:', error);
        }
      };

      if (options.flush === 'sync') {
        executeCallback();
      } else {
        scheduleUpdate(executeCallback);
      }
    }
  });

  return cleanup;
}

// Custom refs
export interface CustomRefFactory<T> {
  get(): T;
  set(value: T): void;
}

export function customRef<T>(factory: (track: () => void, trigger: () => void) => CustomRefFactory<T>): Ref<T> {
  let value: T;
  const subscribers = new Set<() => void>();
  
  const track = () => {
    if (getCurrentObserver()) {
      getCurrentObserver()!.dependencies.add(refImpl);
    }
  };
  
  const trigger = () => {
    subscribers.forEach(fn => fn());
  };
  
  const { get, set } = factory(track, trigger);
  
  const refImpl: Ref<T> = {
    __isRef: true,
    get value() {
      return get();
    },
    set value(newValue: T) {
      set(newValue);
    },
    peek: () => get(),
    subscribe: (fn: () => void) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };
  
  return refImpl;
}

// Debounced ref
export function debouncedRef<T>(value: T, delay: number = 200): Ref<T> {
  const immediate = ref(value);
  const debounced = ref(value);
  let timeoutId: number | null = null;

  return customRef((track, trigger) => ({
    get() {
      track();
      return debounced.value;
    },
    set(newValue: T) {
      immediate.value = newValue;
      
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = window.setTimeout(() => {
        debounced.value = newValue;
        trigger();
      }, delay);
    }
  }));
}

// Throttled ref
export function throttledRef<T>(value: T, delay: number = 200): Ref<T> {
  const immediate = ref(value);
  const throttled = ref(value);
  let lastUpdate = 0;

  return customRef((track, trigger) => ({
    get() {
      track();
      return throttled.value;
    },
    set(newValue: T) {
      immediate.value = newValue;
      const now = Date.now();
      
      if (now - lastUpdate >= delay) {
        lastUpdate = now;
        throttled.value = newValue;
        trigger();
      }
    }
  }));
}

// Computed refs with custom setters
export function computedRef<T>(
  getter: () => T,
  setter?: (value: T) => void
): ComputedSignal<T> | Ref<T> {
  if (setter) {
    return customRef((track, trigger) => ({
      get() {
        track();
        return getter();
      },
      set(value: T) {
        setter(value);
        trigger();
      }
    }));
  } else {
    return computed(getter);
  }
}

// Reactive utilities
export function nextTick(fn?: () => void): Promise<void> {
  return new Promise(resolve => {
    scheduleUpdate(() => {
      if (fn) fn();
      resolve();
    });
  });
}

export function until(condition: () => boolean): Promise<void> {
  return new Promise(resolve => {
    const check = () => {
      if (condition()) {
        resolve();
      } else {
        nextTick(check);
      }
    };
    check();
  });
}

// Effect scope for managing multiple effects
export class EffectScope {
  private effects: Array<() => void> = [];
  private isActive = true;

  run<T>(fn: () => T): T | undefined {
    if (!this.isActive) return undefined;
    
    const prevScope = currentScope;
    currentScope = this;
    
    try {
      return fn();
    } finally {
      currentScope = prevScope;
    }
  }

  stop(): void {
    if (!this.isActive) return;
    
    this.effects.forEach(cleanup => cleanup());
    this.effects = [];
    this.isActive = false;
  }

  addEffect(cleanup: () => void): void {
    if (this.isActive) {
      this.effects.push(cleanup);
    }
  }
}

let currentScope: EffectScope | null = null;

export function effectScope(): EffectScope {
  return new EffectScope();
}

export function getCurrentScope(): EffectScope | null {
  return currentScope;
}

export function onScopeDispose(fn: () => void): void {
  if (currentScope) {
    currentScope.addEffect(fn);
  }
}