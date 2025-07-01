import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';

export class IfDirective extends BaseDirective {
  public name = 'if';
  public priority = DIRECTIVE_PRIORITIES.IF;
  
  private placeholder: Comment | null = null;
  private isInDOM = true;

  init(): void {
    this.placeholder = document.createComment('x-if');
    
    this.createEffect(() => {
      const condition = Boolean(this.evaluateExpression());
      
      if (condition && !this.isInDOM) {
        this.showElement();
      } else if (!condition && this.isInDOM) {
        this.hideElement();
      }
    });
  }

  private hideElement(): void {
    if (this.context.element.parentNode && this.placeholder) {
      this.context.element.parentNode.insertBefore(this.placeholder, this.context.element);
      this.context.element.remove();
      this.isInDOM = false;
    }
  }

  private showElement(): void {
    if (this.placeholder && this.placeholder.parentNode) {
      this.placeholder.parentNode.insertBefore(this.context.element, this.placeholder);
      this.placeholder.remove();
      this.isInDOM = true;
    }
  }

  dispose(): void {
    if (this.placeholder && this.placeholder.parentNode) {
      this.placeholder.remove();
    }
    super.dispose();
  }
}

registerDirective('if', IfDirective);