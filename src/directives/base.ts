import { Signal } from '../core/signal.js';
import { Effect, createEffect } from '../core/effect.js';
import { ExpressionContext, globalEvaluator } from '../parser/expression.js';
import { Component } from '../core/component.js';

export interface DirectiveContext {
  element: Element;
  expression: string;
  value: string;
  modifiers: string[];
  scope: Record<string, Signal<any>>;
  component: Component;
}

export interface Directive {
  name: string;
  priority: number;
  bind(element: Element, expression: string, component: Component): void;
  update(element: Element, value: any, oldValue: any): void;
  unbind(element: Element): void;
}

export abstract class BaseDirective implements Directive {
  public abstract name: string;
  public abstract priority: number;
  
  protected effects: Effect[] = [];
  protected cleanup: (() => void)[] = [];

  constructor(protected context: DirectiveContext) {}

  abstract init(): void;
  
  bind(element: Element, expression: string, component: Component): void {
    this.init();
  }

  update(element: Element, value: any, oldValue: any): void {
    // Override in subclasses if needed
  }

  unbind(element: Element): void {
    this.dispose();
  }

  protected createEffect(fn: () => void | (() => void)): void {
    const dispose = createEffect(fn);
    this.cleanup.push(dispose);
  }

  protected evaluateExpression(expression: string = this.context.expression): any {
    const evaluationContext = this.buildEvaluationContext();
    return globalEvaluator.evaluate(expression, evaluationContext);
  }

  protected buildEvaluationContext(): ExpressionContext {
    const context: ExpressionContext = {
      $el: this.context.element,
      $refs: this.context.component.refs,
      $watch: this.context.component.watch.bind(this.context.component),
      $nextTick: this.context.component.nextTick.bind(this.context.component),
      $dispatch: this.context.component.dispatch.bind(this.context.component),
      ...this.getScopeValues()
    };

    return context;
  }

  private getScopeValues(): Record<string, any> {
    const values: Record<string, any> = {};
    
    for (const [key, signal] of Object.entries(this.context.scope)) {
      values[key] = signal.value;
    }
    
    return values;
  }

  private getElementRefs(): Record<string, Element> {
    const refs: Record<string, Element> = {};
    const root = this.context.element.closest('[x-data]') || document.body;
    
    root.querySelectorAll('[x-ref]').forEach(el => {
      const refName = el.getAttribute('x-ref');
      if (refName) {
        refs[refName] = el;
      }
    });
    
    return refs;
  }

  protected hasModifier(modifier: string): boolean {
    return this.context.modifiers.includes(modifier);
  }

  dispose(): void {
    this.cleanup.forEach(fn => fn());
    this.cleanup = [];
    this.effects = [];
  }
}

export interface DirectiveConstructor {
  new (context: DirectiveContext): BaseDirective;
  priority?: number;
}

export const directiveRegistry = new Map<string, DirectiveConstructor>();

export function registerDirective(name: string, directive: DirectiveConstructor): void {
  directiveRegistry.set(name, directive);
}

export function getDirective(name: string): DirectiveConstructor | undefined {
  return directiveRegistry.get(name);
}

export function getDirectivesByPriority(): Array<[string, DirectiveConstructor]> {
  return Array.from(directiveRegistry.entries()).sort((a, b) => {
    const aPriority = a[1].priority || 0;
    const bPriority = b[1].priority || 0;
    return bPriority - aPriority;
  });
}

export const DIRECTIVE_PRIORITIES = {
  DATA: 100,
  CLOAK: 90,
  IF: 80,
  FOR: 70,
  SHOW: 60,
  BIND: 50,
  MODEL: 40,
  ON: 30,
  TEXT: 20,
  HTML: 10,
  REF: 5,
  DEFAULT: 0
} as const;