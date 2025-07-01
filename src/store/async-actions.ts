import { signal, Signal } from '../core/signal.js';
import { Store } from './store.js';

export interface AsyncActionState {
  loading: boolean;
  error: Error | null;
  data: any;
  lastExecuted: number | null;
}

export interface AsyncActionOptions {
  keepPreviousData?: boolean;
  debounce?: number;
  timeout?: number;
  retry?: {
    attempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
}

export class AsyncAction<TArgs extends any[] = any[], TResult = any> {
  public readonly loading: Signal<boolean>;
  public readonly error: Signal<Error | null>;
  public readonly data: Signal<TResult | null>;
  public readonly lastExecuted: Signal<number | null>;
  
  private debounceTimer: number | null = null;
  private currentAbortController: AbortController | null = null;
  private retryCount = 0;

  constructor(
    private asyncFn: (...args: TArgs) => Promise<TResult>,
    private options: AsyncActionOptions = {}
  ) {
    this.loading = signal(false);
    this.error = signal<Error | null>(null);
    this.data = signal<TResult | null>(null);
    this.lastExecuted = signal<number | null>(null);
  }

  async execute(...args: TArgs): Promise<TResult | null> {
    // Handle debouncing
    if (this.options.debounce) {
      return this.executeWithDebounce(...args);
    }

    return this.executeImmediate(...args);
  }

  private executeWithDebounce(...args: TArgs): Promise<TResult | null> {
    return new Promise((resolve, reject) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = window.setTimeout(async () => {
        try {
          const result = await this.executeImmediate(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.options.debounce);
    });
  }

  private async executeImmediate(...args: TArgs): Promise<TResult | null> {
    // Cancel previous request if still running
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }

    this.currentAbortController = new AbortController();
    this.loading.value = true;
    this.error.value = null;
    this.retryCount = 0;

    if (!this.options.keepPreviousData) {
      this.data.value = null;
    }

    try {
      const result = await this.executeWithRetry(args, this.currentAbortController.signal);
      
      if (!this.currentAbortController.signal.aborted) {
        this.data.value = result;
        this.lastExecuted.value = Date.now();
        this.loading.value = false;
        return result;
      }
      
      return null;
    } catch (error) {
      if (!this.currentAbortController.signal.aborted) {
        this.error.value = error as Error;
        this.loading.value = false;
      }
      throw error;
    }
  }

  private async executeWithRetry(args: TArgs, signal: AbortSignal): Promise<TResult> {
    while (true) {
      try {
        // Add timeout if specified
        if (this.options.timeout) {
          return await Promise.race([
            this.asyncFn(...args),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Action timeout')), this.options.timeout);
            })
          ]);
        } else {
          return await this.asyncFn(...args);
        }
      } catch (error) {
        if (signal.aborted) {
          throw new Error('Action aborted');
        }

        const retry = this.options.retry;
        if (retry && this.retryCount < retry.attempts) {
          this.retryCount++;
          const delay = this.calculateRetryDelay(retry, this.retryCount);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }
  }

  private calculateRetryDelay(retry: NonNullable<AsyncActionOptions['retry']>, attempt: number): number {
    if (retry.backoff === 'exponential') {
      return retry.delay * Math.pow(2, attempt - 1);
    }
    return retry.delay * attempt;
  }

  cancel(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.loading.value = false;
  }

  reset(): void {
    this.cancel();
    this.error.value = null;
    this.data.value = null;
    this.lastExecuted.value = null;
    this.retryCount = 0;
  }

  // Computed properties for convenience
  get isIdle(): boolean {
    return !this.loading.value && this.error.value === null && this.data.value === null;
  }

  get isLoading(): boolean {
    return this.loading.value;
  }

  get isError(): boolean {
    return this.error.value !== null;
  }

  get isSuccess(): boolean {
    return !this.loading.value && this.error.value === null && this.data.value !== null;
  }
}

// Helper function to create async actions
export function createAsyncAction<TArgs extends any[] = any[], TResult = any>(
  asyncFn: (...args: TArgs) => Promise<TResult>,
  options?: AsyncActionOptions
): AsyncAction<TArgs, TResult> {
  return new AsyncAction(asyncFn, options);
}

// Store integration helpers
export interface StoreWithAsyncActions<T> extends Store<T> {
  $asyncActions: Record<string, AsyncAction<any[], any>>;
}

export function withAsyncActions<T>(
  store: Store<T>,
  asyncActions: Record<string, AsyncAction<any[], any>>
): StoreWithAsyncActions<T> {
  const enhancedStore = store as StoreWithAsyncActions<T>;
  enhancedStore.$asyncActions = asyncActions;
  
  // Add async actions to store actions
  Object.entries(asyncActions).forEach(([key, asyncAction]) => {
    enhancedStore.actions[key] = (...args: any[]) => asyncAction.execute(...args);
    enhancedStore.actions[`cancel${key.charAt(0).toUpperCase() + key.slice(1)}`] = () => asyncAction.cancel();
    enhancedStore.actions[`reset${key.charAt(0).toUpperCase() + key.slice(1)}`] = () => asyncAction.reset();
  });

  return enhancedStore;
}

// Resource pattern for common async operations
export interface Resource<T> {
  data: Signal<T | null>;
  loading: Signal<boolean>;
  error: Signal<Error | null>;
  refresh: () => Promise<void>;
  mutate: (updater: (current: T | null) => T | null) => void;
}

export function createResource<T>(
  fetcher: () => Promise<T>,
  options?: AsyncActionOptions
): Resource<T> {
  const asyncAction = createAsyncAction(fetcher, options);
  
  return {
    data: asyncAction.data,
    loading: asyncAction.loading,
    error: asyncAction.error,
    refresh: () => asyncAction.execute(),
    mutate: (updater) => {
      const current = asyncAction.data.value;
      const updated = updater(current);
      asyncAction.data.value = updated;
    }
  };
}

// Query pattern for parameterized fetching
export interface Query<TParams, TResult> {
  data: Signal<TResult | null>;
  loading: Signal<boolean>;
  error: Signal<Error | null>;
  execute: (params: TParams) => Promise<TResult | null>;
  cancel: () => void;
  reset: () => void;
}

export function createQuery<TParams, TResult>(
  queryFn: (params: TParams) => Promise<TResult>,
  options?: AsyncActionOptions
): Query<TParams, TResult> {
  const asyncAction = createAsyncAction(queryFn, options);
  
  return {
    data: asyncAction.data,
    loading: asyncAction.loading,
    error: asyncAction.error,
    execute: (params: TParams) => asyncAction.execute(params),
    cancel: () => asyncAction.cancel(),
    reset: () => asyncAction.reset()
  };
}

// Mutation pattern for state-changing operations
export interface Mutation<TParams, TResult> extends Query<TParams, TResult> {
  mutate: (params: TParams) => Promise<TResult | null>;
}

export function createMutation<TParams, TResult>(
  mutationFn: (params: TParams) => Promise<TResult>,
  options?: AsyncActionOptions
): Mutation<TParams, TResult> {
  const query = createQuery(mutationFn, options);
  
  return {
    ...query,
    mutate: query.execute
  };
}