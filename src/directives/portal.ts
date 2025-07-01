import { BaseDirective, registerDirective, DIRECTIVE_PRIORITIES } from './base.js';

export class PortalDirective extends BaseDirective {
  public name = 'portal';
  public priority = DIRECTIVE_PRIORITIES.DEFAULT;
  
  private targetContainer: Element | null = null;
  private placeholder: Comment | null = null;
  private originalParent: Element | null = null;
  private originalNextSibling: Node | null = null;

  init(): void {
    this.originalParent = this.context.element.parentElement;
    this.originalNextSibling = this.context.element.nextSibling;
    this.placeholder = document.createComment('x-portal');
    
    if (this.originalParent) {
      this.originalParent.insertBefore(this.placeholder, this.context.element);
    }

    this.createEffect(() => {
      const target = this.evaluateExpression();
      this.moveToTarget(target);
    });
  }

  private moveToTarget(target: string | Element | null): void {
    let targetElement: Element | null = null;

    if (typeof target === 'string') {
      if (target === 'body') {
        targetElement = document.body;
      } else if (target === 'head') {
        targetElement = document.head;
      } else {
        targetElement = document.querySelector(target);
      }
    } else if (target instanceof Element) {
      targetElement = target;
    }

    if (!targetElement) {
      console.warn('Portal target not found:', target);
      this.moveToOriginalPosition();
      return;
    }

    if (this.targetContainer === targetElement) {
      return; // Already in the correct container
    }

    this.targetContainer = targetElement;
    targetElement.appendChild(this.context.element);

    // Dispatch portal events
    this.context.element.dispatchEvent(new CustomEvent('portal:moved', {
      bubbles: true,
      detail: { 
        element: this.context.element,
        target: targetElement,
        from: this.originalParent
      }
    }));
  }

  private moveToOriginalPosition(): void {
    if (this.originalParent && this.placeholder) {
      this.originalParent.insertBefore(this.context.element, this.placeholder.nextSibling);
      this.targetContainer = null;
    }
  }

  dispose(): void {
    // Move element back to original position
    this.moveToOriginalPosition();
    
    if (this.placeholder) {
      this.placeholder.remove();
    }
    
    super.dispose();
  }
}

registerDirective('portal', PortalDirective);