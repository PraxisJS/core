// PraxisJS Production Features

export interface ProductionConfig {
  errorBoundaries?: ErrorBoundaryConfig;
  telemetry?: TelemetryConfig;
  monitoring?: MonitoringConfig;
  performance?: PerformanceConfig;
  analytics?: AnalyticsConfig;
  resourceHints?: ResourceHintsConfig;
  progressiveEnhancement?: ProgressiveEnhancementConfig;
}

export interface ErrorBoundaryConfig {
  enabled?: boolean;
  fallbackComponent?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  reportErrors?: boolean;
  retryable?: boolean;
  maxRetries?: number;
}

export interface TelemetryConfig {
  enabled?: boolean;
  endpoint?: string;
  apiKey?: string;
  sampleRate?: number;
  batchSize?: number;
  flushInterval?: number;
  includeUserAgent?: boolean;
  includePerformanceMetrics?: boolean;
}

export interface MonitoringConfig {
  enabled?: boolean;
  performanceObserver?: boolean;
  memoryMonitoring?: boolean;
  errorTracking?: boolean;
  vitalsTracking?: boolean;
  customMetrics?: string[];
}

export interface PerformanceConfig {
  enabled?: boolean;
  measureComponents?: boolean;
  measureDirectives?: boolean;
  measureStoreActions?: boolean;
  threshold?: number;
  bufferSize?: number;
}

export interface AnalyticsConfig {
  enabled?: boolean;
  provider?: 'google' | 'custom';
  trackingId?: string;
  customProvider?: AnalyticsProvider;
  autoTrack?: {
    pageViews?: boolean;
    clicks?: boolean;
    formSubmissions?: boolean;
    errors?: boolean;
  };
}

export interface ResourceHintsConfig {
  preload?: string[];
  prefetch?: string[];
  preconnect?: string[];
  dnsPrefetch?: string[];
  modulePreload?: string[];
}

export interface ProgressiveEnhancementConfig {
  enabled?: boolean;
  gracefulDegradation?: boolean;
  jsDisabledFallback?: boolean;
  cssDisabledFallback?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
}

export interface ErrorInfo {
  componentStack?: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
}

export interface AnalyticsProvider {
  track(event: string, properties?: Record<string, any>): void;
  identify(userId: string, properties?: Record<string, any>): void;
  page(properties?: Record<string, any>): void;
}

export class ProductionManager {
  private config: Required<ProductionConfig>;
  private errorBoundaries: Map<string, ErrorBoundary> = new Map();
  private telemetryQueue: TelemetryEvent[] = [];
  private performanceObserver?: PerformanceObserver;
  private memoryMonitor?: MemoryMonitor;
  private telemetryTimer?: number;

  constructor(config: ProductionConfig = {}) {
    this.config = this.mergeDefaultConfig(config);
    this.initialize();
  }

  private mergeDefaultConfig(config: ProductionConfig): Required<ProductionConfig> {
    return {
      errorBoundaries: {
        enabled: true,
        fallbackComponent: '<div class="error-boundary">Something went wrong. Please refresh the page.</div>',
        onError: (error, errorInfo) => console.error('Error boundary caught:', error, errorInfo),
        reportErrors: true,
        retryable: true,
        maxRetries: 3,
        ...config.errorBoundaries
      },
      telemetry: {
        enabled: false,
        endpoint: '/api/telemetry',
        apiKey: '',
        sampleRate: 1.0,
        batchSize: 10,
        flushInterval: 30000,
        includeUserAgent: true,
        includePerformanceMetrics: true,
        ...config.telemetry
      },
      monitoring: {
        enabled: true,
        performanceObserver: true,
        memoryMonitoring: true,
        errorTracking: true,
        vitalsTracking: true,
        customMetrics: [],
        ...config.monitoring
      },
      performance: {
        enabled: true,
        measureComponents: true,
        measureDirectives: true,
        measureStoreActions: true,
        threshold: 16, // 60fps threshold
        bufferSize: 1000,
        ...config.performance
      },
      analytics: {
        enabled: false,
        provider: 'google',
        trackingId: '',
        customProvider: undefined,
        autoTrack: {
          pageViews: true,
          clicks: true,
          formSubmissions: true,
          errors: true
        },
        ...config.analytics
      },
      resourceHints: {
        preload: [],
        prefetch: [],
        preconnect: [],
        dnsPrefetch: [],
        modulePreload: [],
        ...config.resourceHints
      },
      progressiveEnhancement: {
        enabled: true,
        gracefulDegradation: true,
        jsDisabledFallback: true,
        cssDisabledFallback: true,
        reducedMotion: true,
        highContrast: true,
        ...config.progressiveEnhancement
      }
    };
  }

  private initialize(): void {
    if (this.config.monitoring.enabled) {
      this.initializeMonitoring();
    }

    if (this.config.telemetry.enabled) {
      this.initializeTelemetry();
    }

    if (this.config.analytics.enabled) {
      this.initializeAnalytics();
    }

    if (this.config.resourceHints) {
      this.addResourceHints();
    }

    if (this.config.progressiveEnhancement.enabled) {
      this.initializeProgressiveEnhancement();
    }
  }

  // Error Boundary Management
  createErrorBoundary(id: string, element: HTMLElement): ErrorBoundary {
    const boundary = new ErrorBoundary(id, element, this.config.errorBoundaries);
    this.errorBoundaries.set(id, boundary);
    return boundary;
  }

  handleError(error: Error, errorInfo: ErrorInfo): void {
    // Report to error boundary
    if (this.config.errorBoundaries.onError) {
      this.config.errorBoundaries.onError(error, errorInfo);
    }

    // Send telemetry
    if (this.config.telemetry.enabled) {
      this.trackEvent('error', {
        message: error.message,
        stack: error.stack,
        ...errorInfo
      });
    }

    // Track in analytics
    if (this.config.analytics.enabled && this.config.analytics.autoTrack?.errors) {
      this.trackAnalyticsEvent('praxis_error', {
        error_message: error.message,
        error_type: error.constructor.name
      });
    }
  }

  // Performance Monitoring
  measurePerformance(name: string, fn: Function): any {
    if (!this.config.performance.enabled) {
      return fn();
    }

    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > this.config.performance.threshold) {
      this.trackEvent('slow_operation', {
        operation: name,
        duration,
        threshold: this.config.performance.threshold
      });
    }

    // Record performance mark
    performance.mark(`praxis-${name}-start`);
    performance.mark(`praxis-${name}-end`);
    performance.measure(`praxis-${name}`, `praxis-${name}-start`, `praxis-${name}-end`);

    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.config.performance.enabled) {
      return fn();
    }

    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > this.config.performance.threshold) {
      this.trackEvent('slow_async_operation', {
        operation: name,
        duration,
        threshold: this.config.performance.threshold
      });
    }

    return result;
  }

  // Telemetry
  trackEvent(event: string, data: Record<string, any> = {}): void {
    if (!this.config.telemetry.enabled) {
      return;
    }

    if (Math.random() > this.config.telemetry.sampleRate) {
      return;
    }

    const telemetryEvent: TelemetryEvent = {
      event,
      data,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      userAgent: this.config.telemetry.includeUserAgent ? navigator.userAgent : undefined,
      url: window.location.href
    };

    this.telemetryQueue.push(telemetryEvent);

    if (this.telemetryQueue.length >= this.config.telemetry.batchSize) {
      this.flushTelemetry();
    }
  }

  // Analytics
  trackAnalyticsEvent(event: string, properties: Record<string, any> = {}): void {
    if (!this.config.analytics.enabled) {
      return;
    }

    if (this.config.analytics.customProvider) {
      this.config.analytics.customProvider.track(event, properties);
    } else if (this.config.analytics.provider === 'google' && typeof gtag !== 'undefined') {
      gtag('event', event, properties);
    }
  }

  trackPageView(path?: string): void {
    if (!this.config.analytics.enabled) {
      return;
    }

    const properties = {
      page_path: path || window.location.pathname,
      page_title: document.title
    };

    if (this.config.analytics.customProvider) {
      this.config.analytics.customProvider.page(properties);
    } else if (this.config.analytics.provider === 'google' && typeof gtag !== 'undefined') {
      gtag('config', this.config.analytics.trackingId, properties);
    }
  }

  // Memory Leak Detection
  detectMemoryLeaks(): MemoryReport {
    const memoryInfo = this.getMemoryInfo();
    const report: MemoryReport = {
      timestamp: Date.now(),
      heapUsed: memoryInfo.usedJSHeapSize,
      heapTotal: memoryInfo.totalJSHeapSize,
      heapLimit: memoryInfo.jsHeapSizeLimit,
      components: this.getComponentMemoryUsage(),
      stores: this.getStoreMemoryUsage(),
      leaksDetected: []
    };

    // Simple leak detection - rapid memory growth
    const previousReport = this.getLastMemoryReport();
    if (previousReport) {
      const growthRate = (report.heapUsed - previousReport.heapUsed) / (report.timestamp - previousReport.timestamp);
      if (growthRate > 1000) { // More than 1KB per ms
        report.leaksDetected.push({
          type: 'rapid_growth',
          severity: 'high',
          description: `Memory growing at ${growthRate.toFixed(2)} bytes/ms`
        });
      }
    }

    this.saveMemoryReport(report);
    return report;
  }

  // Progressive Enhancement
  enhanceProgressively(element: HTMLElement): void {
    if (!this.config.progressiveEnhancement.enabled) {
      return;
    }

    // Check for reduced motion preference
    if (this.config.progressiveEnhancement.reducedMotion && this.prefersReducedMotion()) {
      element.classList.add('reduce-motion');
    }

    // Check for high contrast preference
    if (this.config.progressiveEnhancement.highContrast && this.prefersHighContrast()) {
      element.classList.add('high-contrast');
    }

    // Add fallback attributes for no-JS scenarios
    if (this.config.progressiveEnhancement.jsDisabledFallback) {
      this.addNoJSFallbacks(element);
    }
  }

  // Resource Hints
  private addResourceHints(): void {
    const head = document.head;

    // Preload resources
    this.config.resourceHints.preload.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = this.getResourceType(url);
      head.appendChild(link);
    });

    // Prefetch resources
    this.config.resourceHints.prefetch.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      head.appendChild(link);
    });

    // Preconnect to origins
    this.config.resourceHints.preconnect.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      head.appendChild(link);
    });

    // DNS prefetch
    this.config.resourceHints.dnsPrefetch.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      head.appendChild(link);
    });

    // Module preload
    this.config.resourceHints.modulePreload.forEach(module => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = module;
      head.appendChild(link);
    });
  }

  // Private helper methods
  private initializeMonitoring(): void {
    if (this.config.monitoring.performanceObserver && 'PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    }

    if (this.config.monitoring.memoryMonitoring) {
      this.memoryMonitor = new MemoryMonitor(this);
      this.memoryMonitor.start();
    }

    if (this.config.monitoring.vitalsTracking) {
      this.trackWebVitals();
    }
  }

  private initializeTelemetry(): void {
    // Set up automatic flushing
    this.telemetryTimer = window.setInterval(() => {
      this.flushTelemetry();
    }, this.config.telemetry.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushTelemetry();
    });
  }

  private initializeAnalytics(): void {
    if (this.config.analytics.autoTrack?.pageViews) {
      this.trackPageView();
    }

    if (this.config.analytics.autoTrack?.clicks) {
      document.addEventListener('click', (event) => {
        this.trackAnalyticsEvent('click', {
          element: (event.target as Element).tagName,
          text: (event.target as Element).textContent?.slice(0, 100)
        });
      });
    }

    if (this.config.analytics.autoTrack?.formSubmissions) {
      document.addEventListener('submit', (event) => {
        this.trackAnalyticsEvent('form_submit', {
          form_id: (event.target as HTMLFormElement).id,
          form_action: (event.target as HTMLFormElement).action
        });
      });
    }
  }

  private initializeProgressiveEnhancement(): void {
    document.documentElement.classList.add('js-enabled');
    
    if (this.config.progressiveEnhancement.gracefulDegradation) {
      this.setupGracefulDegradation();
    }
  }

  private flushTelemetry(): void {
    if (this.telemetryQueue.length === 0) {
      return;
    }

    const events = [...this.telemetryQueue];
    this.telemetryQueue = [];

    fetch(this.config.telemetry.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.telemetry.apiKey}`
      },
      body: JSON.stringify({ events })
    }).catch(error => {
      console.warn('Failed to send telemetry:', error);
      // Re-queue events on failure
      this.telemetryQueue.unshift(...events);
    });
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    if (entry.name.startsWith('praxis-')) {
      this.trackEvent('performance_measure', {
        name: entry.name,
        duration: entry.duration,
        startTime: entry.startTime
      });
    }
  }

  private trackWebVitals(): void {
    // Track Core Web Vitals if available
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcp = entries[entries.length - 1];
        this.trackEvent('web_vital_lcp', { value: lcp.startTime });
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackEvent('web_vital_fid', { value: entry.processingStart - entry.startTime });
        }
      }).observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.trackEvent('web_vital_cls', { value: clsValue });
      }).observe({ type: 'layout-shift', buffered: true });
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('praxis_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2);
      sessionStorage.setItem('praxis_session_id', sessionId);
    }
    return sessionId;
  }

  private getMemoryInfo(): any {
    return (performance as any).memory || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };
  }

  private getComponentMemoryUsage(): ComponentMemoryUsage[] {
    // Placeholder - would track actual component memory in real implementation
    return [];
  }

  private getStoreMemoryUsage(): StoreMemoryUsage[] {
    // Placeholder - would track actual store memory in real implementation
    return [];
  }

  private getLastMemoryReport(): MemoryReport | null {
    const stored = localStorage.getItem('praxis_last_memory_report');
    return stored ? JSON.parse(stored) : null;
  }

  private saveMemoryReport(report: MemoryReport): void {
    localStorage.setItem('praxis_last_memory_report', JSON.stringify(report));
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private prefersHighContrast(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  private addNoJSFallbacks(element: HTMLElement): void {
    // Add noscript fallbacks for key functionality
    const noscript = document.createElement('noscript');
    noscript.innerHTML = '<style>.js-only { display: none !important; }</style>';
    document.head.appendChild(noscript);
  }

  private setupGracefulDegradation(): void {
    // Handle script loading failures
    window.addEventListener('error', (event) => {
      if (event.target && (event.target as any).tagName === 'SCRIPT') {
        console.warn('Script failed to load, falling back to basic functionality');
        document.documentElement.classList.add('js-degraded');
      }
    });
  }

  private getResourceType(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': return 'script';
      case 'css': return 'style';
      case 'woff':
      case 'woff2':
      case 'ttf': return 'font';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'svg':
      case 'webp': return 'image';
      default: return 'fetch';
    }
  }
}

// Error Boundary Implementation
export class ErrorBoundary {
  private retryCount = 0;
  private originalContent: string;

  constructor(
    public id: string,
    public element: HTMLElement,
    private config: ErrorBoundaryConfig
  ) {
    this.originalContent = element.innerHTML;
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    // Catch JavaScript errors in this boundary
    window.addEventListener('error', (event) => {
      if (this.element.contains(event.target as Node)) {
        this.handleError(new Error(event.message), {
          componentStack: this.getComponentStack(),
          errorBoundary: this.id,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        });
      }
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        componentStack: this.getComponentStack(),
        errorBoundary: this.id,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    });
  }

  private handleError(error: Error, errorInfo: ErrorInfo): void {
    if (this.config.onError) {
      this.config.onError(error, errorInfo);
    }

    this.showFallbackUI();

    if (this.config.retryable && this.retryCount < this.config.maxRetries!) {
      setTimeout(() => this.retry(), 1000 * Math.pow(2, this.retryCount));
    }
  }

  private showFallbackUI(): void {
    this.element.innerHTML = this.config.fallbackComponent!;
    this.element.classList.add('error-boundary-active');
  }

  private retry(): void {
    this.retryCount++;
    this.element.innerHTML = this.originalContent;
    this.element.classList.remove('error-boundary-active');
  }

  private getComponentStack(): string {
    // Build component stack from DOM hierarchy
    const stack: string[] = [];
    let current: HTMLElement | null = this.element;
    
    while (current) {
      if (current.hasAttribute('x-data')) {
        stack.push(current.tagName.toLowerCase());
      }
      current = current.parentElement;
    }
    
    return stack.join(' > ');
  }
}

// Memory Monitor
class MemoryMonitor {
  private interval?: number;

  constructor(private manager: ProductionManager) {}

  start(): void {
    this.interval = window.setInterval(() => {
      const report = this.manager.detectMemoryLeaks();
      
      if (report.leaksDetected.length > 0) {
        console.warn('Memory leaks detected:', report.leaksDetected);
      }
    }, 30000); // Check every 30 seconds
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

// Types
interface TelemetryEvent {
  event: string;
  data: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userAgent?: string;
  url: string;
}

interface MemoryReport {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  components: ComponentMemoryUsage[];
  stores: StoreMemoryUsage[];
  leaksDetected: MemoryLeak[];
}

interface ComponentMemoryUsage {
  id: string;
  memoryUsage: number;
  elementCount: number;
}

interface StoreMemoryUsage {
  name: string;
  memoryUsage: number;
  stateSize: number;
}

interface MemoryLeak {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

// Export singleton instance
export const production = new ProductionManager();