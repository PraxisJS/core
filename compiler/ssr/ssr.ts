// Server-Side Rendering for PraxisJS

export interface SSRContext {
  url: string;
  request?: any;
  response?: any;
  [key: string]: any;
}

export interface SSROptions {
  hydration?: HydrationStrategy;
  streaming?: boolean;
  prerender?: boolean;
  target?: SSRTarget;
  clientManifest?: ClientManifest;
}

export type HydrationStrategy = 'progressive' | 'partial' | 'lazy' | 'full';
export type SSRTarget = 'node' | 'webworker' | 'edge';

export interface ClientManifest {
  publicPath: string;
  all: string[];
  initial: string[];
  async: string[];
  modules: Record<string, number[]>;
}

export interface SSRResult {
  html: string;
  head?: string;
  script?: string;
  state?: any;
  preloadLinks?: string[];
}

export interface RenderFunction {
  (context: SSRContext): string | Promise<string>;
}

export class SSRRenderer {
  private renderFn: RenderFunction;
  private options: SSROptions;
  private clientManifest?: ClientManifest;

  constructor(renderFn: RenderFunction, options: SSROptions = {}) {
    this.renderFn = renderFn;
    this.options = {
      hydration: 'full',
      streaming: false,
      prerender: false,
      target: 'node',
      ...options
    };
    this.clientManifest = options.clientManifest;
  }

  async renderToString(context: SSRContext): Promise<SSRResult> {
    try {
      const html = await this.renderFn(context);
      const hydrationScript = this.generateHydrationScript(context);
      const preloadLinks = this.generatePreloadLinks();
      
      return {
        html,
        script: hydrationScript,
        preloadLinks,
        state: context
      };
    } catch (error) {
      throw new Error(`SSR failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async renderToStream(context: SSRContext): Promise<ReadableStream> {
    if (!this.options.streaming) {
      throw new Error('Streaming not enabled');
    }

    return new ReadableStream({
      start: async (controller) => {
        try {
          const html = await this.renderFn(context);
          
          // Split HTML into chunks for streaming
          const chunks = this.splitForStreaming(html);
          
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
            // Add small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }

  private generateHydrationScript(context: SSRContext): string {
    const strategy = this.options.hydration;
    const stateScript = `window.__SSR_STATE__ = ${JSON.stringify(context)};`;
    
    switch (strategy) {
      case 'progressive':
        return `
${stateScript}
window.__HYDRATION_STRATEGY__ = 'progressive';
// Progressive hydration will start from visible components
document.addEventListener('DOMContentLoaded', function() {
  praxis.hydrateProgressive(document.body, window.__SSR_STATE__);
});
`;
      
      case 'partial':
        return `
${stateScript}
window.__HYDRATION_STRATEGY__ = 'partial';
// Only hydrate components marked with x-hydrate
document.addEventListener('DOMContentLoaded', function() {
  praxis.hydratePartial(document.body, window.__SSR_STATE__);
});
`;
      
      case 'lazy':
        return `
${stateScript}
window.__HYDRATION_STRATEGY__ = 'lazy';
// Hydrate on interaction
document.addEventListener('DOMContentLoaded', function() {
  praxis.hydrateLazy(document.body, window.__SSR_STATE__);
});
`;
      
      default: // 'full'
        return `
${stateScript}
window.__HYDRATION_STRATEGY__ = 'full';
document.addEventListener('DOMContentLoaded', function() {
  praxis.hydrate(document.body, window.__SSR_STATE__);
});
`;
    }
  }

  private generatePreloadLinks(): string[] {
    if (!this.clientManifest) {
      return [];
    }

    const links: string[] = [];
    const { publicPath, initial } = this.clientManifest;

    // Preload initial chunks
    for (const file of initial) {
      if (file.endsWith('.js')) {
        links.push(`<link rel="modulepreload" href="${publicPath}${file}">`);
      } else if (file.endsWith('.css')) {
        links.push(`<link rel="preload" href="${publicPath}${file}" as="style">`);
      }
    }

    return links;
  }

  private splitForStreaming(html: string): string[] {
    // Simple streaming strategy - split on component boundaries
    const chunks: string[] = [];
    const componentRegex = /<[^>]+x-data[^>]*>/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = componentRegex.exec(html)) !== null) {
      if (match.index > lastIndex) {
        chunks.push(html.slice(lastIndex, match.index));
      }
      lastIndex = match.index;
    }
    
    if (lastIndex < html.length) {
      chunks.push(html.slice(lastIndex));
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }
}

// Static Site Generation
export class SSGGenerator {
  private renderer: SSRRenderer;
  private routes: SSGRoute[];

  constructor(renderer: SSRRenderer, routes: SSGRoute[] = []) {
    this.renderer = renderer;
    this.routes = routes;
  }

  async generateSite(outputDir: string): Promise<SSGResult[]> {
    const results: SSGResult[] = [];
    
    for (const route of this.routes) {
      const result = await this.generatePage(route, outputDir);
      results.push(result);
    }
    
    return results;
  }

  private async generatePage(route: SSGRoute, outputDir: string): Promise<SSGResult> {
    const context: SSRContext = {
      url: route.path,
      ...route.data
    };
    
    const ssrResult = await this.renderer.renderToString(context);
    const fullHtml = this.wrapInDocument(ssrResult, route);
    
    // Write to file system
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const filePath = path.join(outputDir, route.path === '/' ? 'index.html' : `${route.path.slice(1)}/index.html`);
    const dir = path.dirname(filePath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, fullHtml);
    
    return {
      route: route.path,
      file: filePath,
      size: Buffer.byteLength(fullHtml, 'utf8')
    };
  }

  private wrapInDocument(ssrResult: SSRResult, route: SSGRoute): string {
    const preloadLinks = ssrResult.preloadLinks?.join('\n  ') || '';
    
    return `<!DOCTYPE html>
<html${route.lang ? ` lang="${route.lang}"` : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${route.title || 'PraxisJS App'}</title>
  ${route.meta ? route.meta.map(m => `<meta ${Object.entries(m).map(([k, v]) => `${k}="${v}"`).join(' ')}>`).join('\n  ') : ''}
  ${preloadLinks}
  ${ssrResult.head || ''}
</head>
<body>
  <div id="app">${ssrResult.html}</div>
  ${ssrResult.script ? `<script>${ssrResult.script}</script>` : ''}
  ${route.scripts ? route.scripts.map(s => `<script src="${s}"></script>`).join('\n  ') : ''}
</body>
</html>`;
  }
}

export interface SSGRoute {
  path: string;
  title?: string;
  lang?: string;
  meta?: Array<Record<string, string>>;
  scripts?: string[];
  data?: Record<string, any>;
}

export interface SSGResult {
  route: string;
  file: string;
  size: number;
}

// Hydration strategies implementation
export class HydrationManager {
  private strategy: HydrationStrategy;
  private state: any;

  constructor(strategy: HydrationStrategy, state: any) {
    this.strategy = strategy;
    this.state = state;
  }

  hydrate(element: Element): void {
    switch (this.strategy) {
      case 'progressive':
        this.hydrateProgressive(element);
        break;
      case 'partial':
        this.hydratePartial(element);
        break;
      case 'lazy':
        this.hydrateLazy(element);
        break;
      default:
        this.hydrateFull(element);
    }
  }

  private hydrateProgressive(element: Element): void {
    // Hydrate visible components first
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.hydrateComponent(entry.target);
          observer.unobserve(entry.target);
        }
      });
    });

    const components = element.querySelectorAll('[x-data]');
    components.forEach(component => observer.observe(component));
  }

  private hydratePartial(element: Element): void {
    // Only hydrate components marked with x-hydrate
    const components = element.querySelectorAll('[x-data][x-hydrate]');
    components.forEach(component => this.hydrateComponent(component));
  }

  private hydrateLazy(element: Element): void {
    // Hydrate on first interaction
    const components = element.querySelectorAll('[x-data]');
    
    components.forEach(component => {
      const events = ['click', 'focus', 'mouseover', 'touchstart'];
      
      const hydrateOnce = () => {
        this.hydrateComponent(component);
        events.forEach(event => {
          component.removeEventListener(event, hydrateOnce);
        });
      };
      
      events.forEach(event => {
        component.addEventListener(event, hydrateOnce, { once: true, passive: true });
      });
    });
  }

  private hydrateFull(element: Element): void {
    // Hydrate all components immediately
    const components = element.querySelectorAll('[x-data]');
    components.forEach(component => this.hydrateComponent(component));
  }

  private hydrateComponent(component: Element): void {
    // Initialize component with PraxisJS
    if (typeof (window as any).praxis !== 'undefined') {
      (window as any).praxis.init(component, this.state);
    }
  }
}

// Edge runtime compatibility
export class EdgeSSRRenderer extends SSRRenderer {
  constructor(renderFn: RenderFunction, options: SSROptions = {}) {
    super(renderFn, { ...options, target: 'edge' });
  }

  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const context: SSRContext = {
      url: url.pathname,
      request,
      headers: Object.fromEntries(request.headers.entries()),
      query: Object.fromEntries(url.searchParams.entries())
    };

    try {
      if (this.options.streaming) {
        const stream = await this.renderToStream(context);
        return new Response(stream, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      } else {
        const result = await this.renderToString(context);
        return new Response(result.html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    } catch (error) {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}

// Utility functions
export function createSSRContext(data: Record<string, any> = {}): SSRContext {
  return {
    url: '/',
    ...data
  };
}

export function createSSRRenderer(renderFn: RenderFunction, options?: SSROptions): SSRRenderer {
  return new SSRRenderer(renderFn, options);
}

export function createSSGGenerator(renderer: SSRRenderer, routes: SSGRoute[]): SSGGenerator {
  return new SSGGenerator(renderer, routes);
}

export async function renderToString(renderFn: RenderFunction, context: SSRContext): Promise<string> {
  const renderer = new SSRRenderer(renderFn);
  const result = await renderer.renderToString(context);
  return result.html;
}

export async function renderToStream(renderFn: RenderFunction, context: SSRContext): Promise<ReadableStream> {
  const renderer = new SSRRenderer(renderFn, { streaming: true });
  return await renderer.renderToStream(context);
}

// Island architecture support
export interface Island {
  component: string;
  props: any;
  hydrate: boolean;
  priority?: number;
}

export class IslandRenderer {
  private islands: Map<string, Island> = new Map();

  registerIsland(id: string, island: Island): void {
    this.islands.set(id, island);
  }

  renderIslands(): string {
    const sortedIslands = Array.from(this.islands.entries())
      .sort(([, a], [, b]) => (b.priority || 0) - (a.priority || 0));

    return sortedIslands
      .map(([id, island]) => this.renderIsland(id, island))
      .join('\n');
  }

  private renderIsland(id: string, island: Island): string {
    const dataAttrs = island.hydrate ? ' data-hydrate="true"' : '';
    const propsScript = `<script type="application/json" data-props="${id}">${JSON.stringify(island.props)}</script>`;
    
    return `
<div id="${id}" data-island="${island.component}"${dataAttrs}>
  <!-- Server-rendered content -->
</div>
${propsScript}`;
  }
}