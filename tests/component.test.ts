import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentImpl } from '../src/core/component.js';
import { signal } from '../src/core/signal.js';

describe('Component Lifecycle', () => {
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

  it('should initialize component', () => {
    expect(component.element).toBe(element);
    expect(component.scope).toEqual({});
    expect(component.refs).toEqual({});
    expect(component.children.size).toBe(0);
  });

  it('should manage parent-child relationships', () => {
    const childElement = document.createElement('span');
    const childComponent = new ComponentImpl(childElement);

    component.addChild(childComponent);

    expect(component.children.has(childComponent)).toBe(true);
    expect(childComponent.parent).toBe(component);

    component.removeChild(childComponent);

    expect(component.children.has(childComponent)).toBe(false);
    expect(childComponent.parent).toBeUndefined();
  });

  it('should handle watch functionality', () => {
    const callback = vi.fn();
    const unwatch = component.watch('test', callback);

    expect(typeof unwatch).toBe('function');
    
    // Clean up
    unwatch();
  });

  it('should dispatch custom events', () => {
    const eventListener = vi.fn();
    element.addEventListener('test-event', eventListener);

    component.dispatch('test-event', { message: 'hello' });

    expect(eventListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test-event',
        detail: { message: 'hello' }
      })
    );
  });

  it('should handle nextTick scheduling', () => {
    const callback = vi.fn();
    component.nextTick(callback);

    // nextTick should be async, so callback shouldn't be called immediately
    expect(callback).not.toHaveBeenCalled();
  });

  it('should find parent with scope', () => {
    const parentElement = document.createElement('div');
    const parentComponent = new ComponentImpl(parentElement);
    parentComponent.scope.test = signal('value');

    const childElement = document.createElement('span');
    const childComponent = new ComponentImpl(childElement);

    parentComponent.addChild(childComponent);

    const foundParent = childComponent.findParentWithScope();
    expect(foundParent).toBe(parentComponent);
  });

  it('should handle destruction properly', () => {
    const childElement = document.createElement('span');
    const childComponent = new ComponentImpl(childElement);
    component.addChild(childComponent);

    const mockDirective = {
      dispose: vi.fn()
    };
    component.directives.set('test', mockDirective);

    component.destroyed();

    expect(component.isDestroyed()).toBe(true);
    expect(component.children.size).toBe(0);
    expect(mockDirective.dispose).toHaveBeenCalled();
  });
});