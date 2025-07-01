export interface SanitizerConfig {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedProtocols: string[];
}

export const DEFAULT_SANITIZER_CONFIG: SanitizerConfig = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'code', 'pre'
  ],
  allowedAttributes: {
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'width', 'height'],
    '*': ['class', 'id']
  },
  allowedProtocols: ['http', 'https', 'mailto']
};

export class HTMLSanitizer {
  private config: SanitizerConfig;

  constructor(config: SanitizerConfig = DEFAULT_SANITIZER_CONFIG) {
    this.config = config;
  }

  sanitize(html: string): string {
    if (typeof html !== 'string') {
      return String(html);
    }

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = html;

    // Recursively sanitize
    this.sanitizeNode(container);

    return container.innerHTML;
  }

  private sanitizeNode(node: Element): void {
    const children = Array.from(node.children);
    
    children.forEach(child => {
      if (this.isAllowedTag(child.tagName.toLowerCase())) {
        this.sanitizeAttributes(child);
        this.sanitizeNode(child);
      } else {
        // Remove disallowed tags but keep their text content
        const textContent = child.textContent || '';
        const textNode = document.createTextNode(textContent);
        child.parentNode?.replaceChild(textNode, child);
      }
    });
  }

  private isAllowedTag(tagName: string): boolean {
    return this.config.allowedTags.includes(tagName);
  }

  private sanitizeAttributes(element: Element): void {
    const attributes = Array.from(element.attributes);
    const tagName = element.tagName.toLowerCase();
    
    attributes.forEach(attr => {
      const attrName = attr.name.toLowerCase();
      
      if (!this.isAllowedAttribute(tagName, attrName)) {
        element.removeAttribute(attr.name);
        return;
      }

      // Special handling for URLs
      if (this.isUrlAttribute(attrName)) {
        const url = attr.value.trim();
        if (!this.isAllowedProtocol(url)) {
          element.removeAttribute(attr.name);
        }
      }

      // Remove javascript: and data: protocols
      if (attr.value.toLowerCase().includes('javascript:') || 
          attr.value.toLowerCase().includes('data:')) {
        element.removeAttribute(attr.name);
      }
    });
  }

  private isAllowedAttribute(tagName: string, attrName: string): boolean {
    const tagAttrs = this.config.allowedAttributes[tagName] || [];
    const globalAttrs = this.config.allowedAttributes['*'] || [];
    
    return tagAttrs.includes(attrName) || globalAttrs.includes(attrName);
  }

  private isUrlAttribute(attrName: string): boolean {
    return ['href', 'src', 'action'].includes(attrName);
  }

  private isAllowedProtocol(url: string): boolean {
    if (url.startsWith('#') || url.startsWith('/') || url.startsWith('./')) {
      return true; // Relative URLs are allowed
    }

    const protocolMatch = url.match(/^([a-z][a-z0-9+.-]*:)/i);
    if (!protocolMatch) {
      return true; // No protocol specified
    }

    const protocol = protocolMatch[1].slice(0, -1).toLowerCase();
    return this.config.allowedProtocols.includes(protocol);
  }
}

export const defaultSanitizer = new HTMLSanitizer();