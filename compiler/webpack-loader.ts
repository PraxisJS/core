// Webpack Loader for PraxisJS

import { LoaderContext } from 'webpack';
import { CoralCompiler, CompilerOptions } from './compiler.js';
import { getOptions } from 'loader-utils';
import validateOptions from 'schema-utils';
import path from 'path';

// Loader options schema for validation
const schema = {
  type: 'object',
  properties: {
    optimize: {
      type: 'object',
      properties: {
        hoistStatic: { type: 'boolean' },
        optimizeExpressions: { type: 'boolean' },
        removeUnusedDirectives: { type: 'boolean' },
        inlineConstants: { type: 'boolean' },
        aggressive: { type: 'boolean' }
      }
    },
    codegen: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['development', 'production'] },
        ssr: { type: 'boolean' },
        minify: { type: 'boolean' },
        sourceMaps: { type: 'boolean' }
      }
    },
    hmr: { type: 'boolean' },
    extractCSS: { type: 'boolean' },
    transformAssets: { type: 'boolean' }
  },
  additionalProperties: false
};

export interface CoralLoaderOptions extends CompilerOptions {
  hmr?: boolean;
  extractCSS?: boolean;
  transformAssets?: boolean;
}

export default function praxisLoader(this: LoaderContext<CoralLoaderOptions>, source: string) {
  const callback = this.async();
  const options = getOptions(this) || {};
  
  // Validate options
  validateOptions(schema, options, {
    name: 'Coral Loader',
    baseDataPath: 'options'
  });
  
  try {
    const isProduction = this.mode === 'production';
    const filename = this.resourcePath;
    
    // Configure compiler based on webpack mode and options
    const compiler = new CoralCompiler({
      filename,
      ...options,
      codegen: {
        mode: isProduction ? 'production' : 'development',
        minify: isProduction,
        sourceMaps: this.sourceMap,
        ...options.codegen
      },
      optimize: {
        aggressive: isProduction,
        hoistStatic: true,
        optimizeExpressions: isProduction,
        removeUnusedDirectives: true,
        ...options.optimize
      }
    });
    
    // Compile template
    const result = compiler.compile(source, filename);
    
    if (result.errors.length > 0) {
      const error = new Error(`Coral compilation failed: ${result.errors.map(e => e.message).join(', ')}`);
      return callback(error);
    }
    
    // Emit warnings
    result.warnings.forEach(warning => {
      this.emitWarning(new Error(`${warning.message} at ${warning.filename}:${warning.line}:${warning.column}`));
    });
    
    let code = result.code;
    
    // Add HMR support in development
    if (options.hmr !== false && !isProduction) {
      code = addHMRSupport(code, filename);
    }
    
    // Extract CSS if enabled
    if (options.extractCSS) {
      const { code: codeWithoutCSS, css } = extractCSS(code);
      code = codeWithoutCSS;
      
      if (css) {
        // Emit CSS as separate file
        this.emitFile(
          path.basename(filename, path.extname(filename)) + '.css',
          css
        );
      }
    }
    
    // Add source map if available
    const map = result.map && this.sourceMap ? result.map : null;
    
    callback(null, code, map);
    
  } catch (error) {
    callback(error instanceof Error ? error : new Error(String(error)));
  }
}

function addHMRSupport(code: string, filename: string): string {
  return `
${code}

// HMR Support
if (module.hot) {
  module.hot.accept();
  
  if (module.hot.data && module.hot.data.prevRenderFn) {
    // Update existing components
    if (typeof praxis !== 'undefined') {
      praxis.updateTemplate('${filename}', render);
    }
  }
  
  module.hot.dispose(function(data) {
    data.prevRenderFn = render;
  });
}
`;
}

function extractCSS(code: string): { code: string; css: string | null } {
  // Simple CSS extraction - in a real implementation, this would be more sophisticated
  const cssRegex = /\/\*\s*<style>(.*?)<\/style>\s*\*\//gs;
  let css = '';
  
  const codeWithoutCSS = code.replace(cssRegex, (match, styles) => {
    css += styles;
    return '';
  });
  
  return {
    code: codeWithoutCSS,
    css: css || null
  };
}

// Webpack plugin for global configuration
export class CoralWebpackPlugin {
  private options: CoralLoaderOptions;
  
  constructor(options: CoralLoaderOptions = {}) {
    this.options = options;
  }
  
  apply(compiler: any) {
    const { webpack } = compiler;
    const { Compilation } = webpack;
    
    compiler.hooks.compilation.tap('CoralWebpackPlugin', (compilation: any) => {
      // Add praxis runtime to dependencies
      compilation.hooks.buildModule.tap('CoralWebpackPlugin', (module: any) => {
        if (module.resource && module.resource.endsWith('.praxis')) {
          // Mark praxis templates for special handling
          module.___isCoral = true;
        }
      });
      
      // Optimize praxis templates in the final bundle
      compilation.hooks.optimizeChunkAssets.tapAsync('CoralWebpackPlugin', (chunks: any[], callback: any) => {
        chunks.forEach(chunk => {
          chunk.files.forEach((file: string) => {
            if (file.endsWith('.js')) {
              const asset = compilation.assets[file];
              if (asset && asset.source().includes('/* praxis-template */')) {
                // Apply praxis-specific optimizations
                const optimized = this.optimizeCoralAsset(asset.source());
                compilation.assets[file] = {
                  source: () => optimized,
                  size: () => optimized.length
                };
              }
            }
          });
        });
        
        callback();
      });
    });
    
    // Add praxis file extensions to resolve
    compiler.options.resolve = compiler.options.resolve || {};
    compiler.options.resolve.extensions = compiler.options.resolve.extensions || [];
    
    if (!compiler.options.resolve.extensions.includes('.praxis')) {
      compiler.options.resolve.extensions.push('.praxis');
    }
  }
  
  private optimizeCoralAsset(source: string): string {
    // Apply praxis-specific optimizations
    return source
      .replace(/\/\*\s*praxis-template\s*\*\/[^}]*}/g, '') // Remove praxis comments
      .replace(/\s+/g, ' ') // Minify whitespace
      .trim();
  }
}

// Webpack rule helper
export function createCoralRule(options: CoralLoaderOptions = {}) {
  return {
    test: /\.praxis$/,
    use: [
      {
        loader: require.resolve('./webpack-loader'),
        options
      }
    ]
  };
}

// TypeScript support
export function createCoralTSRule(options: CoralLoaderOptions = {}) {
  return {
    test: /\.praxis$/,
    use: [
      {
        loader: 'ts-loader',
        options: {
          transpileOnly: true
        }
      },
      {
        loader: require.resolve('./webpack-loader'),
        options: {
          ...options,
          codegen: {
            ...options.codegen,
            typescript: true
          }
        }
      }
    ]
  };
}

// Development server integration
export function createDevServerConfig() {
  return {
    contentBase: path.join(process.cwd(), 'dist'),
    hot: true,
    before: (app: any) => {
      // Add middleware for praxis templates
      app.get('*.praxis', (req: any, res: any, next: any) => {
        res.setHeader('Content-Type', 'text/html');
        next();
      });
    }
  };
}

// Example webpack configuration
export function createWebpackConfig(options: CoralLoaderOptions = {}) {
  return {
    module: {
      rules: [
        createCoralRule(options),
        // Add other rules as needed
      ]
    },
    plugins: [
      new CoralWebpackPlugin(options)
    ],
    resolve: {
      extensions: ['.js', '.ts', '.praxis']
    }
  };
}