import { Signal, setCurrentObserver, getCurrentObserver } from './signal.js';
import { scheduleUpdate } from './scheduler.js';

export interface Effect {
  execute(): void;
  dispose(): void;
  dependencies: Set<Signal<any>>;
}

export class EffectImpl implements Effect {
  public dependencies = new Set<Signal<any>>();
  private cleanup?: () => void;
  private isDisposed = false;
  private isExecuting = false;

  constructor(private fn: () => void | (() => void)) {}

  execute(): void {
    if (this.isDisposed || this.isExecuting) return;
    
    this.isExecuting = true;
    
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = undefined;
    }
    
    this.dependencies.clear();
    
    const prevObserver = getCurrentObserver();
    setCurrentObserver(this);
    
    try {
      const result = this.fn();
      if (typeof result === 'function') {
        this.cleanup = result;
      }
    } finally {
      setCurrentObserver(prevObserver);
      this.isExecuting = false;
    }
    
    this.dependencies.forEach(signal => {
      signal.subscribe(() => {
        if (!this.isDisposed) {
          scheduleUpdate(() => this.execute());
        }
      });
    });
  }

  dispose(): void {
    if (this.isDisposed) return;
    
    this.isDisposed = true;
    
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = undefined;
    }
    
    this.dependencies.clear();
  }
}

export function effect(fn: () => void | (() => void)): Effect {
  const eff = new EffectImpl(fn);
  eff.execute();
  return eff;
}

export function createEffect(fn: () => void | (() => void)): () => void {
  const eff = effect(fn);
  return () => eff.dispose();
}