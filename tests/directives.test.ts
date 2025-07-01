import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal } from '../src/core/signal.js';
import { DataDirective, ShowDirective, IfDirective } from '../src/directives/index.js';

describe('DataDirective', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  it('should create data scope', () => {
    element.setAttribute('x-data', '{ count: 0, name: "test" }');
    
    const context = {
      element,
      expression: '{ count: 0, name: "test" }',
      value: '',
      modifiers: [],
      scope: {}
    };

    const directive = new DataDirective(context);
    directive.init();

    expect(context.scope.count).toBeDefined();
    expect(context.scope.name).toBeDefined();
    expect(context.scope.count.value).toBe(0);
    expect(context.scope.name.value).toBe('test');
  });

  it('should attach scope to element', () => {
    element.setAttribute('x-data', '{ count: 5 }');
    
    const context = {
      element,
      expression: '{ count: 5 }',
      value: '',
      modifiers: [],
      scope: {}
    };

    const directive = new DataDirective(context);
    directive.init();

    expect((element as any)._praxisScope).toBeDefined();
    expect((element as any)._praxisScope.count.value).toBe(5);
  });
});

describe('ShowDirective', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.style.display = 'block';
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  it('should hide element when condition is false', () => {
    const show = signal(false);
    
    const context = {
      element,
      expression: 'show',
      value: '',
      modifiers: [],
      scope: { show }
    };

    const directive = new ShowDirective(context);
    directive.init();

    expect(element.style.display).toBe('none');
  });

  it('should show element when condition is true', () => {
    const show = signal(true);
    
    const context = {
      element,
      expression: 'show',
      value: '',
      modifiers: [],
      scope: { show }
    };

    const directive = new ShowDirective(context);
    directive.init();

    expect(element.style.display).toBe('block');
  });

  it('should toggle visibility when signal changes', () => {
    const show = signal(true);
    
    const context = {
      element,
      expression: 'show',
      value: '',
      modifiers: [],
      scope: { show }
    };

    const directive = new ShowDirective(context);
    directive.init();

    expect(element.style.display).toBe('block');

    show.value = false;
    expect(element.style.display).toBe('none');

    show.value = true;
    expect(element.style.display).toBe('block');
  });
});

describe('IfDirective', () => {
  let element: HTMLElement;
  let parent: HTMLElement;

  beforeEach(() => {
    parent = document.createElement('div');
    element = document.createElement('div');
    parent.appendChild(element);
    document.body.appendChild(parent);
  });

  afterEach(() => {
    parent.remove();
  });

  it('should remove element from DOM when condition is false', () => {
    const condition = signal(false);
    
    const context = {
      element,
      expression: 'condition',
      value: '',
      modifiers: [],
      scope: { condition }
    };

    const directive = new IfDirective(context);
    directive.init();

    expect(parent.contains(element)).toBe(false);
    expect(parent.childNodes.length).toBe(1);
    expect(parent.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
  });

  it('should keep element in DOM when condition is true', () => {
    const condition = signal(true);
    
    const context = {
      element,
      expression: 'condition',
      value: '',
      modifiers: [],
      scope: { condition }
    };

    const directive = new IfDirective(context);
    directive.init();

    expect(parent.contains(element)).toBe(true);
  });

  it('should toggle element presence when signal changes', () => {
    const condition = signal(true);
    
    const context = {
      element,
      expression: 'condition',
      value: '',
      modifiers: [],
      scope: { condition }
    };

    const directive = new IfDirective(context);
    directive.init();

    expect(parent.contains(element)).toBe(true);

    condition.value = false;
    expect(parent.contains(element)).toBe(false);

    condition.value = true;
    expect(parent.contains(element)).toBe(true);
  });
});