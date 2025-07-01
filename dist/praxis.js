// Praxis - High-performance reactive JavaScript framework
// Version 1.0.0

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.praxis = {}));
}(this, (function (exports) { 'use strict';

  // Signal implementation
  function signal(value) {
    const s = {
      value: value,
      subscribers: new Set()
    };
    
    return new Proxy(s, {
      get(target, prop) {
        if (prop === 'value') {
          return target.value;
        }
        return target[prop];
      },
      set(target, prop, newValue) {
        if (prop === 'value') {
          target.value = newValue;
          target.subscribers.forEach(fn => fn());
          return true;
        }
        target[prop] = newValue;
        return true;
      }
    });
  }

  // Computed implementation
  function computed(fn) {
    return signal(fn());
  }

  // Effect implementation
  function effect(fn) {
    fn();
    return () => {}; // dispose function
  }

  // Main Praxis class
  class Praxis {
    constructor(config = {}) {
      this.config = config;
      this.started = false;
    }

    start() {
      if (this.started) return;
      this.started = true;
      
      // Initialize praxis
      document.addEventListener('DOMContentLoaded', () => {
        this.scanAndInit(document.body);
      });
    }

    scanAndInit(root) {
      const elements = root.querySelectorAll('[x-data]');
      elements.forEach(el => {
        // Basic x-data initialization
        const dataAttr = el.getAttribute('x-data');
        if (dataAttr) {
          try {
            const data = new Function('return ' + dataAttr)();
            // Create reactive data
            const reactiveData = this.makeReactive(data);
            el._praxisData = reactiveData;
            // Process directives
            this.processDirectives(el);
          } catch (e) {
            console.warn('Invalid x-data:', dataAttr);
          }
        }
      });
    }

    makeReactive(data) {
      const reactive = {};
      const watchers = new Map();
      
      Object.keys(data).forEach(key => {
        let value = data[key];
        
        Object.defineProperty(reactive, key, {
          get() {
            return value;
          },
          set(newValue) {
            value = newValue;
            // Trigger updates
            if (watchers.has(key)) {
              watchers.get(key).forEach(fn => fn());
            }
          }
        });
      });
      
      reactive._watch = (key, fn) => {
        if (!watchers.has(key)) {
          watchers.set(key, new Set());
        }
        watchers.get(key).add(fn);
      };
      
      return reactive;
    }

    processDirectives(root) {
      // Process x-text
      root.querySelectorAll('[x-text]').forEach(el => {
        const expr = el.getAttribute('x-text');
        const update = () => {
          const data = el.closest('[x-data]')._praxisData;
          if (data && data[expr] !== undefined) {
            el.textContent = data[expr];
          }
        };
        update();
        const data = el.closest('[x-data]')._praxisData;
        if (data && data._watch) {
          data._watch(expr, update);
        }
      });

      // Process x-show
      root.querySelectorAll('[x-show]').forEach(el => {
        const expr = el.getAttribute('x-show');
        const update = () => {
          const data = el.closest('[x-data]')._praxisData;
          if (data && data[expr] !== undefined) {
            el.style.display = data[expr] ? '' : 'none';
          }
        };
        update();
        const data = el.closest('[x-data]')._praxisData;
        if (data && data._watch) {
          data._watch(expr, update);
        }
      });

      // Process x-model
      root.querySelectorAll('[x-model]').forEach(el => {
        const expr = el.getAttribute('x-model');
        const data = el.closest('[x-data]')._praxisData;
        
        // Set initial value
        if (data && data[expr] !== undefined) {
          el.value = data[expr];
        }
        
        // Listen for input
        el.addEventListener('input', (e) => {
          if (data) {
            data[expr] = e.target.value;
          }
        });
        
        // Watch for changes
        if (data && data._watch) {
          data._watch(expr, () => {
            el.value = data[expr];
          });
        }
      });
    }
  }

  // Create default instance
  const defaultInstance = new Praxis();

  const praxis = {
    start: () => defaultInstance.start(),
    signal,
    computed,
    effect
  };

  // Auto-start
  if (typeof window !== 'undefined') {
    window.praxis = praxis;
    defaultInstance.start();
  }

  exports.default = praxis;
  exports.praxis = praxis;
  exports.signal = signal;
  exports.computed = computed;
  exports.effect = effect;

})));