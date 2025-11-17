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
  private subscriptions = new Set<() => void>();

  constructor(private fn: () => void | (() => void)) {}

  execute(): void {
    if (this.isDisposed || this.isExecuting) return;

    this.isExecuting = true;

    if (this.cleanup) {
      this.cleanup();
      this.cleanup = undefined;
    }

    // Clean up old subscriptions before creating new ones
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions.clear();

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

    // Create new subscriptions and store unsubscribe functions
    this.dependencies.forEach(signal => {
      const unsub = signal.subscribe(() => {
        if (!this.isDisposed) {
          scheduleUpdate(() => this.execute());
        }
      });
      this.subscriptions.add(unsub);
    });
  }

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;

    // Clean up all subscriptions
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions.clear();

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