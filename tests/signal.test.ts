import { describe, it, expect, beforeEach } from 'vitest';
import { signal, effect, computed } from '../src/praxis.js';

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

  it('should track dependencies in effects', () => {
    const count = signal(0);
    let effectValue = 0;

    effect(() => {
      effectValue = count.value;
    });

    expect(effectValue).toBe(0);

    count.value = 10;
    expect(effectValue).toBe(10);
  });

  it('should not trigger effect if value does not change', () => {
    const count = signal(0);
    let callCount = 0;

    effect(() => {
      count.value;
      callCount++;
    });

    expect(callCount).toBe(1);

    count.value = 0;
    expect(callCount).toBe(1);

    count.value = 1;
    expect(callCount).toBe(2);
  });

  it('should support peek() without tracking', () => {
    const count = signal(0);
    let effectValue = 0;

    effect(() => {
      effectValue = count.peek() + 1;
    });

    expect(effectValue).toBe(1);

    count.value = 10;
    expect(effectValue).toBe(1);
  });

  it('should support subscribe/unsubscribe', () => {
    const count = signal(0);
    let notifyCount = 0;

    const unsubscribe = count.subscribe(() => {
      notifyCount++;
    });

    count.value = 1;
    expect(notifyCount).toBe(1);

    count.value = 2;
    expect(notifyCount).toBe(2);

    unsubscribe();
    count.value = 3;
    expect(notifyCount).toBe(2);
  });
});

describe('Computed Signal', () => {
  it('should compute derived value', () => {
    const count = signal(5);
    const doubled = computed(() => count.value * 2);

    expect(doubled.value).toBe(10);
  });

  it('should recompute when dependency changes', () => {
    const count = signal(5);
    const doubled = computed(() => count.value * 2);

    expect(doubled.value).toBe(10);

    count.value = 10;
    expect(doubled.value).toBe(20);
  });

  it('should support nested computed signals', () => {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a.value + b.value);
    const product = computed(() => sum.value * 2);

    expect(product.value).toBe(10);

    a.value = 5;
    expect(product.value).toBe(16);
  });

  it('should only recompute when dependencies change', () => {
    const count = signal(5);
    let computeCount = 0;

    const doubled = computed(() => {
      computeCount++;
      return count.value * 2;
    });

    expect(doubled.value).toBe(10);
    expect(computeCount).toBe(1);

    expect(doubled.value).toBe(10);
    expect(computeCount).toBe(1);

    count.value = 10;
    expect(doubled.value).toBe(20);
    expect(computeCount).toBe(2);
  });
});

describe('Effect', () => {
  it('should run immediately', () => {
    let ran = false;

    effect(() => {
      ran = true;
    });

    expect(ran).toBe(true);
  });

  it('should rerun when dependencies change', () => {
    const count = signal(0);
    let effectCount = 0;

    effect(() => {
      count.value;
      effectCount++;
    });

    expect(effectCount).toBe(1);

    count.value = 1;
    expect(effectCount).toBe(2);
  });

  it('should support cleanup function', () => {
    const count = signal(0);
    let cleanupCount = 0;

    const eff = effect(() => {
      count.value;
      return () => {
        cleanupCount++;
      };
    });

    expect(cleanupCount).toBe(0);

    count.value = 1;
    expect(cleanupCount).toBe(1);

    eff.dispose();
    expect(cleanupCount).toBe(2);
  });

  it('should dispose properly', () => {
    const count = signal(0);
    let effectCount = 0;

    const eff = effect(() => {
      count.value;
      effectCount++;
    });

    expect(effectCount).toBe(1);

    eff.dispose();
    count.value = 1;
    expect(effectCount).toBe(1);
  });
});