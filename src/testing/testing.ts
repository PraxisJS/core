// PraxisJS Testing Utilities

import { signal, Signal } from '../core/signal.js';
import { defineStore, Store } from '../store/store.js';
import { reactive } from '../store/reactive.js';

export interface ComponentWrapper {
  element: HTMLElement;
  vm: any;
  find(selector: string): ElementWrapper | null;
  findAll(selector: string): ElementWrapper[];
  trigger(event: string, options?: EventOptions): Promise<void>;
  setData(data: Partial<any>): Promise<void>;
  text(): string;
  html(): string;
  exists(): boolean;
  isVisible(): boolean;
  hasClass(className: string): boolean;
  getAttribute(name: string): string | null;
  destroy(): void;
}

export interface ElementWrapper {
  element: HTMLElement;
  trigger(event: string, options?: EventOptions): Promise<void>;
  text(): string;
  html(): string;
  exists(): boolean;
  isVisible(): boolean;
  hasClass(className: string): boolean;
  getAttribute(name: string): string | null;
}

export interface EventOptions {
  bubbles?: boolean;
  cancelable?: boolean;
  detail?: any;
  [key: string]: any;
}

export interface MountOptions {
  data?: Record<string, any>;
  methods?: Record<string, Function>;
  stores?: Record<string, any>;
  plugins?: any[];
  attachTo?: HTMLElement;
  sync?: boolean;
}

export interface MockStoreOptions<T> {
  state?: T;
  getters?: Record<string, any>;
  actions?: Record<string, Function>;
  modules?: Record<string, any>;
}

export class PraxisTestUtils {
  private mountedComponents: ComponentWrapper[] = [];
  private originalStores: Map<string, Store<any>> = new Map();
  private mockStores: Map<string, Store<any>> = new Map();

  // Component mounting and testing
  mount(template: string, options: MountOptions = {}): ComponentWrapper {
    const container = this.createContainer(options.attachTo);
    container.innerHTML = template;
    
    // Initialize data
    const componentData = reactive(options.data || {});
    
    // Mock stores if provided
    if (options.stores) {
      for (const [name, storeConfig] of Object.entries(options.stores)) {
        this.mockStore(name, storeConfig);
      }
    }
    
    // Initialize component with Praxis
    const vm = this.initializeComponent(container, componentData, options);
    
    const wrapper = new ComponentWrapperImpl(container, vm, this);
    this.mountedComponents.push(wrapper);
    
    return wrapper;
  }

  async fireEvent(element: Element, eventName: string, options: EventOptions = {}): Promise<void> {
    const event = this.createEvent(eventName, options);
    element.dispatchEvent(event);
    
    // Wait for any async updates
    await this.waitForUpdate();
  }

  async waitForUpdate(): Promise<void> {
    // Wait for next tick and any scheduled updates
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  }

  mockStore<T>(name: string, options: MockStoreOptions<T> = {}): Store<T> {
    // Save original store if it exists
    const originalStore = this.getStore(name);
    if (originalStore) {
      this.originalStores.set(name, originalStore);
    }
    
    // Create mock store
    const mockStore = defineStore(name, {
      state: () => options.state as T || {} as T,
      getters: options.getters || {},
      actions: options.actions || {},
      modules: options.modules || {}
    });
    
    this.mockStores.set(name, mockStore);
    return mockStore;
  }

  // Test spies and mocks
  createSpy(name?: string): TestSpy {
    return new TestSpy(name);
  }

  spyOn(object: any, method: string): TestSpy {
    const originalMethod = object[method];
    const spy = new TestSpy(method, originalMethod);
    object[method] = spy.fn;
    return spy;
  }

  mock<T>(moduleExports: T): MockedModule<T> {
    return new MockedModule(moduleExports);
  }

  // Async testing utilities
  async flushPromises(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  async nextTick(): Promise<void> {
    return this.waitForUpdate();
  }

  // Cleanup
  cleanup(): void {
    // Destroy all mounted components
    this.mountedComponents.forEach(wrapper => wrapper.destroy());
    this.mountedComponents = [];
    
    // Restore original stores
    for (const [name, store] of this.originalStores) {
      this.restoreStore(name, store);
    }
    this.originalStores.clear();
    this.mockStores.clear();
  }

  // Private helper methods
  private createContainer(attachTo?: HTMLElement): HTMLElement {
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'praxis-test-container');
    
    if (attachTo) {
      attachTo.appendChild(container);
    } else {
      document.body.appendChild(container);
    }
    
    return container;
  }

  private initializeComponent(container: HTMLElement, data: any, options: MountOptions): any {
    // Simulate Praxis initialization
    const vm = {
      $data: data,
      $el: container,
      $methods: options.methods || {},
      $nextTick: this.waitForUpdate.bind(this),
      $emit: (event: string, ...args: any[]) => {
        const customEvent = new CustomEvent(event, { detail: args });
        container.dispatchEvent(customEvent);
      }
    };
    
    // Process directives and bind data
    this.processDirectives(container, vm);
    
    return vm;
  }

  private processDirectives(element: HTMLElement, vm: any): void {
    // Simple directive processing for testing
    const elements = element.querySelectorAll('[x-data], [x-text], [x-model], [x-show], [x-if]');
    
    elements.forEach(el => {
      // Process x-text
      const textDirective = el.getAttribute('x-text');
      if (textDirective) {
        this.bindTextDirective(el as HTMLElement, textDirective, vm);
      }
      
      // Process x-model
      const modelDirective = el.getAttribute('x-model');
      if (modelDirective) {
        this.bindModelDirective(el as HTMLElement, modelDirective, vm);
      }
      
      // Process x-show
      const showDirective = el.getAttribute('x-show');
      if (showDirective) {
        this.bindShowDirective(el as HTMLElement, showDirective, vm);
      }
    });
  }

  private bindTextDirective(element: HTMLElement, expression: string, vm: any): void {
    const updateText = () => {
      try {
        const value = this.evaluateExpression(expression, vm.$data);
        element.textContent = String(value);
      } catch (error) {
        console.warn('Error evaluating x-text expression:', error);
      }
    };
    
    updateText();
    // In a real implementation, this would set up reactive updates
  }

  private bindModelDirective(element: HTMLElement, property: string, vm: any): void {
    if (element instanceof HTMLInputElement) {
      // Set initial value
      if (vm.$data[property] !== undefined) {
        element.value = String(vm.$data[property]);
      }
      
      // Listen for changes
      element.addEventListener('input', () => {
        vm.$data[property] = element.value;
      });
    }
  }

  private bindShowDirective(element: HTMLElement, expression: string, vm: any): void {
    const updateVisibility = () => {
      try {
        const value = this.evaluateExpression(expression, vm.$data);
        element.style.display = value ? '' : 'none';
      } catch (error) {
        console.warn('Error evaluating x-show expression:', error);
      }
    };
    
    updateVisibility();
  }

  private evaluateExpression(expression: string, data: any): any {
    try {
      const func = new Function(...Object.keys(data), `return (${expression})`);
      return func(...Object.values(data));
    } catch (error) {
      console.warn('Expression evaluation failed:', error);
      return undefined;
    }
  }

  private createEvent(eventName: string, options: EventOptions): Event {
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      ...options
    };
    
    // Handle different event types
    if (eventName.startsWith('key')) {
      return new KeyboardEvent(eventName, eventOptions as KeyboardEventInit);
    } else if (eventName.startsWith('mouse') || eventName === 'click') {
      return new MouseEvent(eventName, eventOptions as MouseEventInit);
    } else if (eventName === 'input' || eventName === 'change') {
      return new InputEvent(eventName, eventOptions as InputEventInit);
    } else {
      return new CustomEvent(eventName, eventOptions);
    }
  }

  private getStore(name: string): Store<any> | undefined {
    // In a real implementation, this would get the store from the registry
    return undefined;
  }

  private restoreStore(name: string, store: Store<any>): void {
    // In a real implementation, this would restore the store to the registry
  }
}

// Component wrapper implementation
class ComponentWrapperImpl implements ComponentWrapper {
  constructor(
    public element: HTMLElement,
    public vm: any,
    private testUtils: PraxisTestUtils
  ) {}

  find(selector: string): ElementWrapper | null {
    const element = this.element.querySelector(selector) as HTMLElement;
    return element ? new ElementWrapperImpl(element, this.testUtils) : null;
  }

  findAll(selector: string): ElementWrapper[] {
    const elements = this.element.querySelectorAll(selector);
    return Array.from(elements).map(el => new ElementWrapperImpl(el as HTMLElement, this.testUtils));
  }

  async trigger(event: string, options: EventOptions = {}): Promise<void> {
    await this.testUtils.fireEvent(this.element, event, options);
  }

  async setData(data: Partial<any>): Promise<void> {
    Object.assign(this.vm.$data, data);
    await this.testUtils.waitForUpdate();
  }

  text(): string {
    return this.element.textContent || '';
  }

  html(): string {
    return this.element.innerHTML;
  }

  exists(): boolean {
    return this.element.parentNode !== null;
  }

  isVisible(): boolean {
    return this.element.style.display !== 'none' && 
           this.element.offsetParent !== null;
  }

  hasClass(className: string): boolean {
    return this.element.classList.contains(className);
  }

  getAttribute(name: string): string | null {
    return this.element.getAttribute(name);
  }

  destroy(): void {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// Element wrapper implementation
class ElementWrapperImpl implements ElementWrapper {
  constructor(
    public element: HTMLElement,
    private testUtils: PraxisTestUtils
  ) {}

  async trigger(event: string, options: EventOptions = {}): Promise<void> {
    await this.testUtils.fireEvent(this.element, event, options);
  }

  text(): string {
    return this.element.textContent || '';
  }

  html(): string {
    return this.element.innerHTML;
  }

  exists(): boolean {
    return this.element.parentNode !== null;
  }

  isVisible(): boolean {
    return this.element.style.display !== 'none' && 
           this.element.offsetParent !== null;
  }

  hasClass(className: string): boolean {
    return this.element.classList.contains(className);
  }

  getAttribute(name: string): string | null {
    return this.element.getAttribute(name);
  }
}

// Test spy implementation
export class TestSpy {
  public calls: any[][] = [];
  public returns: any[] = [];
  public fn: Function;
  
  constructor(
    public name?: string,
    private originalFn?: Function
  ) {
    this.fn = (...args: any[]) => {
      this.calls.push(args);
      
      if (this.mockImplementation) {
        const result = this.mockImplementation(...args);
        this.returns.push(result);
        return result;
      }
      
      if (this.originalFn) {
        const result = this.originalFn(...args);
        this.returns.push(result);
        return result;
      }
      
      return undefined;
    };
  }

  private mockImplementation?: Function;

  mockReturnValue(value: any): this {
    this.mockImplementation = () => value;
    return this;
  }

  mockImplementationOnce(fn: Function): this {
    const currentImpl = this.mockImplementation;
    this.mockImplementation = (...args: any[]) => {
      this.mockImplementation = currentImpl;
      return fn(...args);
    };
    return this;
  }

  mockResolvedValue(value: any): this {
    this.mockImplementation = () => Promise.resolve(value);
    return this;
  }

  mockRejectedValue(error: any): this {
    this.mockImplementation = () => Promise.reject(error);
    return this;
  }

  toHaveBeenCalled(): boolean {
    return this.calls.length > 0;
  }

  toHaveBeenCalledTimes(times: number): boolean {
    return this.calls.length === times;
  }

  toHaveBeenCalledWith(...args: any[]): boolean {
    return this.calls.some(call => 
      call.length === args.length && 
      call.every((arg, index) => arg === args[index])
    );
  }

  toHaveBeenLastCalledWith(...args: any[]): boolean {
    const lastCall = this.calls[this.calls.length - 1];
    return lastCall && 
           lastCall.length === args.length && 
           lastCall.every((arg, index) => arg === args[index]);
  }

  reset(): void {
    this.calls = [];
    this.returns = [];
  }
}

// Mocked module implementation
export class MockedModule<T> {
  private mocks: Map<string, TestSpy> = new Map();
  
  constructor(private moduleExports: T) {}

  mock(property: keyof T): TestSpy {
    const spy = new TestSpy(String(property));
    this.mocks.set(String(property), spy);
    (this.moduleExports as any)[property] = spy.fn;
    return spy;
  }

  restore(): void {
    // In a real implementation, this would restore original exports
    this.mocks.clear();
  }
}

// Test matchers
export class TestMatchers {
  static expect(actual: any): ExpectAPI {
    return new ExpectAPI(actual);
  }
}

class ExpectAPI {
  constructor(private actual: any) {}

  toBe(expected: any): void {
    if (this.actual !== expected) {
      throw new Error(`Expected ${this.actual} to be ${expected}`);
    }
  }

  toEqual(expected: any): void {
    if (JSON.stringify(this.actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} to equal ${JSON.stringify(expected)}`);
    }
  }

  toBeTruthy(): void {
    if (!this.actual) {
      throw new Error(`Expected ${this.actual} to be truthy`);
    }
  }

  toBeFalsy(): void {
    if (this.actual) {
      throw new Error(`Expected ${this.actual} to be falsy`);
    }
  }

  toContain(item: any): void {
    if (!this.actual.includes(item)) {
      throw new Error(`Expected ${this.actual} to contain ${item}`);
    }
  }

  toHaveLength(length: number): void {
    if (this.actual.length !== length) {
      throw new Error(`Expected ${this.actual} to have length ${length}, got ${this.actual.length}`);
    }
  }
}

// Test suite runner
export class TestSuite {
  private tests: Test[] = [];
  private beforeEachHooks: Function[] = [];
  private afterEachHooks: Function[] = [];
  private beforeAllHooks: Function[] = [];
  private afterAllHooks: Function[] = [];

  constructor(public name: string) {}

  test(name: string, fn: () => void | Promise<void>): void {
    this.tests.push(new Test(name, fn));
  }

  beforeEach(fn: () => void | Promise<void>): void {
    this.beforeEachHooks.push(fn);
  }

  afterEach(fn: () => void | Promise<void>): void {
    this.afterEachHooks.push(fn);
  }

  beforeAll(fn: () => void | Promise<void>): void {
    this.beforeAllHooks.push(fn);
  }

  afterAll(fn: () => void | Promise<void>): void {
    this.afterAllHooks.push(fn);
  }

  async run(): Promise<TestResults> {
    const results = new TestResults(this.name);
    
    try {
      // Run beforeAll hooks
      for (const hook of this.beforeAllHooks) {
        await hook();
      }

      // Run tests
      for (const test of this.tests) {
        try {
          // Run beforeEach hooks
          for (const hook of this.beforeEachHooks) {
            await hook();
          }

          // Run test
          await test.run();
          results.addSuccess(test.name);

          // Run afterEach hooks
          for (const hook of this.afterEachHooks) {
            await hook();
          }
        } catch (error) {
          results.addFailure(test.name, error);
        }
      }

      // Run afterAll hooks
      for (const hook of this.afterAllHooks) {
        await hook();
      }
    } catch (error) {
      results.addFailure('Suite setup/teardown', error);
    }

    return results;
  }
}

class Test {
  constructor(
    public name: string,
    private fn: () => void | Promise<void>
  ) {}

  async run(): Promise<void> {
    await this.fn();
  }
}

class TestResults {
  public passed: string[] = [];
  public failed: Array<{ name: string; error: any }> = [];

  constructor(public suiteName: string) {}

  addSuccess(testName: string): void {
    this.passed.push(testName);
  }

  addFailure(testName: string, error: any): void {
    this.failed.push({ name: testName, error });
  }

  get total(): number {
    return this.passed.length + this.failed.length;
  }

  get success(): boolean {
    return this.failed.length === 0;
  }
}

// Export singleton instance
export const testUtils = new PraxisTestUtils();
export const { expect } = TestMatchers;

// Export test utilities
export { TestSuite, TestResults };