// PraxisJS Security Module

import { createDOMPurify } from 'dompurify';

export interface SecurityConfig {
  csp?: CSPConfig;
  trustedTypes?: TrustedTypesConfig;
  xssProtection?: XSSProtectionConfig;
  corsHandling?: CORSConfig;
  sanitization?: SanitizationConfig;
}

export interface CSPConfig {
  mode?: 'strict' | 'moderate' | 'permissive';
  nonce?: string;
  allowInlineStyles?: boolean;
  allowInlineScripts?: boolean;
  reportOnly?: boolean;
  reportUri?: string;
}

export interface TrustedTypesConfig {
  enabled?: boolean;
  policyName?: string;
  allowDuplicates?: boolean;
  createHTML?: (input: string) => string;
  createScript?: (input: string) => string;
  createScriptURL?: (input: string) => string;
}

export interface XSSProtectionConfig {
  enabled?: boolean;
  sanitizeHTML?: boolean;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  customSanitizer?: (input: string) => string;
}

export interface CORSConfig {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export interface SanitizationConfig {
  html?: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    forbiddenTags?: string[];
    forbiddenAttributes?: string[];
  };
  urls?: {
    allowedProtocols?: string[];
    allowedDomains?: string[];
    blockExternalUrls?: boolean;
  };
}

export class SecurityManager {
  private config: Required<SecurityConfig>;
  private domPurify: any;
  private trustedTypesPolicy?: TrustedTypePolicy;
  private cspNonce?: string;

  constructor(config: SecurityConfig = {}) {
    this.config = this.mergeDefaultConfig(config);
    this.initializeDOMPurify();
    this.initializeTrustedTypes();
    this.initializeCSP();
  }

  private mergeDefaultConfig(config: SecurityConfig): Required<SecurityConfig> {
    return {
      csp: {
        mode: 'strict',
        nonce: this.generateNonce(),
        allowInlineStyles: false,
        allowInlineScripts: false,
        reportOnly: false,
        reportUri: '',
        ...config.csp
      },
      trustedTypes: {
        enabled: this.isTrustedTypesSupported(),
        policyName: 'praxis-policy',
        allowDuplicates: false,
        createHTML: (input: string) => this.sanitizeHTML(input),
        createScript: (input: string) => input, // Scripts should be pre-validated
        createScriptURL: (input: string) => this.validateScriptURL(input),
        ...config.trustedTypes
      },
      xssProtection: {
        enabled: true,
        sanitizeHTML: true,
        allowedTags: ['div', 'span', 'p', 'a', 'img', 'strong', 'em', 'ul', 'ol', 'li'],
        allowedAttributes: {
          'a': ['href', 'title'],
          'img': ['src', 'alt', 'title'],
          '*': ['class', 'id']
        },
        customSanitizer: undefined,
        ...config.xssProtection
      },
      corsHandling: {
        allowedOrigins: ['*'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: false,
        maxAge: 86400,
        ...config.corsHandling
      },
      sanitization: {
        html: {
          allowedTags: ['div', 'span', 'p', 'a', 'img', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
          allowedAttributes: {
            'a': ['href', 'title', 'target'],
            'img': ['src', 'alt', 'title', 'width', 'height'],
            '*': ['class', 'id', 'style']
          },
          forbiddenTags: ['script', 'iframe', 'object', 'embed'],
          forbiddenAttributes: ['onclick', 'onload', 'onerror'],
          ...config.sanitization?.html
        },
        urls: {
          allowedProtocols: ['http:', 'https:', 'mailto:', 'tel:'],
          allowedDomains: [],
          blockExternalUrls: false,
          ...config.sanitization?.urls
        },
        ...config.sanitization
      }
    };
  }

  private initializeDOMPurify(): void {
    if (typeof window !== 'undefined') {
      this.domPurify = createDOMPurify(window);
      
      // Configure DOMPurify with our settings
      this.domPurify.setConfig({
        ALLOWED_TAGS: this.config.sanitization.html.allowedTags,
        ALLOWED_ATTR: Object.values(this.config.sanitization.html.allowedAttributes).flat(),
        FORBID_TAGS: this.config.sanitization.html.forbiddenTags,
        FORBID_ATTR: this.config.sanitization.html.forbiddenAttributes,
        USE_PROFILES: { html: true },
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_TRUSTED_TYPE: this.config.trustedTypes.enabled
      });
    }
  }

  private initializeTrustedTypes(): void {
    if (this.config.trustedTypes.enabled && this.isTrustedTypesSupported()) {
      try {
        this.trustedTypesPolicy = (window as any).trustedTypes.createPolicy(
          this.config.trustedTypes.policyName,
          {
            createHTML: this.config.trustedTypes.createHTML,
            createScript: this.config.trustedTypes.createScript,
            createScriptURL: this.config.trustedTypes.createScriptURL
          },
          this.config.trustedTypes.allowDuplicates
        );
      } catch (error) {
        console.warn('Failed to create Trusted Types policy:', error);
      }
    }
  }

  private initializeCSP(): void {
    if (typeof document !== 'undefined') {
      this.cspNonce = this.config.csp.nonce;
      this.updateCSPHeaders();
    }
  }

  // Public API methods

  sanitizeHTML(html: string): string {
    if (!this.config.xssProtection.enabled) {
      return html;
    }

    if (this.config.xssProtection.customSanitizer) {
      return this.config.xssProtection.customSanitizer(html);
    }

    if (this.domPurify) {
      return this.domPurify.sanitize(html);
    }

    // Fallback basic sanitization
    return this.basicHTMLSanitization(html);
  }

  sanitizeURL(url: string): string {
    try {
      const parsedUrl = new URL(url);
      
      // Check protocol
      if (!this.config.sanitization.urls.allowedProtocols.includes(parsedUrl.protocol)) {
        throw new Error(`Protocol ${parsedUrl.protocol} not allowed`);
      }

      // Check domain if external URLs are blocked
      if (this.config.sanitization.urls.blockExternalUrls) {
        const currentDomain = window.location.hostname;
        if (parsedUrl.hostname !== currentDomain) {
          throw new Error('External URLs are blocked');
        }
      }

      // Check allowed domains
      if (this.config.sanitization.urls.allowedDomains.length > 0) {
        if (!this.config.sanitization.urls.allowedDomains.includes(parsedUrl.hostname)) {
          throw new Error(`Domain ${parsedUrl.hostname} not allowed`);
        }
      }

      return url;
    } catch (error) {
      console.warn('URL sanitization failed:', error);
      return '#';
    }
  }

  evaluateExpression(expression: string, context: Record<string, any>): any {
    // Create a safe evaluation context
    const safeContext = this.createSafeContext(context);
    
    try {
      // Check for dangerous patterns
      if (this.containsDangerousPatterns(expression)) {
        throw new Error('Expression contains dangerous patterns');
      }

      // Use Function constructor with restricted context
      const func = new Function(...Object.keys(safeContext), `return (${expression})`);
      return func(...Object.values(safeContext));
    } catch (error) {
      console.warn('Expression evaluation failed:', error);
      return undefined;
    }
  }

  createTrustedHTML(html: string): string | TrustedHTML {
    if (this.trustedTypesPolicy) {
      return this.trustedTypesPolicy.createHTML(html);
    }
    return this.sanitizeHTML(html);
  }

  createTrustedScript(script: string): string | TrustedScript {
    if (this.trustedTypesPolicy) {
      return this.trustedTypesPolicy.createScript(script);
    }
    return script;
  }

  createTrustedScriptURL(url: string): string | TrustedScriptURL {
    if (this.trustedTypesPolicy) {
      return this.trustedTypesPolicy.createScriptURL(url);
    }
    return this.sanitizeURL(url);
  }

  validateCORSRequest(origin: string, method: string, headers: string[]): boolean {
    // Check origin
    if (this.config.corsHandling.allowedOrigins[0] !== '*') {
      if (!this.config.corsHandling.allowedOrigins.includes(origin)) {
        return false;
      }
    }

    // Check method
    if (!this.config.corsHandling.allowedMethods.includes(method.toUpperCase())) {
      return false;
    }

    // Check headers
    for (const header of headers) {
      if (!this.config.corsHandling.allowedHeaders.includes(header)) {
        return false;
      }
    }

    return true;
  }

  generateCSPHeader(): string {
    const directives: string[] = [];

    switch (this.config.csp.mode) {
      case 'strict':
        directives.push("default-src 'self'");
        directives.push("script-src 'self'" + (this.config.csp.allowInlineScripts ? " 'unsafe-inline'" : "") + (this.cspNonce ? ` 'nonce-${this.cspNonce}'` : ""));
        directives.push("style-src 'self'" + (this.config.csp.allowInlineStyles ? " 'unsafe-inline'" : ""));
        directives.push("img-src 'self' data: https:");
        directives.push("font-src 'self'");
        directives.push("connect-src 'self'");
        directives.push("frame-src 'none'");
        directives.push("object-src 'none'");
        break;

      case 'moderate':
        directives.push("default-src 'self'");
        directives.push("script-src 'self' 'unsafe-inline'");
        directives.push("style-src 'self' 'unsafe-inline'");
        directives.push("img-src 'self' data: https:");
        directives.push("font-src 'self' https:");
        directives.push("connect-src 'self' https:");
        break;

      case 'permissive':
        directives.push("default-src 'self' 'unsafe-inline' 'unsafe-eval'");
        break;
    }

    if (this.config.csp.reportUri) {
      directives.push(`report-uri ${this.config.csp.reportUri}`);
    }

    return directives.join('; ');
  }

  // Private helper methods

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private isTrustedTypesSupported(): boolean {
    return typeof window !== 'undefined' && 'trustedTypes' in window;
  }

  private validateScriptURL(url: string): string {
    // Only allow same-origin script URLs or trusted CDNs
    const trustedDomains = ['cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com'];
    
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.origin === window.location.origin) {
        return url;
      }
      
      if (trustedDomains.includes(parsedUrl.hostname)) {
        return url;
      }
      
      throw new Error('Untrusted script URL');
    } catch {
      return '';
    }
  }

  private basicHTMLSanitization(html: string): string {
    // Basic regex-based sanitization as fallback
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, 'data:text/plain');
  }

  private createSafeContext(context: Record<string, any>): Record<string, any> {
    const safeContext: Record<string, any> = {};
    
    // Only include safe properties
    for (const [key, value] of Object.entries(context)) {
      if (this.isSafeContextValue(key, value)) {
        safeContext[key] = value;
      }
    }

    // Remove dangerous globals
    safeContext.window = undefined;
    safeContext.document = undefined;
    safeContext.eval = undefined;
    safeContext.Function = undefined;
    safeContext.setTimeout = undefined;
    safeContext.setInterval = undefined;

    return safeContext;
  }

  private isSafeContextValue(key: string, value: any): boolean {
    // Blacklist dangerous property names
    const dangerousKeys = ['__proto__', 'constructor', 'prototype', 'eval', 'function'];
    if (dangerousKeys.includes(key.toLowerCase())) {
      return false;
    }

    // Blacklist function values (except safe methods)
    if (typeof value === 'function') {
      return false;
    }

    return true;
  }

  private containsDangerousPatterns(expression: string): boolean {
    const dangerousPatterns = [
      /\b(eval|Function|setTimeout|setInterval)\b/,
      /\b(document|window|global)\b/,
      /\b(__proto__|constructor|prototype)\b/,
      /\bimport\b/,
      /\brequire\b/,
      /\.\s*constructor\s*\(/,
      /\[\s*["']constructor["']\s*\]/,
      /javascript:/i,
      /data:text\/html/i,
      /<script/i,
      /on\w+\s*=/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(expression));
  }

  private updateCSPHeaders(): void {
    if (typeof document !== 'undefined') {
      // Try to set CSP via meta tag if no server headers
      const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!existingMeta) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = this.generateCSPHeader();
        document.head.appendChild(meta);
      }
    }
  }
}

// Export singleton instance with default config
export const security = new SecurityManager();

// Security utility functions
export function sanitizeHTML(html: string): string {
  return security.sanitizeHTML(html);
}

export function sanitizeURL(url: string): string {
  return security.sanitizeURL(url);
}

export function createTrustedHTML(html: string): string | TrustedHTML {
  return security.createTrustedHTML(html);
}

export function evaluateExpression(expression: string, context: Record<string, any>): any {
  return security.evaluateExpression(expression, context);
}

// Security hooks for directives
export interface SecurityHooks {
  beforeHTMLInsert?: (html: string) => string;
  beforeURLNavigation?: (url: string) => string;
  beforeExpressionEvaluation?: (expression: string) => string;
  onSecurityViolation?: (violation: SecurityViolation) => void;
}

export interface SecurityViolation {
  type: 'xss' | 'csp' | 'cors' | 'trusted-types';
  message: string;
  element?: Element;
  expression?: string;
  url?: string;
}

export class SecurityHookManager {
  private hooks: SecurityHooks = {};

  registerHooks(hooks: SecurityHooks): void {
    this.hooks = { ...this.hooks, ...hooks };
  }

  beforeHTMLInsert(html: string): string {
    if (this.hooks.beforeHTMLInsert) {
      html = this.hooks.beforeHTMLInsert(html);
    }
    return security.sanitizeHTML(html);
  }

  beforeURLNavigation(url: string): string {
    if (this.hooks.beforeURLNavigation) {
      url = this.hooks.beforeURLNavigation(url);
    }
    return security.sanitizeURL(url);
  }

  beforeExpressionEvaluation(expression: string): string {
    if (this.hooks.beforeExpressionEvaluation) {
      expression = this.hooks.beforeExpressionEvaluation(expression);
    }
    return expression;
  }

  reportSecurityViolation(violation: SecurityViolation): void {
    console.warn('Security violation detected:', violation);
    
    if (this.hooks.onSecurityViolation) {
      this.hooks.onSecurityViolation(violation);
    }
  }
}

export const securityHooks = new SecurityHookManager();