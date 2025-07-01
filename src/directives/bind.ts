import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';

export class BindDirective extends BaseDirective {
  public name = 'bind';
  public priority = DIRECTIVE_PRIORITIES.BIND;
  
  private attributeName: string;

  constructor(context: any) {
    super(context);
    this.attributeName = context.value || '';
  }

  init(): void {
    if (!this.attributeName) {
      console.error('x-bind directive requires an attribute name');
      return;
    }

    this.createEffect(() => {
      const value = this.evaluateExpression();
      this.updateAttribute(value);
    });
  }

  private updateAttribute(value: any): void {
    const element = this.context.element as HTMLElement;
    
    switch (this.attributeName) {
      case 'class':
        this.updateClass(element, value);
        break;
      case 'style':
        this.updateStyle(element, value);
        break;
      case 'disabled':
      case 'checked':
      case 'selected':
      case 'hidden':
      case 'readonly':
      case 'required':
        this.updateBooleanAttribute(element, value);
        break;
      default:
        this.updateRegularAttribute(element, value);
        break;
    }
  }

  private updateClass(element: HTMLElement, value: any): void {
    // Handle different class value types
    if (typeof value === 'string') {
      element.className = value;
    } else if (Array.isArray(value)) {
      element.className = value.filter(Boolean).join(' ');
    } else if (typeof value === 'object' && value !== null) {
      const classes = Object.entries(value)
        .filter(([_, shouldApply]) => Boolean(shouldApply))
        .map(([className]) => className);
      element.className = classes.join(' ');
    } else {
      element.className = '';
    }
  }

  private updateStyle(element: HTMLElement, value: any): void {
    if (typeof value === 'string') {
      element.style.cssText = value;
    } else if (typeof value === 'object' && value !== null) {
      // Clear existing styles
      element.style.cssText = '';
      
      // Apply new styles
      Object.entries(value).forEach(([property, val]) => {
        if (val != null) {
          const cssProperty = this.camelToKebab(property);
          element.style.setProperty(cssProperty, String(val));
        }
      });
    } else {
      element.style.cssText = '';
    }
  }

  private updateBooleanAttribute(element: HTMLElement, value: any): void {
    const shouldSet = Boolean(value);
    
    if (shouldSet) {
      element.setAttribute(this.attributeName, '');
    } else {
      element.removeAttribute(this.attributeName);
    }
  }

  private updateRegularAttribute(element: HTMLElement, value: any): void {
    if (value == null || value === false) {
      element.removeAttribute(this.attributeName);
    } else {
      element.setAttribute(this.attributeName, String(value));
    }
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

// Support shorthand syntax like :class="..." which becomes x-bind:class="..."
export class ShorthandBindDirective extends BindDirective {
  public name = 'bind-shorthand';
  public priority = DIRECTIVE_PRIORITIES.BIND;

  constructor(context: any) {
    // Extract attribute name from the directive name (e.g., ":class" -> "class")
    const attributeName = context.value || context.expression.split('=')[0];
    const modifiedContext = {
      ...context,
      value: attributeName
    };
    super(modifiedContext);
  }
}

registerDirective('bind', BindDirective);

// Register common bind patterns
const BIND_ALIASES = [
  'class', 'style', 'href', 'src', 'alt', 'title', 'value',
  'disabled', 'checked', 'selected', 'hidden', 'readonly', 'required'
];

BIND_ALIASES.forEach(attr => {
  registerDirective(`bind:${attr}`, class extends BindDirective {
    constructor(context: any) {
      super({ ...context, value: attr });
    }
  });
});