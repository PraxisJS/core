import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';
import { VirtualDOM, VirtualNode } from '../utils/vdom.js';
import { signal } from '../core/signal.js';

export class ForDirective extends BaseDirective {
  public name = 'for';
  public priority = DIRECTIVE_PRIORITIES.FOR;
  
  private template: Element | null = null;
  private container: Element | null = null;
  private virtualNodes: VirtualNode[] = [];
  private renderedElements: Element[] = [];
  private placeholder: Comment | null = null;

  init(): void {
    if (this.context.element.tagName.toLowerCase() !== 'template') {
      console.error('x-for directive must be used on a <template> element');
      return;
    }

    this.template = this.context.element;
    this.container = this.template.parentElement;
    this.placeholder = document.createComment('x-for');
    
    if (this.container) {
      this.container.insertBefore(this.placeholder, this.template);
      this.template.remove();
    }

    this.createEffect(() => {
      this.render();
    });
  }

  private render(): void {
    const { items, keyExpression } = this.parseExpression();
    const newVirtualNodes = this.createVirtualNodes(items, keyExpression);
    
    const diffs = VirtualDOM.diff(this.virtualNodes, newVirtualNodes);
    this.applyDiffs(diffs);
    
    this.virtualNodes = newVirtualNodes;
  }

  private parseExpression(): { items: any[], keyExpression?: string } {
    const expression = this.context.expression.trim();
    
    // Parse "item in items" or "(item, index) in items" or "item in items :key='item.id'"
    const keyMatch = expression.match(/(.+?)\s*:key\s*=\s*['"`]([^'"`]+)['"`]/);
    let mainExpression = expression;
    let keyExpression: string | undefined;
    
    if (keyMatch) {
      mainExpression = keyMatch[1].trim();
      keyExpression = keyMatch[2];
    }
    
    const match = mainExpression.match(/^(.+?)\s+in\s+(.+)$/);
    if (!match) {
      console.error('Invalid x-for expression:', expression);
      return { items: [] };
    }

    const itemExpression = match[1].trim();
    const arrayExpression = match[2].trim();
    
    // Evaluate the array expression
    const items = this.evaluateExpression(arrayExpression);
    
    if (!Array.isArray(items)) {
      console.warn('x-for expression did not evaluate to an array:', items);
      return { items: [] };
    }

    return { items, keyExpression };
  }

  private createVirtualNodes(items: any[], keyExpression?: string): VirtualNode[] {
    if (!this.template) return [];

    return items.map((item, index) => {
      const key = keyExpression 
        ? this.evaluateInItemContext(keyExpression, item, index)
        : index;

      // Clone the template content
      const templateContent = (this.template as HTMLTemplateElement).content || this.template;
      const clonedElement = templateContent.cloneNode(true) as Element;
      
      // Create virtual node representation
      const vnode: VirtualNode = {
        type: clonedElement.nodeType === Node.DOCUMENT_FRAGMENT_NODE 
          ? 'fragment' 
          : clonedElement.nodeName.toLowerCase(),
        key,
        props: this.extractProps(clonedElement, item, index),
        children: [],
        element: clonedElement as Element
      };

      return vnode;
    });
  }

  private extractProps(element: Element, item: any, index: number): Record<string, any> {
    const props: Record<string, any> = {};
    
    // Store item context for later evaluation
    props._itemContext = { item, index };
    
    // Extract attributes that might need item context
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('x-') || attr.name.startsWith(':')) {
        props[attr.name] = attr.value;
      }
    });
    
    return props;
  }

  private evaluateInItemContext(expression: string, item: any, index: number): any {
    const itemVar = this.getItemVariable();
    const indexVar = this.getIndexVariable();
    
    const context = {
      ...this.buildEvaluationContext(),
      [itemVar]: item,
      [indexVar]: index
    };
    
    return this.evaluateExpression(expression);
  }

  private getItemVariable(): string {
    const expression = this.context.expression.trim();
    const match = expression.match(/^(.+?)\s+in\s+/);
    if (!match) return 'item';
    
    const itemExpression = match[1].trim();
    
    // Handle (item, index) syntax
    const destructureMatch = itemExpression.match(/^\((.+?),\s*(.+?)\)$/);
    if (destructureMatch) {
      return destructureMatch[1].trim();
    }
    
    return itemExpression;
  }

  private getIndexVariable(): string {
    const expression = this.context.expression.trim();
    const match = expression.match(/^(.+?)\s+in\s+/);
    if (!match) return 'index';
    
    const itemExpression = match[1].trim();
    
    // Handle (item, index) syntax
    const destructureMatch = itemExpression.match(/^\((.+?),\s*(.+?)\)$/);
    if (destructureMatch) {
      return destructureMatch[2].trim();
    }
    
    return 'index';
  }

  private applyDiffs(diffs: any[]): void {
    if (!this.container || !this.placeholder) return;

    diffs.forEach(diff => {
      switch (diff.type) {
        case 'create':
          this.createElement(diff.node, diff.index);
          break;
        case 'update':
          this.updateElement(diff.node, diff.oldNode, diff.index);
          break;
        case 'move':
          this.moveElement(diff.node, diff.index, diff.newIndex);
          break;
        case 'remove':
          this.removeElement(diff.index);
          break;
      }
    });
  }

  private createElement(vnode: VirtualNode, index: number): void {
    if (!this.container || !this.placeholder) return;

    const element = vnode.element || VirtualDOM.createElement(vnode);
    const nextSibling = this.renderedElements[index] || this.placeholder.nextSibling;
    
    this.container.insertBefore(element, nextSibling);
    this.renderedElements.splice(index, 0, element);
  }

  private updateElement(vnode: VirtualNode, oldVNode: VirtualNode, index: number): void {
    const element = this.renderedElements[index];
    if (element && oldVNode) {
      VirtualDOM.updateElement(element, oldVNode, vnode);
    }
  }

  private moveElement(vnode: VirtualNode, oldIndex: number, newIndex: number): void {
    if (!this.container) return;

    const element = this.renderedElements[oldIndex];
    if (element) {
      this.renderedElements.splice(oldIndex, 1);
      this.renderedElements.splice(newIndex, 0, element);
      
      const nextSibling = this.renderedElements[newIndex + 1] || this.placeholder?.nextSibling;
      this.container.insertBefore(element, nextSibling);
    }
  }

  private removeElement(index: number): void {
    const element = this.renderedElements[index];
    if (element) {
      element.remove();
      this.renderedElements.splice(index, 1);
    }
  }

  dispose(): void {
    this.renderedElements.forEach(el => el.remove());
    this.renderedElements = [];
    this.virtualNodes = [];
    
    if (this.placeholder) {
      this.placeholder.remove();
    }
    
    super.dispose();
  }
}

registerDirective('for', ForDirective);