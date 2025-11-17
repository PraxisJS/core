import { Signal, signal } from '../core/signal.js';
import { ComputedSignal, computed } from '../core/computed.js';
import { effect } from '../core/effect.js';
import { reactive, SignalifiedObject } from './reactive.js';

export interface StoreDefinition<T = any> {
  state: () => T;
  getters?: Record<string, (state: SignalifiedObject<T>, getters: any) => any>;
  actions?: Record<string, (this: Store<T>, ...args: any[]) => any>;
  modules?: Record<string, StoreDefinition<any>>;
}

export interface Store<T = any> {
  readonly id: string;
  readonly state: SignalifiedObject<T>;
  readonly getters: Record<string, ComputedSignal<any>>;
  readonly actions: Record<string, Function>;
  readonly modules: Record<string, Store<any>>;
  
  // Store methods
  subscribe(path: string, callback: (newValue: any, oldValue: any) => void): () => void;
  watch<K extends keyof T>(key: K, callback: (newValue: T[K], oldValue: T[K]) => void): () => void;
  reset(): void;
  
  // State management
  $state: SignalifiedObject<T>;
  $patch(partialState: Partial<T>): void;
  $patch(mutatorFunction: (state: T) => void): void;
  
  // Debugging
  $id: string;
  $dispose(): void;
}

export interface StoreAction {
  type: string;
  payload?: any;
  timestamp: number;
  storeId: string;
}

export interface StoreSubscription {
  id: string;
  path: string;
  callback: Function;
  unsubscribe: () => void;
}

class StoreImpl<T = any> implements Store<T> {
  public readonly id: string;
  public readonly state: SignalifiedObject<T>;
  public readonly getters: Record<string, ComputedSignal<any>> = {};
  public readonly actions: Record<string, Function> = {};
  public readonly modules: Record<string, Store<any>> = {};
  
  private subscribers = new Map<string, StoreSubscription[]>();
  private actionHistory: StoreAction[] = [];
  private isDisposed = false;
  private initialState: T;

  constructor(id: string, definition: StoreDefinition<T>) {
    this.id = id;
    this.initialState = definition.state();
    this.state = reactive(this.initialState);
    
    this.setupGetters(definition.getters || {});
    this.setupActions(definition.actions || {});
    this.setupModules(definition.modules || {});
  }

  get $state(): SignalifiedObject<T> {
    return this.state;
  }

  get $id(): string {
    return this.id;
  }

  private setupGetters(gettersDefinition: Record<string, Function>): void {
    Object.entries(gettersDefinition).forEach(([key, getter]) => {
      this.getters[key] = computed(() => {
        return getter(this.state, this.getters);
      });
    });
  }

  private setupActions(actionsDefinition: Record<string, Function>): void {
    Object.entries(actionsDefinition).forEach(([key, action]) => {
      this.actions[key] = (...args: any[]) => {
        const actionObj: StoreAction = {
          type: `${this.id}/${key}`,
          payload: args,
          timestamp: Date.now(),
          storeId: this.id
        };
        
        this.recordAction(actionObj);
        
        try {
          return action.apply(this, args);
        } catch (error) {
          console.error(`Action ${key} failed:`, error);
          throw error;
        }
      };
    });
  }

  private setupModules(modulesDefinition: Record<string, StoreDefinition<any>>): void {
    Object.entries(modulesDefinition).forEach(([key, moduleDefinition]) => {
      this.modules[key] = new StoreImpl(`${this.id}/${key}`, moduleDefinition);
    });
  }

  subscribe(path: string, callback: (newValue: any, oldValue: any) => void): () => void {
    const subscriptionId = `${Date.now()}-${Math.random()}`;
    
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }

    const subscription: StoreSubscription = {
      id: subscriptionId,
      path,
      callback,
      unsubscribe: () => this.unsubscribe(path, subscriptionId)
    };

    this.subscribers.get(path)!.push(subscription);

    // Set up reactive effect to watch the path
    let oldValue = this.getValueAtPath(path);
    const dispose = effect(() => {
      const newValue = this.getValueAtPath(path);
      if (newValue !== oldValue) {
        callback(newValue, oldValue);
        oldValue = newValue;
      }
    });

    subscription.unsubscribe = () => {
      dispose();
      this.unsubscribe(path, subscriptionId);
    };

    return subscription.unsubscribe;
  }

  watch<K extends keyof T>(key: K, callback: (newValue: T[K], oldValue: T[K]) => void): () => void {
    return this.subscribe(String(key), callback);
  }

  $patch(stateOrMutator: Partial<T> | ((state: T) => void)): void {
    if (typeof stateOrMutator === 'function') {
      // Mutator function
      const currentState = this.getCurrentState();
      stateOrMutator(currentState);
      this.applyState(currentState);
    } else {
      // Partial state object
      Object.assign(this.state, stateOrMutator);
    }
  }

  reset(): void {
    this.applyState(this.initialState);
  }

  $dispose(): void {
    if (this.isDisposed) return;
    
    this.isDisposed = true;
    this.subscribers.clear();
    this.actionHistory = [];
    
    // Dispose modules
    Object.values(this.modules).forEach(module => module.$dispose());
  }

  // Helper methods
  private unsubscribe(path: string, subscriptionId: string): void {
    const subscriptions = this.subscribers.get(path);
    if (subscriptions) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index > -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscribers.delete(path);
        }
      }
    }
  }

  private getValueAtPath(path: string): any {
    const keys = path.split('.');
    let current: any = this.state;
    
    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }
    
    return current;
  }

  private getCurrentState(): T {
    return JSON.parse(JSON.stringify(this.state));
  }

  private applyState(newState: T): void {
    Object.keys(newState).forEach(key => {
      (this.state as any)[key] = (newState as any)[key];
    });
  }

  private recordAction(action: StoreAction): void {
    this.actionHistory.push(action);
    
    // Limit history size for memory management
    if (this.actionHistory.length > 1000) {
      this.actionHistory.shift();
    }
    
    // Emit to devtools if available
    if (typeof window !== 'undefined' && (window as any).__CORAL_DEVTOOLS__) {
      (window as any).__CORAL_DEVTOOLS__.recordAction(action);
    }
  }

  // Public getters for debugging
  get $actionHistory(): readonly StoreAction[] {
    return this.actionHistory;
  }

  get $subscribers(): ReadonlyMap<string, readonly StoreSubscription[]> {
    return this.subscribers;
  }
}

// Global store registry
class StoreRegistry {
  private stores = new Map<string, Store<any>>();

  define<T>(id: string, definition: StoreDefinition<T>): Store<T> {
    if (this.stores.has(id)) {
      console.warn(`Store ${id} already exists. Replacing...`);
      this.stores.get(id)?.$dispose();
    }

    const store = new StoreImpl(id, definition);
    this.stores.set(id, store);
    return store;
  }

  get<T = any>(id: string): Store<T> | undefined {
    return this.stores.get(id);
  }

  getAll(): ReadonlyMap<string, Store<any>> {
    return this.stores;
  }

  remove(id: string): boolean {
    const store = this.stores.get(id);
    if (store) {
      store.$dispose();
      return this.stores.delete(id);
    }
    return false;
  }

  clear(): void {
    this.stores.forEach(store => store.$dispose());
    this.stores.clear();
  }
}

export const storeRegistry = new StoreRegistry();

// Convenience functions
export function defineStore<T>(id: string, definition: StoreDefinition<T>): Store<T> {
  return storeRegistry.define(id, definition);
}

export function useStore<T = any>(id: string): Store<T> | undefined {
  return storeRegistry.get<T>(id);
}

export function createStore<T>(definition: StoreDefinition<T>): Store<T> {
  const id = `store-${Date.now()}-${Math.random()}`;
  return defineStore(id, definition);
}