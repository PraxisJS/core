import { describe, it, expect, vi } from 'vitest';
import { signal, computed, effect } from '../../src/praxis';

describe('Signals', () => {
  describe('signal()', () => {
    it('should create a signal with initial value', () => {
      const s = signal(10);
      expect(s.value).toBe(10);
    });

    it('should update signal value', () => {
      const s = signal(10);
      s.value = 20;
      expect(s.value).toBe(20);
    });

    it('should notify subscribers on value change', () => {
      const s = signal(10);
      const callback = vi.fn();
      
      s.subscribers.add(callback);
      s.value = 20;
      
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not notify if value is the same', () => {
      const s = signal(10);
      const callback = vi.fn();
      
      s.subscribers.add(callback);
      s.value = 10; // Same value
      
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('should handle different data types', () => {
      const stringSignal = signal('hello');
      const arraySignal = signal([1, 2, 3]);
      const objectSignal = signal({ name: 'test' });
      
      expect(stringSignal.value).toBe('hello');
      expect(arraySignal.value).toEqual([1, 2, 3]);
      expect(objectSignal.value).toEqual({ name: 'test' });
    });
  });

  describe('computed()', () => {
    it('should create computed value from function', () => {
      const a = signal(5);
      const b = signal(10);
      const sum = computed(() => a.value + b.value);
      
      expect(sum.value).toBe(15);
    });

    it('should update when dependencies change', () => {
      const a = signal(5);
      const b = signal(10);
      const sum = computed(() => a.value + b.value);
      
      a.value = 7;
      expect(sum.value).toBe(17);
      
      b.value = 20;
      expect(sum.value).toBe(27);
    });

    it('should handle nested computations', () => {
      const a = signal(2);
      const doubled = computed(() => a.value * 2);
      const quadrupled = computed(() => doubled.value * 2);
      
      expect(quadrupled.value).toBe(8);
      
      a.value = 3;
      expect(doubled.value).toBe(6);
      expect(quadrupled.value).toBe(12);
    });

    it('should only recompute when necessary', () => {
      const computeFn = vi.fn();
      const a = signal(5);
      const b = signal(10);
      
      const sum = computed(() => {
        computeFn();
        return a.value + b.value;
      });
      
      // Initial computation
      expect(sum.value).toBe(15);
      expect(computeFn).toHaveBeenCalledTimes(1);
      
      // Access again without changes
      expect(sum.value).toBe(15);
      expect(computeFn).toHaveBeenCalledTimes(1); // Should not recompute
      
      // Change dependency
      a.value = 7;
      expect(sum.value).toBe(17);
      expect(computeFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('effect()', () => {
    it('should run effect function immediately', () => {
      const effectFn = vi.fn();
      effect(effectFn);
      
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it('should return dispose function', () => {
      const effectFn = vi.fn();
      const dispose = effect(effectFn);
      
      expect(typeof dispose).toBe('function');
    });

    it('should run effect when dependencies change', () => {
      const a = signal(5);
      const effectFn = vi.fn(() => {
        const value = a.value; // Access signal
      });
      
      effect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);
      
      a.value = 10;
      expect(effectFn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple dependencies', () => {
      const a = signal(5);
      const b = signal(10);
      let result = 0;
      
      effect(() => {
        result = a.value + b.value;
      });
      
      expect(result).toBe(15);
      
      a.value = 7;
      expect(result).toBe(17);
      
      b.value = 20;
      expect(result).toBe(27);
    });

    it('should stop running after disposal', () => {
      const a = signal(5);
      const effectFn = vi.fn(() => {
        const value = a.value;
      });
      
      const dispose = effect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);
      
      dispose();
      
      a.value = 10;
      expect(effectFn).toHaveBeenCalledTimes(1); // Should not run again
    });

    it('should handle errors gracefully', () => {
      const a = signal(5);
      const errorFn = vi.fn(() => {
        if (a.value > 10) {
          throw new Error('Value too high');
        }
      });
      
      expect(() => effect(errorFn)).not.toThrow();
      
      a.value = 15;
      // Effect should handle error internally
    });
  });

  describe('Integration', () => {
    it('should work with complex reactive systems', () => {
      const firstName = signal('John');
      const lastName = signal('Doe');
      
      const fullName = computed(() => `${firstName.value} ${lastName.value}`);
      const greeting = computed(() => `Hello, ${fullName.value}!`);
      
      let sideEffectResult = '';
      effect(() => {
        sideEffectResult = greeting.value;
      });
      
      expect(sideEffectResult).toBe('Hello, John Doe!');
      
      firstName.value = 'Jane';
      expect(fullName.value).toBe('Jane Doe');
      expect(greeting.value).toBe('Hello, Jane Doe!');
      expect(sideEffectResult).toBe('Hello, Jane Doe!');
    });

    it('should handle circular dependencies gracefully', () => {
      const a = signal(5);
      const b = signal(10);
      
      // This should not cause infinite loop
      effect(() => {
        if (a.value < 100) {
          b.value = a.value + 1;
        }
      });
      
      effect(() => {
        if (b.value < 100) {
          a.value = b.value + 1;
        }
      });
      
      // Should stabilize without infinite loop
      expect(a.value).toBeGreaterThan(5);
      expect(b.value).toBeGreaterThan(10);
    });
  });
});