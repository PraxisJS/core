// Comprehensive Test Suite for PraxisJS

import { CoralTestUtils, TestSuite, expect } from '../src/testing/testing.js';
import { SecurityManager } from '../src/security/security.js';
import { ProductionManager } from '../src/production/production.js';
import { AccessibilityManager } from '../src/accessibility/accessibility.js';

const testUtils = new CoralTestUtils();

// Core Functionality Tests
export const coreTests = new TestSuite('Core Framework Tests');

coreTests.beforeEach(async () => {
  testUtils.cleanup();
});

coreTests.test('should initialize component with x-data', async () => {
  const wrapper = testUtils.mount('<div x-data="{ count: 0 }">Count: <span x-text="count"></span></div>');
  
  expect(wrapper.text()).toContain('Count: 0');
  expect(wrapper.vm.$data.count).toBe(0);
});

coreTests.test('should handle x-text directive', async () => {
  const wrapper = testUtils.mount(`
    <div x-data="{ message: 'Hello World' }">
      <span x-text="message"></span>
    </div>
  `);
  
  expect(wrapper.find('span')?.text()).toBe('Hello World');
  
  await wrapper.setData({ message: 'Updated' });
  expect(wrapper.find('span')?.text()).toBe('Updated');
});

coreTests.test('should handle x-model directive', async () => {
  const wrapper = testUtils.mount(`
    <div x-data="{ value: '' }">
      <input x-model="value" />
      <span x-text="value"></span>
    </div>
  `);
  
  const input = wrapper.find('input')!;
  await input.trigger('input', { target: { value: 'test' } });
  
  expect(wrapper.vm.$data.value).toBe('test');
  expect(wrapper.find('span')?.text()).toBe('test');
});

coreTests.test('should handle x-show directive', async () => {
  const wrapper = testUtils.mount(`
    <div x-data="{ visible: true }">
      <div x-show="visible" id="target">Content</div>
    </div>
  `);
  
  const target = wrapper.find('#target')!;
  expect(target.isVisible()).toBe(true);
  
  await wrapper.setData({ visible: false });
  expect(target.isVisible()).toBe(false);
});

coreTests.test('should handle x-on directive', async () => {
  const wrapper = testUtils.mount(`
    <div x-data="{ count: 0 }">
      <button x-on:click="count++" id="btn">Click</button>
      <span x-text="count"></span>
    </div>
  `);
  
  const button = wrapper.find('#btn')!;
  await button.trigger('click');
  
  expect(wrapper.vm.$data.count).toBe(1);
  expect(wrapper.find('span')?.text()).toBe('1');
});

coreTests.test('should handle x-if directive', async () => {
  const wrapper = testUtils.mount(`
    <div x-data="{ show: true }">
      <div x-if="show" id="conditional">Visible</div>
    </div>
  `);
  
  expect(wrapper.find('#conditional')?.exists()).toBe(true);
  
  await wrapper.setData({ show: false });
  expect(wrapper.find('#conditional')?.exists()).toBe(false);
});

coreTests.test('should handle x-for directive', async () => {
  const wrapper = testUtils.mount(`
    <div x-data="{ items: ['a', 'b', 'c'] }">
      <ul>
        <template x-for="item in items">
          <li x-text="item"></li>
        </template>
      </ul>
    </div>
  `);
  
  const items = wrapper.findAll('li');
  expect(items).toHaveLength(3);
  expect(items[0].text()).toBe('a');
  expect(items[1].text()).toBe('b');
  expect(items[2].text()).toBe('c');
});

// Security Tests
export const securityTests = new TestSuite('Security Tests');

securityTests.test('should sanitize HTML content', () => {
  const security = new SecurityManager();
  
  const maliciousHTML = '<script>alert("xss")</script><p>Safe content</p>';
  const sanitized = security.sanitizeHTML(maliciousHTML);
  
  expect(sanitized).not.toContain('<script>');
  expect(sanitized).toContain('<p>Safe content</p>');
});

securityTests.test('should validate URLs', () => {
  const security = new SecurityManager();
  
  const safeURL = 'https://example.com/page';
  const maliciousURL = 'javascript:alert("xss")';
  
  expect(security.sanitizeURL(safeURL)).toBe(safeURL);
  expect(security.sanitizeURL(maliciousURL)).toBe('#');
});

securityTests.test('should prevent dangerous expressions', () => {
  const security = new SecurityManager();
  
  const safeExpression = 'count + 1';
  const dangerousExpression = 'window.location = "evil.com"';
  
  const result1 = security.evaluateExpression(safeExpression, { count: 5 });
  const result2 = security.evaluateExpression(dangerousExpression, {});
  
  expect(result1).toBe(6);
  expect(result2).toBeUndefined();
});

securityTests.test('should generate proper CSP headers', () => {
  const security = new SecurityManager({
    csp: { mode: 'strict' }
  });
  
  const header = security.generateCSPHeader();
  
  expect(header).toContain("default-src 'self'");
  expect(header).toContain("script-src 'self'");
  expect(header).toContain("object-src 'none'");
});

securityTests.test('should handle Trusted Types', () => {
  const security = new SecurityManager({
    trustedTypes: { enabled: true }
  });
  
  const html = '<p>Safe content</p>';
  const trustedHTML = security.createTrustedHTML(html);
  
  expect(typeof trustedHTML === 'string' || trustedHTML instanceof TrustedHTML).toBe(true);
});

// Accessibility Tests
export const accessibilityTests = new TestSuite('Accessibility Tests');

accessibilityTests.test('should announce messages to screen readers', async () => {
  const accessibility = new AccessibilityManager();
  
  // Mock live region
  const liveRegion = document.createElement('div');
  document.body.appendChild(liveRegion);
  (accessibility as any).liveRegion = liveRegion;
  
  accessibility.announce('Test message');
  
  await new Promise(resolve => setTimeout(resolve, 150));
  expect(liveRegion.textContent).toBe('Test message');
  
  document.body.removeChild(liveRegion);
});

accessibilityTests.test('should validate color contrast', () => {
  const accessibility = new AccessibilityManager();
  
  const result = accessibility.validateColorContrast('#000000', '#ffffff');
  
  expect(result.passes).toBe(true);
  expect(result.level).toBe('AAA');
  expect(result.ratio).toBeGreaterThan(7);
});

accessibilityTests.test('should manage focus properly', () => {
  const accessibility = new AccessibilityManager();
  
  const element = document.createElement('button');
  element.textContent = 'Test Button';
  document.body.appendChild(element);
  
  accessibility.manageFocus(element, { restoreFocus: true });
  
  expect(document.activeElement).toBe(element);
  
  document.body.removeChild(element);
});

accessibilityTests.test('should create accessible skip links', () => {
  const accessibility = new AccessibilityManager();
  
  accessibility.addSkipLink('Skip to content', '#main');
  
  const skipLink = document.querySelector('.praxis-skip-link') as HTMLElement;
  expect(skipLink).toBeTruthy();
  expect(skipLink.textContent).toBe('Skip to content');
});

// Performance Tests
export const performanceTests = new TestSuite('Performance Tests');

performanceTests.test('should measure component performance', async () => {
  const production = new ProductionManager({
    performance: { enabled: true, threshold: 10 }
  });
  
  const result = production.measurePerformance('test-operation', () => {
    // Simulate work
    const start = Date.now();
    while (Date.now() - start < 5) {
      // Small delay
    }
    return 'result';
  });
  
  expect(result).toBe('result');
});

performanceTests.test('should track memory usage', () => {
  const production = new ProductionManager({
    monitoring: { enabled: true, memoryMonitoring: true }
  });
  
  const report = production.detectMemoryLeaks();
  
  expect(report.timestamp).toBeGreaterThan(0);
  expect(report.heapUsed).toBeGreaterThan(0);
  expect(Array.isArray(report.leaksDetected)).toBe(true);
});

performanceTests.test('should handle error boundaries', () => {
  const production = new ProductionManager({
    errorBoundaries: { enabled: true }
  });
  
  const element = document.createElement('div');
  element.innerHTML = '<p>Original content</p>';
  document.body.appendChild(element);
  
  const boundary = production.createErrorBoundary('test', element);
  
  const error = new Error('Test error');
  const errorInfo = {
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  production.handleError(error, errorInfo);
  
  document.body.removeChild(element);
});

// Advanced Directives Tests
export const advancedDirectivesTests = new TestSuite('Advanced Directives Tests');

advancedDirectivesTests.test('should handle x-intersect directive', async () => {
  // Mock IntersectionObserver
  const mockObserver = {
    observe: jest.fn(),
    disconnect: jest.fn()
  };
  
  global.IntersectionObserver = jest.fn().mockImplementation(() => mockObserver);
  
  const wrapper = testUtils.mount(`
    <div x-data="{ visible: false }" style="height: 100px;">
      <div x-intersect="visible = true" id="target">Target</div>
    </div>
  `);
  
  expect(mockObserver.observe).toHaveBeenCalled();
  
  wrapper.destroy();
  expect(mockObserver.disconnect).toHaveBeenCalled();
});

advancedDirectivesTests.test('should handle x-clickaway directive', async () => {
  const wrapper = testUtils.mount(`
    <div x-data="{ open: true }">
      <div x-clickaway="open = false" id="target">Content</div>
    </div>
  `);
  
  // Simulate click outside
  const outsideElement = document.createElement('div');
  document.body.appendChild(outsideElement);
  
  await testUtils.fireEvent(outsideElement, 'click');
  
  expect(wrapper.vm.$data.open).toBe(false);
  
  document.body.removeChild(outsideElement);
});

advancedDirectivesTests.test('should handle x-hotkey directive', async () => {
  const wrapper = testUtils.mount(`
    <div x-data="{ triggered: false }">
      <div x-hotkey="'ctrl+k'" x-on:keydown="triggered = true" id="target">Target</div>
    </div>
  `);
  
  const target = wrapper.find('#target')!;
  
  await target.trigger('keydown', {
    key: 'k',
    ctrlKey: true
  });
  
  expect(wrapper.vm.$data.triggered).toBe(true);
});

// Store Tests
export const storeTests = new TestSuite('Store Tests');

storeTests.test('should create and use stores', () => {
  const mockStore = testUtils.mockStore('test', {
    state: { count: 0 },
    actions: {
      increment() {
        this.$state.count++;
      }
    }
  });
  
  expect(mockStore.state.count).toBe(0);
  
  mockStore.actions.increment();
  expect(mockStore.state.count).toBe(1);
});

storeTests.test('should handle computed getters', () => {
  const mockStore = testUtils.mockStore('computed-test', {
    state: { items: [1, 2, 3] },
    getters: {
      total: (state) => state.items.reduce((sum, item) => sum + item, 0)
    }
  });
  
  expect(mockStore.getters.total).toBe(6);
});

// Integration Tests
export const integrationTests = new TestSuite('Integration Tests');

integrationTests.test('should work with complex nested components', async () => {
  const wrapper = testUtils.mount(`
    <div x-data="{ parent: { child: { value: 'test' } } }">
      <div x-data="{ local: 'local' }">
        <span x-text="parent.child.value" id="nested"></span>
        <span x-text="local" id="local"></span>
      </div>
    </div>
  `);
  
  expect(wrapper.find('#nested')?.text()).toBe('test');
  expect(wrapper.find('#local')?.text()).toBe('local');
});

integrationTests.test('should handle multiple directives on same element', async () => {
  const wrapper = testUtils.mount(`
    <div x-data="{ show: true, text: 'Hello' }">
      <div x-show="show" x-text="text" id="multi"></div>
    </div>
  `);
  
  const target = wrapper.find('#multi')!;
  expect(target.text()).toBe('Hello');
  expect(target.isVisible()).toBe(true);
  
  await wrapper.setData({ show: false });
  expect(target.isVisible()).toBe(false);
});

// Security Audit Tests
export const securityAuditTests = new TestSuite('Security Audit Tests');

securityAuditTests.test('should detect XSS vulnerabilities', () => {
  const security = new SecurityManager();
  
  const xssPayloads = [
    '<script>alert(1)</script>',
    'javascript:alert(1)',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    'data:text/html,<script>alert(1)</script>'
  ];
  
  xssPayloads.forEach(payload => {
    const sanitized = security.sanitizeHTML(payload);
    expect(sanitized.toLowerCase()).not.toContain('script');
    expect(sanitized.toLowerCase()).not.toContain('javascript:');
    expect(sanitized.toLowerCase()).not.toContain('onerror');
    expect(sanitized.toLowerCase()).not.toContain('onload');
  });
});

securityAuditTests.test('should prevent prototype pollution', () => {
  const security = new SecurityManager();
  
  const maliciousExpression = 'constructor.prototype.isAdmin = true';
  const result = security.evaluateExpression(maliciousExpression, {});
  
  expect(result).toBeUndefined();
  expect((Object.prototype as any).isAdmin).toBeUndefined();
});

securityAuditTests.test('should validate CSP compliance', () => {
  const security = new SecurityManager();
  
  const inlineScript = '<script>alert(1)</script>';
  const sanitized = security.sanitizeHTML(inlineScript);
  
  expect(sanitized).not.toContain('<script>');
  
  const cspHeader = security.generateCSPHeader();
  expect(cspHeader).toContain("script-src 'self'");
});

// Test Runner
export class TestRunner {
  private suites: TestSuite[] = [];
  
  addSuite(suite: TestSuite): void {
    this.suites.push(suite);
  }
  
  async runAll(): Promise<TestRunnerResults> {
    const results: TestRunnerResults = {
      totalSuites: this.suites.length,
      totalTests: 0,
      passed: 0,
      failed: 0,
      duration: 0,
      suiteResults: []
    };
    
    const startTime = performance.now();
    
    for (const suite of this.suites) {
      const suiteResult = await suite.run();
      results.suiteResults.push(suiteResult);
      results.totalTests += suiteResult.total;
      results.passed += suiteResult.passed.length;
      results.failed += suiteResult.failed.length;
    }
    
    results.duration = performance.now() - startTime;
    return results;
  }
  
  generateReport(results: TestRunnerResults): string {
    let report = 'PraxisJS Test Suite Results\n';
    report += '========================\n\n';
    
    report += `Total Suites: ${results.totalSuites}\n`;
    report += `Total Tests: ${results.totalTests}\n`;
    report += `Passed: ${results.passed}\n`;
    report += `Failed: ${results.failed}\n`;
    report += `Duration: ${results.duration.toFixed(2)}ms\n\n`;
    
    results.suiteResults.forEach(suite => {
      report += `${suite.suiteName}: `;
      if (suite.success) {
        report += `✓ All ${suite.passed.length} tests passed\n`;
      } else {
        report += `✗ ${suite.failed.length} of ${suite.total} tests failed\n`;
        suite.failed.forEach(failure => {
          report += `  - ${failure.name}: ${failure.error.message}\n`;
        });
      }
    });
    
    return report;
  }
}

interface TestRunnerResults {
  totalSuites: number;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  suiteResults: any[];
}

// Main test execution
export async function runComprehensiveTests(): Promise<void> {
  const runner = new TestRunner();
  
  // Add all test suites
  runner.addSuite(coreTests);
  runner.addSuite(securityTests);
  runner.addSuite(accessibilityTests);
  runner.addSuite(performanceTests);
  runner.addSuite(advancedDirectivesTests);
  runner.addSuite(storeTests);
  runner.addSuite(integrationTests);
  runner.addSuite(securityAuditTests);
  
  console.log('Running comprehensive test suite...\n');
  
  const results = await runner.runAll();
  const report = runner.generateReport(results);
  
  console.log(report);
  
  if (results.failed > 0) {
    process.exit(1);
  }
}

// Export for external use
export { testUtils, TestSuite, expect };