// Core type definitions for PraxisJS with full TypeScript support

import { Signal } from '../core/signal.js';
import { ComputedSignal } from '../core/computed.js';
import { Store, StoreDefinition } from '../store/store.js';
import { SignalifiedObject } from '../store/reactive.js';
import { Component } from '../core/component.js';

// Utility types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

export type UnwrapSignal<T> = T extends Signal<infer U> ? U : T;

export type UnwrapSignals<T> = {
  [K in keyof T]: UnwrapSignal<T[K]>;
};

// PraxisJS data type inference
export interface CoralDataContext {
  [key: string]: any;
}

export type InferCoralData<T extends string> = 
  T extends `{ ${infer Content} }` 
    ? InferObjectLiteral<Content>
    : T extends `${infer FnName}()`
    ? ReturnType<any> // Would need runtime inference
    : any;

type InferObjectLiteral<T extends string> = 
  T extends `${infer Key}: ${infer Value}, ${infer Rest}`
    ? { [K in Key]: InferValue<Value> } & InferObjectLiteral<Rest>
    : T extends `${infer Key}: ${infer Value}`
    ? { [K in Key]: InferValue<Value> }
    : {};

type InferValue<T extends string> = 
  T extends `'${string}'` | `"${string}"` | `\`${string}\``
    ? string
    : T extends `${number}`
    ? number
    : T extends 'true' | 'false'
    ? boolean
    : T extends `[${string}]`
    ? any[]
    : T extends `{${string}}`
    ? object
    : any;

// Directive types
export interface DirectiveBinding<T = any> {
  value: T;
  oldValue: T;
  arg?: string;
  modifiers: Record<string, boolean>;
  instance: Component;
}

export interface DirectiveHook<T = any, P = any> {
  (el: Element, binding: DirectiveBinding<T>, node?: P): void;
}

export interface ObjectDirective<T = any, P = any> {
  beforeMount?: DirectiveHook<T, P>;
  mounted?: DirectiveHook<T, P>;
  beforeUpdate?: DirectiveHook<T, P>;
  updated?: DirectiveHook<T, P>;
  beforeUnmount?: DirectiveHook<T, P>;
  unmounted?: DirectiveHook<T, P>;
}

export type Directive<T = any, P = any> = ObjectDirective<T, P> | DirectiveHook<T, P>;

// Store types with enhanced inference
export interface TypedStore<T extends Record<string, any>> {
  readonly $id: string;
  readonly $state: SignalifiedObject<T>;
  readonly $getters: {
    [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: ComputedSignal<ReturnType<T[K]>>;
  };
  readonly $actions: {
    [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K];
  };
}

export type StoreState<S extends StoreDefinition> = 
  S extends StoreDefinition<infer T> ? T : never;

export type StoreGetters<S extends StoreDefinition> = 
  S['getters'] extends Record<string, any> ? S['getters'] : {};

export type StoreActions<S extends StoreDefinition> = 
  S['actions'] extends Record<string, any> ? S['actions'] : {};

// Component types
export interface ComponentProps {
  [key: string]: any;
}

export interface ComponentEmits {
  [key: string]: (...args: any[]) => void;
}

export interface ComponentSetupContext<E extends ComponentEmits = {}> {
  emit: <K extends keyof E>(event: K, ...args: Parameters<E[K]>) => void;
  expose: (exposed: Record<string, any>) => void;
}

export interface ComponentOptions<
  P extends ComponentProps = {},
  E extends ComponentEmits = {}
> {
  props?: (keyof P)[];
  emits?: (keyof E)[];
  setup?: (props: P, context: ComponentSetupContext<E>) => any;
  template?: string;
}

// Magic properties type definitions
export interface MagicProperties {
  $el: Element;
  $refs: Record<string, Element>;
  $watch: <T>(source: () => T, callback: (newValue: T, oldValue: T) => void) => () => void;
  $nextTick: (callback?: () => void) => Promise<void>;
  $dispatch: (event: string, detail?: any) => void;
  $store: <T = any>(id: string) => Store<T> | undefined;
}

// Event types
export interface CoralEvent<T = any> extends CustomEvent<T> {
  praxis: {
    component: Component;
    element: Element;
  };
}

export type EventHandler<T = Event> = (event: T) => void | Promise<void>;

// Ref types for template refs
export interface TemplateRef<T extends Element = Element> {
  value: T | null;
}

export interface ComponentRef<T extends Record<string, any> = Record<string, any>> {
  value: T | null;
}

// Plugin types
export interface PluginInstallFunction {
  (app: any, options?: any): void;
}

export interface PluginObject {
  install: PluginInstallFunction;
}

export type Plugin = PluginInstallFunction | PluginObject;

// Global types augmentation
declare global {
  namespace PraxisJS {
    interface GlobalProperties extends MagicProperties {}
    
    interface ComponentCustomProperties {}
    
    interface DirectiveCustomProperties {}
  }
}

// Expression context types
export interface ExpressionScope extends MagicProperties {
  [key: string]: any;
}

// Advanced type helpers
export type IsAny<T> = 0 extends (1 & T) ? true : false;

export type IfAny<T, Y, N> = IsAny<T> extends true ? Y : N;

export type Loosen<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]?: T[K];
};

// Computed type helpers
export type ComputedGetter<T> = () => T;
export type ComputedSetter<T> = (value: T) => void;

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>;
  set: ComputedSetter<T>;
}

export type WritableComputedRef<T> = Signal<T>;

// Watch types
export type WatchSource<T = any> = Signal<T> | ComputedSignal<T> | (() => T);

export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onInvalidate: (fn: () => void) => void
) => void;

export type MultiWatchSources = (WatchSource<unknown> | object)[];

export type MapSources<T> = {
  [K in keyof T]: T[K] extends WatchSource<infer V> ? V : never;
};

export type MapOldSources<T, Immediate> = {
  [K in keyof T]: T[K] extends WatchSource<infer V> 
    ? Immediate extends true ? (V | undefined) : V 
    : never;
};

// Reactive types
export type ToSignal<T> = T extends Signal<any> ? T : Signal<T>;

export type ToSignals<T extends object> = {
  [K in keyof T]: ToSignal<T[K]>;
};

// Store composition types
export interface StoreModule<T = any> {
  namespaced?: boolean;
  state?: T | (() => T);
  getters?: Record<string, (state: T, getters: any, rootState: any, rootGetters: any) => any>;
  actions?: Record<string, (context: any, payload: any) => any>;
  mutations?: Record<string, (state: T, payload: any) => void>;
  modules?: Record<string, StoreModule>;
}

// Performance types
export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

// Devtools types
export interface DevtoolsApi {
  addInspector(inspector: any): void;
  addTimelineLayer(layer: any): void;
  addTimelineEvent(event: any): void;
  highlightElement(element: Element): void;
  unhighlightElement(): void;
}

// Error handling types
export type ErrorCodes = 
  | 'SETUP_FUNCTION' 
  | 'RENDER_FUNCTION'
  | 'WATCH_CALLBACK'
  | 'COMPONENT_EVENT_HANDLER'
  | 'DIRECTIVE_HOOK'
  | 'TRANSITION_HOOK'
  | 'APP_ERROR_HANDLER'
  | 'APP_WARN_HANDLER'
  | 'FUNCTION_REF'
  | 'ASYNC_COMPONENT_LOADER'
  | 'SCHEDULER';

export interface ErrorInfo {
  type: ErrorCodes;
  trace?: any[];
}

// Export all types
export * from '../core/signal.js';
export * from '../core/computed.js';
export * from '../core/effect.js';
export * from '../store/store.js';
export * from '../store/reactive.js';
export * from '../core/component.js';