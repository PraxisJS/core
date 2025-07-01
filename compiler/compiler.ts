// PraxisJS Template Compiler

import { HTMLParser, ASTNode, ParseOptions } from './parser/html-parser.js';
import { TemplateOptimizer, OptimizationOptions, OptimizationResult } from './optimizer/optimizer.js';
import { CodeGenerator, CodegenOptions, CodegenResult } from './codegen/codegen.js';

export interface CompilerOptions {
  parse?: ParseOptions;
  optimize?: OptimizationOptions;
  codegen?: CodegenOptions;
  filename?: string;
  sourceMap?: boolean;
}

export interface CompileResult {
  code: string;
  ast: ASTNode;
  optimization?: OptimizationResult;
  map?: any;
  errors: CompilerError[];
  warnings: CompilerWarning[];
}

export interface CompilerError {
  message: string;
  line?: number;
  column?: number;
  filename?: string;
  stack?: string;
}

export interface CompilerWarning {
  message: string;
  line?: number;
  column?: number;
  filename?: string;
}

export class CoralCompiler {
  private parser: HTMLParser;
  private optimizer: TemplateOptimizer;
  private generator: CodeGenerator;
  private errors: CompilerError[] = [];
  private warnings: CompilerWarning[] = [];

  constructor(private options: CompilerOptions = {}) {
    this.parser = new HTMLParser('', this.options.parse);
    this.optimizer = new TemplateOptimizer(this.options.optimize);
    this.generator = new CodeGenerator(this.options.codegen);
  }

  compile(source: string, filename?: string): CompileResult {
    this.reset();
    
    try {
      // Step 1: Parse HTML template
      this.parser = new HTMLParser(source, {
        ...this.options.parse,
        filename: filename || this.options.filename || 'template.html'
      });
      
      const ast = this.parser.parse();
      this.validateAST(ast);
      
      // Step 2: Optimize template
      let optimizationResult: OptimizationResult | undefined;
      if (this.options.optimize !== false) {
        optimizationResult = this.optimizer.optimize(ast);
        this.generateOptimizationWarnings(optimizationResult);
      }
      
      // Step 3: Generate code
      const codegenResult = this.generator.generate(
        optimizationResult?.ast || ast,
        optimizationResult
      );
      
      return {
        code: codegenResult.code,
        ast: optimizationResult?.ast || ast,
        optimization: optimizationResult,
        map: codegenResult.map,
        errors: this.errors,
        warnings: this.warnings
      };
      
    } catch (error) {
      this.addError({
        message: error instanceof Error ? error.message : String(error),
        filename: filename || this.options.filename
      });
      
      return {
        code: '',
        ast: { type: 'element', tag: 'root', children: [] },
        errors: this.errors,
        warnings: this.warnings
      };
    }
  }

  compileToFunction(source: string, filename?: string): Function {
    const result = this.compile(source, filename);
    
    if (result.errors.length > 0) {
      throw new Error(`Compilation failed: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    try {
      // Create function from generated code
      return new Function('praxis', `
        const { createVNode, Fragment, withDirectives, renderList } = praxis;
        ${result.code}
        return render;
      `);
    } catch (error) {
      throw new Error(`Failed to create render function: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private reset(): void {
    this.errors = [];
    this.warnings = [];
  }

  private validateAST(ast: ASTNode): void {
    this.walkAST(ast, (node) => {
      // Validate directives
      if (node.directives) {
        for (const directive of node.directives) {
          this.validateDirective(directive, node);
        }
      }
      
      // Validate attributes
      if (node.attributes) {
        for (const [key, value] of Object.entries(node.attributes)) {
          this.validateAttribute(key, value, node);
        }
      }
    });
  }

  private validateDirective(directive: any, node: ASTNode): void {
    // Check for common directive mistakes
    if (directive.name === 'for' && !directive.expression.includes(' in ')) {
      this.addError({
        message: `Invalid x-for expression: "${directive.expression}". Expected format: "item in items"`,
        line: directive.loc?.start.line,
        column: directive.loc?.start.column,
        filename: directive.loc?.filename
      });
    }
    
    if (directive.name === 'if' && !directive.expression.trim()) {
      this.addError({
        message: 'x-if directive requires an expression',
        line: directive.loc?.start.line,
        column: directive.loc?.start.column,
        filename: directive.loc?.filename
      });
    }
    
    if (directive.name === 'model' && node.tag !== 'input' && node.tag !== 'textarea' && node.tag !== 'select') {
      this.addWarning({
        message: `x-model directive is typically used with form elements, not <${node.tag}>`,
        line: directive.loc?.start.line,
        column: directive.loc?.start.column,
        filename: directive.loc?.filename
      });
    }
  }

  private validateAttribute(key: string, value: string, node: ASTNode): void {
    // Check for potential security issues
    if (key === 'innerHTML' || key === 'outerHTML') {
      this.addWarning({
        message: `Directly setting ${key} can be dangerous. Consider using x-html with proper sanitization.`,
        line: node.loc?.start.line,
        column: node.loc?.start.column,
        filename: node.loc?.filename
      });
    }
    
    // Check for common mistakes
    if (key.startsWith('on') && !key.startsWith('on:')) {
      this.addWarning({
        message: `Did you mean "x-on:${key.slice(2)}" instead of "${key}"?`,
        line: node.loc?.start.line,
        column: node.loc?.start.column,
        filename: node.loc?.filename
      });
    }
  }

  private generateOptimizationWarnings(result: OptimizationResult): void {
    if (result.stats.reductionPercentage < 10) {
      this.addWarning({
        message: `Low optimization impact (${result.stats.reductionPercentage.toFixed(1)}%). Consider making more content static.`
      });
    }
    
    if (result.removedDirectives.length > 0) {
      this.addWarning({
        message: `Removed ${result.removedDirectives.length} unused directive(s) during optimization.`
      });
    }
  }

  private walkAST(node: ASTNode, visitor: (node: ASTNode) => void): void {
    visitor(node);
    if (node.children) {
      node.children.forEach(child => this.walkAST(child, visitor));
    }
  }

  private addError(error: CompilerError): void {
    this.errors.push(error);
  }

  private addWarning(warning: CompilerWarning): void {
    this.warnings.push(warning);
  }
}

// Utility functions
export function compile(source: string, options?: CompilerOptions): CompileResult {
  const compiler = new CoralCompiler(options);
  return compiler.compile(source);
}

export function compileToFunction(source: string, options?: CompilerOptions): Function {
  const compiler = new CoralCompiler(options);
  return compiler.compileToFunction(source);
}

// Template compilation cache
const compilationCache = new Map<string, CompileResult>();

export function compileWithCache(source: string, options?: CompilerOptions): CompileResult {
  const cacheKey = `${source}-${JSON.stringify(options)}`;
  
  if (compilationCache.has(cacheKey)) {
    return compilationCache.get(cacheKey)!;
  }
  
  const result = compile(source, options);
  
  // Only cache successful compilations
  if (result.errors.length === 0) {
    compilationCache.set(cacheKey, result);
  }
  
  return result;
}

export function clearCompilationCache(): void {
  compilationCache.clear();
}

// Development helpers
export function compileTemplate(template: string): string {
  const result = compile(template, {
    codegen: { mode: 'development', minify: false },
    optimize: { aggressive: false }
  });
  
  if (result.errors.length > 0) {
    console.error('Compilation errors:', result.errors);
  }
  
  if (result.warnings.length > 0) {
    console.warn('Compilation warnings:', result.warnings);
  }
  
  return result.code;
}

export function compileTemplateOptimized(template: string): {
  code: string;
  stats: any;
  report: string;
} {
  const { generateOptimizationReport } = require('./optimizer/optimizer.js');
  
  const result = compile(template, {
    codegen: { mode: 'production', minify: true },
    optimize: { aggressive: true }
  });
  
  return {
    code: result.code,
    stats: result.optimization?.stats,
    report: result.optimization ? generateOptimizationReport(result.optimization) : ''
  };
}