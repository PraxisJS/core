// Praxis TypeScript definitions

export interface Signal<T = any> {
  value: T;
  subscribers: Set<Function>;
}

export interface PraxisConfig {
  autoStart?: boolean;
  devtools?: boolean;
  performance?: boolean;
}

export interface PraxisInstance {
  start(): void;
  signal: typeof signal;
  computed: typeof computed;
  effect: typeof effect;
}

export declare function signal<T>(value: T): Signal<T>;
export declare function computed<T>(fn: () => T): Signal<T>;
export declare function effect(fn: Function): () => void;

declare class Praxis {
  constructor(config?: PraxisConfig);
  start(): void;
  scanAndInit(root: Element): void;
}

declare const praxis: PraxisInstance;

export { praxis };
export default praxis;