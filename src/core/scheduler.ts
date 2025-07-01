type UpdateFunction = () => void;

class Scheduler {
  private updateQueue = new Set<UpdateFunction>();
  private isFlushPending = false;
  private currentFlushPromise: Promise<void> | null = null;

  scheduleUpdate(fn: UpdateFunction): void {
    this.updateQueue.add(fn);
    
    if (!this.isFlushPending) {
      this.isFlushPending = true;
      this.currentFlushPromise = this.flushUpdates();
    }
  }

  async flushUpdates(): Promise<void> {
    await this.nextTick();
    
    if (this.updateQueue.size === 0) {
      this.isFlushPending = false;
      return;
    }

    const updates = Array.from(this.updateQueue);
    this.updateQueue.clear();
    this.isFlushPending = false;

    for (const update of updates) {
      try {
        update();
      } catch (error) {
        console.error('Error during scheduled update:', error);
      }
    }

    if (this.updateQueue.size > 0) {
      this.currentFlushPromise = this.flushUpdates();
    } else {
      this.currentFlushPromise = null;
    }
  }

  private nextTick(): Promise<void> {
    return new Promise(resolve => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => resolve(), { timeout: 5 });
      } else if (typeof MessageChannel !== 'undefined') {
        const channel = new MessageChannel();
        channel.port2.onmessage = () => resolve();
        channel.port1.postMessage(null);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  async waitForUpdates(): Promise<void> {
    if (this.currentFlushPromise) {
      await this.currentFlushPromise;
    }
  }

  hasPendingUpdates(): boolean {
    return this.updateQueue.size > 0 || this.isFlushPending;
  }

  clear(): void {
    this.updateQueue.clear();
    this.isFlushPending = false;
    this.currentFlushPromise = null;
  }
}

const globalScheduler = new Scheduler();

export function scheduleUpdate(fn: UpdateFunction): void {
  globalScheduler.scheduleUpdate(fn);
}

export function flushUpdates(): Promise<void> {
  return globalScheduler.flushUpdates();
}

export function waitForUpdates(): Promise<void> {
  return globalScheduler.waitForUpdates();
}

export function hasPendingUpdates(): boolean {
  return globalScheduler.hasPendingUpdates();
}

export function clearScheduler(): void {
  globalScheduler.clear();
}