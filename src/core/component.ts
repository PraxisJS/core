import { Signal, signal } from './signal.js';
import { scheduleUpdate } from './scheduler.js';

export interface ComponentLifecycle {
  init(): void;
  mounted(): void;
  updated(mutations: MutationRecord[]): void;
  destroyed(): void;
}

export interface Component extends ComponentLifecycle {
  element: Element;
  scope: Record<string, Signal<any>>;
  refs: Record<string, Element>;
  directives: Map<string, any>;
  parent?: Component;
  children: Set<Component>;
  
  watch(expression: string, callback: (newValue: any, oldValue: any) => void): () => void;
  nextTick(callback: () => void): void;
  dispatch(eventName: string, detail?: any): void;
}

export class ComponentImpl implements Component {
  public scope: Record<string, Signal<any>> = {};
  public refs: Record<string, Element> = {};
  public directives = new Map<string, any>();
  public parent?: Component;
  public children = new Set<Component>();
  
  private watchers = new Map<string, Array<(newValue: any, oldValue: any) => void>>();
  private isDestroyed = false;

  constructor(public element: Element) {}

  init(): void {
    this.updateRefs();
  }

  mounted(): void {
    this.updateRefs();
  }

  updated(mutations: MutationRecord[]): void {
    this.updateRefs();
  }

  destroyed(): void {
    this.isDestroyed = true;
    this.children.forEach(child => child.destroyed());
    this.children.clear();
    this.watchers.clear();
    this.directives.forEach(directive => {
      if (directive.dispose) directive.dispose();
    });
    this.directives.clear();
  }

  watch(expression: string, callback: (newValue: any, oldValue: any) => void): () => void {
    if (!this.watchers.has(expression)) {
      this.watchers.set(expression, []);
    }
    
    this.watchers.get(expression)!.push(callback);
    
    return () => {
      const callbacks = this.watchers.get(expression);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  nextTick(callback: () => void): void {
    scheduleUpdate(callback);
  }

  dispatch(eventName: string, detail?: any): void {
    const customEvent = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });
    this.element.dispatchEvent(customEvent);
  }

  private updateRefs(): void {
    this.refs = {};
    const refElements = this.element.querySelectorAll('[x-ref]');
    
    refElements.forEach(el => {
      const refName = el.getAttribute('x-ref');
      if (refName) {
        this.refs[refName] = el;
      }
    });
  }

  addChild(child: Component): void {
    this.children.add(child);
    child.parent = this;
  }

  removeChild(child: Component): void {
    this.children.delete(child);
    child.parent = undefined;
  }

  findParentWithScope(): Component | null {
    let current = this.parent;
    while (current) {
      if (Object.keys(current.scope).length > 0) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  isDestroyed(): boolean {
    return this.isDestroyed;
  }
}