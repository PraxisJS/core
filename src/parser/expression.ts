export interface ExpressionContext {
  [key: string]: any;
}

export interface ParsedExpression {
  execute(context: ExpressionContext): any;
  dependencies: string[];
}

class ExpressionParser {
  private static readonly ALLOWED_GLOBALS = new Set([
    'console', 'Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number', 
    'Boolean', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent',
    'decodeURIComponent'
    // Removed setTimeout, setInterval for security
  ]);

  private static readonly FORBIDDEN_PATTERNS = [
    /\b(eval|Function|constructor|prototype|__proto__|with)\b/,
    /\b(document\.|window\.|global\.|process\.|require\()/,
    /\b(import\s|export\s|async\s|await\s)/,
    /\b(fetch\(|XMLHttpRequest|WebSocket)/,
    /\b(localStorage|sessionStorage)\.(?!getItem|setItem|removeItem|clear)/,
    /\<script\b/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i
  ];

  parse(expression: string): ParsedExpression {
    // Security check
    if (!this.isExpressionSafe(expression)) {
      throw new Error(`Unsafe expression detected: ${expression}`);
    }
    
    const dependencies = this.extractDependencies(expression);
    const wrappedExpression = this.wrapExpression(expression);
    
    return {
      execute: (context: ExpressionContext) => {
        return this.safeEvaluate(wrappedExpression, context);
      },
      dependencies
    };
  }

  private isExpressionSafe(expression: string): boolean {
    // Check for forbidden patterns
    for (const pattern of ExpressionParser.FORBIDDEN_PATTERNS) {
      if (pattern.test(expression)) {
        console.warn('Forbidden pattern detected:', pattern, 'in expression:', expression);
        return false;
      }
    }
    
    // Check for excessive string concatenations (potential XSS)
    const stringConcatCount = (expression.match(/\+\s*['"`]/g) || []).length;
    if (stringConcatCount > 10) {
      console.warn('Excessive string concatenation detected:', expression);
      return false;
    }
    
    // Check for excessive function calls
    const functionCallCount = (expression.match(/\w+\s*\(/g) || []).length;
    if (functionCallCount > 20) {
      console.warn('Excessive function calls detected:', expression);
      return false;
    }
    
    return true;
  }

  private extractDependencies(expression: string): string[] {
    const dependencies = new Set<string>();
    
    // More sophisticated dependency extraction
    const tokens = this.tokenizeExpression(expression);
    
    for (const token of tokens) {
      if (token.type === 'identifier' && 
          !ExpressionParser.ALLOWED_GLOBALS.has(token.value) && 
          !this.isKeyword(token.value) &&
          !this.isMagicProperty(token.value)) {
        dependencies.add(token.value);
      }
    }

    return Array.from(dependencies);
  }

  private tokenizeExpression(expression: string): Array<{type: string, value: string, position: number}> {
    const tokens: Array<{type: string, value: string, position: number}> = [];
    const tokenPatterns = [
      { type: 'string', pattern: /^(['"`])(?:(?!\1)[^\\]|\\.)*.?\1/ },
      { type: 'number', pattern: /^\d+(\.\d+)?([eE][+-]?\d+)?/ },
      { type: 'identifier', pattern: /^[a-zA-Z_$][a-zA-Z0-9_$]*/ },
      { type: 'operator', pattern: /^(\+\+|--|<=|>=|===|!==|==|!=|&&|\|\||<<|>>|[+\-*/%<>=!&|^~?:])/ },
      { type: 'punctuation', pattern: /^[(){}\[\].,;]/ },
      { type: 'whitespace', pattern: /^\s+/ }
    ];
    
    let position = 0;
    while (position < expression.length) {
      let matched = false;
      
      for (const { type, pattern } of tokenPatterns) {
        const match = expression.slice(position).match(pattern);
        if (match) {
          if (type !== 'whitespace') { // Skip whitespace tokens
            tokens.push({
              type,
              value: match[0],
              position
            });
          }
          position += match[0].length;
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        // Skip unknown character
        position++;
      }
    }
    
    return tokens;
  }

  private isMagicProperty(identifier: string): boolean {
    return identifier.startsWith('$');
  }

  private isKeyword(identifier: string): boolean {
    const keywords = new Set([
      'true', 'false', 'null', 'undefined', 'typeof', 'instanceof',
      'new', 'this', 'return', 'if', 'else', 'for', 'while', 'do',
      'break', 'continue', 'function', 'var', 'let', 'const'
    ]);
    return keywords.has(identifier);
  }

  private wrapExpression(expression: string): string {
    if (expression.trim().startsWith('{') && expression.trim().endsWith('}')) {
      return `(${expression})`;
    }
    
    if (this.isStatement(expression)) {
      return `(() => { ${expression} })()`;
    }
    
    return `(${expression})`;
  }

  private isStatement(expression: string): boolean {
    const statementPatterns = [
      /^\s*if\s*\(/,
      /^\s*for\s*\(/,
      /^\s*while\s*\(/,
      /^\s*do\s*\{/,
      /^\s*switch\s*\(/,
      /^\s*try\s*\{/,
      /^\s*\{.*\}\s*$/,
      /;\s*$/
    ];
    
    return statementPatterns.some(pattern => pattern.test(expression));
  }

  private safeEvaluate(expression: string, context: ExpressionContext): any {
    const contextKeys = Object.keys(context);
    const contextValues = contextKeys.map(key => context[key]);
    
    // Create a more secure evaluation environment
    const allowedGlobals = Array.from(ExpressionParser.ALLOWED_GLOBALS)
      .filter(global => typeof window !== 'undefined' && global in window)
      .map(global => `const ${global} = window.${global}`);
    
    // Add security measures
    const securityMeasures = [
      'const window = undefined',
      'const document = undefined', 
      'const global = undefined',
      'const process = undefined',
      'const require = undefined',
      'const eval = undefined',
      'const Function = undefined'
    ];
    
    // ⚠️ TIMEOUT PROTECTION LIMITATION:
    // Synchronous code execution in JavaScript cannot be reliably timed out.
    // The timeout check below runs BEFORE expression evaluation, not during it.
    // This means infinite loops in the expression CANNOT be caught.
    //
    // Proper solutions require:
    // 1. Web Workers with termination capability (async, complex)
    // 2. AST-based evaluator with step counting (requires parser replacement)
    // 3. Transpilation with injected checks (performance overhead)
    //
    // Current implementation provides error handling only, not DoS protection.

    const functionBody = `
      "use strict";
      ${securityMeasures.join('; ')};
      ${allowedGlobals.join('; ')};

      // Wrap in try-catch for error handling
      // NOTE: This does NOT protect against infinite loops or DoS attacks
      try {
        return ${expression};
      } catch (error) {
        // Re-throw errors for debugging with context
        throw new Error('Expression evaluation failed: ' + error.message);
      }
    `;

    try {
      // ⚠️ SECURITY WARNING: Using Function constructor is equivalent to eval()
      // This is inherently unsafe and should be replaced with a proper AST-based
      // expression parser in production. Current mitigations include:
      // - Blacklist validation of dangerous patterns (bypassable)
      // - Restricted context (no global scope access)
      // - Error handling (but NO DoS protection against infinite loops)
      //
      // CRITICAL LIMITATIONS:
      // - Code injection still possible via clever exploits
      // - No timeout protection for infinite loops
      // - Blacklists can be bypassed
      //
      // RECOMMENDATION: Replace with libraries like 'expr-eval', 'jsep', or
      // implement a safe subset DSL parser for production use.
      const func = new Function(...contextKeys, functionBody);
      return func(...contextValues);
    } catch (error) {
      console.error('Expression evaluation error:', error);
      return undefined;
    }
  }
}

const parser = new ExpressionParser();

export function parseExpression(expression: string): ParsedExpression {
  return parser.parse(expression);
}

export class ExpressionEvaluator {
  private cache = new Map<string, ParsedExpression>();

  evaluate(expression: string, context: ExpressionContext): any {
    let parsed = this.cache.get(expression);
    
    if (!parsed) {
      parsed = parseExpression(expression);
      this.cache.set(expression, parsed);
    }
    
    return parsed.execute(context);
  }

  getDependencies(expression: string): string[] {
    let parsed = this.cache.get(expression);
    
    if (!parsed) {
      parsed = parseExpression(expression);
      this.cache.set(expression, parsed);
    }
    
    return parsed.dependencies;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const globalEvaluator = new ExpressionEvaluator();