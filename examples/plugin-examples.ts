// PraxisJS Phase 3 Plugin Examples

import { definePlugin, Plugin, CoralInstance, DirectiveConstructor } from '../src/core/plugin.js';
import { BaseDirective, DIRECTIVE_PRIORITIES } from '../src/directives/base.js';
import { signal } from '../src/core/signal.js';

// 1. Simple Magic Property Plugin
export const MathPlugin: Plugin = definePlugin({
  name: 'math',
  version: '1.0.0',
  install(praxis: CoralInstance) {
    praxis.magic('$math', () => ({
      random: () => Math.random(),
      round: (num: number) => Math.round(num),
      abs: (num: number) => Math.abs(num),
      max: (...numbers: number[]) => Math.max(...numbers),
      min: (...numbers: number[]) => Math.min(...numbers)
    }));
  }
});

// 2. Date/Time Plugin
export const DateTimePlugin: Plugin = definePlugin({
  name: 'datetime',
  version: '1.0.0',
  install(praxis: CoralInstance) {
    praxis.magic('$date', () => ({
      now: () => new Date(),
      format: (date: Date, format: string) => {
        // Simple date formatting
        const d = new Date(date);
        return format
          .replace('YYYY', d.getFullYear().toString())
          .replace('MM', (d.getMonth() + 1).toString().padStart(2, '0'))
          .replace('DD', d.getDate().toString().padStart(2, '0'))
          .replace('HH', d.getHours().toString().padStart(2, '0'))
          .replace('mm', d.getMinutes().toString().padStart(2, '0'))
          .replace('ss', d.getSeconds().toString().padStart(2, '0'));
      },
      fromNow: (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'just now';
      }
    }));
  }
});

// 3. Custom Directive Plugin
class ClickOutsideDirective extends BaseDirective {
  public name = 'click-outside';
  public priority = DIRECTIVE_PRIORITIES.ON;
  
  private handler?: (event: Event) => void;

  init(): void {
    this.handler = (event: Event) => {
      if (!this.context.element.contains(event.target as Node)) {
        this.evaluateExpression();
      }
    };

    document.addEventListener('click', this.handler);
  }

  dispose(): void {
    if (this.handler) {
      document.removeEventListener('click', this.handler);
    }
    super.dispose();
  }
}

class IntersectDirective extends BaseDirective {
  public name = 'intersect';
  public priority = DIRECTIVE_PRIORITIES.DEFAULT;
  
  private observer?: IntersectionObserver;

  init(): void {
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported');
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.target === this.context.element) {
          const evaluationContext = {
            ...this.buildEvaluationContext(),
            $isIntersecting: entry.isIntersecting,
            $intersectionRatio: entry.intersectionRatio
          };
          
          // Temporarily override evaluation context
          const originalContext = this.buildEvaluationContext;
          this.buildEvaluationContext = () => evaluationContext;
          
          this.evaluateExpression();
          
          this.buildEvaluationContext = originalContext;
        }
      });
    }, {
      threshold: this.getThreshold(),
      rootMargin: this.getRootMargin()
    });

    this.observer.observe(this.context.element);
  }

  private getThreshold(): number {
    const thresholdModifier = this.context.modifiers.find(m => m.startsWith('threshold-'));
    return thresholdModifier ? parseFloat(thresholdModifier.split('-')[1]) / 100 : 0.1;
  }

  private getRootMargin(): string {
    const marginModifier = this.context.modifiers.find(m => m.startsWith('margin-'));
    return marginModifier ? marginModifier.split('-')[1] + 'px' : '0px';
  }

  dispose(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    super.dispose();
  }
}

export const CustomDirectivesPlugin: Plugin = definePlugin({
  name: 'custom-directives',
  version: '1.0.0',
  install(praxis: CoralInstance) {
    praxis.directive('click-outside', ClickOutsideDirective as DirectiveConstructor);
    praxis.directive('intersect', IntersectDirective as DirectiveConstructor);
  }
});

// 4. Animation Plugin
export const AnimationPlugin: Plugin = definePlugin({
  name: 'animation',
  version: '1.0.0',
  install(praxis: CoralInstance) {
    praxis.magic('$animate', () => ({
      fadeIn: (element: Element, duration = 300) => {
        const el = element as HTMLElement;
        el.style.opacity = '0';
        el.style.transition = `opacity ${duration}ms ease-in-out`;
        
        requestAnimationFrame(() => {
          el.style.opacity = '1';
        });
        
        return new Promise(resolve => {
          setTimeout(resolve, duration);
        });
      },
      
      fadeOut: (element: Element, duration = 300) => {
        const el = element as HTMLElement;
        el.style.transition = `opacity ${duration}ms ease-in-out`;
        el.style.opacity = '0';
        
        return new Promise(resolve => {
          setTimeout(() => {
            el.style.display = 'none';
            resolve(undefined);
          }, duration);
        });
      },
      
      slideDown: (element: Element, duration = 300) => {
        const el = element as HTMLElement;
        const originalHeight = el.scrollHeight;
        
        el.style.height = '0';
        el.style.overflow = 'hidden';
        el.style.transition = `height ${duration}ms ease-in-out`;
        
        requestAnimationFrame(() => {
          el.style.height = originalHeight + 'px';
        });
        
        return new Promise(resolve => {
          setTimeout(() => {
            el.style.height = '';
            el.style.overflow = '';
            resolve(undefined);
          }, duration);
        });
      }
    }));
  }
});

// 5. Local Storage Plugin
export const StoragePlugin: Plugin = definePlugin({
  name: 'storage',
  version: '1.0.0',
  install(praxis: CoralInstance) {
    praxis.magic('$storage', () => ({
      get: (key: string, defaultValue?: any) => {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : defaultValue;
        } catch {
          return defaultValue;
        }
      },
      
      set: (key: string, value: any) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch {
          return false;
        }
      },
      
      remove: (key: string) => {
        localStorage.removeItem(key);
      },
      
      clear: () => {
        localStorage.clear();
      },
      
      // Reactive storage
      reactive: (key: string, defaultValue?: any) => {
        const storedValue = (() => {
          try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
          } catch {
            return defaultValue;
          }
        })();
        
        const reactiveValue = signal(storedValue);
        
        // Watch for changes and persist
        praxis.magic('$watch', () => (
          () => reactiveValue.value,
          (newValue: any) => {
            try {
              localStorage.setItem(key, JSON.stringify(newValue));
            } catch (error) {
              console.error('Failed to persist to localStorage:', error);
            }
          }
        ));
        
        return reactiveValue;
      }
    }));
  }
});

// 6. HTTP Client Plugin
export const HttpPlugin: Plugin = definePlugin({
  name: 'http',
  version: '1.0.0',
  install(praxis: CoralInstance) {
    const baseURL = '';
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };

    praxis.magic('$http', () => ({
      get: async (url: string, options?: RequestInit) => {
        const response = await fetch(baseURL + url, {
          method: 'GET',
          headers: defaultHeaders,
          ...options
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
      },
      
      post: async (url: string, data?: any, options?: RequestInit) => {
        const response = await fetch(baseURL + url, {
          method: 'POST',
          headers: defaultHeaders,
          body: JSON.stringify(data),
          ...options
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
      },
      
      put: async (url: string, data?: any, options?: RequestInit) => {
        const response = await fetch(baseURL + url, {
          method: 'PUT',
          headers: defaultHeaders,
          body: JSON.stringify(data),
          ...options
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
      },
      
      delete: async (url: string, options?: RequestInit) => {
        const response = await fetch(baseURL + url, {
          method: 'DELETE',
          headers: defaultHeaders,
          ...options
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.status === 204 ? null : response.json();
      }
    }));
  }
});

// 7. Form Validation Plugin
export const ValidationPlugin: Plugin = definePlugin({
  name: 'validation',
  version: '1.0.0',
  install(praxis: CoralInstance) {
    praxis.magic('$validate', () => ({
      email: (value: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) || 'Please enter a valid email address';
      },
      
      required: (value: any) => {
        return (value !== null && value !== undefined && value !== '') || 'This field is required';
      },
      
      minLength: (min: number) => (value: string) => {
        return value.length >= min || `Minimum length is ${min} characters`;
      },
      
      maxLength: (max: number) => (value: string) => {
        return value.length <= max || `Maximum length is ${max} characters`;
      },
      
      pattern: (regex: RegExp, message: string) => (value: string) => {
        return regex.test(value) || message;
      },
      
      // Form validation helper
      form: (rules: Record<string, Array<(value: any) => string | true>>) => {
        const errors = signal<Record<string, string>>({});
        
        return {
          errors: errors,
          validate: (formData: Record<string, any>) => {
            const newErrors: Record<string, string> = {};
            let isValid = true;
            
            Object.entries(rules).forEach(([field, validators]) => {
              for (const validator of validators) {
                const result = validator(formData[field]);
                if (result !== true) {
                  newErrors[field] = result;
                  isValid = false;
                  break;
                }
              }
            });
            
            errors.value = newErrors;
            return isValid;
          }
        };
      }
    }));
  }
});

// 8. Theme Plugin
export const ThemePlugin: Plugin = definePlugin({
  name: 'theme',
  version: '1.0.0',
  install(praxis: CoralInstance) {
    const currentTheme = signal(localStorage.getItem('theme') || 'light');
    
    // Apply theme to document
    const applyTheme = (theme: string) => {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    };
    
    // Initialize theme
    applyTheme(currentTheme.value);
    
    praxis.magic('$theme', () => ({
      current: currentTheme,
      
      set: (theme: string) => {
        currentTheme.value = theme;
        applyTheme(theme);
      },
      
      toggle: () => {
        const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
        currentTheme.value = newTheme;
        applyTheme(newTheme);
      },
      
      isDark: () => currentTheme.value === 'dark',
      isLight: () => currentTheme.value === 'light'
    }));
  }
});

// 9. Plugin Composition Example
export function createAppWithPlugins() {
  return praxis
    .use(MathPlugin)
    .use(DateTimePlugin)
    .use(CustomDirectivesPlugin)
    .use(AnimationPlugin)
    .use(StoragePlugin)
    .use(HttpPlugin)
    .use(ValidationPlugin)
    .use(ThemePlugin);
}

// 10. Plugin with Store Integration
export const TodoPlugin: Plugin = definePlugin({
  name: 'todo',
  version: '1.0.0',
  install(praxis: CoralInstance) {
    // Define a todo store
    const todoStore = praxis.store('todos', {
      state: () => ({
        todos: [] as Todo[],
        filter: 'all' as 'all' | 'active' | 'completed'
      }),
      
      getters: {
        activeTodos: (state) => state.todos.filter(todo => !todo.completed),
        completedTodos: (state) => state.todos.filter(todo => todo.completed),
        filteredTodos: (state, getters) => {
          switch (state.filter) {
            case 'active': return getters.activeTodos;
            case 'completed': return getters.completedTodos;
            default: return state.todos;
          }
        }
      },
      
      actions: {
        addTodo(text: string) {
          this.$state.todos.push({
            id: Date.now(),
            text,
            completed: false
          });
        },
        
        toggleTodo(id: number) {
          const todo = this.$state.todos.find(t => t.id === id);
          if (todo) {
            todo.completed = !todo.completed;
          }
        },
        
        removeTodo(id: number) {
          const index = this.$state.todos.findIndex(t => t.id === id);
          if (index > -1) {
            this.$state.todos.splice(index, 1);
          }
        },
        
        setFilter(filter: 'all' | 'active' | 'completed') {
          this.$state.filter = filter;
        }
      }
    });
    
    // Add magic property for todo management
    praxis.magic('$todos', () => todoStore);
  }
});

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}