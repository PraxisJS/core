import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal } from '../src/core/signal.js';
import { ComponentImpl } from '../src/core/component.js';
import { TextDirective, HtmlDirective, BindDirective, RefDirective } from '../src/directives/index.js';

describe('Phase 2 Directives', () => {
  let element: HTMLElement;
  let component: ComponentImpl;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    component = new ComponentImpl(element);
  });

  afterEach(() => {
    element.remove();
  });

  describe('TextDirective', () => {
    it('should update text content', () => {
      const text = signal('Hello World');
      component.scope.text = text;

      const context = {
        element,
        expression: 'text',
        value: '',
        modifiers: [],
        scope: component.scope,
        component
      };

      const directive = new TextDirective(context);
      directive.init();

      expect(element.textContent).toBe('Hello World');

      text.value = 'Updated Text';
      expect(element.textContent).toBe('Updated Text');
    });

    it('should handle null/undefined values', () => {
      const text = signal(null);
      component.scope.text = text;

      const context = {
        element,
        expression: 'text',
        value: '',
        modifiers: [],
        scope: component.scope,
        component
      };

      const directive = new TextDirective(context);
      directive.init();

      expect(element.textContent).toBe('');

      text.value = undefined;
      expect(element.textContent).toBe('');
    });
  });

  describe('HtmlDirective', () => {
    it('should update innerHTML with sanitization', () => {
      const html = signal('<p>Safe content</p>');
      component.scope.html = html;

      const context = {
        element,
        expression: 'html',
        value: '',
        modifiers: [],
        scope: component.scope,
        component
      };

      const directive = new HtmlDirective(context);
      directive.init();

      expect(element.innerHTML).toBe('<p>Safe content</p>');
    });

    it('should sanitize dangerous HTML', () => {
      const html = signal('<script>alert("xss")</script><p>Safe</p>');
      component.scope.html = html;

      const context = {
        element,
        expression: 'html',
        value: '',
        modifiers: [],
        scope: component.scope,
        component
      };

      const directive = new HtmlDirective(context);
      directive.init();

      expect(element.innerHTML).toBe('<p>Safe</p>');
      expect(element.innerHTML).not.toContain('<script>');
    });

    it('should allow unsafe HTML with unsafe modifier', () => {
      const html = signal('<span onclick="alert()">Click me</span>');
      component.scope.html = html;

      const context = {
        element,
        expression: 'html',
        value: '',
        modifiers: ['unsafe'],
        scope: component.scope,
        component
      };

      const directive = new HtmlDirective(context);
      directive.init();

      expect(element.innerHTML).toBe('<span onclick="alert()">Click me</span>');
    });
  });

  describe('BindDirective', () => {
    it('should bind class attribute from string', () => {
      const className = signal('active highlight');
      component.scope.className = className;

      const context = {
        element,
        expression: 'className',
        value: 'class',
        modifiers: [],
        scope: component.scope,
        component
      };

      const directive = new BindDirective(context);
      directive.init();

      expect(element.className).toBe('active highlight');

      className.value = 'inactive';
      expect(element.className).toBe('inactive');
    });

    it('should bind class attribute from object', () => {
      const classObj = signal({ active: true, highlight: false, disabled: true });
      component.scope.classObj = classObj;

      const context = {
        element,
        expression: 'classObj',
        value: 'class',
        modifiers: [],
        scope: component.scope,
        component
      };

      const directive = new BindDirective(context);
      directive.init();

      expect(element.className).toBe('active disabled');

      classObj.value = { active: false, highlight: true };
      expect(element.className).toBe('highlight');
    });

    it('should bind style attribute from object', () => {
      const style = signal({ color: 'red', fontSize: '16px', backgroundColor: 'blue' });
      component.scope.style = style;

      const context = {
        element: element as HTMLElement,
        expression: 'style',
        value: 'style',
        modifiers: [],
        scope: component.scope,
        component
      };

      const directive = new BindDirective(context);
      directive.init();

      expect((element as HTMLElement).style.color).toBe('red');
      expect((element as HTMLElement).style.fontSize).toBe('16px');
      expect((element as HTMLElement).style.backgroundColor).toBe('blue');
    });

    it('should bind boolean attributes', () => {
      const disabled = signal(true);
      component.scope.disabled = disabled;

      const context = {
        element,
        expression: 'disabled',
        value: 'disabled',
        modifiers: [],
        scope: component.scope,
        component
      };

      const directive = new BindDirective(context);
      directive.init();

      expect(element.hasAttribute('disabled')).toBe(true);

      disabled.value = false;
      expect(element.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('RefDirective', () => {
    it('should register element reference', () => {
      const context = {
        element,
        expression: 'myRef',
        value: '',
        modifiers: [],
        scope: component.scope,
        component
      };

      const directive = new RefDirective(context);
      directive.init();

      expect(component.refs.myRef).toBe(element);
    });

    it('should clean up reference on dispose', () => {
      const context = {
        element,
        expression: 'myRef',
        value: '',
        modifiers: [],
        scope: component.scope,
        component
      };

      const directive = new RefDirective(context);
      directive.init();

      expect(component.refs.myRef).toBe(element);

      directive.dispose();
      expect(component.refs.myRef).toBeUndefined();
    });
  });
});