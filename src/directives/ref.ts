import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';

export class RefDirective extends BaseDirective {
  public name = 'ref';
  public priority = DIRECTIVE_PRIORITIES.REF;
  
  private refName: string;

  constructor(context: any) {
    super(context);
    this.refName = context.expression || '';
  }

  init(): void {
    if (!this.refName) {
      console.error('x-ref directive requires a reference name');
      return;
    }

    // Register the element reference
    this.registerRef();
  }

  private registerRef(): void {
    // Add to component refs
    this.context.component.refs[this.refName] = this.context.element;
    
    // Also set on element for backwards compatibility
    (this.context.element as any)._refName = this.refName;
  }

  dispose(): void {
    // Clean up the reference
    if (this.context.component.refs[this.refName] === this.context.element) {
      delete this.context.component.refs[this.refName];
    }
    
    super.dispose();
  }
}

registerDirective('ref', RefDirective);