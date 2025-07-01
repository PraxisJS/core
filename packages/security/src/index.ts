import DOMPurify from 'dompurify';

// Content Security Policy utilities
export interface CSPConfig {
  directives: Record<string, string[]>;
  reportUri?: string;
}

export function generateCSP(config: CSPConfig): string {
  const directives = Object.entries(config.directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
  
  if (config.reportUri) {
    return `${directives}; report-uri ${config.reportUri}`;
  }
  
  return directives;
}

// XSS Protection
export function sanitizeHTML(html: string, options?: DOMPurify.Config): string {
  return DOMPurify.sanitize(html, options);
}

// Trusted Types support
export function createTrustedHTML(html: string): TrustedHTML | string {
  if (typeof window !== 'undefined' && window.trustedTypes) {
    const policy = window.trustedTypes.createPolicy('praxis-security', {
      createHTML: (input: string) => DOMPurify.sanitize(input)
    });
    return policy.createHTML(html);
  }
  return sanitizeHTML(html);
}

// Security headers middleware
export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Content-Type-Options'?: string;
  'X-Frame-Options'?: string;
  'X-XSS-Protection'?: string;
  'Strict-Transport-Security'?: string;
}

export function getSecurityHeaders(csp?: CSPConfig): SecurityHeaders {
  const headers: SecurityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };
  
  if (csp) {
    headers['Content-Security-Policy'] = generateCSP(csp);
  }
  
  return headers;
}

// Export all functionality
export {
  DOMPurify
};