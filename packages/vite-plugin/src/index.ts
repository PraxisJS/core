import type { Plugin, ViteDevServer } from 'vite';
import type { FilterPattern } from '@rollup/pluginutils';
import { createFilter } from '@rollup/pluginutils';

export interface PraxisVitePluginOptions {
  include?: FilterPattern;
  exclude?: FilterPattern;
  hmr?: boolean;
  optimize?: boolean;
}

export function praxisPlugin(options: PraxisVitePluginOptions = {}): Plugin {
  const {
    include = /\.(tsx?|jsx?)$/,
    exclude = /node_modules/,
    hmr = true,
    optimize = true
  } = options;

  const filter = createFilter(include, exclude);

  return {
    name: 'vite-plugin-praxis',
    
    // Transform hook for build time optimizations
    transform(code: string, id: string) {
      if (!filter(id)) return null;
      
      // TODO: Implement Praxis-specific transformations
      // - Component optimization
      // - Reactive binding compilation
      // - Template processing
      
      return {
        code,
        map: null
      };
    },
    
    // Configure HMR
    configureServer(server: ViteDevServer) {
      if (!hmr) return;
      
      // TODO: Implement Praxis-specific HMR logic
      server.ws.on('praxis:update', (data) => {
        // Handle component updates
        server.ws.send({
          type: 'custom',
          event: 'praxis:hmr',
          data
        });
      });
    },
    
    // Optimize deps
    config() {
      if (!optimize) return {};
      
      return {
        optimizeDeps: {
          include: ['@oxog/praxis']
        }
      };
    }
  };
}

// Export default function
export default praxisPlugin;