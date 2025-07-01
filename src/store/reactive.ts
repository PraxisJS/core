import { signal, Signal } from '../core/signal.js';
import { computed, ComputedSignal } from '../core/computed.js';

export type SignalifiedValue<T> = T extends object 
  ? T extends Array<infer U>
    ? SignalifiedArray<U>
    : T extends Map<infer K, infer V>
    ? SignalifiedMap<K, V>
    : T extends Set<infer U>
    ? SignalifiedSet<U>
    : SignalifiedObject<T>
  : Signal<T>;

export type SignalifiedObject<T> = {
  [K in keyof T]: SignalifiedValue<T[K]>;
};

export interface SignalifiedArray<T> extends Array<SignalifiedValue<T>> {
  push(...items: T[]): number;
  pop(): SignalifiedValue<T> | undefined;
  shift(): SignalifiedValue<T> | undefined;
  unshift(...items: T[]): number;
  splice(start: number, deleteCount?: number, ...items: T[]): SignalifiedValue<T>[];
  readonly length: Signal<number>;
}

export interface SignalifiedMap<K, V> extends Map<K, SignalifiedValue<V>> {
  set(key: K, value: V): this;
  get(key: K): SignalifiedValue<V> | undefined;
  readonly size: Signal<number>;
}

export interface SignalifiedSet<T> extends Set<SignalifiedValue<T>> {
  add(value: T): this;
  readonly size: Signal<number>;
}

export interface ReactiveOptions {
  deep?: boolean;
  readonly?: boolean;
  shallow?: boolean;
}

class ReactiveHandler<T extends object> implements ProxyHandler<T> {
  private signals = new Map<string | symbol, Signal<any>>();
  private options: ReactiveOptions;

  constructor(options: ReactiveOptions = {}) {
    this.options = { deep: true, readonly: false, shallow: false, ...options };
  }

  get(target: T, prop: string | symbol, receiver: any): any {
    if (prop === '__isReactive') {
      return true;
    }

    if (prop === '__reactive_signals') {
      return this.signals;
    }

    if (!this.signals.has(prop)) {
      const value = Reflect.get(target, prop, receiver);
      const reactiveValue = this.options.deep && this.shouldMakeReactive(value) 
        ? reactive(value, this.options) 
        : signal(value);
      
      this.signals.set(prop, reactiveValue);
    }

    const signalValue = this.signals.get(prop)!;
    return this.isSignal(signalValue) ? signalValue.value : signalValue;
  }

  set(target: T, prop: string | symbol, value: any, receiver: any): boolean {
    if (this.options.readonly) {
      console.warn(`Cannot set property ${String(prop)} on readonly reactive object`);
      return false;
    }

    if (!this.signals.has(prop)) {
      const reactiveValue = this.options.deep && this.shouldMakeReactive(value) 
        ? reactive(value, this.options) 
        : signal(value);
      
      this.signals.set(prop, reactiveValue);
    } else {
      const existingSignal = this.signals.get(prop)!;
      if (this.isSignal(existingSignal)) {
        existingSignal.value = this.options.deep && this.shouldMakeReactive(value) 
          ? reactive(value, this.options) 
          : value;
      }
    }

    return Reflect.set(target, prop, value, receiver);
  }

  has(target: T, prop: string | symbol): boolean {
    return Reflect.has(target, prop);
  }

  ownKeys(target: T): ArrayLike<string | symbol> {
    return Reflect.ownKeys(target);
  }

  deleteProperty(target: T, prop: string | symbol): boolean {
    if (this.options.readonly) {
      console.warn(`Cannot delete property ${String(prop)} on readonly reactive object`);
      return false;
    }

    this.signals.delete(prop);
    return Reflect.deleteProperty(target, prop);
  }

  private shouldMakeReactive(value: any): boolean {
    return value != null && 
           typeof value === 'object' && 
           !this.isSignal(value) && 
           !this.isReactive(value);
  }

  private isSignal(value: any): value is Signal<any> {
    return value && typeof value === 'object' && 'value' in value && 'subscribe' in value;
  }

  private isReactive(value: any): boolean {
    return value && typeof value === 'object' && value.__isReactive === true;
  }
}

export function reactive<T extends object>(target: T, options?: ReactiveOptions): SignalifiedObject<T> {
  if ((target as any).__isReactive) {
    return target as SignalifiedObject<T>;
  }

  const handler = new ReactiveHandler<T>(options);
  return new Proxy(target, handler) as SignalifiedObject<T>;
}

export function readonly<T extends object>(target: T): SignalifiedObject<T> {
  return reactive(target, { readonly: true });
}

export function shallowReactive<T extends object>(target: T): SignalifiedObject<T> {
  return reactive(target, { deep: false, shallow: true });
}

export function shallowReadonly<T extends object>(target: T): SignalifiedObject<T> {
  return reactive(target, { readonly: true, deep: false, shallow: true });
}

export function isReactive(value: any): boolean {
  return value && typeof value === 'object' && value.__isReactive === true;
}

export function isReadonly(value: any): boolean {
  return isReactive(value) && value.__readonly === true;
}

export function toRaw<T>(reactive: T): T {
  if (isReactive(reactive)) {
    return (reactive as any).__target || reactive;
  }
  return reactive;
}

// Reactive collections
export function reactiveMap<K, V>(initialEntries?: readonly (readonly [K, V])[]): SignalifiedMap<K, V> {
  const map = new Map(initialEntries);
  const sizeSignal = signal(map.size);
  const valueSignals = new Map<K, Signal<V>>();

  return new Proxy(map, {
    get(target, prop) {
      if (prop === 'size') {
        return sizeSignal.value;
      }
      
      if (prop === 'set') {
        return (key: K, value: V) => {
          if (!valueSignals.has(key)) {
            valueSignals.set(key, signal(value));
            target.set(key, value);
            sizeSignal.value = target.size;
          } else {
            valueSignals.get(key)!.value = value;
            target.set(key, value);
          }
          return map;
        };
      }
      
      if (prop === 'get') {
        return (key: K) => {
          if (!valueSignals.has(key)) {
            return undefined;
          }
          return valueSignals.get(key)!.value;
        };
      }
      
      if (prop === 'delete') {
        return (key: K) => {
          const result = target.delete(key);
          if (result) {
            valueSignals.delete(key);
            sizeSignal.value = target.size;
          }
          return result;
        };
      }
      
      if (prop === 'clear') {
        return () => {
          target.clear();
          valueSignals.clear();
          sizeSignal.value = 0;
        };
      }
      
      return Reflect.get(target, prop);
    }
  }) as SignalifiedMap<K, V>;
}

export function reactiveSet<T>(initialValues?: readonly T[]): SignalifiedSet<T> {
  const set = new Set(initialValues);
  const sizeSignal = signal(set.size);
  const valueSignals = new Map<T, Signal<T>>();

  return new Proxy(set, {
    get(target, prop) {
      if (prop === 'size') {
        return sizeSignal.value;
      }
      
      if (prop === 'add') {
        return (value: T) => {
          if (!target.has(value)) {
            target.add(value);
            valueSignals.set(value, signal(value));
            sizeSignal.value = target.size;
          }
          return set;
        };
      }
      
      if (prop === 'delete') {
        return (value: T) => {
          const result = target.delete(value);
          if (result) {
            valueSignals.delete(value);
            sizeSignal.value = target.size;
          }
          return result;
        };
      }
      
      if (prop === 'clear') {
        return () => {
          target.clear();
          valueSignals.clear();
          sizeSignal.value = 0;
        };
      }
      
      return Reflect.get(target, prop);
    }
  }) as SignalifiedSet<T>;
}