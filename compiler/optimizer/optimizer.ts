// Template Optimizer for PraxisJS Compiler

import { ASTNode, DirectiveNode } from '../parser/html-parser.js';

export interface OptimizationResult {
  ast: ASTNode;
  hoistedElements: ASTNode[];
  staticBindings: Map<string, any>;
  optimizedExpressions: Map<string, string>;
  removedDirectives: DirectiveNode[];
  stats: OptimizationStats;
}

export interface OptimizationStats {
  totalNodes: number;
  staticNodes: number;
  hoistedNodes: number;
  optimizedExpressions: number;
  removedDirectives: number;
  reductionPercentage: number;
}

export interface OptimizationOptions {
  hoistStatic?: boolean;
  optimizeExpressions?: boolean;
  removeUnusedDirectives?: boolean;
  inlineConstants?: boolean;
  minifyExpressions?: boolean;
  aggressive?: boolean;
}

export class TemplateOptimizer {
  private options: Required<OptimizationOptions>;
  private hoistedElements: ASTNode[] = [];
  private staticBindings = new Map<string, any>();
  private optimizedExpressions = new Map<string, string>();
  private removedDirectives: DirectiveNode[] = [];
  private stats = {
    totalNodes: 0,
    staticNodes: 0,
    hoistedNodes: 0,
    optimizedExpressions: 0,
    removedDirectives: 0,
    reductionPercentage: 0
  };

  constructor(options: OptimizationOptions = {}) {
    this.options = {
      hoistStatic: true,
      optimizeExpressions: true,
      removeUnusedDirectives: true,
      inlineConstants: true,
      minifyExpressions: true,
      aggressive: false,
      ...options
    };
  }

  optimize(ast: ASTNode): OptimizationResult {
    this.reset();
    this.countNodes(ast);
    
    let optimizedAst = this.cloneAST(ast);
    
    if (this.options.hoistStatic) {
      optimizedAst = this.hoistStaticElements(optimizedAst);
    }
    
    if (this.options.optimizeExpressions) {
      optimizedAst = this.optimizeExpressions(optimizedAst);
    }
    
    if (this.options.removeUnusedDirectives) {
      optimizedAst = this.removeUnusedDirectives(optimizedAst);
    }
    
    if (this.options.inlineConstants) {
      optimizedAst = this.inlineConstants(optimizedAst);
    }
    
    this.calculateStats();
    
    return {
      ast: optimizedAst,
      hoistedElements: this.hoistedElements,
      staticBindings: this.staticBindings,
      optimizedExpressions: this.optimizedExpressions,
      removedDirectives: this.removedDirectives,
      stats: this.stats
    };
  }

  private reset(): void {
    this.hoistedElements = [];
    this.staticBindings.clear();
    this.optimizedExpressions.clear();
    this.removedDirectives = [];
    this.stats = {
      totalNodes: 0,
      staticNodes: 0,
      hoistedNodes: 0,
      optimizedExpressions: 0,
      removedDirectives: 0,
      reductionPercentage: 0
    };
  }

  private countNodes(node: ASTNode): void {
    this.stats.totalNodes++;
    if (node.children) {
      node.children.forEach(child => this.countNodes(child));
    }
  }

  private cloneAST(node: ASTNode): ASTNode {
    const cloned: ASTNode = {
      type: node.type,
      tag: node.tag,
      content: node.content,
      attributes: node.attributes ? { ...node.attributes } : undefined,
      directives: node.directives ? [...node.directives] : undefined,
      children: node.children ? node.children.map(child => this.cloneAST(child)) : undefined,
      start: node.start,
      end: node.end,
      loc: node.loc
    };
    
    // Restore parent references
    if (cloned.children) {
      cloned.children.forEach(child => {
        child.parent = cloned;
      });
    }
    
    return cloned;
  }

  private hoistStaticElements(node: ASTNode): ASTNode {
    if (this.isStaticElement(node)) {
      this.hoistedElements.push(node);
      this.stats.staticNodes++;
      this.stats.hoistedNodes++;
      
      // Replace with placeholder
      return {
        type: 'element',
        tag: 'template',
        attributes: { 
          'data-static-id': `static-${this.hoistedElements.length - 1}` 
        },
        start: node.start,
        end: node.end,
        loc: node.loc
      };
    }
    
    if (node.children) {
      node.children = node.children.map(child => this.hoistStaticElements(child));
    }
    
    return node;
  }

  private isStaticElement(node: ASTNode): boolean {
    // Element is static if it has no directives and all children are static
    if (node.type !== 'element') {
      return node.type === 'text' && !this.hasInterpolation(node.content || '');
    }
    
    // Has directives - not static
    if (node.directives && node.directives.length > 0) {
      return false;
    }
    
    // Has dynamic attributes
    if (node.attributes) {
      for (const [key, value] of Object.entries(node.attributes)) {
        if (this.isDynamicAttribute(key, value)) {
          return false;
        }
      }
    }
    
    // Check children
    if (node.children) {
      return node.children.every(child => this.isStaticElement(child));
    }
    
    return true;
  }

  private hasInterpolation(content: string): boolean {
    return /\{\{.*?\}\}/.test(content);
  }

  private isDynamicAttribute(key: string, value: string): boolean {
    // Check for dynamic binding syntax
    return key.startsWith(':') || 
           key.startsWith('v-') || 
           key.startsWith('x-') ||
           this.hasInterpolation(value);
  }

  private optimizeExpressions(node: ASTNode): ASTNode {
    if (node.directives) {
      node.directives = node.directives.map(directive => ({
        ...directive,
        expression: this.optimizeExpression(directive.expression)
      }));
    }
    
    if (node.attributes) {
      const optimizedAttributes: Record<string, string> = {};
      for (const [key, value] of Object.entries(node.attributes)) {
        optimizedAttributes[key] = this.optimizeAttributeValue(key, value);
      }
      node.attributes = optimizedAttributes;
    }
    
    if (node.type === 'text' && node.content) {
      node.content = this.optimizeTextContent(node.content);
    }
    
    if (node.children) {
      node.children = node.children.map(child => this.optimizeExpressions(child));
    }
    
    return node;
  }

  private optimizeExpression(expression: string): string {
    const original = expression;
    let optimized = expression;
    
    // Constant folding
    optimized = this.foldConstants(optimized);
    
    // Remove unnecessary parentheses
    optimized = this.removeUnnecessaryParentheses(optimized);
    
    // Simplify boolean expressions
    optimized = this.simplifyBooleanExpressions(optimized);
    
    // Minify if enabled
    if (this.options.minifyExpressions) {
      optimized = this.minifyExpression(optimized);
    }
    
    if (optimized !== original) {
      this.optimizedExpressions.set(original, optimized);
      this.stats.optimizedExpressions++;
    }
    
    return optimized;
  }

  private optimizeAttributeValue(key: string, value: string): string {
    if (this.hasInterpolation(value)) {
      return value.replace(/\{\{(.*?)\}\}/g, (match, expr) => {
        const optimized = this.optimizeExpression(expr.trim());
        return `{{${optimized}}}`;
      });
    }
    return value;
  }

  private optimizeTextContent(content: string): string {
    return content.replace(/\{\{(.*?)\}\}/g, (match, expr) => {
      const optimized = this.optimizeExpression(expr.trim());
      return `{{${optimized}}}`;
    });
  }

  private foldConstants(expression: string): string {
    // Simple constant folding for numeric operations
    return expression
      // Fold addition: 1 + 2 -> 3
      .replace(/(\d+)\s*\+\s*(\d+)/g, (match, a, b) => (parseInt(a) + parseInt(b)).toString())
      // Fold subtraction: 5 - 3 -> 2
      .replace(/(\d+)\s*-\s*(\d+)/g, (match, a, b) => (parseInt(a) - parseInt(b)).toString())
      // Fold multiplication: 4 * 2 -> 8
      .replace(/(\d+)\s*\*\s*(\d+)/g, (match, a, b) => (parseInt(a) * parseInt(b)).toString())
      // Fold boolean operations
      .replace(/true\s*&&\s*true/g, 'true')
      .replace(/false\s*\|\|\s*false/g, 'false')
      .replace(/true\s*\|\|\s*\w+/g, 'true')
      .replace(/false\s*&&\s*\w+/g, 'false');
  }

  private removeUnnecessaryParentheses(expression: string): string {
    // Remove single-level unnecessary parentheses
    return expression.replace(/^\((.*)\)$/, (match, inner) => {
      // Only remove if no operators that would change precedence
      if (!/[+\-*\/&|]/.test(inner)) {
        return inner;
      }
      return match;
    });
  }

  private simplifyBooleanExpressions(expression: string): string {
    return expression
      // !!x -> Boolean(x)
      .replace(/!!\s*(\w+)/g, 'Boolean($1)')
      // !true -> false, !false -> true
      .replace(/!\s*true/g, 'false')
      .replace(/!\s*false/g, 'true')
      // x === true -> x, x === false -> !x
      .replace(/(\w+)\s*===\s*true/g, '$1')
      .replace(/(\w+)\s*===\s*false/g, '!$1');
  }

  private minifyExpression(expression: string): string {
    return expression
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Remove spaces around operators
      .replace(/\s*([+\-*\/=<>!&|])\s*/g, '$1')
      // Remove spaces around parentheses
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')');
  }

  private removeUnusedDirectives(node: ASTNode): ASTNode {
    if (node.directives) {
      const usedDirectives: DirectiveNode[] = [];
      
      for (const directive of node.directives) {
        if (this.isDirectiveUsed(directive, node)) {
          usedDirectives.push(directive);
        } else {
          this.removedDirectives.push(directive);
          this.stats.removedDirectives++;
        }
      }
      
      node.directives = usedDirectives.length > 0 ? usedDirectives : undefined;
    }
    
    if (node.children) {
      node.children = node.children.map(child => this.removeUnusedDirectives(child));
    }
    
    return node;
  }

  private isDirectiveUsed(directive: DirectiveNode, node: ASTNode): boolean {
    // Always keep essential directives
    const essentialDirectives = ['if', 'for', 'show', 'model', 'on'];
    if (essentialDirectives.includes(directive.name)) {
      return true;
    }
    
    // Remove empty expressions
    if (!directive.expression || directive.expression.trim() === '') {
      return false;
    }
    
    // Remove directives with always-false conditions
    if (directive.expression === 'false') {
      return false;
    }
    
    return true;
  }

  private inlineConstants(node: ASTNode): ASTNode {
    // Look for constant expressions and inline them
    if (node.directives) {
      node.directives = node.directives.map(directive => ({
        ...directive,
        expression: this.inlineConstantsInExpression(directive.expression)
      }));
    }
    
    if (node.children) {
      node.children = node.children.map(child => this.inlineConstants(child));
    }
    
    return node;
  }

  private inlineConstantsInExpression(expression: string): string {
    // Replace common constants
    return expression
      .replace(/Math\.PI/g, '3.141592653589793')
      .replace(/Math\.E/g, '2.718281828459045')
      .replace(/Number\.MAX_VALUE/g, '1.7976931348623157e+308')
      .replace(/Number\.MIN_VALUE/g, '5e-324');
  }

  private calculateStats(): void {
    this.stats.reductionPercentage = this.stats.totalNodes > 0 
      ? ((this.stats.hoistedNodes + this.stats.removedDirectives) / this.stats.totalNodes) * 100
      : 0;
  }
}

// Utility functions for optimization analysis
export function analyzeTemplateComplexity(ast: ASTNode): {
  nodeCount: number;
  directiveCount: number;
  dynamicNodeCount: number;
  staticNodeCount: number;
  maxDepth: number;
} {
  let nodeCount = 0;
  let directiveCount = 0;
  let dynamicNodeCount = 0;
  let staticNodeCount = 0;
  let maxDepth = 0;

  function traverse(node: ASTNode, depth = 0): void {
    nodeCount++;
    maxDepth = Math.max(maxDepth, depth);

    if (node.directives && node.directives.length > 0) {
      directiveCount += node.directives.length;
      dynamicNodeCount++;
    } else {
      staticNodeCount++;
    }

    if (node.children) {
      node.children.forEach(child => traverse(child, depth + 1));
    }
  }

  traverse(ast);

  return {
    nodeCount,
    directiveCount,
    dynamicNodeCount,
    staticNodeCount,
    maxDepth
  };
}

export function generateOptimizationReport(result: OptimizationResult): string {
  const { stats } = result;
  
  return `
Template Optimization Report
===========================

Original nodes: ${stats.totalNodes}
Static nodes hoisted: ${stats.hoistedNodes}
Expressions optimized: ${stats.optimizedExpressions}
Directives removed: ${stats.removedDirectives}
Overall reduction: ${stats.reductionPercentage.toFixed(1)}%

Optimizations Applied:
- Static hoisting: ${stats.hoistedNodes} elements
- Expression optimization: ${stats.optimizedExpressions} expressions
- Dead code elimination: ${stats.removedDirectives} directives

Performance Impact:
- Reduced runtime parsing by ${stats.reductionPercentage.toFixed(1)}%
- ${stats.hoistedNodes} elements can be reused
- ${stats.optimizedExpressions} expressions require less computation
`.trim();
}