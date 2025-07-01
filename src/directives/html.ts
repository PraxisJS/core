import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';
import { defaultSanitizer, HTMLSanitizer } from '../utils/sanitizer.js';

export class HtmlDirective extends BaseDirective {
  public name = 'html';
  public priority = DIRECTIVE_PRIORITIES.HTML;
  
  private sanitizer: HTMLSanitizer;

  constructor(context: any) {
    super(context);
    
    // Allow disabling sanitization with x-html.unsafe modifier
    this.sanitizer = this.hasModifier('unsafe') ? null : defaultSanitizer;
  }

  init(): void {
    this.createEffect(() => {
      const value = this.evaluateExpression();
      this.updateInnerHTML(value);
    });
  }

  private updateInnerHTML(value: any): void {
    let htmlContent = value == null ? '' : String(value);
    
    // Sanitize HTML content unless unsafe modifier is used
    if (this.sanitizer) {
      htmlContent = this.sanitizer.sanitize(htmlContent);
    }
    
    if (this.context.element.innerHTML !== htmlContent) {
      this.context.element.innerHTML = htmlContent;
    }
  }
}

registerDirective('html', HtmlDirective);