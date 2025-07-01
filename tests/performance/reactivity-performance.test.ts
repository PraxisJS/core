import { describe, it, expect, beforeEach } from 'vitest';
import { signal, computed, effect, batch } from '../../src/core/signal';

describe('Performance - Reactivity System', () => {
  beforeEach(() => {
    // Clear any existing performance marks
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  });

  describe('Signal Performance', () => {
    it('should handle many signals efficiently', () => {
      const start = performance.now();
      
      // Create 1000 signals
      const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
      
      const creationTime = performance.now() - start;
      expect(creationTime).toBeLessThan(100); // Should create 1000 signals in under 100ms
      
      // Test access performance
      const accessStart = performance.now();
      let sum = 0;
      for (const s of signals) {
        sum += s.value;
      }
      const accessTime = performance.now() - accessStart;
      
      expect(accessTime).toBeLessThan(50); // Should access 1000 signals in under 50ms
      expect(sum).toBe(499500); // Sum of 0 to 999
    });

    it('should update signals efficiently', () => {
      const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
      
      const start = performance.now();
      
      // Update all signals
      signals.forEach((s, i) => {
        s.value = i + 1000;
      });
      
      const updateTime = performance.now() - start;
      expect(updateTime).toBeLessThan(100); // Should update 1000 signals in under 100ms
    });

    it('should handle deep signal chains efficiently', () => {
      const start = performance.now();
      
      // Create a chain of 100 computed signals
      let current = signal(0);
      const computedSignals = [];
      
      for (let i = 0; i < 100; i++) {
        const prev = current;
        current = computed(() => prev.value + 1);
        computedSignals.push(current);
      }
      
      const chainTime = performance.now() - start;
      expect(chainTime).toBeLessThan(100); // Should create chain in under 100ms
      
      // Test propagation performance
      const propagationStart = performance.now();
      computedSignals[0].value; // Trigger computation
      const propagationTime = performance.now() - propagationStart;
      
      expect(propagationTime).toBeLessThan(50); // Should compute chain in under 50ms
      expect(current.value).toBe(100);
    });
  });

  describe('Effect Performance', () => {
    it('should handle many effects efficiently', () => {
      const source = signal(0);
      const effects: (() => void)[] = [];
      
      const start = performance.now();
      
      // Create 1000 effects
      for (let i = 0; i < 1000; i++) {
        const dispose = effect(() => {
          source.value; // Track dependency
        });
        effects.push(dispose);
      }
      
      const creationTime = performance.now() - start;
      expect(creationTime).toBeLessThan(200); // Should create 1000 effects in under 200ms
      
      // Test update performance
      const updateStart = performance.now();
      source.value = 1; // Trigger all effects
      const updateTime = performance.now() - updateStart;
      
      expect(updateTime).toBeLessThan(100); // Should run 1000 effects in under 100ms
      
      // Cleanup
      effects.forEach(dispose => dispose());
    });

    it('should optimize effect dependencies', () => {
      const a = signal(1);
      const b = signal(2);
      const c = signal(3);
      
      let effectRuns = 0;
      
      effect(() => {
        effectRuns++;
        // Only depend on 'a'
        return a.value + 10;
      });
      
      expect(effectRuns).toBe(1);
      
      // Updates to b and c should not trigger effect
      b.value = 20;
      c.value = 30;
      expect(effectRuns).toBe(1);
      
      // Update to a should trigger effect
      a.value = 2;
      expect(effectRuns).toBe(2);
    });
  });

  describe('Batch Performance', () => {
    it('should batch multiple updates efficiently', () => {
      const signals = Array.from({ length: 100 }, () => signal(0));
      let effectRuns = 0;
      
      effect(() => {
        effectRuns++;
        signals.forEach(s => s.value); // Track all signals
      });
      
      expect(effectRuns).toBe(1);
      
      const start = performance.now();
      
      batch(() => {
        signals.forEach(s => {
          s.value = Math.random();
        });
      });
      
      const batchTime = performance.now() - start;
      
      expect(effectRuns).toBe(2); // Only one additional run despite 100 updates
      expect(batchTime).toBeLessThan(50); // Should batch in under 50ms
    });

    it('should handle nested batches efficiently', () => {
      const signal1 = signal(0);
      const signal2 = signal(0);
      let effectRuns = 0;
      
      effect(() => {
        effectRuns++;
        signal1.value + signal2.value;
      });
      
      expect(effectRuns).toBe(1);
      
      const start = performance.now();
      
      batch(() => {
        signal1.value = 1;
        batch(() => {
          signal2.value = 2;
          batch(() => {
            signal1.value = 3;
          });
        });
      });
      
      const nestedBatchTime = performance.now() - start;
      
      expect(effectRuns).toBe(2); // Only one additional run
      expect(nestedBatchTime).toBeLessThan(25); // Should handle nested batches quickly
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory when disposing effects', () => {
      const source = signal(0);
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Create and dispose many effects
      for (let i = 0; i < 1000; i++) {
        const dispose = effect(() => {
          source.value; // Track dependency
        });
        dispose(); // Immediately dispose
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });

    it('should handle circular references without memory leaks', () => {
      const a = signal(0);
      const b = signal(0);
      
      // Create circular dependency (should be handled safely)
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
      
      const start = performance.now();
      
      // This should not cause infinite recursion
      a.value = 10;
      
      const executionTime = performance.now() - start;
      
      expect(executionTime).toBeLessThan(100); // Should resolve quickly
      expect(a.value).toBe(0); // Should stabilize
      expect(b.value).toBe(0);
    });
  });

  describe('Computed Performance', () => {
    it('should cache computed values efficiently', () => {
      const base = signal(5);
      let computations = 0;
      
      const expensive = computed(() => {
        computations++;
        // Simulate expensive computation
        let result = base.value;
        for (let i = 0; i < 1000; i++) {
          result = result * 1.001;
        }
        return result;
      });
      
      const start = performance.now();
      
      // Multiple reads should use cached value
      for (let i = 0; i < 100; i++) {
        expensive.value;
      }
      
      const readTime = performance.now() - start;
      
      expect(computations).toBe(1); // Should compute only once
      expect(readTime).toBeLessThan(10); // Cached reads should be very fast
    });

    it('should handle complex computed dependencies', () => {
      const inputs = Array.from({ length: 50 }, (_, i) => signal(i));
      
      const start = performance.now();
      
      // Create a computed that depends on all inputs
      const sum = computed(() => {
        return inputs.reduce((acc, input) => acc + input.value, 0);
      });
      
      const firstComputation = performance.now();
      const result1 = sum.value;
      const firstComputationTime = firstComputation - start;
      
      expect(result1).toBe(1225); // Sum of 0 to 49
      expect(firstComputationTime).toBeLessThan(50);
      
      // Update one input
      const updateStart = performance.now();
      inputs[0].value = 100;
      const result2 = sum.value;
      const updateTime = performance.now() - updateStart;
      
      expect(result2).toBe(1325); // Updated sum
      expect(updateTime).toBeLessThan(25); // Should recompute quickly
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle a simulated component tree efficiently', () => {
      // Simulate a tree of components with props flowing down
      const appState = signal({ users: [], selectedId: null });
      const components: any[] = [];
      
      const start = performance.now();
      
      // Create 100 "components" that depend on app state
      for (let i = 0; i < 100; i++) {
        const component = {
          props: computed(() => ({
            user: appState.value.users.find((u: any) => u.id === appState.value.selectedId),
            isSelected: appState.value.selectedId === i
          })),
          render: computed(() => {
            const props = component.props.value;
            return `Component ${i}: ${props.isSelected ? 'Selected' : 'Not Selected'}`;
          })
        };
        components.push(component);
      }
      
      const setupTime = performance.now() - start;
      expect(setupTime).toBeLessThan(100);
      
      // Simulate state update
      const updateStart = performance.now();
      appState.value = {
        users: Array.from({ length: 10 }, (_, i) => ({ id: i, name: `User ${i}` })),
        selectedId: 5
      };
      
      // Force re-computation of all components
      components.forEach(c => c.render.value);
      
      const updateTime = performance.now() - updateStart;
      expect(updateTime).toBeLessThan(50);
    });

    it('should handle frequent updates efficiently', () => {
      const position = signal({ x: 0, y: 0 });
      let renderCount = 0;
      
      effect(() => {
        renderCount++;
        position.value; // Track position changes
      });
      
      const start = performance.now();
      
      // Simulate 60 FPS updates for 1 second (60 updates)
      for (let i = 0; i < 60; i++) {
        batch(() => {
          position.value = { x: i, y: i * 2 };
        });
      }
      
      const updateTime = performance.now() - start;
      
      expect(renderCount).toBe(61); // Initial + 60 updates
      expect(updateTime).toBeLessThan(100); // Should handle 60 FPS easily
    });

    it('should handle large lists efficiently', () => {
      const items = signal(Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` })));
      const filter = signal('');
      
      const filteredItems = computed(() => {
        const filterValue = filter.value.toLowerCase();
        return items.value.filter(item => 
          item.name.toLowerCase().includes(filterValue)
        );
      });
      
      const start = performance.now();
      
      // Test initial computation
      let result = filteredItems.value;
      expect(result.length).toBe(1000);
      
      // Test filtering
      filter.value = 'Item 1';
      result = filteredItems.value;
      expect(result.length).toBe(111); // Item 1, 10-19, 100-199
      
      const totalTime = performance.now() - start;
      expect(totalTime).toBeLessThan(100); // Should filter 1000 items quickly
    });
  });
});