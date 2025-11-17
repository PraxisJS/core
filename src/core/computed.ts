import { Signal, setCurrentObserver, getCurrentObserver, setTracking, getTracking } from './signal.js';
import { Effect } from './effect.js';
import { scheduleUpdate } from './scheduler.js';

export interface ComputedSignal<T> extends Signal<T> {
  readonly value: T;
}

export class ComputedImpl<T> implements ComputedSignal<T>, Effect {
  private _value!: T;
  private _isStale = true;
  private _isComputing = false;
  public dependencies = new Set<Signal<any>>();
  private subscribers = new Set<() => void>();
  private isDisposed = false;
  private subscriptions = new Set<() => void>();

  constructor(private computeFn: () => T) {
    this.compute();
  }

  get value(): T {
    if (getCurrentObserver()) {
      getCurrentObserver()!.dependencies.add(this);
    }
    
    if (this._isStale && !this._isComputing) {
      this.compute();
    }
    
    return this._value;
  }

  peek(): T {
    const wasTracking = getTracking();
    setTracking(false);
    const value = this.value;
    setTracking(wasTracking);
    return value;
  }

  subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  execute(): void {
    this.compute();
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    // Clean up all subscriptions
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions.clear();

    this.dependencies.clear();
    this.subscribers.clear();
  }

  private compute(): void {
    if (this._isComputing || this.isDisposed) return;

    this._isComputing = true;
    this._isStale = false;

    // Clean up old subscriptions before creating new ones
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions.clear();

    this.dependencies.clear();

    const prevObserver = getCurrentObserver();
    setCurrentObserver(this);

    try {
      this._value = this.computeFn();
    } finally {
      setCurrentObserver(prevObserver);
      this._isComputing = false;
    }

    // Create new subscriptions and store unsubscribe functions
    this.dependencies.forEach(signal => {
      const unsub = signal.subscribe(() => {
        if (!this.isDisposed) {
          this._isStale = true;
          scheduleUpdate(() => this.notifySubscribers());
        }
      });
      this.subscriptions.add(unsub);
    });
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(fn => fn());
  }
}

export function computed<T>(fn: () => T): ComputedSignal<T> {
  return new ComputedImpl(fn);
}