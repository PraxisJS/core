// PraxisJS Showcase Application

import { praxis } from '../../src/praxis.js';
import { registerAdvancedDirectives } from '../../src/directives/advanced.js';
import { production } from '../../src/production/production.js';
import { accessibility } from '../../src/accessibility/accessibility.js';
import { security } from '../../src/security/security.js';

// Register advanced directives
registerAdvancedDirectives(praxis);

// Initialize production features
production.trackEvent('app_started', { timestamp: Date.now() });

// Configure accessibility
accessibility.announce('PraxisJS Showcase application loaded');

// App-level data and functionality
function AppData() {
    return {
        version: '1.0.0',
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        
        toggleReducedMotion() {
            this.reducedMotion = !this.reducedMotion;
            document.documentElement.classList.toggle('reduce-motion', this.reducedMotion);
            accessibility.announce(`Motion ${this.reducedMotion ? 'reduced' : 'enabled'}`);
        }
    };
}

// Header component
function HeaderComponent() {
    return {
        lastUpdated: new Date().toLocaleString()
    };
}

// Theme toggle component
function ThemeToggle() {
    return {
        isDark: localStorage.getItem('theme') === 'dark',
        
        init() {
            this.applyTheme();
        },
        
        toggleTheme() {
            this.isDark = !this.isDark;
            this.applyTheme();
            localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
            accessibility.announce(`Switched to ${this.isDark ? 'dark' : 'light'} theme`);
        },
        
        applyTheme() {
            document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
        }
    };
}

// Tabs component with full accessibility
function TabsComponent() {
    return {
        activeTab: 0,
        tabs: [
            { id: 'core', title: 'Core Directives' },
            { id: 'advanced', title: 'Advanced Directives' },
            { id: 'store', title: 'Store Management' },
            { id: 'accessibility', title: 'Accessibility' },
            { id: 'performance', title: 'Performance' }
        ],
        
        selectTab(index) {
            this.activeTab = index;
            accessibility.announce(`Selected ${this.tabs[index].title} tab`);
            production.trackEvent('tab_selected', { tab: this.tabs[index].id });
        },
        
        selectPreviousTab() {
            if (this.activeTab > 0) {
                this.selectTab(this.activeTab - 1);
            }
        },
        
        selectNextTab() {
            if (this.activeTab < this.tabs.length - 1) {
                this.selectTab(this.activeTab + 1);
            }
        },
        
        selectFirstTab() {
            this.selectTab(0);
        },
        
        selectLastTab() {
            this.selectTab(this.tabs.length - 1);
        }
    };
}

// Counter component
function CounterComponent() {
    return {
        count: 0,
        
        increment() {
            this.count++;
            if (this.count % 10 === 0) {
                accessibility.announce(`Count reached ${this.count}`);
            }
        },
        
        decrement() {
            this.count--;
        },
        
        reset() {
            this.count = 0;
            accessibility.announce('Counter reset to zero');
        }
    };
}

// Form component with validation
function FormComponent() {
    return {
        form: {
            username: '',
            email: ''
        },
        errors: {},
        isSubmitting: false,
        submitted: false,
        
        async submitForm() {
            this.errors = {};
            this.isSubmitting = true;
            
            // Validate form
            if (!this.form.username.trim()) {
                this.errors.username = 'Username is required';
            } else if (this.form.username.length < 3) {
                this.errors.username = 'Username must be at least 3 characters';
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!this.form.email.trim()) {
                this.errors.email = 'Email is required';
            } else if (!emailRegex.test(this.form.email)) {
                this.errors.email = 'Please enter a valid email address';
            }
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.isSubmitting = false;
            
            if (Object.keys(this.errors).length === 0) {
                this.submitted = true;
                accessibility.announce('Form submitted successfully');
                production.trackEvent('form_submitted', { 
                    username: this.form.username,
                    email: this.form.email 
                });
                
                // Reset form after success
                setTimeout(() => {
                    this.form = { username: '', email: '' };
                    this.submitted = false;
                }, 3000);
            } else {
                const errorCount = Object.keys(this.errors).length;
                accessibility.announce(`Form has ${errorCount} validation error${errorCount > 1 ? 's' : ''}`);
            }
        }
    };
}

// List component
function ListComponent() {
    return {
        items: [
            { id: 1, text: 'Learn PraxisJS' },
            { id: 2, text: 'Build awesome apps' },
            { id: 3, text: 'Share with the community' }
        ],
        newItem: '',
        nextId: 4,
        
        addItem() {
            if (this.newItem.trim()) {
                const item = {
                    id: this.nextId++,
                    text: this.newItem.trim()
                };
                this.items.push(item);
                accessibility.announce(`Added item: ${item.text}`);
                this.newItem = '';
            }
        },
        
        removeItem(index) {
            const item = this.items[index];
            this.items.splice(index, 1);
            accessibility.announce(`Removed item: ${item.text}`);
        }
    };
}

// Intersection observer demo
function IntersectionDemo() {
    return {
        isVisible: false,
        
        handleIntersection() {
            this.isVisible = !this.isVisible;
            accessibility.announce(`Element is now ${this.isVisible ? 'visible' : 'hidden'}`);
        }
    };
}

// Click away demo
function ClickAwayDemo() {
    return {
        open: false
    };
}

// Resize demo
function ResizeDemo() {
    return {
        width: 200,
        height: 100,
        
        handleResize() {
            // Update dimensions - these will be set by the directive
            accessibility.announce(`Resized to ${this.width} by ${this.height} pixels`, 'polite');
        }
    };
}

// Hotkey demo
function HotkeyDemo() {
    return {
        triggered: false,
        triggerCount: 0,
        
        handleHotkey(event) {
            this.triggered = true;
            this.triggerCount++;
            accessibility.announce(`Hotkey triggered ${this.triggerCount} times`);
            
            setTimeout(() => {
                this.triggered = false;
            }, 2000);
        }
    };
}

// Todo store demo
function TodoStoreDemo() {
    return {
        todos: [
            { id: 1, text: 'Learn PraxisJS stores', completed: false },
            { id: 2, text: 'Build reactive apps', completed: false },
            { id: 3, text: 'Master state management', completed: true }
        ],
        newTodo: '',
        filter: 'all',
        nextId: 4,
        
        get totalCount() {
            return this.todos.length;
        },
        
        get activeCount() {
            return this.todos.filter(todo => !todo.completed).length;
        },
        
        get completedCount() {
            return this.todos.filter(todo => todo.completed).length;
        },
        
        get filteredTodos() {
            switch (this.filter) {
                case 'active':
                    return this.todos.filter(todo => !todo.completed);
                case 'completed':
                    return this.todos.filter(todo => todo.completed);
                default:
                    return this.todos;
            }
        },
        
        addTodo() {
            if (this.newTodo.trim()) {
                const todo = {
                    id: this.nextId++,
                    text: this.newTodo.trim(),
                    completed: false
                };
                this.todos.push(todo);
                accessibility.announce(`Added todo: ${todo.text}`);
                this.newTodo = '';
            }
        },
        
        removeTodo(id) {
            const todo = this.todos.find(t => t.id === id);
            this.todos = this.todos.filter(t => t.id !== id);
            if (todo) {
                accessibility.announce(`Removed todo: ${todo.text}`);
            }
        },
        
        setFilter(newFilter) {
            this.filter = newFilter;
            accessibility.announce(`Showing ${newFilter} todos`);
        }
    };
}

// User store demo with async actions
function UserStoreDemo() {
    return {
        users: [],
        loading: false,
        error: null,
        
        get userCount() {
            return this.users.length;
        },
        
        async fetchUsers() {
            this.loading = true;
            this.error = null;
            
            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Mock user data
                this.users = [
                    { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
                    { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
                    { id: 3, name: 'Carol Davis', email: 'carol@example.com' },
                    { id: 4, name: 'David Wilson', email: 'david@example.com' }
                ];
                
                accessibility.announce(`Loaded ${this.users.length} users`);
                production.trackEvent('users_fetched', { count: this.users.length });
                
            } catch (error) {
                this.error = 'Failed to fetch users. Please try again.';
                accessibility.announce('Failed to load users', 'assertive');
            } finally {
                this.loading = false;
            }
        },
        
        clearUsers() {
            this.users = [];
            accessibility.announce('User list cleared');
        }
    };
}

// Live region demo
function LiveRegionDemo() {
    return {
        message: '',
        
        announceMessage(priority = 'polite') {
            const messages = [
                'This is a live region announcement',
                'Screen readers will read this message',
                'Content updated dynamically',
                'Accessibility in action!'
            ];
            
            this.message = messages[Math.floor(Math.random() * messages.length)];
            
            // Also use the global announcement system
            accessibility.announce(this.message, priority);
        },
        
        clearAnnouncement() {
            this.message = '';
        }
    };
}

// Focus management demo
function FocusDemo() {
    return {
        dialogOpen: false,
        
        openDialog() {
            this.dialogOpen = true;
            accessibility.announce('Dialog opened');
        },
        
        closeDialog() {
            this.dialogOpen = false;
            accessibility.announce('Dialog closed');
        }
    };
}

// Color contrast demo
function ContrastDemo() {
    return {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff',
        contrastResult: null,
        
        init() {
            this.checkContrast();
        },
        
        checkContrast() {
            this.contrastResult = accessibility.validateColorContrast(
                this.foregroundColor,
                this.backgroundColor
            );
        }
    };
}

// Performance monitoring demo
function PerformanceDemo() {
    return {
        performanceData: null,
        slowOperationRunning: false,
        
        runPerformanceTest() {
            const startTime = performance.now();
            
            // Simulate some work
            const data = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: Math.random() }));
            
            const endTime = performance.now();
            const renderTime = endTime - startTime;
            
            const memoryUsage = performance.memory ? 
                Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 
                Math.round(Math.random() * 50);
            
            this.performanceData = {
                renderTime: renderTime.toFixed(2),
                memoryUsage,
                componentCount: document.querySelectorAll('[x-data]').length
            };
            
            production.trackEvent('performance_test', this.performanceData);
            accessibility.announce('Performance test completed');
        },
        
        measureMemory() {
            const report = production.detectMemoryLeaks();
            
            this.performanceData = {
                renderTime: '0',
                memoryUsage: Math.round(report.heapUsed / 1024 / 1024),
                componentCount: document.querySelectorAll('[x-data]').length
            };
            
            accessibility.announce('Memory measurement completed');
        },
        
        async simulateSlowOperation() {
            this.slowOperationRunning = true;
            
            await production.measureAsync('slow-operation', async () => {
                // Simulate slow work
                await new Promise(resolve => setTimeout(resolve, 2000));
            });
            
            this.slowOperationRunning = false;
            accessibility.announce('Slow operation completed');
        }
    };
}

// Error boundary demo
function ErrorBoundaryDemo() {
    return {
        hasError: false,
        errorMessage: '',
        status: 'ready',
        
        triggerError() {
            try {
                this.status = 'triggering error';
                throw new Error('Demonstration error triggered by user action');
            } catch (error) {
                this.handleError(error);
            }
        },
        
        async triggerAsyncError() {
            try {
                this.status = 'triggering async error';
                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error('Async demonstration error'));
                    }, 1000);
                });
            } catch (error) {
                this.handleError(error);
            }
        },
        
        handleError(error) {
            this.hasError = true;
            this.errorMessage = error.message + '\n' + (error.stack || '');
            this.status = 'error state';
            
            // Report to production monitoring
            production.handleError(error, {
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                componentStack: 'ErrorBoundaryDemo'
            });
            
            accessibility.announce('An error occurred in the component', 'assertive');
        },
        
        resetError() {
            this.hasError = false;
            this.errorMessage = '';
            this.status = 'ready';
            accessibility.announce('Error boundary reset');
        }
    };
}

// Global error handling
window.addEventListener('error', (event) => {
    production.handleError(new Error(event.message), {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    production.handleError(new Error(event.reason), {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
    });
});

// Expose functions globally for PraxisJS
window.AppData = AppData;
window.HeaderComponent = HeaderComponent;
window.ThemeToggle = ThemeToggle;
window.TabsComponent = TabsComponent;
window.CounterComponent = CounterComponent;
window.FormComponent = FormComponent;
window.ListComponent = ListComponent;
window.IntersectionDemo = IntersectionDemo;
window.ClickAwayDemo = ClickAwayDemo;
window.ResizeDemo = ResizeDemo;
window.HotkeyDemo = HotkeyDemo;
window.TodoStoreDemo = TodoStoreDemo;
window.UserStoreDemo = UserStoreDemo;
window.LiveRegionDemo = LiveRegionDemo;
window.FocusDemo = FocusDemo;
window.ContrastDemo = ContrastDemo;
window.PerformanceDemo = PerformanceDemo;
window.ErrorBoundaryDemo = ErrorBoundaryDemo;

// Initialize PraxisJS
praxis.init();

// Track app initialization
production.trackEvent('app_initialized', {
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    viewport: {
        width: window.innerWidth,
        height: window.innerHeight
    }
});

console.log('🌊 PraxisJS Showcase App Loaded');
console.log('This application demonstrates all major PraxisJS features including:');
console.log('• Core reactive directives');
console.log('• Advanced directives (intersection, resize, hotkeys, etc.)');
console.log('• Store management with computed getters');
console.log('• Accessibility features and ARIA support');
console.log('• Performance monitoring and error boundaries');
console.log('• Security features and sanitization');
console.log('• Production-ready features');
console.log('\nExplore the tabs above to see each feature in action!');