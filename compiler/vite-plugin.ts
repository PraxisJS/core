// Vite Plugin for PraxisJS

import type { Plugin, TransformResult, ResolvedConfig } from 'vite';
import { CoralCompiler, CompilerOptions } from './compiler.js';
import path from 'path';
import fs from 'fs';

export interface CoralVitePluginOptions extends CompilerOptions {
  include?: string | RegExp | Array<string | RegExp>;
  exclude?: string | RegExp | Array<string | RegExp>;
  ssr?: SSROptions;
  hmr?: boolean;
  transformAssets?: boolean;
  optimizeDeps?: string[];
}

export interface SSROptions {
  enabled?: boolean;
  prerender?: boolean;
  hydration?: 'progressive' | 'partial' | 'lazy' | 'full';
  target?: 'node' | 'webworker' | 'edge';
}

export interface TransformContext {
  id: string;
  code: string;
  ssr: boolean;
  config: ResolvedConfig;
}

export function praxis(options: CoralVitePluginOptions = {}): Plugin {
  let config: ResolvedConfig;
  let compiler: CoralCompiler;
  let isProduction: boolean;

  const {
    include = [/\.praxis$/, /\.html$/],
    exclude = [/node_modules/],
    ssr = {},
    hmr = true,
    transformAssets = true,
    optimizeDeps = ['@oxog/praxis-runtime'],
    ...compilerOptions
  } = options;

  return {
    name: 'praxis',
    
    configResolved(resolvedConfig) {
      config = resolvedConfig;
      isProduction = config.command === 'build';
      
      // Initialize compiler with appropriate options
      compiler = new CoralCompiler({
        ...compilerOptions,
        codegen: {
          mode: isProduction ? 'production' : 'development',
          minify: isProduction,
          sourceMaps: config.build.sourcemap !== false,
          ssr: ssr.enabled || false,
          ...compilerOptions.codegen
        },
        optimize: {
          aggressive: isProduction,
          hoistStatic: true,
          optimizeExpressions: isProduction,
          removeUnusedDirectives: true,
          ...compilerOptions.optimize
        }
      });
    },

    buildStart() {
      // Add praxis runtime to optimized dependencies
      if (optimizeDeps.length > 0) {
        this.addWatchFile(path.join(__dirname, '../dist/praxis.js'));
      }
    },

    resolveId(id, importer) {
      // Handle praxis template imports
      if (id.endsWith('.praxis')) {
        return id;
      }
      
      // Handle virtual modules for SSR
      if (id.startsWith('virtual:praxis-ssr-')) {
        return id;
      }
      
      return null;
    },

    load(id) {
      // Load praxis template files
      if (id.endsWith('.praxis')) {
        try {
          return fs.readFileSync(id, 'utf-8');
        } catch (error) {
          this.error(`Failed to load praxis template: ${id}`);
        }
      }
      
      // Load virtual SSR modules
      if (id.startsWith('virtual:praxis-ssr-')) {
        const originalId = id.replace('virtual:praxis-ssr-', '');
        return this.generateSSRModule(originalId);
      }
      
      return null;
    },

    transform(code: string, id: string, transformOptions): TransformResult | null {
      if (!this.shouldTransform(id)) {
        return null;
      }

      try {
        const context: TransformContext = {
          id,
          code,
          ssr: transformOptions?.ssr || false,
          config
        };

        return this.transformTemplate(context);
      } catch (error) {
        this.error(`Failed to transform ${id}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    },

    generateBundle(outputOptions, bundle) {
      if (ssr.prerender) {
        this.generatePrerenderFiles(bundle);
      }
    },

    handleHotUpdate(ctx) {
      if (!hmr || !this.shouldTransform(ctx.file)) {
        return;
      }

      // Invalidate module and trigger re-compilation
      const module = ctx.server.moduleGraph.getModuleById(ctx.file);
      if (module) {
        ctx.server.reloadModule(module);
      }

      return [];
    },

    // Helper methods
    shouldTransform(id: string): boolean {
      if (this.isExcluded(id, exclude)) {
        return false;
      }
      
      return this.isIncluded(id, include);
    },

    isIncluded(id: string, patterns: string | RegExp | Array<string | RegExp>): boolean {
      const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
      
      return patternsArray.some(pattern => {
        if (typeof pattern === 'string') {
          return id.includes(pattern);
        }
        return pattern.test(id);
      });
    },

    isExcluded(id: string, patterns: string | RegExp | Array<string | RegExp>): boolean {
      const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
      
      return patternsArray.some(pattern => {
        if (typeof pattern === 'string') {
          return id.includes(pattern);
        }
        return pattern.test(id);
      });
    },

    transformTemplate(context: TransformContext): TransformResult {
      const { id, code, ssr } = context;
      
      // Compile template
      const result = compiler.compile(code, id);
      
      if (result.errors.length > 0) {
        throw new Error(`Compilation failed: ${result.errors.map(e => e.message).join(', ')}`);
      }
      
      // Log warnings in development
      if (!isProduction && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          console.warn(`[praxis] ${warning.message} at ${warning.filename}:${warning.line}:${warning.column}`);
        });
      }
      
      let transformedCode = result.code;
      
      // Add HMR support in development
      if (hmr && !isProduction && !ssr) {
        transformedCode = this.addHMRSupport(transformedCode, id);
      }
      
      // Transform for SSR if needed
      if (ssr && ssr.enabled) {
        transformedCode = this.transformForSSR(transformedCode, context);
      }
      
      return {
        code: transformedCode,
        map: result.map
      };
    },

    addHMRSupport(code: string, id: string): string {
      return `
${code}

// HMR Support
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.data.renderFn = render;
  
  if (import.meta.hot.data.prevRenderFn) {
    // Update existing components
    praxis.updateTemplate('${id}', render);
  }
  
  import.meta.hot.data.prevRenderFn = render;
}
`;
    },

    transformForSSR(code: string, context: TransformContext): string {
      const { ssr: ssrOptions } = options;
      
      // Add SSR-specific imports and setup
      let ssrCode = `
import { renderToString, renderToStream } from '@oxog/praxis-ssr';

`;
      
      ssrCode += code;
      
      // Add SSR render functions
      ssrCode += `

// SSR Functions
export function renderToString(ctx) {
  return renderToString(render(ctx));
}

export function renderToStream(ctx) {
  return renderToStream(render(ctx));
}

// Hydration data
export function getHydrationData(ctx) {
  return {
    props: ctx,
    strategy: '${ssrOptions.hydration || 'full'}'
  };
}
`;
      
      return ssrCode;
    },

    generateSSRModule(originalId: string): string {
      // Generate a virtual SSR module for the given template
      return `
import { render } from '${originalId}';
import { renderToString, createSSRContext } from '@oxog/praxis-ssr';

export default function(props = {}) {
  const ctx = createSSRContext(props);
  return renderToString(render(ctx));
}

export { render };
`;
    },

    generatePrerenderFiles(bundle: any): void {
      // Generate static HTML files for prerendering
      const prerenderRoutes = this.getPrerenderRoutes();
      
      for (const route of prerenderRoutes) {
        const html = this.prerenderRoute(route);
        
        this.emitFile({
          type: 'asset',
          fileName: route === '/' ? 'index.html' : `${route.slice(1)}/index.html`,
          source: html
        });
      }
    },

    getPrerenderRoutes(): string[] {
      // Get routes to prerender from config or discovery
      return ['/'];
    },

    prerenderRoute(route: string): string {
      // Prerender a specific route
      return `<!DOCTYPE html>
<html>
<head>
  <title>PraxisJS App</title>
</head>
<body>
  <div id="app"><!-- Prerendered content for ${route} --></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`;
    }
  };
}

// TypeScript support
export function praxisTS(options: CoralVitePluginOptions = {}): Plugin {
  return praxis({
    ...options,
    codegen: {
      ...options.codegen,
      typescript: true
    }
  });
}

// Development server integration
export function devMiddleware() {
  return function(req: any, res: any, next: any) {
    if (req.url.endsWith('.praxis')) {
      // Serve praxis templates with proper MIME type
      res.setHeader('Content-Type', 'text/html');
    }
    next();
  };
}

// Build optimization helpers
export function optimizeCoralBundle(bundle: any) {
  // Optimize the generated bundle for praxis templates
  for (const [fileName, chunk] of Object.entries(bundle)) {
    if (fileName.includes('praxis-template-')) {
      // Apply praxis-specific optimizations
      // @ts-ignore
      chunk.code = optimizeCoralCode(chunk.code);
    }
  }
}

function optimizeCoralCode(code: string): string {
  // Apply praxis-specific code optimizations
  return code
    .replace(/\s+/g, ' ')  // Minify whitespace
    .replace(/console\.(log|warn|debug)\([^)]*\);?/g, ''); // Remove console statements in production
}

export default praxis;