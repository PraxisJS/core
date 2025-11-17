// PraxisJS Accessibility Features

export interface AccessibilityConfig {
  enabled?: boolean;
  ariaLiveRegions?: boolean;
  focusManagement?: boolean;
  keyboardNavigation?: boolean;
  screenReaderSupport?: boolean;
  colorContrastValidation?: boolean;
  reducedMotionSupport?: boolean;
  highContrastSupport?: boolean;
  announcements?: AnnouncementConfig;
}

export interface AnnouncementConfig {
  enabled?: boolean;
  politeness?: 'polite' | 'assertive';
  delay?: number;
  deduplicate?: boolean;
  maxLength?: number;
}

export interface FocusOptions {
  preventScroll?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
  skipLinks?: boolean;
}

export interface KeyboardNavigationConfig {
  enabled?: boolean;
  roving?: boolean;
  arrowKeys?: boolean;
  homeEnd?: boolean;
  pageKeys?: boolean;
  typeAhead?: boolean;
}

export interface ColorContrastResult {
  ratio: number;
  level: 'AA' | 'AAA' | 'fail';
  passes: boolean;
  foreground: string;
  background: string;
}

export class AccessibilityManager {
  private config: Required<AccessibilityConfig>;
  private liveRegion?: HTMLElement;
  private announcements: Set<string> = new Set();
  private focusHistory: HTMLElement[] = [];
  private originalFocus?: HTMLElement;
  private skipLinkContainer?: HTMLElement;

  // MEMORY LEAK FIX: Store event listeners for cleanup
  private eventListeners: Array<{
    target: EventTarget;
    type: string;
    handler: EventListenerOrEventListenerObject;
  }> = [];

  constructor(config: AccessibilityConfig = {}) {
    this.config = this.mergeDefaultConfig(config);
    this.initialize();
  }

  private mergeDefaultConfig(config: AccessibilityConfig): Required<AccessibilityConfig> {
    return {
      enabled: true,
      ariaLiveRegions: true,
      focusManagement: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      colorContrastValidation: false,
      reducedMotionSupport: true,
      highContrastSupport: true,
      announcements: {
        enabled: true,
        politeness: 'polite',
        delay: 100,
        deduplicate: true,
        maxLength: 150,
        ...config.announcements
      },
      ...config
    };
  }

  // MEMORY LEAK FIX: Helper to track event listeners for cleanup
  private addEventListener(
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject
  ): void {
    target.addEventListener(type, handler);
    this.eventListeners.push({ target, type, handler });
  }

  private initialize(): void {
    if (!this.config.enabled) {
      return;
    }

    if (this.config.ariaLiveRegions) {
      this.createLiveRegion();
    }

    if (this.config.reducedMotionSupport) {
      this.setupReducedMotionSupport();
    }

    if (this.config.highContrastSupport) {
      this.setupHighContrastSupport();
    }

    if (this.config.keyboardNavigation) {
      this.setupKeyboardNavigation();
    }

    this.setupSkipLinks();
    this.setupFocusIndicators();
  }

  // ARIA Live Region Management
  private createLiveRegion(): void {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', this.config.announcements.politeness);
    this.liveRegion.setAttribute('aria-atomic', 'false');
    this.liveRegion.setAttribute('aria-relevant', 'additions text');
    this.liveRegion.className = 'praxis-live-region';
    
    // Hide visually but keep accessible to screen readers
    Object.assign(this.liveRegion.style, {
      position: 'absolute',
      left: '-10000px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      clipPath: 'inset(50%)',
      whiteSpace: 'nowrap'
    });

    document.body.appendChild(this.liveRegion);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.config.announcements.enabled || !this.liveRegion) {
      return;
    }

    // Trim message to max length
    if (message.length > this.config.announcements.maxLength) {
      message = message.substring(0, this.config.announcements.maxLength - 3) + '...';
    }

    // Deduplicate announcements
    if (this.config.announcements.deduplicate && this.announcements.has(message)) {
      return;
    }

    this.announcements.add(message);

    // Clear previous announcement
    this.liveRegion.textContent = '';

    // Update politeness if needed
    if (priority !== this.config.announcements.politeness) {
      this.liveRegion.setAttribute('aria-live', priority);
    }

    // Announce after delay to ensure screen readers pick it up
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    }, this.config.announcements.delay);

    // Clean up announcement from set after some time
    setTimeout(() => {
      this.announcements.delete(message);
    }, 5000);
  }

  // Focus Management
  manageFocus(element: HTMLElement, options: FocusOptions = {}): void {
    if (!this.config.focusManagement) {
      return;
    }

    // Store current focus for restoration
    if (options.restoreFocus && document.activeElement instanceof HTMLElement) {
      this.originalFocus = document.activeElement;
    }

    // Focus the element
    element.focus({
      preventScroll: options.preventScroll
    });

    // Add to focus history
    this.focusHistory.push(element);

    // Set up focus trap if requested
    if (options.trapFocus) {
      this.trapFocus(element);
    }
  }

  restoreFocus(): void {
    if (this.originalFocus && document.body.contains(this.originalFocus)) {
      this.originalFocus.focus();
      this.originalFocus = undefined;
    }
  }

  private trapFocus(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    
    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeydown);

    // Store cleanup function
    (container as any)._cleanupFocusTrap = () => {
      container.removeEventListener('keydown', handleKeydown);
    };
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    return Array.from(container.querySelectorAll(focusableSelectors.join(',')))
      .filter((element) => this.isVisible(element))
      .sort((a, b) => {
        const aTabIndex = parseInt((a as HTMLElement).tabIndex.toString()) || 0;
        const bTabIndex = parseInt((b as HTMLElement).tabIndex.toString()) || 0;
        return aTabIndex - bTabIndex;
      }) as HTMLElement[];
  }

  private isVisible(element: Element): boolean {
    const style = getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           (element as HTMLElement).offsetParent !== null;
  }

  // Keyboard Navigation
  private setupKeyboardNavigation(): void {
    const keydownHandler = (event: Event) => {
      const target = (event as KeyboardEvent).target as HTMLElement;

      // Handle roving tabindex
      if (target.hasAttribute('data-roving-tabindex')) {
        this.handleRovingTabindex(event as KeyboardEvent, target);
      }

      // Handle list navigation
      if (target.closest('[role="listbox"], [role="menu"], [role="tablist"]')) {
        this.handleListNavigation(event as KeyboardEvent);
      }
    };

    this.addEventListener(document, 'keydown', keydownHandler);
  }

  private handleRovingTabindex(event: KeyboardEvent, current: HTMLElement): void {
    const container = current.closest('[data-roving-container]') as HTMLElement;
    if (!container) return;

    const items = Array.from(container.querySelectorAll('[data-roving-tabindex]')) as HTMLElement[];
    const currentIndex = items.indexOf(current);

    let nextIndex = -1;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
    }

    if (nextIndex !== -1) {
      event.preventDefault();
      
      // Update tabindex
      items.forEach((item, index) => {
        item.tabIndex = index === nextIndex ? 0 : -1;
      });
      
      // Focus new item
      items[nextIndex].focus();
    }
  }

  private handleListNavigation(event: KeyboardEvent): void {
    const list = (event.target as HTMLElement).closest('[role="listbox"], [role="menu"], [role="tablist"]');
    if (!list) return;

    const items = Array.from(list.querySelectorAll('[role="option"], [role="menuitem"], [role="tab"]')) as HTMLElement[];
    const currentIndex = items.indexOf(event.target as HTMLElement);

    if (currentIndex === -1) return;

    let nextIndex = -1;

    switch (event.key) {
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + 1, items.length - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
    }

    if (nextIndex !== -1 && nextIndex !== currentIndex) {
      event.preventDefault();
      items[nextIndex].focus();
    }
  }

  // Skip Links
  private setupSkipLinks(): void {
    this.skipLinkContainer = document.createElement('div');
    this.skipLinkContainer.className = 'praxis-skip-links';
    this.skipLinkContainer.setAttribute('aria-label', 'Skip navigation links');
    
    Object.assign(this.skipLinkContainer.style, {
      position: 'absolute',
      top: '-100px',
      left: '0',
      zIndex: '10000',
      background: '#000',
      color: '#fff',
      padding: '8px',
      textDecoration: 'none',
      borderRadius: '0 0 4px 0'
    });

    // Add default skip links
    this.addSkipLink('Skip to main content', '#main, main, [role="main"]');
    this.addSkipLink('Skip to navigation', 'nav, [role="navigation"]');

    document.body.insertBefore(this.skipLinkContainer, document.body.firstChild);
  }

  addSkipLink(text: string, target: string): void {
    if (!this.skipLinkContainer) return;

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = text;
    link.className = 'praxis-skip-link';
    
    Object.assign(link.style, {
      position: 'absolute',
      top: '-100px',
      left: '0',
      background: '#000',
      color: '#fff',
      padding: '8px 16px',
      textDecoration: 'none',
      borderRadius: '0 0 4px 0',
      transition: 'top 0.2s'
    });

    const focusHandler = () => {
      link.style.top = '0';
    };

    const blurHandler = () => {
      link.style.top = '-100px';
    };

    const clickHandler = (event: Event) => {
      event.preventDefault();
      const targetElement = document.querySelector(target);
      if (targetElement) {
        (targetElement as HTMLElement).focus();
        (targetElement as HTMLElement).scrollIntoView({ behavior: 'smooth' });
      }
    };

    this.addEventListener(link, 'focus', focusHandler);
    this.addEventListener(link, 'blur', blurHandler);
    this.addEventListener(link, 'click', clickHandler);

    this.skipLinkContainer.appendChild(link);
  }

  // Focus Indicators
  private setupFocusIndicators(): void {
    // Add focus-visible polyfill behavior
    const keydownHandler = (event: Event) => {
      if ((event as KeyboardEvent).key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    };

    const mousedownHandler = () => {
      document.body.classList.remove('keyboard-navigation');
    };

    this.addEventListener(document, 'keydown', keydownHandler);
    this.addEventListener(document, 'mousedown', mousedownHandler);

    // Add custom focus styles
    const style = document.createElement('style');
    style.textContent = `
      .keyboard-navigation *:focus {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }
      
      .praxis-skip-link:focus {
        top: 0 !important;
      }
      
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
      
      @media (prefers-contrast: high) {
        * {
          border-color: ButtonText !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Media Query Support
  private setupReducedMotionSupport(): void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateMotionPreference = () => {
      if (mediaQuery.matches) {
        document.documentElement.classList.add('reduce-motion');
        this.announce('Reduced motion is enabled');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
    };

    updateMotionPreference();
    this.addEventListener(mediaQuery, 'change', updateMotionPreference);
  }

  private setupHighContrastSupport(): void {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');

    const updateContrastPreference = () => {
      if (mediaQuery.matches) {
        document.documentElement.classList.add('high-contrast');
        this.announce('High contrast mode is enabled');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
    };

    updateContrastPreference();
    this.addEventListener(mediaQuery, 'change', updateContrastPreference);
  }

  // Color Contrast Validation
  validateColorContrast(foreground: string, background: string): ColorContrastResult {
    const fgLuminance = this.getLuminance(foreground);
    const bgLuminance = this.getLuminance(background);
    
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    
    const ratio = (lighter + 0.05) / (darker + 0.05);
    
    let level: 'AA' | 'AAA' | 'fail';
    let passes: boolean;
    
    if (ratio >= 7) {
      level = 'AAA';
      passes = true;
    } else if (ratio >= 4.5) {
      level = 'AA';
      passes = true;
    } else {
      level = 'fail';
      passes = false;
    }

    return {
      ratio: Math.round(ratio * 100) / 100,
      level,
      passes,
      foreground,
      background
    };
  }

  private getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const { r, g, b } = rgb;
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // ARIA Utilities
  setAriaLabel(element: HTMLElement, label: string): void {
    element.setAttribute('aria-label', label);
  }

  setAriaDescription(element: HTMLElement, description: string): void {
    // Create or update description element
    let descId = element.getAttribute('aria-describedby');
    let descElement: HTMLElement;
    
    if (descId) {
      descElement = document.getElementById(descId)!;
    } else {
      descId = `praxis-desc-${Math.random().toString(36).substr(2, 9)}`;
      descElement = document.createElement('div');
      descElement.id = descId;
      descElement.className = 'praxis-description';
      Object.assign(descElement.style, {
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden'
      });
      document.body.appendChild(descElement);
      element.setAttribute('aria-describedby', descId);
    }
    
    descElement.textContent = description;
  }

  setAriaExpanded(element: HTMLElement, expanded: boolean): void {
    element.setAttribute('aria-expanded', expanded.toString());
  }

  setAriaSelected(element: HTMLElement, selected: boolean): void {
    element.setAttribute('aria-selected', selected.toString());
  }

  setAriaPressed(element: HTMLElement, pressed: boolean): void {
    element.setAttribute('aria-pressed', pressed.toString());
  }

  // Screen Reader Utilities
  hideFromScreenReaders(element: HTMLElement): void {
    element.setAttribute('aria-hidden', 'true');
  }

  showToScreenReaders(element: HTMLElement): void {
    element.removeAttribute('aria-hidden');
  }

  makeElementInteractive(element: HTMLElement, role: string): void {
    element.setAttribute('role', role);
    if (element.tabIndex < 0) {
      element.tabIndex = 0;
    }
  }

  // Cleanup
  dispose(): void {
    // MEMORY LEAK FIX: Remove all tracked event listeners
    this.eventListeners.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    this.eventListeners = [];

    if (this.liveRegion) {
      document.body.removeChild(this.liveRegion);
    }

    if (this.skipLinkContainer) {
      document.body.removeChild(this.skipLinkContainer);
    }

    // Clean up focus traps
    document.querySelectorAll('[data-roving-container]').forEach(container => {
      if ((container as any)._cleanupFocusTrap) {
        (container as any)._cleanupFocusTrap();
      }
    });
  }
}

// Export singleton instance
export const accessibility = new AccessibilityManager();

// Utility functions
export function announce(message: string, priority?: 'polite' | 'assertive'): void {
  accessibility.announce(message, priority);
}

export function manageFocus(element: HTMLElement, options?: FocusOptions): void {
  accessibility.manageFocus(element, options);
}

export function validateContrast(fg: string, bg: string): ColorContrastResult {
  return accessibility.validateColorContrast(fg, bg);
}