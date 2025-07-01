import { signal, Signal } from './core/signal.js';
import { computed, ComputedSignal } from './core/computed.js';
import { effect, createEffect, Effect } from './core/effect.js';
import { flushUpdates, waitForUpdates, scheduleUpdate } from './core/scheduler.js';
import { globalBinder } from './utils/dom.js';
import { PluginManager, Plugin, PraxisInstance, PraxisConfig } from './core/plugin.js';
import { storeRegistry, defineStore, useStore, Store, StoreDefinition } from './store/store.js';
import { reactive, readonly, shallowReactive, isReactive } from './store/reactive.js';
import { ref, shallowRef, watchEffect, watch, nextTick } from './core/advanced-reactivity.js';
import { setupDevtools, connectToExtension } from './devtools/devtools.js';
import { globalEventBus, createWebSocket, createBroadcastChannel } from './utils/communication.js';
import { directiveRegistry, registerDirective, DirectiveConstructor } from './directives/base.js';
import './directives/index.js';

export interface PraxisJSConfig extends PraxisConfig {
  autoStart?: boolean;
  strict?: boolean;
}

export class Praxis implements PraxisInstance {
  private static instance: Praxis | null = null;
  private isStarted = false;
  private pluginManager = new PluginManager();
  public config: Required<PraxisJSConfig>;
  public version = '0.3.0';

  constructor(config: PraxisJSConfig = {}) {
    this.config = {
      autoStart: true,
      devtools: false,
      performance: false,
      strict: true,
      warnHandler: console.warn,
      errorHandler: console.error,
      ...config
    };

    if (Praxis.instance) {
      console.warn('Praxis instance already exists. Use Praxis.getInstance() instead.');
      return Praxis.instance;
    }

    Praxis.instance = this;

    if (this.config.autoStart) {
      this.autoStart();
    }
  }

  static getInstance(): Praxis {
    if (!Praxis.instance) {
      Praxis.instance = new Praxis();
    }
    return Praxis.instance;
  }

  private autoStart(): void {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  start(): void {
    if (this.isStarted) {
      console.warn('Praxis is already started.');
      return;
    }

    this.isStarted = true;
    globalBinder.init();

    if (this.config.devtools && typeof window !== 'undefined') {
      this.enableDevtools();
    }

    this.dispatchStartEvent();
  }

  use(plugin: Plugin, options?: any): CoralInstance {
    this.pluginManager.install(this, plugin, options);
    return this;
  }

  directive(name: string, directive: DirectiveConstructor): CoralInstance {
    registerDirective(name, directive);
    return this;
  }

  magic(name: string, fn: Function): CoralInstance {
    // Add to global magic properties
    if (typeof window !== 'undefined') {
      (window as any)[name] = fn;
    }
    return this;
  }

  store<T>(name: string, definition: StoreDefinition<T>): Store<T> {
    return defineStore(name, definition);
  }

  stop(): void {
    if (!this.isStarted) return;

    this.isStarted = false;
    globalBinder.dispose();
    this.dispatchStopEvent();
  }

  restart(): void {
    this.stop();
    this.start();
  }

  private enableDevtools(): void {
    const devtools = setupDevtools(this.version);
    connectToExtension();
    
    (window as any).__CORALJS__ = {
      version: this.version,
      instance: this,
      binder: globalBinder,
      storeRegistry,
      pluginManager: this.pluginManager,
      devtools,
      signal,
      computed,
      effect,
      reactive,
      ref,
      flushUpdates,
      waitForUpdates
    };
  }

  private dispatchStartEvent(): void {
    document.dispatchEvent(new CustomEvent('praxis:init', {
      detail: { instance: this }
    }));
  }

  private dispatchStopEvent(): void {
    document.dispatchEvent(new CustomEvent('praxis:destroy', {
      detail: { instance: this }
    }));
  }

  getConfig(): Required<PraxisJSConfig> {
    return { ...this.config };
  }

  isRunning(): boolean {
    return this.isStarted;
  }
}

// Export all Phase 3 APIs
export { 
  // Core reactivity
  signal, computed, effect, createEffect, flushUpdates, waitForUpdates, scheduleUpdate,
  
  // Advanced reactivity
  ref, shallowRef, readonly, reactive, shallowReactive, isReactive, watchEffect, watch, nextTick,
  
  // Store system
  defineStore, useStore, storeRegistry,
  
  // Communication
  globalEventBus, createWebSocket, createBroadcastChannel,
  
  // Plugin system
  registerDirective
};

export type { 
  Signal, ComputedSignal, Effect, Store, StoreDefinition, Plugin, PraxisInstance, 
  PraxisConfig, DirectiveConstructor 
};

const defaultInstance = new Praxis();

const praxis = {
  // Core methods
  start: () => defaultInstance.start(),
  stop: () => defaultInstance.stop(),
  restart: () => defaultInstance.restart(),
  getInstance: () => defaultInstance,
  isRunning: () => defaultInstance.isRunning(),
  
  // Plugin system
  use: (plugin: Plugin, options?: any) => defaultInstance.use(plugin, options),
  directive: (name: string, directive: DirectiveConstructor) => defaultInstance.directive(name, directive),
  magic: (name: string, fn: Function) => defaultInstance.magic(name, fn),
  store: <T>(name: string, definition: StoreDefinition<T>) => defaultInstance.store(name, definition),

  // Core reactivity
  signal,
  computed,
  effect,
  createEffect,
  flushUpdates,
  waitForUpdates,
  scheduleUpdate,
  
  // Advanced reactivity
  ref,
  shallowRef,
  readonly,
  reactive,
  shallowReactive,
  isReactive,
  watchEffect,
  watch,
  nextTick,
  
  // Store system
  defineStore,
  useStore,
  
  // Communication
  eventBus: globalEventBus,
  createWebSocket,
  createBroadcastChannel
};

if (typeof window !== 'undefined') {
  (window as any).Praxis = praxis;
  (window as any).praxis = praxis;
}

export default praxis;