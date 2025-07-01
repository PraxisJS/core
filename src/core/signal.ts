type Subscriber = () => void;

let currentObserver: Effect | null = null;
let isTracking = true;

export interface Signal<T> {
  value: T;
  peek(): T;
  subscribe(fn: Subscriber): () => void;
}

export class SignalImpl<T> implements Signal<T> {
  private _value: T;
  private subscribers = new Set<Subscriber>();
  private observers = new WeakSet<Effect>();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get value(): T {
    if (currentObserver && isTracking) {
      this.observers.add(currentObserver);
      currentObserver.dependencies.add(this);
    }
    return this._value;
  }

  set value(newValue: T) {
    if (this._value === newValue) return;
    
    this._value = newValue;
    this.notify();
  }

  peek(): T {
    return this._value;
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  private notify(): void {
    this.subscribers.forEach(fn => fn());
  }
}

export function signal<T>(initialValue: T): Signal<T> {
  return new SignalImpl(initialValue);
}

export interface Effect {
  execute(): void;
  dispose(): void;
  dependencies: Set<Signal<any>>;
}

export function setCurrentObserver(observer: Effect | null): void {
  currentObserver = observer;
}

export function getCurrentObserver(): Effect | null {
  return currentObserver;
}

export function setTracking(tracking: boolean): void {
  isTracking = tracking;
}