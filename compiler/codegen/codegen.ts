// Code Generator for PraxisJS Compiler

import { ASTNode, DirectiveNode } from '../parser/html-parser.js';
import { OptimizationResult } from '../optimizer/optimizer.js';

export interface CodegenOptions {
  mode?: 'development' | 'production';
  ssr?: boolean;
  minify?: boolean;
  sourceMaps?: boolean;
  runtimeHelpers?: boolean;
  preserveComments?: boolean;
}

export interface CodegenResult {
  code: string;
  map?: any;
  helpers: string[];
  staticElements: string[];
  imports: string[];
}

export class CodeGenerator {
  private options: Required<CodegenOptions>;
  private helpers = new Set<string>();
  private staticElements: string[] = [];
  private imports = new Set<string>();
  private indentLevel = 0;

  constructor(options: CodegenOptions = {}) {
    this.options = {
      mode: 'production',
      ssr: false,
      minify: true,
      sourceMaps: false,
      runtimeHelpers: true,
      preserveComments: false,
      ...options
    };
  }

  generate(ast: ASTNode, optimizationResult?: OptimizationResult): CodegenResult {
    this.reset();
    
    if (optimizationResult) {
      this.staticElements = optimizationResult.hoistedElements.map(el => this.generateStaticElement(el));
    }
    
    const renderFunction = this.generateRenderFunction(ast);
    const code = this.buildFinalCode(renderFunction);
    
    return {
      code,
      helpers: Array.from(this.helpers),
      staticElements: this.staticElements,
      imports: Array.from(this.imports)
    };
  }

  private reset(): void {
    this.helpers.clear();
    this.staticElements = [];
    this.imports.clear();
    this.indentLevel = 0;
  }

  private generateRenderFunction(ast: ASTNode): string {
    this.addHelper('createVNode');
    this.addImport('{ createVNode, Fragment }', 'praxis');
    
    let code = this.options.minify ? '' : 'function render(ctx) {\n';
    this.indentLevel++;
    
    if (!this.options.minify) {
      code += this.indent() + 'const { ' + Array.from(this.getUsedMagics(ast)).join(', ') + ' } = ctx;\n';
    }
    
    code += this.indent() + 'return ';
    code += this.generateNode(ast);
    code += ';\n';
    
    this.indentLevel--;
    if (!this.options.minify) {
      code += '}';
    }
    
    return code;
  }

  private generateNode(node: ASTNode): string {
    switch (node.type) {
      case 'element':
        return this.generateElement(node);
      case 'text':
        return this.generateText(node);
      case 'comment':
        return this.options.preserveComments ? this.generateComment(node) : '';
      default:
        return '""';
    }
  }

  private generateElement(node: ASTNode): string {
    if (node.tag === 'root') {
      return this.generateFragment(node.children || []);
    }
    
    // Check for static element placeholder
    if (node.attributes?.['data-static-id']) {
      const staticId = node.attributes['data-static-id'];
      this.addHelper('getStaticElement');
      return `getStaticElement(${staticId})`;
    }
    
    const tag = JSON.stringify(node.tag);
    const props = this.generateProps(node);
    const children = this.generateChildren(node.children || []);
    
    // Handle directives
    if (node.directives && node.directives.length > 0) {
      return this.generateElementWithDirectives(tag, props, children, node.directives);
    }
    
    this.addHelper('createVNode');
    return `createVNode(${tag}, ${props}, ${children})`;
  }

  private generateElementWithDirectives(tag: string, props: string, children: string, directives: DirectiveNode[]): string {
    // Sort directives by priority
    const sortedDirectives = [...directives].sort((a, b) => {
      const priorities = {
        'if': 1000,
        'for': 900,
        'show': 800,
        'model': 700,
        'on': 600,
        'bind': 500
      };
      return (priorities[b.name as keyof typeof priorities] || 0) - (priorities[a.name as keyof typeof priorities] || 0);
    });
    
    let result = `createVNode(${tag}, ${props}, ${children})`;
    
    for (const directive of sortedDirectives) {
      result = this.wrapWithDirective(result, directive);
    }
    
    return result;
  }

  private wrapWithDirective(elementCode: string, directive: DirectiveNode): string {
    switch (directive.name) {
      case 'if':
        this.addHelper('withDirectives');
        return `withDirectives(${elementCode}, [['if', ${this.generateExpression(directive.expression)}]])`;
      
      case 'for':
        this.addHelper('renderList');
        return this.generateForDirective(elementCode, directive);
      
      case 'show':
        this.addHelper('vShow');
        return `withDirectives(${elementCode}, [['show', ${this.generateExpression(directive.expression)}]])`;
      
      case 'model':
        this.addHelper('vModel');
        return `withDirectives(${elementCode}, [['model', ${this.generateExpression(directive.expression)}]])`;
      
      case 'on':
        // Event handlers are handled in props generation
        return elementCode;
      
      default:
        this.addHelper('withDirectives');
        return `withDirectives(${elementCode}, [['${directive.name}', ${this.generateExpression(directive.expression)}]])`;
    }
  }

  private generateForDirective(elementCode: string, directive: DirectiveNode): string {
    const expression = directive.expression;
    
    // Parse x-for expression: "item in items" or "(item, index) in items"
    const forMatch = expression.match(/^(?:\(([^)]+)\)|([^,\s]+))(?:\s*,\s*([^)]+))?\s+in\s+(.+)$/);
    
    if (!forMatch) {
      throw new Error(`Invalid x-for expression: ${expression}`);
    }
    
    const [, parensContent, singleParam, index, iterable] = forMatch;
    const item = parensContent || singleParam;
    const indexVar = index || 'index';
    
    this.addHelper('renderList');
    
    return `renderList(${this.generateExpression(iterable)}, (${item}, ${indexVar}) => ${elementCode})`;
  }

  private generateProps(node: ASTNode): string {
    const props: string[] = [];
    
    if (node.attributes) {
      for (const [key, value] of Object.entries(node.attributes)) {
        if (key.startsWith('data-static-')) continue; // Skip static markers
        
        if (key.startsWith(':')) {
          // Dynamic binding
          const propName = key.slice(1);
          props.push(`${JSON.stringify(propName)}: ${this.generateExpression(value)}`);
        } else if (this.hasInterpolation(value)) {
          // Interpolated value
          props.push(`${JSON.stringify(key)}: ${this.generateInterpolation(value)}`);
        } else {
          // Static value
          props.push(`${JSON.stringify(key)}: ${JSON.stringify(value)}`);
        }
      }
    }
    
    // Add event handlers from directives
    if (node.directives) {
      for (const directive of node.directives) {
        if (directive.name === 'on' && directive.argument) {
          const eventName = `on${directive.argument.charAt(0).toUpperCase() + directive.argument.slice(1)}`;
          let handler = this.generateExpression(directive.expression);
          
          // Add modifiers
          if (directive.modifiers.length > 0) {
            handler = this.wrapWithModifiers(handler, directive.modifiers);
          }
          
          props.push(`${JSON.stringify(eventName)}: ${handler}`);
        }
      }
    }
    
    return props.length > 0 ? `{ ${props.join(', ')} }` : 'null';
  }

  private wrapWithModifiers(handler: string, modifiers: string[]): string {
    for (const modifier of modifiers) {
      switch (modifier) {
        case 'prevent':
          this.addHelper('withModifiers');
          handler = `withModifiers(${handler}, ['prevent'])`;
          break;
        case 'stop':
          this.addHelper('withModifiers');
          handler = `withModifiers(${handler}, ['stop'])`;
          break;
        case 'once':
          this.addHelper('withModifiers');
          handler = `withModifiers(${handler}, ['once'])`;
          break;
        case 'passive':
          this.addHelper('withModifiers');
          handler = `withModifiers(${handler}, ['passive'])`;
          break;
      }
    }
    return handler;
  }

  private generateChildren(children: ASTNode[]): string {
    if (children.length === 0) {
      return 'null';
    }
    
    if (children.length === 1) {
      return this.generateNode(children[0]);
    }
    
    return this.generateFragment(children);
  }

  private generateFragment(children: ASTNode[]): string {
    if (children.length === 0) {
      return 'null';
    }
    
    const childrenCode = children
      .map(child => this.generateNode(child))
      .filter(code => code && code !== '""')
      .join(', ');
    
    if (!childrenCode) {
      return 'null';
    }
    
    this.addHelper('Fragment');
    return `createVNode(Fragment, null, [${childrenCode}])`;
  }

  private generateText(node: ASTNode): string {
    const content = node.content || '';
    
    if (this.hasInterpolation(content)) {
      return this.generateInterpolation(content);
    }
    
    return JSON.stringify(content);
  }

  private generateComment(node: ASTNode): string {
    this.addHelper('createCommentVNode');
    return `createCommentVNode(${JSON.stringify(node.content || '')})`;
  }

  private generateInterpolation(content: string): string {
    return content.replace(/\{\{(.*?)\}\}/g, (match, expr) => {
      return `${this.generateExpression(expr.trim())}`;
    });
  }

  private generateExpression(expression: string): string {
    // Simple expression generation - in a real implementation, 
    // this would use a proper expression parser
    
    // Handle basic member access
    if (/^\$\w+/.test(expression)) {
      return expression; // Magic properties
    }
    
    // Handle function calls
    if (/^\w+\(/.test(expression)) {
      return expression; // Function calls
    }
    
    // Handle object property access
    if (/^\w+\.\w+/.test(expression)) {
      return expression;
    }
    
    // Handle literals
    if (/^['"`]/.test(expression) || /^\d+$/.test(expression) || expression === 'true' || expression === 'false') {
      return expression;
    }
    
    // Default: assume it's a variable reference
    return expression;
  }

  private hasInterpolation(content: string): boolean {
    return /\{\{.*?\}\}/.test(content);
  }

  private getUsedMagics(node: ASTNode): Set<string> {
    const magics = new Set<string>();
    
    function traverse(n: ASTNode): void {
      if (n.directives) {
        for (const directive of n.directives) {
          const matches = directive.expression.match(/\$\w+/g);
          if (matches) {
            matches.forEach(magic => magics.add(magic));
          }
        }
      }
      
      if (n.attributes) {
        for (const value of Object.values(n.attributes)) {
          const matches = value.match(/\$\w+/g);
          if (matches) {
            matches.forEach(magic => magics.add(magic));
          }
        }
      }
      
      if (n.content) {
        const matches = n.content.match(/\$\w+/g);
        if (matches) {
          matches.forEach(magic => magics.add(magic));
        }
      }
      
      if (n.children) {
        n.children.forEach(traverse);
      }
    }
    
    traverse(node);
    return magics;
  }

  private generateStaticElement(element: ASTNode): string {
    // Generate static element as a string template
    return this.generateNode(element);
  }

  private buildFinalCode(renderFunction: string): string {
    const imports = Array.from(this.imports).join('\n');
    const staticElements = this.staticElements.length > 0 
      ? `const staticElements = [${this.staticElements.join(', ')}];\n`
      : '';
    
    let code = '';
    
    if (imports) {
      code += imports + '\n\n';
    }
    
    if (staticElements) {
      code += staticElements + '\n';
    }
    
    if (this.options.minify) {
      code += `export default function(ctx){const{${Array.from(this.getUsedMagics(new ASTNode())).join(',')}}=ctx;return ${renderFunction.replace(/\s+/g, ' ').trim()}}`;
    } else {
      code += `export default ${renderFunction}`;
    }
    
    return code;
  }

  private addHelper(helper: string): void {
    this.helpers.add(helper);
  }

  private addImport(importStatement: string, from: string): void {
    this.imports.add(`import ${importStatement} from '${from}';`);
  }

  private indent(): string {
    return this.options.minify ? '' : '  '.repeat(this.indentLevel);
  }
}

// Helper functions for code generation
export function generateRenderFunction(ast: ASTNode, options?: CodegenOptions): string {
  const generator = new CodeGenerator(options);
  const result = generator.generate(ast);
  return result.code;
}

export function optimizeAndGenerate(
  ast: ASTNode, 
  optimizationResult: OptimizationResult, 
  options?: CodegenOptions
): CodegenResult {
  const generator = new CodeGenerator(options);
  return generator.generate(ast, optimizationResult);
}