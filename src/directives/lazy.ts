import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';

export class LazyDirective extends BaseDirective {
  public name = 'lazy';
  public priority = DIRECTIVE_PRIORITIES.DEFAULT;
  
  private observer: IntersectionObserver | null = null;
  private isLoaded = false;

  init(): void {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      this.loadContent();
      return;
    }

    this.setupObserver();
  }

  private setupObserver(): void {
    const options = {
      root: this.getRoot(),
      rootMargin: this.getRootMargin(),
      threshold: this.getThreshold()
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoaded) {
          this.loadContent();
          this.observer?.unobserve(this.context.element);
        }
      });
    }, options);

    this.observer.observe(this.context.element);
  }

  private loadContent(): void {
    if (this.isLoaded) return;
    
    this.isLoaded = true;
    
    try {
      this.evaluateExpression();
    } catch (error) {
      console.error('Error loading lazy content:', error);
    }

    // Dispatch lazy load event
    this.context.element.dispatchEvent(new CustomEvent('lazy:loaded', {
      bubbles: true,
      detail: { element: this.context.element }
    }));
  }

  private getRoot(): Element | null {
    if (this.hasModifier('viewport')) {
      return null; // Use viewport as root
    }
    
    const rootSelector = this.context.modifiers.find(m => m.startsWith('root:'))?.slice(5);
    if (rootSelector) {
      return document.querySelector(rootSelector);
    }
    
    return null;
  }

  private getRootMargin(): string {
    const margin = this.context.modifiers.find(m => m.startsWith('margin:'))?.slice(7);
    return margin || '50px';
  }

  private getThreshold(): number {
    const threshold = this.context.modifiers.find(m => m.startsWith('threshold:'))?.slice(10);
    return threshold ? parseFloat(threshold) : 0.1;
  }

  dispose(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    super.dispose();
  }
}

registerDirective('lazy', LazyDirective);