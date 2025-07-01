import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';

export class CloakDirective extends BaseDirective {
  public name = 'cloak';
  public priority = DIRECTIVE_PRIORITIES.CLOAK;

  init(): void {
    // Remove the x-cloak attribute immediately to show the element
    this.context.element.removeAttribute('x-cloak');
  }

  // Override to prevent any reactive behavior - cloak is one-time only
  protected createEffect(): void {
    // No reactive effects needed for cloak
  }
}

// Add default CSS to hide cloaked elements
export function addCloakStyles(): void {
  const styleId = 'praxis-cloak-styles';
  
  // Don't add styles if they already exist
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    [x-cloak] {
      display: none !important;
    }
  `;
  
  document.head.appendChild(style);
}

// Automatically add cloak styles when this module is imported
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCloakStyles);
  } else {
    addCloakStyles();
  }
}

registerDirective('cloak', CloakDirective);