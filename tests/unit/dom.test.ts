import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('DOM Utilities', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><body></body>');
    document = dom.window.document;
    global.document = document;
    global.window = dom.window as any;
  });

  describe('DOM Queries', () => {
    it('should find elements by selector', () => {
      const div = document.createElement('div');
      div.className = 'test-class';
      div.id = 'test-id';
      document.body.appendChild(div);

      expect(document.querySelector('.test-class')).toBe(div);
      expect(document.querySelector('#test-id')).toBe(div);
      expect(document.getElementById('test-id')).toBe(div);
    });

    it('should find multiple elements', () => {
      for (let i = 0; i < 3; i++) {
        const div = document.createElement('div');
        div.className = 'item';
        document.body.appendChild(div);
      }

      const items = document.querySelectorAll('.item');
      expect(items.length).toBe(3);
    });

    it('should find nested elements', () => {
      const parent = document.createElement('div');
      parent.className = 'parent';
      
      const child = document.createElement('span');
      child.className = 'child';
      parent.appendChild(child);
      
      document.body.appendChild(parent);

      expect(parent.querySelector('.child')).toBe(child);
      expect(document.querySelector('.parent .child')).toBe(child);
    });
  });

  describe('DOM Manipulation', () => {
    it('should create and append elements', () => {
      const container = document.createElement('div');
      const child = document.createElement('span');
      child.textContent = 'Hello';
      
      container.appendChild(child);
      document.body.appendChild(container);

      expect(container.children.length).toBe(1);
      expect(container.firstElementChild).toBe(child);
      expect(child.textContent).toBe('Hello');
    });

    it('should insert elements before others', () => {
      const container = document.createElement('div');
      const first = document.createElement('span');
      const second = document.createElement('span');
      
      first.textContent = '1';
      second.textContent = '2';
      
      container.appendChild(second);
      container.insertBefore(first, second);

      expect(container.children[0]).toBe(first);
      expect(container.children[1]).toBe(second);
    });

    it('should remove elements', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      
      parent.appendChild(child);
      expect(parent.children.length).toBe(1);
      
      parent.removeChild(child);
      expect(parent.children.length).toBe(0);
    });

    it('should replace elements', () => {
      const parent = document.createElement('div');
      const oldChild = document.createElement('span');
      const newChild = document.createElement('div');
      
      parent.appendChild(oldChild);
      parent.replaceChild(newChild, oldChild);

      expect(parent.children.length).toBe(1);
      expect(parent.firstElementChild).toBe(newChild);
    });
  });

  describe('Element Properties', () => {
    it('should handle element attributes', () => {
      const element = document.createElement('div');
      
      element.setAttribute('data-id', '123');
      element.setAttribute('role', 'button');
      
      expect(element.getAttribute('data-id')).toBe('123');
      expect(element.getAttribute('role')).toBe('button');
      expect(element.hasAttribute('data-id')).toBe(true);
      
      element.removeAttribute('data-id');
      expect(element.hasAttribute('data-id')).toBe(false);
    });

    it('should handle element classes', () => {
      const element = document.createElement('div');
      
      element.classList.add('active');
      element.classList.add('primary');
      
      expect(element.classList.contains('active')).toBe(true);
      expect(element.classList.contains('primary')).toBe(true);
      expect(element.className).toBe('active primary');
      
      element.classList.remove('active');
      expect(element.classList.contains('active')).toBe(false);
      
      element.classList.toggle('hidden');
      expect(element.classList.contains('hidden')).toBe(true);
      
      element.classList.toggle('hidden');
      expect(element.classList.contains('hidden')).toBe(false);
    });

    it('should handle element styles', () => {
      const element = document.createElement('div');
      
      element.style.display = 'none';
      element.style.color = 'red';
      element.style.backgroundColor = 'blue';
      
      expect(element.style.display).toBe('none');
      expect(element.style.color).toBe('red');
      expect(element.style.backgroundColor).toBe('blue');
    });

    it('should handle data attributes', () => {
      const element = document.createElement('div');
      
      element.dataset.userId = '123';
      element.dataset.userName = 'John';
      
      expect(element.dataset.userId).toBe('123');
      expect(element.dataset.userName).toBe('John');
      expect(element.getAttribute('data-user-id')).toBe('123');
      expect(element.getAttribute('data-user-name')).toBe('John');
    });
  });

  describe('Events', () => {
    it('should add and remove event listeners', () => {
      const button = document.createElement('button');
      const clicks: Event[] = [];
      
      const handler = (e: Event) => {
        clicks.push(e);
      };
      
      button.addEventListener('click', handler);
      
      button.click();
      expect(clicks.length).toBe(1);
      
      button.click();
      expect(clicks.length).toBe(2);
      
      button.removeEventListener('click', handler);
      button.click();
      expect(clicks.length).toBe(2); // No new click
    });

    it('should handle event bubbling', () => {
      const parent = document.createElement('div');
      const child = document.createElement('button');
      parent.appendChild(child);
      
      const events: string[] = [];
      
      parent.addEventListener('click', () => {
        events.push('parent');
      });
      
      child.addEventListener('click', () => {
        events.push('child');
      });
      
      child.click();
      
      expect(events).toEqual(['child', 'parent']);
    });

    it('should stop propagation', () => {
      const parent = document.createElement('div');
      const child = document.createElement('button');
      parent.appendChild(child);
      
      const events: string[] = [];
      
      parent.addEventListener('click', () => {
        events.push('parent');
      });
      
      child.addEventListener('click', (e) => {
        e.stopPropagation();
        events.push('child');
      });
      
      child.click();
      
      expect(events).toEqual(['child']);
    });

    it('should prevent default', () => {
      const form = document.createElement('form');
      const submitButton = document.createElement('button');
      submitButton.type = 'submit';
      form.appendChild(submitButton);
      
      let submitted = false;
      
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitted = true;
      });
      
      submitButton.click();
      
      expect(submitted).toBe(true);
    });
  });

  describe('DOM Traversal', () => {
    it('should traverse parent elements', () => {
      const grandparent = document.createElement('div');
      grandparent.className = 'grandparent';
      
      const parent = document.createElement('div');
      parent.className = 'parent';
      
      const child = document.createElement('span');
      child.className = 'child';
      
      parent.appendChild(child);
      grandparent.appendChild(parent);
      document.body.appendChild(grandparent);
      
      expect(child.parentElement).toBe(parent);
      expect(parent.parentElement).toBe(grandparent);
      expect(grandparent.parentElement).toBe(document.body);
      
      // Find closest
      expect(child.closest('.parent')).toBe(parent);
      expect(child.closest('.grandparent')).toBe(grandparent);
    });

    it('should traverse sibling elements', () => {
      const container = document.createElement('div');
      const first = document.createElement('div');
      const second = document.createElement('div');
      const third = document.createElement('div');
      
      first.className = 'first';
      second.className = 'second';
      third.className = 'third';
      
      container.appendChild(first);
      container.appendChild(second);
      container.appendChild(third);
      
      expect(first.nextElementSibling).toBe(second);
      expect(second.nextElementSibling).toBe(third);
      expect(third.nextElementSibling).toBe(null);
      
      expect(third.previousElementSibling).toBe(second);
      expect(second.previousElementSibling).toBe(first);
      expect(first.previousElementSibling).toBe(null);
    });

    it('should traverse child elements', () => {
      const parent = document.createElement('div');
      const children = [];
      
      for (let i = 0; i < 3; i++) {
        const child = document.createElement('span');
        child.textContent = String(i);
        parent.appendChild(child);
        children.push(child);
      }
      
      expect(parent.children.length).toBe(3);
      expect(parent.firstElementChild).toBe(children[0]);
      expect(parent.lastElementChild).toBe(children[2]);
      
      expect(Array.from(parent.children)).toEqual(children);
    });
  });
});