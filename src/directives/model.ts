import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';
import { globalEvaluator } from '../parser/expression.js';

export class ModelDirective extends BaseDirective {
  public name = 'model';
  public priority = DIRECTIVE_PRIORITIES.MODEL;
  
  private eventListeners: Array<{ element: Element; event: string; handler: EventListener }> = [];

  init(): void {
    const element = this.context.element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    
    this.setupTwoWayBinding(element);
  }

  private setupTwoWayBinding(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void {
    this.createEffect(() => {
      const value = this.evaluateExpression();
      this.updateElementValue(element, value);
    });

    const eventName = this.getEventName(element);
    const handler = this.createInputHandler(element);
    
    element.addEventListener(eventName, handler);
    this.eventListeners.push({ element, event: eventName, handler });
  }

  private updateElementValue(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: any): void {
    if (element.type === 'checkbox') {
      (element as HTMLInputElement).checked = Boolean(value);
    } else if (element.type === 'radio') {
      (element as HTMLInputElement).checked = element.value === String(value);
    } else if (element.tagName === 'SELECT') {
      (element as HTMLSelectElement).value = String(value);
    } else {
      element.value = String(value ?? '');
    }
  }

  private createInputHandler(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): EventListener {
    return () => {
      const value = this.getElementValue(element);
      const assignment = `${this.context.expression} = $value`;
      
      const evaluationContext = {
        ...this.buildEvaluationContext(),
        $value: value
      };

      try {
        globalEvaluator.evaluate(assignment, evaluationContext);
      } catch (error) {
        console.error('Model binding error:', error);
      }
    };
  }

  private getElementValue(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): any {
    if (element.type === 'checkbox') {
      return (element as HTMLInputElement).checked;
    } else if (element.type === 'number' || element.type === 'range') {
      return Number(element.value);
    } else if (element.type === 'radio') {
      return (element as HTMLInputElement).checked ? element.value : undefined;
    } else {
      return element.value;
    }
  }

  private getEventName(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
    if (this.hasModifier('lazy')) {
      return 'change';
    }
    
    if (element.type === 'checkbox' || element.type === 'radio') {
      return 'change';
    }
    
    return 'input';
  }

  dispose(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    super.dispose();
  }
}

registerDirective('model', ModelDirective);