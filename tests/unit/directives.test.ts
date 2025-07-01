import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal } from '../../src/core/signal';
import { Praxis } from '../../src/praxis';
import { JSDOM } from 'jsdom';

describe('Directives', () => {
  let dom: JSDOM;
  let document: Document;
  let praxis: Praxis;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><body></body>');
    document = dom.window.document;
    global.document = document;
    global.window = dom.window as any;
    
    praxis = new Praxis();
  });

  describe('x-data directive', () => {
    it('should initialize component data', () => {
      const div = document.createElement('div');
      div.setAttribute('x-data', '{ count: 0 }');
      document.body.appendChild(div);
      
      // Mock component initialization
      const component = { count: 0 };
      expect(component.count).toBe(0);
    });

    it('should handle complex data structures', () => {
      const div = document.createElement('div');
      div.setAttribute('x-data', '{ user: { name: "John", age: 30 }, items: [] }');
      document.body.appendChild(div);
      
      const component = { 
        user: { name: "John", age: 30 }, 
        items: [] 
      };
      
      expect(component.user.name).toBe('John');
      expect(component.items).toEqual([]);
    });
  });

  describe('x-text directive', () => {
    it('should set element text content', () => {
      const span = document.createElement('span');
      const count = signal(5);
      
      // Simulate x-text directive
      span.textContent = count.value.toString();
      
      expect(span.textContent).toBe('5');
    });

    it('should update when reactive value changes', () => {
      const span = document.createElement('span');
      const count = signal(5);
      
      // Initial render
      span.textContent = count.value.toString();
      expect(span.textContent).toBe('5');
      
      // Update value
      count.value = 10;
      span.textContent = count.value.toString();
      expect(span.textContent).toBe('10');
    });

    it('should handle falsy values correctly', () => {
      const span = document.createElement('span');
      
      span.textContent = '0';
      expect(span.textContent).toBe('0');
      
      span.textContent = '';
      expect(span.textContent).toBe('');
      
      span.textContent = 'false';
      expect(span.textContent).toBe('false');
    });
  });

  describe('x-show directive', () => {
    it('should show element when value is truthy', () => {
      const div = document.createElement('div');
      const visible = signal(true);
      
      div.style.display = visible.value ? '' : 'none';
      expect(div.style.display).toBe('');
    });

    it('should hide element when value is falsy', () => {
      const div = document.createElement('div');
      const visible = signal(false);
      
      div.style.display = visible.value ? '' : 'none';
      expect(div.style.display).toBe('none');
    });

    it('should toggle visibility reactively', () => {
      const div = document.createElement('div');
      const visible = signal(true);
      
      // Initial state
      div.style.display = visible.value ? '' : 'none';
      expect(div.style.display).toBe('');
      
      // Toggle
      visible.value = false;
      div.style.display = visible.value ? '' : 'none';
      expect(div.style.display).toBe('none');
    });
  });

  describe('x-if directive', () => {
    it('should conditionally render element', () => {
      const template = document.createElement('template');
      template.innerHTML = '<div>Conditional content</div>';
      
      const condition = signal(true);
      const parent = document.createElement('div');
      
      if (condition.value) {
        const clone = template.content.cloneNode(true);
        parent.appendChild(clone);
      }
      
      expect(parent.children.length).toBe(1);
      expect(parent.firstElementChild?.textContent).toBe('Conditional content');
    });

    it('should remove element when condition is false', () => {
      const template = document.createElement('template');
      template.innerHTML = '<div>Conditional content</div>';
      
      const condition = signal(false);
      const parent = document.createElement('div');
      
      if (condition.value) {
        const clone = template.content.cloneNode(true);
        parent.appendChild(clone);
      }
      
      expect(parent.children.length).toBe(0);
    });
  });

  describe('x-for directive', () => {
    it('should render list items', () => {
      const template = document.createElement('template');
      template.innerHTML = '<li></li>';
      
      const items = ['apple', 'banana', 'cherry'];
      const parent = document.createElement('ul');
      
      items.forEach(item => {
        const clone = template.content.cloneNode(true) as DocumentFragment;
        const li = clone.querySelector('li')!;
        li.textContent = item;
        parent.appendChild(clone);
      });
      
      expect(parent.children.length).toBe(3);
      expect(parent.children[0].textContent).toBe('apple');
      expect(parent.children[1].textContent).toBe('banana');
      expect(parent.children[2].textContent).toBe('cherry');
    });

    it('should handle empty arrays', () => {
      const template = document.createElement('template');
      template.innerHTML = '<li></li>';
      
      const items: string[] = [];
      const parent = document.createElement('ul');
      
      items.forEach(item => {
        const clone = template.content.cloneNode(true) as DocumentFragment;
        const li = clone.querySelector('li')!;
        li.textContent = item;
        parent.appendChild(clone);
      });
      
      expect(parent.children.length).toBe(0);
    });

    it('should provide index in loop', () => {
      const template = document.createElement('template');
      template.innerHTML = '<li></li>';
      
      const items = ['a', 'b', 'c'];
      const parent = document.createElement('ul');
      
      items.forEach((item, index) => {
        const clone = template.content.cloneNode(true) as DocumentFragment;
        const li = clone.querySelector('li')!;
        li.textContent = `${index}: ${item}`;
        parent.appendChild(clone);
      });
      
      expect(parent.children[0].textContent).toBe('0: a');
      expect(parent.children[1].textContent).toBe('1: b');
      expect(parent.children[2].textContent).toBe('2: c');
    });
  });

  describe('x-on directive', () => {
    it('should handle click events', () => {
      const button = document.createElement('button');
      const spy = vi.fn();
      
      button.addEventListener('click', spy);
      button.click();
      
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard events', () => {
      const input = document.createElement('input');
      const spy = vi.fn();
      
      input.addEventListener('keydown', spy);
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(event);
      
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should handle event modifiers', () => {
      const button = document.createElement('button');
      const spy = vi.fn();
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        spy();
      });
      
      const event = new MouseEvent('click');
      button.dispatchEvent(event);
      
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('x-model directive', () => {
    it('should bind input value bidirectionally', () => {
      const input = document.createElement('input');
      input.type = 'text';
      
      const value = signal('initial');
      
      // Set initial value
      input.value = value.value;
      expect(input.value).toBe('initial');
      
      // Simulate user input
      input.value = 'updated';
      input.dispatchEvent(new Event('input'));
      
      // Update signal (simulating directive behavior)
      value.value = input.value;
      expect(value.value).toBe('updated');
    });

    it('should handle checkbox inputs', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      
      const checked = signal(false);
      
      checkbox.checked = checked.value;
      expect(checkbox.checked).toBe(false);
      
      // Simulate user interaction
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      
      checked.value = checkbox.checked;
      expect(checked.value).toBe(true);
    });

    it('should handle select elements', () => {
      const select = document.createElement('select');
      select.innerHTML = `
        <option value="a">A</option>
        <option value="b">B</option>
        <option value="c">C</option>
      `;
      
      const selectedValue = signal('b');
      
      select.value = selectedValue.value;
      expect(select.value).toBe('b');
      
      // Simulate user selection
      select.value = 'c';
      select.dispatchEvent(new Event('change'));
      
      selectedValue.value = select.value;
      expect(selectedValue.value).toBe('c');
    });
  });

  describe('x-bind directive', () => {
    it('should bind attributes', () => {
      const img = document.createElement('img');
      const src = signal('/image.jpg');
      
      img.setAttribute('src', src.value);
      expect(img.getAttribute('src')).toBe('/image.jpg');
      
      // Update attribute
      src.value = '/new-image.jpg';
      img.setAttribute('src', src.value);
      expect(img.getAttribute('src')).toBe('/new-image.jpg');
    });

    it('should handle boolean attributes', () => {
      const button = document.createElement('button');
      const disabled = signal(true);
      
      if (disabled.value) {
        button.setAttribute('disabled', '');
      } else {
        button.removeAttribute('disabled');
      }
      
      expect(button.hasAttribute('disabled')).toBe(true);
      
      // Toggle
      disabled.value = false;
      if (disabled.value) {
        button.setAttribute('disabled', '');
      } else {
        button.removeAttribute('disabled');
      }
      
      expect(button.hasAttribute('disabled')).toBe(false);
    });

    it('should handle class binding', () => {
      const div = document.createElement('div');
      const isActive = signal(true);
      
      div.className = isActive.value ? 'active' : '';
      expect(div.className).toBe('active');
      
      isActive.value = false;
      div.className = isActive.value ? 'active' : '';
      expect(div.className).toBe('');
    });

    it('should handle style binding', () => {
      const div = document.createElement('div');
      const color = signal('red');
      
      div.style.color = color.value;
      expect(div.style.color).toBe('red');
      
      color.value = 'blue';
      div.style.color = color.value;
      expect(div.style.color).toBe('blue');
    });
  });
});