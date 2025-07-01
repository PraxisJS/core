// Advanced PraxisJS Directives

import { BaseDirective, DirectiveContext, DIRECTIVE_PRIORITIES } from './base.js';

// x-intersect: Intersection Observer wrapper
export class IntersectDirective extends BaseDirective {
  public name = 'intersect';
  public priority = DIRECTIVE_PRIORITIES.DEFAULT;
  
  private observer?: IntersectionObserver;
  private hasTriggered = false;

  init(): void {
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported');
      return;
    }

    const options = this.getObserverOptions();
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.target === this.context.element) {
          this.handleIntersection(entry);
        }
      });
    }, options);

    this.observer.observe(this.context.element);
  }

  private handleIntersection(entry: IntersectionObserverEntry): void {
    const isIntersecting = entry.isIntersecting;
    const ratio = entry.intersectionRatio;
    
    // Handle once modifier
    if (this.context.modifiers.includes('once') && this.hasTriggered && !isIntersecting) {
      return;
    }

    // Handle threshold modifier
    const thresholdModifier = this.context.modifiers.find(m => m.startsWith('threshold-'));
    if (thresholdModifier) {
      const threshold = parseFloat(thresholdModifier.split('-')[1]) / 100;
      if (ratio < threshold) {
        return;
      }
    }

    // Handle enter/leave modifiers
    if (this.context.modifiers.includes('enter') && !isIntersecting) {
      return;
    }
    if (this.context.modifiers.includes('leave') && isIntersecting) {
      return;
    }

    const evaluationContext = {
      ...this.buildEvaluationContext(),
      $isIntersecting: isIntersecting,
      $intersectionRatio: ratio,
      $boundingClientRect: entry.boundingClientRect,
      $intersectionRect: entry.intersectionRect,
      $rootBounds: entry.rootBounds
    };

    this.evaluateWithContext(this.context.expression, evaluationContext);
    
    if (isIntersecting) {
      this.hasTriggered = true;
    }

    // Handle once modifier cleanup
    if (this.context.modifiers.includes('once') && isIntersecting) {
      this.dispose();
    }
  }

  private getObserverOptions(): IntersectionObserverInit {
    const options: IntersectionObserverInit = {};

    // Parse threshold modifier
    const thresholdModifier = this.context.modifiers.find(m => m.startsWith('threshold-'));
    if (thresholdModifier) {
      const threshold = parseFloat(thresholdModifier.split('-')[1]) / 100;
      options.threshold = threshold;
    } else {
      options.threshold = 0.1;
    }

    // Parse root margin modifier
    const marginModifier = this.context.modifiers.find(m => m.startsWith('margin-'));
    if (marginModifier) {
      const margin = marginModifier.split('-')[1];
      options.rootMargin = `${margin}px`;
    }

    return options;
  }

  dispose(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    super.dispose();
  }
}

// x-resize: ResizeObserver integration
export class ResizeDirective extends BaseDirective {
  public name = 'resize';
  public priority = DIRECTIVE_PRIORITIES.DEFAULT;
  
  private observer?: ResizeObserver;
  private lastSize?: { width: number; height: number };

  init(): void {
    if (!('ResizeObserver' in window)) {
      console.warn('ResizeObserver not supported');
      return;
    }

    this.observer = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        if (entry.target === this.context.element) {
          this.handleResize(entry);
        }
      });
    });

    this.observer.observe(this.context.element);
  }

  private handleResize(entry: ResizeObserverEntry): void {
    const { width, height } = entry.contentRect;
    
    // Handle debounce modifier
    if (this.context.modifiers.includes('debounce')) {
      this.debounceResize(() => this.processResize(entry));
      return;
    }

    this.processResize(entry);
  }

  private processResize(entry: ResizeObserverEntry): void {
    const { width, height } = entry.contentRect;
    
    // Check if size actually changed (avoid duplicate events)
    if (this.lastSize && this.lastSize.width === width && this.lastSize.height === height) {
      return;
    }

    this.lastSize = { width, height };

    const evaluationContext = {
      ...this.buildEvaluationContext(),
      $width: width,
      $height: height,
      $contentRect: entry.contentRect,
      $borderBoxSize: entry.borderBoxSize,
      $contentBoxSize: entry.contentBoxSize
    };

    this.evaluateWithContext(this.context.expression, evaluationContext);
  }

  private debounceResize = this.debounce((callback: Function) => {
    callback();
  }, 100);

  private debounce(func: Function, wait: number): Function {
    let timeout: number;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = window.setTimeout(later, wait);
    };
  }

  dispose(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    super.dispose();
  }
}

// x-clickaway: Outside click detection
export class ClickAwayDirective extends BaseDirective {
  public name = 'clickaway';
  public priority = DIRECTIVE_PRIORITIES.ON;
  
  private handler?: (event: Event) => void;

  init(): void {
    this.handler = (event: Event) => {
      const target = event.target as Node;
      
      // Check if click is outside the element
      if (!this.context.element.contains(target)) {
        // Handle escape modifier
        if (this.context.modifiers.includes('escape') && 
            (event as KeyboardEvent).key !== 'Escape') {
          return;
        }

        this.evaluateExpression();
      }
    };

    // Listen for clicks and escape key
    document.addEventListener('click', this.handler, true);
    
    if (this.context.modifiers.includes('escape')) {
      document.addEventListener('keydown', this.handler, true);
    }
  }

  dispose(): void {
    if (this.handler) {
      document.removeEventListener('click', this.handler, true);
      document.removeEventListener('keydown', this.handler, true);
    }
    super.dispose();
  }
}

// x-hotkey: Keyboard shortcut binding
export class HotkeyDirective extends BaseDirective {
  public name = 'hotkey';
  public priority = DIRECTIVE_PRIORITIES.ON;
  
  private handler?: (event: KeyboardEvent) => void;
  private shortcuts: KeyboardShortcut[] = [];

  init(): void {
    this.parseShortcuts();
    
    this.handler = (event: KeyboardEvent) => {
      for (const shortcut of this.shortcuts) {
        if (this.matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          
          const evaluationContext = {
            ...this.buildEvaluationContext(),
            $event: event,
            $shortcut: shortcut
          };
          
          this.evaluateWithContext(this.context.expression, evaluationContext);
          break;
        }
      }
    };

    const target = this.context.modifiers.includes('global') ? document : this.context.element;
    target.addEventListener('keydown', this.handler);
  }

  private parseShortcuts(): void {
    // Parse shortcut from expression: "ctrl+shift+k" or ["ctrl+k", "ctrl+shift+k"]
    const expression = this.context.expression.trim();
    
    if (expression.startsWith('[') && expression.endsWith(']')) {
      // Array of shortcuts
      const shortcuts = JSON.parse(expression);
      this.shortcuts = shortcuts.map((s: string) => this.parseShortcut(s));
    } else {
      // Single shortcut
      this.shortcuts = [this.parseShortcut(expression.replace(/['"]/g, ''))];
    }
  }

  private parseShortcut(shortcut: string): KeyboardShortcut {
    const parts = shortcut.toLowerCase().split('+').map(s => s.trim());
    
    return {
      key: parts[parts.length - 1],
      ctrl: parts.includes('ctrl') || parts.includes('cmd'),
      alt: parts.includes('alt'),
      shift: parts.includes('shift'),
      meta: parts.includes('meta') || parts.includes('cmd')
    };
  }

  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    const key = event.key.toLowerCase();
    
    return (
      key === shortcut.key &&
      event.ctrlKey === shortcut.ctrl &&
      event.altKey === shortcut.alt &&
      event.shiftKey === shortcut.shift &&
      event.metaKey === shortcut.meta
    );
  }

  dispose(): void {
    if (this.handler) {
      const target = this.context.modifiers.includes('global') ? document : this.context.element;
      target.removeEventListener('keydown', this.handler);
    }
    super.dispose();
  }
}

// x-focus-trap: Accessibility helper
export class FocusTrapDirective extends BaseDirective {
  public name = 'focus-trap';
  public priority = DIRECTIVE_PRIORITIES.DEFAULT;
  
  private isActive = false;
  private focusableElements: HTMLElement[] = [];
  private firstFocusableElement?: HTMLElement;
  private lastFocusableElement?: HTMLElement;
  private previousActiveElement?: HTMLElement;
  private keydownHandler?: (event: KeyboardEvent) => void;

  init(): void {
    this.updateFocusableElements();
    this.setupEventListeners();
    
    // Auto-activate if no modifiers or 'auto' modifier
    if (!this.context.modifiers.length || this.context.modifiers.includes('auto')) {
      this.activate();
    }
  }

  private setupEventListeners(): void {
    this.keydownHandler = (event: KeyboardEvent) => {
      if (!this.isActive) return;
      
      if (event.key === 'Tab') {
        this.handleTabKey(event);
      } else if (event.key === 'Escape' && this.context.modifiers.includes('escape')) {
        this.deactivate();
        this.evaluateExpression();
      }
    };

    document.addEventListener('keydown', this.keydownHandler);
  }

  private handleTabKey(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey) {
      // Shift+Tab: move to previous element
      if (document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement?.focus();
      }
    } else {
      // Tab: move to next element
      if (document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  }

  private updateFocusableElements(): void {
    const focusableSelectors = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ];

    this.focusableElements = Array.from(
      this.context.element.querySelectorAll(focusableSelectors.join(','))
    ).filter((el: Element) => {
      const htmlEl = el as HTMLElement;
      return !htmlEl.disabled && 
             htmlEl.tabIndex !== -1 && 
             this.isVisible(htmlEl);
    }) as HTMLElement[];

    this.firstFocusableElement = this.focusableElements[0];
    this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1];
  }

  private isVisible(element: HTMLElement): boolean {
    const style = getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetParent !== null;
  }

  activate(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.updateFocusableElements();
    
    // Focus first element or the element itself
    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    } else if (this.context.element.tabIndex >= 0) {
      this.context.element.focus();
    }
  }

  deactivate(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Restore previous focus
    if (this.previousActiveElement && 
        document.body.contains(this.previousActiveElement)) {
      this.previousActiveElement.focus();
    }
  }

  dispose(): void {
    this.deactivate();
    
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
    
    super.dispose();
  }
}

// x-live-region: ARIA live regions
export class LiveRegionDirective extends BaseDirective {
  public name = 'live-region';
  public priority = DIRECTIVE_PRIORITIES.DEFAULT;
  
  private originalContent = '';
  private announceTimeout?: number;

  init(): void {
    this.originalContent = this.context.element.textContent || '';
    this.setupLiveRegion();
  }

  private setupLiveRegion(): void {
    // Set ARIA live region attributes
    const politeness = this.getPoliteness();
    const relevance = this.getRelevance();
    
    this.context.element.setAttribute('aria-live', politeness);
    
    if (relevance) {
      this.context.element.setAttribute('aria-relevant', relevance);
    }
    
    // Set atomic if specified
    if (this.context.modifiers.includes('atomic')) {
      this.context.element.setAttribute('aria-atomic', 'true');
    }
    
    // Set busy state if specified
    if (this.context.modifiers.includes('busy')) {
      this.context.element.setAttribute('aria-busy', 'true');
    }
  }

  private getPoliteness(): string {
    if (this.context.modifiers.includes('assertive')) {
      return 'assertive';
    } else if (this.context.modifiers.includes('off')) {
      return 'off';
    }
    return 'polite';
  }

  private getRelevance(): string {
    const relevantModifiers = this.context.modifiers.filter(m => 
      ['additions', 'removals', 'text', 'all'].includes(m)
    );
    
    return relevantModifiers.length > 0 ? relevantModifiers.join(' ') : '';
  }

  announce(message: string, delay = 100): void {
    // Clear any pending announcement
    if (this.announceTimeout) {
      clearTimeout(this.announceTimeout);
    }
    
    // Set busy state
    this.context.element.setAttribute('aria-busy', 'true');
    
    // Delay announcement to ensure screen readers pick it up
    this.announceTimeout = window.setTimeout(() => {
      this.context.element.textContent = message;
      this.context.element.setAttribute('aria-busy', 'false');
    }, delay);
  }

  clear(): void {
    if (this.announceTimeout) {
      clearTimeout(this.announceTimeout);
    }
    
    this.context.element.textContent = '';
    this.context.element.setAttribute('aria-busy', 'false');
  }

  dispose(): void {
    if (this.announceTimeout) {
      clearTimeout(this.announceTimeout);
    }
    
    // Restore original content
    this.context.element.textContent = this.originalContent;
    
    // Remove ARIA attributes
    this.context.element.removeAttribute('aria-live');
    this.context.element.removeAttribute('aria-relevant');
    this.context.element.removeAttribute('aria-atomic');
    this.context.element.removeAttribute('aria-busy');
    
    super.dispose();
  }
}

// Helper interfaces
interface KeyboardShortcut {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

// Export all advanced directives
export const advancedDirectives = {
  'intersect': IntersectDirective,
  'resize': ResizeDirective,
  'clickaway': ClickAwayDirective,
  'hotkey': HotkeyDirective,
  'focus-trap': FocusTrapDirective,
  'live-region': LiveRegionDirective
};

// Convenience function to register all advanced directives
export function registerAdvancedDirectives(praxis: any): void {
  for (const [name, DirectiveClass] of Object.entries(advancedDirectives)) {
    praxis.directive(name, DirectiveClass);
  }
}