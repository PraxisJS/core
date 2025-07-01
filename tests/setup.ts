// Test setup file
import { beforeEach, afterEach, vi } from 'vitest';

// Mock DOM APIs that might not be available in test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
    },
  },
});

// Mock MessageChannel
global.MessageChannel = vi.fn().mockImplementation(() => ({
  port1: {
    onmessage: null,
    postMessage: vi.fn(),
  },
  port2: {
    onmessage: null,
    postMessage: vi.fn(),
  },
}));

// Mock requestIdleCallback
global.requestIdleCallback = vi.fn((callback) => {
  return setTimeout(callback, 0);
});

global.cancelIdleCallback = vi.fn((id) => {
  clearTimeout(id);
});

// Clean up DOM after each test
beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});