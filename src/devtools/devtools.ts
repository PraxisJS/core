import { Store, StoreAction } from '../store/store.js';
import { Component } from '../core/component.js';

export interface DevtoolsHook {
  PraxisJSDevtools?: PraxisJSDevtools;
}

export interface PraxisJSDevtools {
  version: string;
  
  // Store management
  stores: Map<string, DevtoolsStore>;
  registerStore(store: Store<any>): void;
  unregisterStore(storeId: string): void;
  
  // Component management
  components: Map<Element, DevtoolsComponent>;
  registerComponent(component: Component): void;
  unregisterComponent(element: Element): void;
  
  // Event tracking
  events: DevtoolsEvent[];
  recordEvent(event: DevtoolsEvent): void;
  
  // Time travel debugging
  timeline: TimelineEntry[];
  canTimeTravel: boolean;
  timeTravel(index: number): void;
  
  // Performance monitoring
  performance: PerformanceMetrics;
  
  // Settings
  settings: DevtoolsSettings;
}

export interface DevtoolsStore {
  id: string;
  state: any;
  getters: Record<string, any>;
  actions: string[];
  modules: string[];
  subscriptions: number;
  lastAction?: StoreAction;
}

export interface DevtoolsComponent {
  id: string;
  element: Element;
  name: string;
  props: Record<string, any>;
  state: Record<string, any>;
  directives: string[];
  parent?: string;
  children: string[];
  renderCount: number;
  lastRender: number;
}

export interface DevtoolsEvent {
  type: 'store-action' | 'component-render' | 'directive-execute' | 'error' | 'warning';
  timestamp: number;
  storeId?: string;
  componentId?: string;
  data: any;
}

export interface TimelineEntry {
  index: number;
  timestamp: number;
  type: 'action' | 'mutation' | 'render';
  description: string;
  before: any;
  after: any;
}

export interface PerformanceMetrics {
  componentRenders: number;
  storeActions: number;
  directiveExecutions: number;
  averageRenderTime: number;
  memoryUsage: number;
  startTime: number;
}

export interface DevtoolsSettings {
  recordActions: boolean;
  recordComponents: boolean;
  recordPerformance: boolean;
  maxEvents: number;
  maxTimeline: number;
}

class PraxisJSDevtoolsImpl implements PraxisJSDevtools {
  public version: string;
  public stores = new Map<string, DevtoolsStore>();
  public components = new Map<Element, DevtoolsComponent>();
  public events: DevtoolsEvent[] = [];
  public timeline: TimelineEntry[] = [];
  public canTimeTravel = false;
  
  public performance: PerformanceMetrics = {
    componentRenders: 0,
    storeActions: 0,
    directiveExecutions: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    startTime: Date.now()
  };
  
  public settings: DevtoolsSettings = {
    recordActions: true,
    recordComponents: true,
    recordPerformance: true,
    maxEvents: 1000,
    maxTimeline: 500
  };

  constructor(version: string) {
    this.version = version;
    this.setupPerformanceMonitoring();
  }

  registerStore(store: Store<any>): void {
    const devtoolsStore: DevtoolsStore = {
      id: store.id,
      state: this.serializeState(store.state),
      getters: this.serializeGetters(store.getters),
      actions: Object.keys(store.actions),
      modules: Object.keys(store.modules),
      subscriptions: (store as any).$subscribers?.size || 0
    };

    this.stores.set(store.id, devtoolsStore);
    
    this.recordEvent({
      type: 'store-action',
      timestamp: Date.now(),
      storeId: store.id,
      data: { type: 'store-registered', store: devtoolsStore }
    });
  }

  unregisterStore(storeId: string): void {
    this.stores.delete(storeId);
    
    this.recordEvent({
      type: 'store-action',
      timestamp: Date.now(),
      storeId,
      data: { type: 'store-unregistered' }
    });
  }

  registerComponent(component: Component): void {
    const componentId = this.generateComponentId(component.element);
    
    const devtoolsComponent: DevtoolsComponent = {
      id: componentId,
      element: component.element,
      name: this.getComponentName(component.element),
      props: this.extractProps(component.element),
      state: this.serializeState(component.scope),
      directives: this.extractDirectives(component.element),
      parent: this.findParentComponentId(component),
      children: this.findChildComponentIds(component),
      renderCount: 0,
      lastRender: Date.now()
    };

    this.components.set(component.element, devtoolsComponent);
    
    if (this.settings.recordComponents) {
      this.recordEvent({
        type: 'component-render',
        timestamp: Date.now(),
        componentId,
        data: { type: 'component-registered', component: devtoolsComponent }
      });
    }
  }

  unregisterComponent(element: Element): void {
    const component = this.components.get(element);
    if (component) {
      this.components.delete(element);
      
      if (this.settings.recordComponents) {
        this.recordEvent({
          type: 'component-render',
          timestamp: Date.now(),
          componentId: component.id,
          data: { type: 'component-unregistered' }
        });
      }
    }
  }

  recordEvent(event: DevtoolsEvent): void {
    this.events.push(event);
    
    // Limit event history
    if (this.events.length > this.settings.maxEvents) {
      this.events.shift();
    }
    
    // Update performance metrics
    this.updatePerformanceMetrics(event);
    
    // Emit to browser extension if available
    this.emitToExtension('event', event);
  }

  timeTravel(index: number): void {
    if (!this.canTimeTravel || index < 0 || index >= this.timeline.length) {
      console.warn('Invalid time travel index or time travel not available');
      return;
    }

    const entry = this.timeline[index];
    
    // This is a simplified implementation
    // In a full implementation, you would restore the complete application state
    console.log('Time traveling to:', entry);
    
    this.recordEvent({
      type: 'store-action',
      timestamp: Date.now(),
      data: { type: 'time-travel', index, entry }
    });
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window !== 'undefined' && this.settings.recordPerformance) {
      // Monitor memory usage
      setInterval(() => {
        if ('memory' in performance) {
          this.performance.memoryUsage = (performance as any).memory.usedJSHeapSize;
        }
      }, 5000);
    }
  }

  private updatePerformanceMetrics(event: DevtoolsEvent): void {
    switch (event.type) {
      case 'component-render':
        this.performance.componentRenders++;
        break;
      case 'store-action':
        this.performance.storeActions++;
        break;
      case 'directive-execute':
        this.performance.directiveExecutions++;
        break;
    }
  }

  private generateComponentId(element: Element): string {
    return `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getComponentName(element: Element): string {
    return element.tagName.toLowerCase() + 
           (element.id ? `#${element.id}` : '') +
           (element.className ? `.${element.className.split(' ').join('.')}` : '');
  }

  private extractProps(element: Element): Record<string, any> {
    const props: Record<string, any> = {};
    
    Array.from(element.attributes).forEach(attr => {
      if (!attr.name.startsWith('x-')) {
        props[attr.name] = attr.value;
      }
    });
    
    return props;
  }

  private extractDirectives(element: Element): string[] {
    return Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('x-'))
      .map(attr => attr.name);
  }

  private findParentComponentId(component: Component): string | undefined {
    return component.parent ? this.components.get(component.parent.element)?.id : undefined;
  }

  private findChildComponentIds(component: Component): string[] {
    return Array.from(component.children)
      .map(child => this.components.get(child.element)?.id)
      .filter(Boolean) as string[];
  }

  private serializeState(state: any): any {
    try {
      return JSON.parse(JSON.stringify(state));
    } catch (error) {
      return { error: 'Failed to serialize state' };
    }
  }

  private serializeGetters(getters: Record<string, any>): Record<string, any> {
    const serialized: Record<string, any> = {};
    
    Object.entries(getters).forEach(([key, getter]) => {
      try {
        serialized[key] = getter.value;
      } catch (error) {
        serialized[key] = { error: 'Failed to serialize getter' };
      }
    });
    
    return serialized;
  }

  private emitToExtension(type: string, data: any): void {
    if (typeof window !== 'undefined' && window.postMessage) {
      window.postMessage({
        source: 'praxis-devtools',
        type,
        data
      }, '*');
    }
  }
}

// Global devtools setup
export function setupDevtools(version: string): PraxisJSDevtools | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // Check if devtools should be enabled
  const isDevMode = process.env.NODE_ENV !== 'production' || 
                    (window as any).__CORAL_DEVTOOLS_ENABLED__;

  if (!isDevMode) {
    return null;
  }

  const devtools = new PraxisJSDevtoolsImpl(version);
  
  // Expose to global scope for browser extension
  (window as any).__CORAL_DEVTOOLS__ = devtools;
  
  // Notify browser extension
  window.postMessage({
    source: 'praxis-devtools',
    type: 'init',
    data: { version }
  }, '*');

  console.log('🔧 PraxisJS DevTools connected');
  
  return devtools;
}

// Browser extension communication
export function connectToExtension(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== 'praxis-devtools-extension') {
      return;
    }

    const devtools = (window as any).__CORAL_DEVTOOLS__ as PraxisJSDevtools;
    if (!devtools) return;

    const { type, data } = event.data;
    
    switch (type) {
      case 'get-stores':
        window.postMessage({
          source: 'praxis-devtools',
          type: 'stores-data',
          data: Array.from(devtools.stores.values())
        }, '*');
        break;
        
      case 'get-components':
        window.postMessage({
          source: 'praxis-devtools',
          type: 'components-data',
          data: Array.from(devtools.components.values())
        }, '*');
        break;
        
      case 'time-travel':
        devtools.timeTravel(data.index);
        break;
        
      case 'update-settings':
        Object.assign(devtools.settings, data);
        break;
    }
  });
}