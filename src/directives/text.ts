import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';

export class TextDirective extends BaseDirective {
  public name = 'text';
  public priority = DIRECTIVE_PRIORITIES.TEXT;

  init(): void {
    this.createEffect(() => {
      const value = this.evaluateExpression();
      this.updateTextContent(value);
    });
  }

  private updateTextContent(value: any): void {
    const textContent = value == null ? '' : String(value);
    
    if (this.context.element.textContent !== textContent) {
      this.context.element.textContent = textContent;
    }
  }
}

registerDirective('text', TextDirective);