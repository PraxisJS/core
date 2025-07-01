// Praxis - High-performance reactive JavaScript framework
// Main entry point for the library

// Core reactivity system
export { Signal, signal, computed, effect, batch, untrack } from './core/signal';
export { Component, ComponentLifecycle } from './core/component';
export { Scheduler } from './core/scheduler';
export { AdvancedReactivity } from './core/advanced-reactivity';

// Directives
export { BaseDirective, DirectiveBinding, DirectiveHandler } from './directives/base';
export * from './directives/index';

// Store management
export { defineStore, useStore, reactive, ref, shallowRef } from './store/store';
export { AsyncActions } from './store/async-actions';

// Security
export { SecurityManager, SecurityConfig } from './security/security';

// Testing utilities
export { PraxisTestUtils, TestMount, TestFireEvent } from './testing/testing';

// Production features
export { ProductionManager, ErrorBoundary, TelemetryManager } from './production/production';

// Accessibility
export { AccessibilityManager, AriaManager } from './accessibility/accessibility';

// Plugin system
export { Plugin, PluginManager } from './core/plugin';

// DevTools
export { DevTools } from './devtools/devtools';

// Main Praxis instance
export { praxis as default, praxis } from './praxis';

// Types
export * from './types/index';

// Version
export const version = '1.0.0';