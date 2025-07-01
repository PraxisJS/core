import { BaseDirective, DirectiveContext, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';
import { signal, Signal } from '../core/signal.js';

export class DataDirective extends BaseDirective {
  public name = 'data';
  public priority = DIRECTIVE_PRIORITIES.DATA;
  
  private dataScope: Record<string, Signal<any>> = {};

  init(): void {
    const data = this.evaluateExpression();
    
    if (typeof data === 'object' && data !== null) {
      this.createDataScope(data);
      this.attachScopeToComponent();
    }
  }

  private createDataScope(data: Record<string, any>): void {
    for (const [key, value] of Object.entries(data)) {
      this.dataScope[key] = signal(value);
      this.context.scope[key] = this.dataScope[key];
    }
  }

  private attachScopeToComponent(): void {
    Object.assign(this.context.component.scope, this.dataScope);
    (this.context.element as any)._praxisScope = this.context.component.scope;
  }

  getScope(): Record<string, Signal<any>> {
    return this.dataScope;
  }
}

registerDirective('data', DataDirective);