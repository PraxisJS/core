import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';

export class PersistDirective extends BaseDirective {
  public name = 'persist';
  public priority = DIRECTIVE_PRIORITIES.DEFAULT;
  
  private storageKey: string;
  private storageType: 'localStorage' | 'sessionStorage';

  constructor(context: any) {
    super(context);
    this.storageKey = this.getStorageKey();
    this.storageType = this.hasModifier('session') ? 'sessionStorage' : 'localStorage';
  }

  init(): void {
    if (!this.isStorageAvailable()) {
      console.warn('Storage not available for x-persist');
      return;
    }

    // Load persisted value
    this.loadPersistedValue();

    // Watch for changes and persist them
    this.createEffect(() => {
      const value = this.evaluateExpression();
      this.persistValue(value);
    });
  }

  private getStorageKey(): string {
    // Use custom key if provided, otherwise use element info
    const customKey = this.context.modifiers.find(m => m.startsWith('key:'))?.slice(4);
    if (customKey) {
      return customKey;
    }

    // Generate key from element and expression
    const elementId = this.context.element.id || 
                     this.context.element.getAttribute('name') || 
                     'element';
    const hash = this.simpleHash(this.context.expression);
    return `praxis:persist:${elementId}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isStorageAvailable(): boolean {
    try {
      const storage = window[this.storageType];
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private loadPersistedValue(): void {
    try {
      const storage = window[this.storageType];
      const persistedValue = storage.getItem(this.storageKey);
      
      if (persistedValue !== null) {
        const parsedValue = JSON.parse(persistedValue);
        
        // Find the signal to update
        const signalPath = this.getSignalPath();
        if (signalPath) {
          this.updateSignalValue(signalPath, parsedValue);
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted value:', error);
    }
  }

  private persistValue(value: any): void {
    try {
      const storage = window[this.storageType];
      
      // Only persist serializable values
      if (this.isSerializable(value)) {
        storage.setItem(this.storageKey, JSON.stringify(value));
      }
    } catch (error) {
      console.warn('Failed to persist value:', error);
    }
  }

  private isSerializable(value: any): boolean {
    try {
      JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  }

  private getSignalPath(): string[] | null {
    // Parse the expression to find the signal path
    const expression = this.context.expression.trim();
    
    // Simple case: direct property access like "user.name"
    if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(expression)) {
      return expression.split('.');
    }
    
    return null;
  }

  private updateSignalValue(path: string[], value: any): void {
    let current = this.context.component.scope;
    
    // Navigate to the parent object
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (current[key] && typeof current[key] === 'object') {
        current = current[key].value || current[key];
      } else {
        return; // Path not found
      }
    }
    
    // Update the final property
    const finalKey = path[path.length - 1];
    if (current[finalKey] && typeof current[finalKey] === 'object' && 'value' in current[finalKey]) {
      // It's a signal
      current[finalKey].value = value;
    }
  }

  static clearAll(prefix?: string): void {
    const actualPrefix = prefix || 'praxis:persist:';
    
    // Clear localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(actualPrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }

    // Clear sessionStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(actualPrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  }

  dispose(): void {
    // Clean up if needed
    super.dispose();
  }
}

registerDirective('persist', PersistDirective);