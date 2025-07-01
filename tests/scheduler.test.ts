import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scheduleUpdate, flushUpdates, waitForUpdates, hasPendingUpdates, clearScheduler } from '../src/core/scheduler.js';

describe('Scheduler', () => {
  beforeEach(() => {
    clearScheduler();
  });

  it('should batch updates', async () => {
    let count = 0;
    const updates = [
      () => count++,
      () => count++,
      () => count++
    ];

    updates.forEach(scheduleUpdate);
    
    expect(count).toBe(0);
    expect(hasPendingUpdates()).toBe(true);

    await flushUpdates();
    
    expect(count).toBe(3);
    expect(hasPendingUpdates()).toBe(false);
  });

  it('should handle errors in updates', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let successCount = 0;

    scheduleUpdate(() => {
      throw new Error('Test error');
    });
    
    scheduleUpdate(() => {
      successCount++;
    });

    await flushUpdates();

    expect(successCount).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith('Error during scheduled update:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should wait for all updates to complete', async () => {
    let completed = false;

    scheduleUpdate(() => {
      setTimeout(() => {
        completed = true;
      }, 10);
    });

    await waitForUpdates();
    
    expect(hasPendingUpdates()).toBe(false);
  });

  it('should handle nested updates', async () => {
    const execution = [];

    scheduleUpdate(() => {
      execution.push('first');
      scheduleUpdate(() => {
        execution.push('nested');
      });
    });

    scheduleUpdate(() => {
      execution.push('second');
    });

    await flushUpdates();

    expect(execution).toEqual(['first', 'second']);
    
    await flushUpdates();
    
    expect(execution).toEqual(['first', 'second', 'nested']);
  });

  it('should clear pending updates', () => {
    scheduleUpdate(() => {});
    scheduleUpdate(() => {});

    expect(hasPendingUpdates()).toBe(true);

    clearScheduler();

    expect(hasPendingUpdates()).toBe(false);
  });
});