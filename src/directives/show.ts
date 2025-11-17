import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';

export class ShowDirective extends BaseDirective {
  public name = 'show';
  public priority = DIRECTIVE_PRIORITIES.SHOW;
  
  private originalDisplay: string = '';

  init(): void {
    const element = this.context.element as HTMLElement;
    const inlineDisplay = element.style.display;
    // If originally hidden inline, use empty string (let CSS decide)
    this.originalDisplay = (inlineDisplay === 'none' || !inlineDisplay) ? '' : inlineDisplay;

    this.createEffect(() => {
      const shouldShow = Boolean(this.evaluateExpression());
      const element = this.context.element as HTMLElement;

      if (shouldShow) {
        element.style.display = this.originalDisplay;
      } else {
        element.style.display = 'none';
      }
    });
  }
}

registerDirective('show', ShowDirective);