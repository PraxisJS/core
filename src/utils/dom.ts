import { BaseDirective, DirectiveContext, getDirective, getDirectivesByPriority } from '../directives/base.js';
import { signal, Signal } from '../core/signal.js';
import { Component, ComponentImpl } from '../core/component.js';

export class DOMBinder {
  private components = new WeakMap<Element, Component>();
  private mutationObserver: MutationObserver | null = null;
  private isInitialized = false;

  init(): void {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    this.scanAndInitialize(document.body);
    this.setupMutationObserver();
  }

  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scanAndInitialize(node as Element);
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.cleanupElement(node as Element);
            }
          });
        } else if (mutation.type === 'attributes') {
          const element = mutation.target as Element;
          if (this.hasCoralDirectives(element)) {
            this.reinitializeElement(element);
          }
        }
      }
      
      // Notify components of updates
      const affectedComponents = new Set<Component>();
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const component = this.findComponentForElement(node as Element);
              if (component) affectedComponents.add(component);
            }
          });
        }
      });
      
      affectedComponents.forEach(component => {
        component.updated(mutations);
      });
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: this.getDirectiveAttributes()
    });
  }

  private getDirectiveAttributes(): string[] {
    return [
      'x-data', 'x-show', 'x-if', 'x-for', 'x-on', 'x-model',
      'x-text', 'x-html', 'x-bind', 'x-ref', 'x-cloak'
    ];
  }

  private scanAndInitialize(root: Element): void {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: Element) => {
          return this.hasCoralDirectives(node) 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_SKIP;
        }
      }
    );

    const elements: Element[] = [];
    let currentNode: Element | null = walker.currentNode as Element;

    if (this.hasCoralDirectives(root)) {
      elements.push(root);
    }

    while (currentNode = walker.nextNode() as Element) {
      elements.push(currentNode);
    }

    elements.forEach(element => {
      if (!this.components.has(element)) {
        this.initializeElement(element);
      }
    });
  }

  private hasCoralDirectives(element: Element): boolean {
    return Array.from(element.attributes).some(attr => 
      attr.name.startsWith('x-')
    );
  }

  private initializeElement(element: Element): void {
    const parentComponent = this.findParentComponent(element);
    const component = new ComponentImpl(element);
    
    // Set up parent-child relationship
    if (parentComponent) {
      parentComponent.addChild(component);
      // Inherit parent scope
      Object.assign(component.scope, parentComponent.scope);
    }

    this.components.set(element, component);
    component.init();

    // Initialize directives in priority order
    const prioritizedDirectives = getDirectivesByPriority();
    
    for (const [directiveName, DirectiveClass] of prioritizedDirectives) {
      const attributes = this.getDirectiveAttributes(element, directiveName);
      
      for (const attr of attributes) {
        this.initializeDirective(element, attr, component);
      }
    }
    
    component.mounted();
  }

  private findParentComponent(element: Element): Component | null {
    let current = element.parentElement;
    
    while (current) {
      const component = this.components.get(current);
      if (component) {
        return component;
      }
      current = current.parentElement;
    }
    
    return null;
  }

  private findComponentForElement(element: Element): Component | null {
    let current: Element | null = element;
    
    while (current) {
      const component = this.components.get(current);
      if (component) {
        return component;
      }
      current = current.parentElement;
    }
    
    return null;
  }

  private getDirectiveAttributes(element: Element, directiveName: string): Attr[] {
    const attributes: Attr[] = [];
    
    for (const attr of Array.from(element.attributes)) {
      if (attr.name === `x-${directiveName}` || 
          attr.name.startsWith(`x-${directiveName}:`)) {
        attributes.push(attr);
      }
    }
    
    return attributes;
  }

  private initializeDirective(element: Element, attr: Attr, component: Component): void {
    const [directiveName, ...modifierParts] = attr.name.substring(2).split(':');
    const modifiers = modifierParts.join(':').split('.');
    
    const DirectiveClass = getDirective(directiveName);
    if (!DirectiveClass) {
      console.warn(`Unknown directive: x-${directiveName}`);
      return;
    }

    const context: DirectiveContext = {
      element,
      expression: attr.value,
      value: modifiers[0] || '',
      modifiers: modifiers.slice(1),
      scope: component.scope,
      component
    };

    try {
      const directive = new DirectiveClass(context);
      directive.bind(element, attr.value, component);
      component.directives.set(attr.name, directive);
    } catch (error) {
      console.error(`Error initializing directive x-${directiveName}:`, error);
    }
  }

  private reinitializeElement(element: Element): void {
    this.cleanupElement(element);
    this.initializeElement(element);
  }

  private cleanupElement(element: Element): void {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: () => NodeFilter.FILTER_ACCEPT
      }
    );

    const elements: Element[] = [element];
    let currentNode: Element | null;

    while (currentNode = walker.nextNode() as Element) {
      elements.push(currentNode);
    }

    elements.forEach(el => {
      const component = this.components.get(el);
      if (component) {
        component.destroyed();
        this.components.delete(el);
      }
    });
  }

  getComponent(element: Element): Component | undefined {
    return this.components.get(element);
  }

  dispose(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    this.components = new WeakMap();
    this.isInitialized = false;
  }
}

export const globalBinder = new DOMBinder();