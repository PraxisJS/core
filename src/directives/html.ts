import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';
import { defaultSanitizer, HTMLSanitizer } from '../utils/sanitizer.js';

export class HtmlDirective extends BaseDirective {
  public name = 'html';
  public priority = DIRECTIVE_PRIORITIES.HTML;

  private sanitizer: HTMLSanitizer | null;

  constructor(context: any) {
    super(context);

    // ⚠️ SECURITY WARNING: The 'unsafe' modifier completely disables XSS protection
    // This should ONLY be used in development with trusted content
    // NEVER use with user-generated content or in production
    if (this.hasModifier('unsafe')) {
      // Only allow unsafe mode in development
      // @ts-ignore - process.env.NODE_ENV is defined by bundler in production builds
      const isProduction = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production';
      if (isProduction) {
        console.error(
          '[PraxisJS Security Error] The x-html.unsafe modifier is disabled in production. ' +
          'Using unsanitized HTML in production is a critical security vulnerability. ' +
          'Falling back to sanitized mode.'
        );
        this.sanitizer = defaultSanitizer;
      } else {
        console.warn(
          '[PraxisJS Security Warning] Using x-html.unsafe modifier disables all XSS protection! ' +
          'This should ONLY be used with trusted content. ' +
          'NEVER use with user input or data from external sources. ' +
          'Element:', this.context.element
        );
        this.sanitizer = null;
      }
    } else {
      this.sanitizer = defaultSanitizer;
    }
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