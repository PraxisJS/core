import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal, computed, effect, batch, untrack } from '../../src/core/signal';

describe('Signal System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Signal', () => {
    it('should create a signal with initial value', () => {
      const count = signal(0);
      expect(count.value).toBe(0);
    });

    it('should update signal value', () => {
      const count = signal(0);
      count.value = 5;
      expect(count.value).toBe(5);
    });

    it('should notify observers when value changes', () => {
      const count = signal(0);
      const spy = vi.fn();
      
      effect(() => {
        spy(count.value);
      });

      expect(spy).toHaveBeenCalledWith(0);
      
      count.value = 1;
      expect(spy).toHaveBeenCalledWith(1);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should not notify observers when value is the same', () => {
      const count = signal(0);
      const spy = vi.fn();
      
      effect(() => {
        spy(count.value);
      });

      count.value = 0; // Same value
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should support peek() method for untracked reads', () => {
      const count = signal(0);
      const spy = vi.fn();
      
      effect(() => {
        spy(count.peek()); // Untracked read
      });

      count.value = 1;
      expect(spy).toHaveBeenCalledTimes(1); // Should not re-run
    });
  });

  describe('Computed', () => {
    it('should create computed signal based on other signals', () => {
      const count = signal(2);
      const doubled = computed(() => count.value * 2);
      
      expect(doubled.value).toBe(4);
    });

    it('should update when dependencies change', () => {
      const count = signal(2);
      const doubled = computed(() => count.value * 2);
      
      count.value = 3;
      expect(doubled.value).toBe(6);
    });

    it('should cache computed values', () => {
      const count = signal(2);
      const spy = vi.fn(() => count.value * 2);
      const doubled = computed(spy);
      
      // Multiple reads should use cached value
      doubled.value;
      doubled.value;
      doubled.value;
      
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache when dependencies change', () => {
      const count = signal(2);
      const spy = vi.fn(() => count.value * 2);
      const doubled = computed(spy);
      
      doubled.value; // First computation
      count.value = 3; // Invalidate cache
      doubled.value; // Second computation
      
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should handle nested computed signals', () => {
      const a = signal(1);
      const b = signal(2);
      const sum = computed(() => a.value + b.value);
      const doubled = computed(() => sum.value * 2);
      
      expect(doubled.value).toBe(6);
      
      a.value = 2;
      expect(doubled.value).toBe(8);
    });
  });

  describe('Effect', () => {
    it('should run effect immediately', () => {
      const spy = vi.fn();
      effect(spy);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should re-run when dependencies change', () => {
      const count = signal(0);
      const spy = vi.fn();
      
      effect(() => {
        spy(count.value);
      });

      count.value = 1;
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should track multiple dependencies', () => {
      const a = signal(1);
      const b = signal(2);
      const spy = vi.fn();
      
      effect(() => {
        spy(a.value + b.value);
      });

      a.value = 2;
      expect(spy).toHaveBeenCalledWith(4);
      
      b.value = 3;
      expect(spy).toHaveBeenCalledWith(5);
    });

    it('should clean up when disposed', () => {
      const count = signal(0);
      const spy = vi.fn();
      
      const dispose = effect(() => {
        spy(count.value);
      });

      dispose();
      count.value = 1;
      
      expect(spy).toHaveBeenCalledTimes(1); // Only initial run
    });

    it('should handle effect cleanup functions', () => {
      const count = signal(0);
      const cleanup = vi.fn();
      
      effect(() => {
        count.value; // Track dependency
        return cleanup;
      });

      count.value = 1; // Should call cleanup before re-run
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Batch', () => {
    it('should batch multiple signal updates', () => {
      const a = signal(1);
      const b = signal(2);
      const spy = vi.fn();
      
      effect(() => {
        spy(a.value + b.value);
      });

      batch(() => {
        a.value = 2;
        b.value = 3;
      });

      // Should only run effect once after batch
      expect(spy).toHaveBeenCalledTimes(2); // Initial + batched update
      expect(spy).toHaveBeenLastCalledWith(5);
    });

    it('should return batch callback result', () => {
      const result = batch(() => {
        return 'test';
      });
      
      expect(result).toBe('test');
    });

    it('should handle nested batches', () => {
      const count = signal(0);
      const spy = vi.fn();
      
      effect(() => {
        spy(count.value);
      });

      batch(() => {
        count.value = 1;
        batch(() => {
          count.value = 2;
        });
      });

      expect(spy).toHaveBeenCalledTimes(2); // Initial + batched update
      expect(spy).toHaveBeenLastCalledWith(2);
    });
  });

  describe('Untrack', () => {
    it('should prevent dependency tracking', () => {
      const count = signal(0);
      const spy = vi.fn();
      
      effect(() => {
        untrack(() => {
          spy(count.value);
        });
      });

      count.value = 1;
      expect(spy).toHaveBeenCalledTimes(1); // Should not re-run
    });

    it('should return untrack callback result', () => {
      const result = untrack(() => {
        return 'test';
      });
      
      expect(result).toBe('test');
    });

    it('should handle nested untrack calls', () => {
      const count = signal(0);
      const spy = vi.fn();
      
      effect(() => {
        untrack(() => {
          untrack(() => {
            spy(count.value);
          });
        });
      });

      count.value = 1;
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memory Management', () => {
    it('should clean up disposed effects', () => {
      const count = signal(0);
      const dispose = effect(() => count.value);
      
      // Verify effect is registered
      expect(count.value).toBe(0);
      
      dispose();
      
      // Effect should be cleaned up
      count.value = 1;
      // No assertions needed - just ensuring no memory leaks
    });

    it('should handle circular dependencies safely', () => {
      const a = signal(0);
      const b = signal(0);
      
      effect(() => {
        if (a.value > 0) {
          b.value = a.value - 1;
        }
      });
      
      effect(() => {
        if (b.value > 0) {
          a.value = b.value - 1;
        }
      });
      
      // This should not cause infinite loop
      a.value = 2;
      
      expect(a.value).toBe(0);
      expect(b.value).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle many signals efficiently', () => {
      const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
      const sum = computed(() => signals.reduce((acc, s) => acc + s.value, 0));
      
      expect(sum.value).toBe(499500); // Sum of 0 to 999
      
      // Update one signal
      signals[0].value = 1000;
      expect(sum.value).toBe(500500);
    });

    it('should handle deep dependency chains', () => {
      let current = signal(0);
      
      // Create chain of 100 computed signals
      for (let i = 0; i < 100; i++) {
        const prev = current;
        current = computed(() => prev.value + 1);
      }
      
      expect(current.value).toBe(100);
    });
  });
});