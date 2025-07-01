// HTML Template Parser for PraxisJS Compiler

export interface ASTNode {
  type: 'element' | 'text' | 'comment' | 'directive' | 'expression';
  tag?: string;
  content?: string;
  attributes?: Record<string, string>;
  directives?: DirectiveNode[];
  children?: ASTNode[];
  parent?: ASTNode;
  start?: number;
  end?: number;
  loc?: SourceLocation;
}

export interface DirectiveNode {
  name: string;
  expression: string;
  argument?: string;
  modifiers: string[];
  loc?: SourceLocation;
}

export interface SourceLocation {
  start: Position;
  end: Position;
  filename?: string;
}

export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface ParseOptions {
  filename?: string;
  preserveWhitespace?: boolean;
  ignoreComments?: boolean;
  parseDirectives?: boolean;
}

export class HTMLParser {
  private source: string;
  private index = 0;
  private line = 1;
  private column = 1;
  private options: Required<ParseOptions>;

  constructor(source: string, options: ParseOptions = {}) {
    this.source = source;
    this.options = {
      filename: 'template.html',
      preserveWhitespace: false,
      ignoreComments: true,
      parseDirectives: true,
      ...options
    };
  }

  parse(): ASTNode {
    const root: ASTNode = {
      type: 'element',
      tag: 'root',
      children: [],
      start: 0,
      end: this.source.length,
      loc: this.createLocation(0, this.source.length)
    };

    while (this.index < this.source.length) {
      const child = this.parseNode();
      if (child) {
        child.parent = root;
        root.children!.push(child);
      }
    }

    return root;
  }

  private parseNode(): ASTNode | null {
    this.skipWhitespace();
    
    if (this.index >= this.source.length) {
      return null;
    }

    if (this.peek() === '<') {
      if (this.peek(1) === '!') {
        if (this.peek(2) === '-' && this.peek(3) === '-') {
          return this.parseComment();
        } else {
          return this.parseDoctype();
        }
      } else if (this.peek(1) === '/') {
        // Closing tag - should be handled by parseElement
        return null;
      } else {
        return this.parseElement();
      }
    } else {
      return this.parseText();
    }
  }

  private parseElement(): ASTNode {
    const start = this.index;
    const startPos = this.getPosition();
    
    this.consume('<');
    
    const tag = this.parseTagName();
    const attributes: Record<string, string> = {};
    const directives: DirectiveNode[] = [];
    
    // Parse attributes and directives
    while (this.index < this.source.length && 
           !this.isEndOfTag() && 
           this.peek() !== '>') {
      this.skipWhitespace();
      
      if (this.isEndOfTag() || this.peek() === '>') {
        break;
      }
      
      const attr = this.parseAttribute();
      if (attr) {
        if (this.options.parseDirectives && attr.name.startsWith('x-')) {
          directives.push(this.parseDirective(attr.name, attr.value));
        } else {
          attributes[attr.name] = attr.value;
        }
      }
    }
    
    const isSelfClosing = this.peek() === '/' || this.isSelfClosingTag(tag);
    
    if (this.peek() === '/') {
      this.consume('/');
    }
    
    this.consume('>');
    
    const element: ASTNode = {
      type: 'element',
      tag,
      attributes,
      directives: directives.length > 0 ? directives : undefined,
      children: [],
      start,
      loc: {
        start: startPos,
        end: this.getPosition(),
        filename: this.options.filename
      }
    };
    
    if (!isSelfClosing) {
      // Parse children
      while (this.index < this.source.length) {
        if (this.peek() === '<' && this.peek(1) === '/') {
          // Check if this is our closing tag
          const closeTagStart = this.index;
          this.consume('<');
          this.consume('/');
          const closeTag = this.parseTagName();
          
          if (closeTag === tag) {
            this.consume('>');
            break;
          } else {
            // Not our closing tag, backtrack
            this.index = closeTagStart;
            break;
          }
        }
        
        const child = this.parseNode();
        if (child) {
          child.parent = element;
          element.children!.push(child);
        } else {
          break;
        }
      }
    }
    
    element.end = this.index;
    element.loc!.end = this.getPosition();
    
    return element;
  }

  private parseText(): ASTNode {
    const start = this.index;
    const startPos = this.getPosition();
    let content = '';
    
    while (this.index < this.source.length && this.peek() !== '<') {
      content += this.consume();
    }
    
    // Trim whitespace if not preserving
    if (!this.options.preserveWhitespace) {
      content = content.trim();
    }
    
    if (content.length === 0) {
      return null!;
    }
    
    return {
      type: 'text',
      content,
      start,
      end: this.index,
      loc: {
        start: startPos,
        end: this.getPosition(),
        filename: this.options.filename
      }
    };
  }

  private parseComment(): ASTNode {
    const start = this.index;
    const startPos = this.getPosition();
    
    this.consume('<');
    this.consume('!');
    this.consume('-');
    this.consume('-');
    
    let content = '';
    while (this.index < this.source.length) {
      if (this.peek() === '-' && this.peek(1) === '-' && this.peek(2) === '>') {
        this.consume('-');
        this.consume('-');
        this.consume('>');
        break;
      }
      content += this.consume();
    }
    
    return {
      type: 'comment',
      content,
      start,
      end: this.index,
      loc: {
        start: startPos,
        end: this.getPosition(),
        filename: this.options.filename
      }
    };
  }

  private parseDoctype(): ASTNode {
    const start = this.index;
    const startPos = this.getPosition();
    
    while (this.index < this.source.length && this.peek() !== '>') {
      this.consume();
    }
    
    if (this.peek() === '>') {
      this.consume('>');
    }
    
    return {
      type: 'comment', // Treat DOCTYPE as comment for simplicity
      content: 'DOCTYPE',
      start,
      end: this.index,
      loc: {
        start: startPos,
        end: this.getPosition(),
        filename: this.options.filename
      }
    };
  }

  private parseTagName(): string {
    let name = '';
    while (this.index < this.source.length && 
           /[a-zA-Z0-9-_:]/.test(this.peek())) {
      name += this.consume();
    }
    return name;
  }

  private parseAttribute(): { name: string; value: string } | null {
    this.skipWhitespace();
    
    const name = this.parseAttributeName();
    if (!name) return null;
    
    this.skipWhitespace();
    
    let value = '';
    if (this.peek() === '=') {
      this.consume('=');
      this.skipWhitespace();
      value = this.parseAttributeValue();
    }
    
    return { name, value };
  }

  private parseAttributeName(): string {
    let name = '';
    while (this.index < this.source.length && 
           /[^\s=/>]/.test(this.peek())) {
      name += this.consume();
    }
    return name;
  }

  private parseAttributeValue(): string {
    const quote = this.peek();
    if (quote === '"' || quote === "'") {
      this.consume(quote);
      let value = '';
      while (this.index < this.source.length && this.peek() !== quote) {
        value += this.consume();
      }
      if (this.peek() === quote) {
        this.consume(quote);
      }
      return value;
    } else {
      // Unquoted value
      let value = '';
      while (this.index < this.source.length && 
             !/[\s>]/.test(this.peek())) {
        value += this.consume();
      }
      return value;
    }
  }

  private parseDirective(name: string, expression: string): DirectiveNode {
    const parts = name.slice(2).split(':'); // Remove 'x-' prefix
    const directiveName = parts[0];
    const argument = parts[1];
    const modifiers = argument ? argument.split('.').slice(1) : [];
    
    return {
      name: directiveName,
      expression,
      argument: parts[1]?.split('.')[0],
      modifiers,
      loc: {
        start: this.getPosition(),
        end: this.getPosition(),
        filename: this.options.filename
      }
    };
  }

  private skipWhitespace(): void {
    while (this.index < this.source.length && /\s/.test(this.peek())) {
      this.consume();
    }
  }

  private isEndOfTag(): boolean {
    return this.peek() === '>' || (this.peek() === '/' && this.peek(1) === '>');
  }

  private isSelfClosingTag(tag: string): boolean {
    const selfClosingTags = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ]);
    return selfClosingTags.has(tag.toLowerCase());
  }

  private peek(offset = 0): string {
    return this.source[this.index + offset] || '';
  }

  private consume(expected?: string): string {
    const char = this.source[this.index];
    
    if (expected && char !== expected) {
      throw new Error(`Expected '${expected}' but got '${char}' at ${this.getPosition()}`);
    }
    
    this.index++;
    
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    
    return char;
  }

  private getPosition(): Position {
    return {
      line: this.line,
      column: this.column,
      offset: this.index
    };
  }

  private createLocation(start: number, end: number): SourceLocation {
    return {
      start: { line: 1, column: 1, offset: start },
      end: { line: 1, column: 1, offset: end },
      filename: this.options.filename
    };
  }
}

// Utility functions
export function parseHTML(source: string, options?: ParseOptions): ASTNode {
  const parser = new HTMLParser(source, options);
  return parser.parse();
}

export function walkAST(node: ASTNode, visitor: (node: ASTNode) => void | boolean): void {
  const result = visitor(node);
  
  // If visitor returns false, stop traversal
  if (result === false) return;
  
  if (node.children) {
    for (const child of node.children) {
      walkAST(child, visitor);
    }
  }
}

export function findDirectives(ast: ASTNode): DirectiveNode[] {
  const directives: DirectiveNode[] = [];
  
  walkAST(ast, (node) => {
    if (node.directives) {
      directives.push(...node.directives);
    }
  });
  
  return directives;
}

export function findElements(ast: ASTNode, predicate: (node: ASTNode) => boolean): ASTNode[] {
  const elements: ASTNode[] = [];
  
  walkAST(ast, (node) => {
    if (predicate(node)) {
      elements.push(node);
    }
  });
  
  return elements;
}