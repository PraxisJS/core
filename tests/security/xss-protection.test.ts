import { describe, it, expect, beforeEach } from 'vitest';

describe('XSS Protection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('HTML Sanitization', () => {
    const sanitizeHTML = (html: string): string => {
      // Mock sanitization function
      const allowedTags = ['div', 'span', 'p', 'strong', 'em', 'br'];
      const allowedAttributes = ['class', 'id'];
      
      // Simple sanitization logic for testing
      let sanitized = html;
      
      // Remove script tags
      sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
      
      // Remove javascript: protocol
      sanitized = sanitized.replace(/javascript:/gi, '');
      
      // Remove on* event handlers
      sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
      
      return sanitized;
    };

    it('should remove script tags', () => {
      const maliciousHTML = '<div>Safe content</div><script>alert("XSS")</script>';
      const sanitized = sanitizeHTML(maliciousHTML);
      
      expect(sanitized).toBe('<div>Safe content</div>');
      expect(sanitized).not.toContain('<script>');
    });

    it('should remove javascript: protocol from links', () => {
      const maliciousHTML = '<a href="javascript:alert(\'XSS\')">Click me</a>';
      const sanitized = sanitizeHTML(maliciousHTML);
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toBe('<a href="">Click me</a>');
    });

    it('should remove event handlers', () => {
      const maliciousHTML = '<div onclick="alert(\'XSS\')">Click me</div>';
      const sanitized = sanitizeHTML(maliciousHTML);
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toBe('<div>Click me</div>');
    });

    it('should preserve safe HTML', () => {
      const safeHTML = '<div class="safe"><strong>Bold text</strong></div>';
      const sanitized = sanitizeHTML(safeHTML);
      
      expect(sanitized).toBe(safeHTML);
    });

    it('should handle nested malicious content', () => {
      const maliciousHTML = '<div><script>alert("XSS")</script><span onmouseover="alert(\'XSS\')">Text</span></div>';
      const sanitized = sanitizeHTML(maliciousHTML);
      
      expect(sanitized).toBe('<div><span>Text</span></div>');
    });
  });

  describe('Expression Sanitization', () => {
    const sanitizeExpression = (expr: string): string => {
      // Block dangerous patterns
      const dangerousPatterns = [
        /constructor/i,
        /__proto__/i,
        /prototype/i,
        /eval\s*\(/i,
        /function\s*\(/i,
        /import\s*\(/i,
        /require\s*\(/i,
        /document\./i,
        /window\./i,
        /global\./i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(expr)) {
          throw new Error(`Unsafe expression: ${expr}`);
        }
      }

      return expr;
    };

    it('should block constructor access', () => {
      expect(() => {
        sanitizeExpression('constructor.constructor("alert(1)")()');
      }).toThrow('Unsafe expression');
    });

    it('should block prototype pollution', () => {
      expect(() => {
        sanitizeExpression('__proto__.isAdmin = true');
      }).toThrow('Unsafe expression');
    });

    it('should block eval usage', () => {
      expect(() => {
        sanitizeExpression('eval("alert(1)")');
      }).toThrow('Unsafe expression');
    });

    it('should block function constructor', () => {
      expect(() => {
        sanitizeExpression('Function("alert(1)")()');
      }).toThrow('Unsafe expression');
    });

    it('should block DOM access', () => {
      expect(() => {
        sanitizeExpression('document.createElement("script")');
      }).toThrow('Unsafe expression');
    });

    it('should allow safe expressions', () => {
      const safeExpressions = [
        'count + 1',
        'user.name',
        'items.length',
        'Math.max(a, b)',
        'JSON.stringify(data)'
      ];

      safeExpressions.forEach(expr => {
        expect(() => sanitizeExpression(expr)).not.toThrow();
      });
    });
  });

  describe('Content Security Policy', () => {
    const checkCSPCompliance = (content: string): boolean => {
      // Check if content would pass strict CSP
      const hasInlineScript = /<script(?![^>]*src=)[^>]*>/i.test(content);
      const hasInlineEventHandlers = /\s*on\w+\s*=/i.test(content);
      const hasJavaScriptUrls = /href\s*=\s*["']javascript:/i.test(content);
      
      return !hasInlineScript && !hasInlineEventHandlers && !hasJavaScriptUrls;
    };

    it('should detect inline scripts as CSP violation', () => {
      const content = '<div><script>alert("test")</script></div>';
      expect(checkCSPCompliance(content)).toBe(false);
    });

    it('should detect inline event handlers as CSP violation', () => {
      const content = '<button onclick="doSomething()">Click</button>';
      expect(checkCSPCompliance(content)).toBe(false);
    });

    it('should detect javascript: URLs as CSP violation', () => {
      const content = '<a href="javascript:alert(1)">Link</a>';
      expect(checkCSPCompliance(content)).toBe(false);
    });

    it('should pass compliant content', () => {
      const content = '<div class="safe"><button>Click</button></div>';
      expect(checkCSPCompliance(content)).toBe(true);
    });

    it('should allow external scripts', () => {
      const content = '<script src="/safe-script.js"></script>';
      expect(checkCSPCompliance(content)).toBe(true);
    });
  });

  describe('Trusted Types Integration', () => {
    const createTrustedHTML = (html: string): { toString: () => string } => {
      // Mock Trusted Types
      return {
        toString: () => html
      };
    };

    it('should create trusted HTML for safe content', () => {
      const safeHTML = '<div>Safe content</div>';
      const trusted = createTrustedHTML(safeHTML);
      
      expect(trusted.toString()).toBe(safeHTML);
    });

    it('should integrate with DOM APIs', () => {
      const div = document.createElement('div');
      const trustedHTML = createTrustedHTML('<span>Trusted content</span>');
      
      // In real implementation, this would use TrustedHTML
      div.innerHTML = trustedHTML.toString();
      
      expect(div.innerHTML).toBe('<span>Trusted content</span>');
    });
  });

  describe('User Input Validation', () => {
    const validateInput = (input: string, type: 'text' | 'email' | 'url' = 'text'): boolean => {
      if (input.length > 1000) return false; // Prevent DoS
      
      switch (type) {
        case 'email':
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
        case 'url':
          try {
            new URL(input);
            return input.startsWith('http://') || input.startsWith('https://');
          } catch {
            return false;
          }
        default:
          return true;
      }
    };

    it('should validate email inputs', () => {
      expect(validateInput('user@example.com', 'email')).toBe(true);
      expect(validateInput('invalid-email', 'email')).toBe(false);
      expect(validateInput('user@', 'email')).toBe(false);
    });

    it('should validate URL inputs', () => {
      expect(validateInput('https://example.com', 'url')).toBe(true);
      expect(validateInput('http://example.com', 'url')).toBe(true);
      expect(validateInput('javascript:alert(1)', 'url')).toBe(false);
      expect(validateInput('ftp://example.com', 'url')).toBe(false);
    });

    it('should reject overly long inputs', () => {
      const longInput = 'a'.repeat(1001);
      expect(validateInput(longInput)).toBe(false);
    });

    it('should accept normal text inputs', () => {
      expect(validateInput('Normal text input')).toBe(true);
      expect(validateInput('Text with numbers 123')).toBe(true);
    });
  });

  describe('DOM XSS Prevention', () => {
    it('should safely set text content', () => {
      const div = document.createElement('div');
      const userInput = '<script>alert("XSS")</script>';
      
      // Safe: using textContent instead of innerHTML
      div.textContent = userInput;
      
      expect(div.textContent).toBe('<script>alert("XSS")</script>');
      expect(div.innerHTML).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });

    it('should safely set attributes', () => {
      const img = document.createElement('img');
      const userInput = 'javascript:alert("XSS")';
      
      // Safe: validate before setting
      const safeSrc = userInput.startsWith('javascript:') ? '/default.jpg' : userInput;
      img.src = safeSrc;
      
      expect(img.src).toContain('/default.jpg');
    });

    it('should handle data attributes safely', () => {
      const div = document.createElement('div');
      const userData = '"><script>alert("XSS")</script>';
      
      // Safe: data attributes are automatically escaped
      div.setAttribute('data-user', userData);
      
      expect(div.getAttribute('data-user')).toBe('"><script>alert("XSS")</script>');
      expect(div.outerHTML).toContain('&quot;&gt;&lt;script&gt;');
    });
  });

  describe('Security Headers', () => {
    const generateSecurityHeaders = () => {
      return {
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      };
    };

    it('should generate appropriate security headers', () => {
      const headers = generateSecurityHeaders();
      
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('should include XSS protection header', () => {
      const headers = generateSecurityHeaders();
      
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
    });
  });
});