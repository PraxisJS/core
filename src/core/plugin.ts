import { DirectiveConstructor } from '../directives/base.js';
import { Store, StoreDefinition } from '../store/store.js';

export interface Plugin {
  name: string;
  version?: string;
  install(praxis: CoralInstance, options?: any): void;
  directives?: Record<string, DirectiveConstructor>;
  magics?: Record<string, Function>;
  stores?: Record<string, StoreDefinition<any>>;
  components?: Record<string, ComponentDefinition>;
}

export interface ComponentDefinition {
  template?: string;
  setup?: () => any;
  props?: string[];
  emits?: string[];
}

export interface CoralInstance {
  // Core methods
  start(): void;
  stop(): void;
  restart(): void;
  
  // Plugin management
  use(plugin: Plugin, options?: any): CoralInstance;
  
  // Directive management
  directive(name: string, directive: DirectiveConstructor): CoralInstance;
  
  // Magic property management
  magic(name: string, fn: Function): CoralInstance;
  
  // Store management
  store<T>(name: string, definition: StoreDefinition<T>): Store<T>;
  
  // Global configuration
  config: CoralConfig;
  
  // Version
  version: string;
}

export interface CoralConfig {
  devtools: boolean;
  performance: boolean;
  warnHandler?: (msg: string, instance?: any, trace?: string) => void;
  errorHandler?: (err: Error, instance?: any, info?: string) => void;
}

export class PluginManager {
  private installedPlugins = new Set<Plugin>();
  private globalDirectives = new Map<string, DirectiveConstructor>();
  private globalMagics = new Map<string, Function>();
  private globalStores = new Map<string, StoreDefinition<any>>();
  private globalComponents = new Map<string, ComponentDefinition>();

  install(praxis: CoralInstance, plugin: Plugin, options?: any): void {
    // Prevent double installation
    if (this.installedPlugins.has(plugin)) {
      console.warn(`Plugin ${plugin.name} is already installed`);
      return;
    }

    // Validate plugin
    if (!this.validatePlugin(plugin)) {
      throw new Error(`Invalid plugin: ${plugin.name}`);
    }

    try {
      // Install the plugin
      plugin.install(praxis, options);

      // Register plugin resources
      this.registerPluginResources(plugin);

      // Mark as installed
      this.installedPlugins.add(plugin);

      console.log(`Plugin ${plugin.name} installed successfully`);
    } catch (error) {
      console.error(`Failed to install plugin ${plugin.name}:`, error);
      throw error;
    }
  }

  private validatePlugin(plugin: Plugin): boolean {
    if (!plugin.name || typeof plugin.install !== 'function') {
      return false;
    }

    // Validate directives if provided
    if (plugin.directives) {
      for (const [name, directive] of Object.entries(plugin.directives)) {
        if (typeof directive !== 'function') {
          console.error(`Invalid directive ${name} in plugin ${plugin.name}`);
          return false;
        }
      }
    }

    // Validate magics if provided
    if (plugin.magics) {
      for (const [name, magic] of Object.entries(plugin.magics)) {
        if (typeof magic !== 'function') {
          console.error(`Invalid magic property ${name} in plugin ${plugin.name}`);
          return false;
        }
      }
    }

    return true;
  }

  private registerPluginResources(plugin: Plugin): void {
    // Register directives
    if (plugin.directives) {
      Object.entries(plugin.directives).forEach(([name, directive]) => {
        this.globalDirectives.set(name, directive);
      });
    }

    // Register magic properties
    if (plugin.magics) {
      Object.entries(plugin.magics).forEach(([name, magic]) => {
        this.globalMagics.set(name, magic);
      });
    }

    // Register stores
    if (plugin.stores) {
      Object.entries(plugin.stores).forEach(([name, store]) => {
        this.globalStores.set(name, store);
      });
    }

    // Register components
    if (plugin.components) {
      Object.entries(plugin.components).forEach(([name, component]) => {
        this.globalComponents.set(name, component);
      });
    }
  }

  getInstalledPlugins(): ReadonlySet<Plugin> {
    return this.installedPlugins;
  }

  getGlobalDirectives(): ReadonlyMap<string, DirectiveConstructor> {
    return this.globalDirectives;
  }

  getGlobalMagics(): ReadonlyMap<string, Function> {
    return this.globalMagics;
  }

  getGlobalStores(): ReadonlyMap<string, StoreDefinition<any>> {
    return this.globalStores;
  }

  getGlobalComponents(): ReadonlyMap<string, ComponentDefinition> {
    return this.globalComponents;
  }

  hasPlugin(nameOrPlugin: string | Plugin): boolean {
    if (typeof nameOrPlugin === 'string') {
      return Array.from(this.installedPlugins).some(plugin => plugin.name === nameOrPlugin);
    }
    return this.installedPlugins.has(nameOrPlugin);
  }

  clear(): void {
    this.installedPlugins.clear();
    this.globalDirectives.clear();
    this.globalMagics.clear();
    this.globalStores.clear();
    this.globalComponents.clear();
  }
}

// Built-in plugins
export const RouterPlugin: Plugin = {
  name: 'router',
  version: '1.0.0',
  install(praxis: CoralInstance) {
    // Simple router implementation
    const routes = new Map<string, ComponentDefinition>();
    const currentRoute = praxis.store('$router', {
      state: () => ({
        path: window.location.pathname,
        params: {},
        query: {}
      }),
      actions: {
        push(path: string) {
          window.history.pushState({}, '', path);
          this.$state.path = path;
        },
        replace(path: string) {
          window.history.replaceState({}, '', path);
          this.$state.path = path;
        },
        go(delta: number) {
          window.history.go(delta);
        }
      }
    });

    // Listen to browser navigation
    window.addEventListener('popstate', () => {
      currentRoute.$state.path = window.location.pathname;
    });

    praxis.magic('$router', () => currentRoute);
    praxis.magic('$route', () => currentRoute.state);
  }
};

export const DevtoolsPlugin: Plugin = {
  name: 'devtools',
  version: '1.0.0',
  install(praxis: CoralInstance, options = {}) {
    if (typeof window === 'undefined' || !praxis.config.devtools) {
      return;
    }

    // Create devtools interface
    const devtools = {
      version: praxis.version,
      stores: new Map(),
      components: new Map(),
      events: [],
      
      recordEvent(event: any) {
        this.events.push({
          ...event,
          timestamp: Date.now()
        });
        
        // Limit event history
        if (this.events.length > 1000) {
          this.events.shift();
        }
      },
      
      getStoreState(storeId: string) {
        const store = this.stores.get(storeId);
        return store ? JSON.parse(JSON.stringify(store.state)) : null;
      },
      
      inspectComponent(element: Element) {
        return this.components.get(element) || null;
      }
    };

    // Expose to global scope for browser extension
    (window as any).__CORAL_DEVTOOLS__ = devtools;

    console.log('🐚 PraxisJS DevTools initialized');
  }
};

export const PerformancePlugin: Plugin = {
  name: 'performance',
  version: '1.0.0',
  install(praxis: CoralInstance) {
    if (!praxis.config.performance || typeof performance === 'undefined') {
      return;
    }

    const metrics = {
      componentRenders: 0,
      storeUpdates: 0,
      directiveExecutions: 0,
      
      startTiming(label: string) {
        performance.mark(`praxis-${label}-start`);
      },
      
      endTiming(label: string) {
        performance.mark(`praxis-${label}-end`);
        performance.measure(`praxis-${label}`, `praxis-${label}-start`, `praxis-${label}-end`);
      },
      
      getMetrics() {
        return { ...metrics };
      }
    };

    praxis.magic('$performance', () => metrics);

    console.log('📊 PraxisJS Performance monitoring enabled');
  }
};

// Helper functions for plugin development
export function definePlugin(definition: Omit<Plugin, 'install'> & {
  install: Plugin['install'];
}): Plugin {
  return definition as Plugin;
}

export function createDirectivePlugin(
  name: string,
  directives: Record<string, DirectiveConstructor>
): Plugin {
  return {
    name,
    install() {
      // Installation is handled by the plugin manager
    },
    directives
  };
}

export function createMagicPlugin(
  name: string,
  magics: Record<string, Function>
): Plugin {
  return {
    name,
    install() {
      // Installation is handled by the plugin manager
    },
    magics
  };
}

export function createStorePlugin(
  name: string,
  stores: Record<string, StoreDefinition<any>>
): Plugin {
  return {
    name,
    install() {
      // Installation is handled by the plugin manager
    },
    stores
  };
}