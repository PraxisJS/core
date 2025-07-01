import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';
import { globalEvaluator } from '../parser/expression.js';

export class OnDirective extends BaseDirective {
  public name = 'on';
  public priority = DIRECTIVE_PRIORITIES.ON;
  
  private eventListeners: Array<{ element: Element; event: string; handler: EventListener }> = [];
  private debounceTimeouts = new Map<string, number>();

  init(): void {
    const eventName = this.context.value;
    if (!eventName) return;

    const handler = this.createEventHandler();
    const element = this.getTargetElement();
    
    element.addEventListener(eventName, handler, this.getEventOptions());
    this.eventListeners.push({ element, event: eventName, handler });
  }

  private createEventHandler(): EventListener {
    const baseHandler = (event: Event) => {
      // Apply modifiers
      this.applyModifiers(event);

      const evaluationContext = {
        ...this.buildEvaluationContext(),
        $event: event,
        $dispatch: this.createDispatchFunction()
      };

      try {
        globalEvaluator.evaluate(this.context.expression, evaluationContext);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    };

    // Apply debounce if specified
    if (this.hasModifier('debounce')) {
      return this.debounce(baseHandler);
    }

    // Apply throttle if specified
    if (this.hasModifier('throttle')) {
      return this.throttle(baseHandler);
    }

    return baseHandler;
  }

  private applyModifiers(event: Event): void {
    // Prevent default
    if (this.hasModifier('prevent')) {
      event.preventDefault();
    }

    // Stop propagation
    if (this.hasModifier('stop')) {
      event.stopPropagation();
    }

    // Stop immediate propagation
    if (this.hasModifier('stop-immediate')) {
      event.stopImmediatePropagation();
    }

    // Self - only trigger if event target is the element itself
    if (this.hasModifier('self') && event.target !== this.context.element) {
      return;
    }

    // Key modifiers for keyboard events
    if (event instanceof KeyboardEvent) {
      this.applyKeyModifiers(event);
    }
  }

  private applyKeyModifiers(event: KeyboardEvent): void {
    const keyModifiers = this.context.modifiers.filter(modifier => 
      ['enter', 'tab', 'delete', 'esc', 'space', 'up', 'down', 'left', 'right', 'ctrl', 'alt', 'shift', 'meta'].includes(modifier)
    );

    if (keyModifiers.length === 0) return;

    const keyMap: Record<string, string> = {
      'enter': 'Enter',
      'tab': 'Tab', 
      'delete': 'Delete',
      'esc': 'Escape',
      'space': ' ',
      'up': 'ArrowUp',
      'down': 'ArrowDown', 
      'left': 'ArrowLeft',
      'right': 'ArrowRight'
    };

    const systemModifiers = ['ctrl', 'alt', 'shift', 'meta'];
    const regularKeys = keyModifiers.filter(m => !systemModifiers.includes(m));
    const requiredSystemModifiers = keyModifiers.filter(m => systemModifiers.includes(m));

    // Check system modifiers
    for (const modifier of requiredSystemModifiers) {
      const property = `${modifier}Key` as keyof KeyboardEvent;
      if (!event[property]) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    // Check regular keys
    if (regularKeys.length > 0) {
      const matchedKey = regularKeys.some(modifier => {
        const expectedKey = keyMap[modifier] || modifier;
        return event.key === expectedKey || event.code === expectedKey;
      });

      if (!matchedKey) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
  }

  private debounce(fn: EventListener): EventListener {
    const delay = this.getModifierValue('debounce') || 300;
    
    return (event: Event) => {
      const key = `${this.context.value}-debounce`;
      
      if (this.debounceTimeouts.has(key)) {
        clearTimeout(this.debounceTimeouts.get(key)!);
      }
      
      const timeoutId = window.setTimeout(() => {
        fn(event);
        this.debounceTimeouts.delete(key);
      }, delay);
      
      this.debounceTimeouts.set(key, timeoutId);
    };
  }

  private throttle(fn: EventListener): EventListener {
    const delay = this.getModifierValue('throttle') || 100;
    let lastCall = 0;
    
    return (event: Event) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(event);
      }
    };
  }

  private getModifierValue(modifier: string): number | undefined {
    const modifierWithValue = this.context.modifiers.find(m => m.startsWith(modifier));
    if (!modifierWithValue) return undefined;
    
    const match = modifierWithValue.match(new RegExp(`${modifier}-(\\d+)`));
    return match ? parseInt(match[1], 10) : undefined;
  }

  private getTargetElement(): Element {
    if (this.hasModifier('window')) {
      return window as any;
    }
    if (this.hasModifier('document')) {
      return document as any;
    }
    return this.context.element;
  }

  private getEventOptions(): AddEventListenerOptions {
    const options: AddEventListenerOptions = {};
    
    if (this.hasModifier('once')) {
      options.once = true;
    }
    if (this.hasModifier('passive')) {
      options.passive = true;
    }
    if (this.hasModifier('capture')) {
      options.capture = true;
    }
    
    return options;
  }

  private createDispatchFunction(): Function {
    return (eventName: string, detail?: any) => {
      const customEvent = new CustomEvent(eventName, {
        detail,
        bubbles: true,
        cancelable: true
      });
      this.context.element.dispatchEvent(customEvent);
    };
  }

  dispose(): void {
    // Clear any pending debounce timeouts
    this.debounceTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.debounceTimeouts.clear();
    
    // Remove event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    super.dispose();
  }
}

registerDirective('on', OnDirective);