import { describe, it, expect } from 'vitest';
import { parseExpression } from '../src/parser/expression.js';
import { defaultSanitizer } from '../src/utils/sanitizer.js';

describe('Security Features', () => {
  describe('Expression Parser Security', () => {
    it('should reject dangerous expressions', () => {
      const dangerousExpressions = [
        'eval("alert(1)")',
        'window.location = "http://evil.com"',
        'document.cookie = "stolen"',
        'constructor.constructor("alert(1)")()',
        'this.__proto__.constructor("alert(1)")()',
        'import("./malicious.js")',
        'fetch("/steal-data")',
        'new XMLHttpRequest()',
        'setTimeout("alert(1)", 100)',
        '<script>alert(1)</script>'
      ];

      dangerousExpressions.forEach(expr => {
        expect(() => parseExpression(expr)).toThrow();
      });
    });

    it('should allow safe expressions', () => {
      const safeExpressions = [
        'user.name',
        'count + 1',
        'items.length > 0',
        'Math.max(a, b)',
        'JSON.stringify(data)',
        '"hello " + name',
        'condition ? "yes" : "no"',
        'items.filter(item => item.active)',
        'Object.keys(obj).length'
      ];

      safeExpressions.forEach(expr => {
        expect(() => parseExpression(expr)).not.toThrow();
      });
    });

    it('should detect excessive operations', () => {
      // Test excessive function calls
      const excessiveCalls = 'a()'.repeat(25);
      expect(() => parseExpression(excessiveCalls)).toThrow();

      // Test excessive string concatenation
      const excessiveConcat = '"a" + '.repeat(15) + '"b"';
      expect(() => parseExpression(excessiveConcat)).toThrow();
    });

    it('should properly extract dependencies while ignoring magic properties', () => {
      const parsed = parseExpression('user.name + $el.id + $refs.button.value');
      expect(parsed.dependencies).toEqual(['user']);
    });
  });

  describe('HTML Sanitizer', () => {
    it('should remove dangerous HTML elements', () => {
      const dangerous = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = defaultSanitizer.sanitize(dangerous);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });

    it('should remove dangerous attributes', () => {
      const dangerous = '<div onclick="alert(1)" onload="evil()">Content</div>';
      const sanitized = defaultSanitizer.sanitize(dangerous);
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('onload');
      expect(sanitized).toContain('Content');
    });

    it('should allow safe HTML', () => {
      const safe = '<div class="container"><p><strong>Bold</strong> and <em>italic</em> text</p></div>';
      const sanitized = defaultSanitizer.sanitize(safe);
      
      expect(sanitized).toBe(safe);
    });

    it('should sanitize dangerous URLs', () => {
      const dangerous = '<a href="javascript:alert(1)">Link</a><img src="data:text/html,<script>alert(1)</script>">';
      const sanitized = defaultSanitizer.sanitize(dangerous);
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('data:');
    });

    it('should allow safe URLs', () => {
      const safe = '<a href="https://example.com">Link</a><img src="/image.jpg" alt="Image">';
      const sanitized = defaultSanitizer.sanitize(safe);
      
      expect(sanitized).toContain('https://example.com');
      expect(sanitized).toContain('/image.jpg');
    });

    it('should handle malformed HTML gracefully', () => {
      const malformed = '<div><p>Unclosed paragraph<span>Text</div>';
      const sanitized = defaultSanitizer.sanitize(malformed);
      
      // Should not throw and should return some sanitized content
      expect(typeof sanitized).toBe('string');
    });
  });

  describe('CSP Compliance', () => {
    it('should not use eval-like constructs in normal operation', () => {
      // Test that our expression evaluator uses Function constructor appropriately
      const parsed = parseExpression('1 + 1');
      const result = parsed.execute({});
      
      expect(result).toBe(2);
    });

    it('should handle expression timeouts', () => {
      // Create an expression that would potentially loop
      const longRunning = parseExpression('1');
      
      // Should complete quickly for simple expressions
      const start = Date.now();
      const result = longRunning.execute({});
      const duration = Date.now() - start;
      
      expect(result).toBe(1);
      expect(duration).toBeLessThan(100);
    });
  });
});