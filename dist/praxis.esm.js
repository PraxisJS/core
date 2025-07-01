// Praxis - High-performance reactive JavaScript framework
// ES Module version - Version 1.0.0

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
          el._praxisData = data;
        } catch (e) {
          console.warn('Invalid x-data:', dataAttr);
        }
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

export { signal, computed, effect };
export default praxis;