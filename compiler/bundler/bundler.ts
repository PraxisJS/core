// Bundle Generator and Optimizer for PraxisJS

import { rollup, RollupOptions, OutputOptions, Plugin } from 'rollup';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import { gzipSize } from 'gzip-size';
import fs from 'fs/promises';
import path from 'path';

export interface BundleOptions {
  input: string;
  output: string;
  formats: BundleFormat[];
  minify?: boolean;
  sourcemap?: boolean;
  external?: string[];
  globals?: Record<string, string>;
  treeshake?: boolean;
  target?: 'es2015' | 'es2018' | 'es2020' | 'esnext';
  environment?: 'development' | 'production';
}

export type BundleFormat = 'esm' | 'cjs' | 'iife' | 'umd' | 'amd';

export interface BundleResult {
  format: BundleFormat;
  file: string;
  size: number;
  gzipSize: number;
  exports: string[];
  chunks?: ChunkInfo[];
}

export interface ChunkInfo {
  fileName: string;
  size: number;
  modules: string[];
  isDynamicEntry: boolean;
}

export interface BundleStats {
  totalSize: number;
  totalGzipSize: number;
  formats: BundleResult[];
  treeshakeEffectiveness: number;
  compressionRatio: number;
}

export class CoralBundler {
  private options: BundleOptions;

  constructor(options: BundleOptions) {
    this.options = options;
  }

  async bundle(): Promise<BundleStats> {
    const results: BundleResult[] = [];
    
    for (const format of this.options.formats) {
      const result = await this.bundleFormat(format);
      results.push(result);
    }
    
    return this.calculateStats(results);
  }

  private async bundleFormat(format: BundleFormat): Promise<BundleResult> {
    const inputOptions = this.createInputOptions();
    const outputOptions = this.createOutputOptions(format);
    
    const bundle = await rollup(inputOptions);
    const { output } = await bundle.generate(outputOptions);
    
    // Write bundle to disk
    await bundle.write(outputOptions);
    
    const mainChunk = output.find(chunk => chunk.type === 'chunk' && chunk.isEntry);
    if (!mainChunk || mainChunk.type !== 'chunk') {
      throw new Error('No entry chunk found');
    }
    
    const filePath = path.join(this.options.output, outputOptions.file!);
    const size = Buffer.byteLength(mainChunk.code, 'utf8');
    const gzipSize = await this.getGzipSize(mainChunk.code);
    
    const chunks: ChunkInfo[] = output
      .filter(chunk => chunk.type === 'chunk')
      .map(chunk => {
        const chunkData = chunk as any;
        return {
          fileName: chunkData.fileName,
          size: Buffer.byteLength(chunkData.code, 'utf8'),
          modules: Object.keys(chunkData.modules),
          isDynamicEntry: chunkData.isDynamicEntry
        };
      });
    
    await bundle.close();
    
    return {
      format,
      file: filePath,
      size,
      gzipSize,
      exports: mainChunk.exports,
      chunks
    };
  }

  private createInputOptions(): RollupOptions {
    const plugins: Plugin[] = [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        target: this.options.target || 'es2018',
        module: 'esnext',
        declaration: false,
        sourceMap: this.options.sourcemap
      })
    ];
    
    // Add environment-specific replacements
    plugins.push(replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify(this.options.environment || 'production'),
        '__DEV__': this.options.environment === 'development' ? 'true' : 'false',
        '__VERSION__': JSON.stringify(this.getVersion())
      }
    }));
    
    // Add minification for production
    if (this.options.minify && this.options.environment === 'production') {
      plugins.push(terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false,
          drop_console: true,
          drop_debugger: true
        },
        mangle: {
          reserved: ['praxis', 'PraxisJS']
        }
      }));
    }
    
    return {
      input: this.options.input,
      external: this.options.external || [],
      plugins,
      treeshake: this.options.treeshake !== false ? {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false
      } : false
    };
  }

  private createOutputOptions(format: BundleFormat): OutputOptions {
    const extension = this.getFileExtension(format);
    const file = `praxis${this.options.minify ? '.min' : ''}.${extension}`;
    
    const outputOptions: OutputOptions = {
      file: path.join(this.options.output, file),
      format: this.rollupFormat(format),
      sourcemap: this.options.sourcemap,
      exports: 'named'
    };
    
    if (format === 'iife' || format === 'umd') {
      outputOptions.name = 'Coral';
      outputOptions.globals = this.options.globals || {};
    }
    
    if (format === 'esm') {
      outputOptions.chunkFileNames = 'chunks/[name]-[hash].js';
      outputOptions.manualChunks = this.createManualChunks();
    }
    
    return outputOptions;
  }

  private rollupFormat(format: BundleFormat): string {
    const formatMap = {
      'esm': 'es',
      'cjs': 'cjs',
      'iife': 'iife',
      'umd': 'umd',
      'amd': 'amd'
    };
    return formatMap[format];
  }

  private getFileExtension(format: BundleFormat): string {
    const extensionMap = {
      'esm': 'mjs',
      'cjs': 'cjs',
      'iife': 'js',
      'umd': 'js',
      'amd': 'js'
    };
    return extensionMap[format];
  }

  private createManualChunks() {
    return {
      'vendor': ['tslib'],
      'runtime': ['src/core/signal', 'src/core/effect', 'src/core/computed'],
      'directives': ['src/directives'],
      'store': ['src/store']
    };
  }

  private async getGzipSize(code: string): Promise<number> {
    return await gzipSize(code);
  }

  private getVersion(): string {
    // In a real implementation, this would read from package.json
    return '1.0.0';
  }

  private calculateStats(results: BundleResult[]): BundleStats {
    const totalSize = results.reduce((sum, result) => sum + result.size, 0);
    const totalGzipSize = results.reduce((sum, result) => sum + result.gzipSize, 0);
    
    // Calculate treeshake effectiveness (simplified)
    const originalSize = totalSize * 1.3; // Assume 30% reduction
    const treeshakeEffectiveness = ((originalSize - totalSize) / originalSize) * 100;
    
    const compressionRatio = totalSize > 0 ? (totalGzipSize / totalSize) : 0;
    
    return {
      totalSize,
      totalGzipSize,
      formats: results,
      treeshakeEffectiveness,
      compressionRatio
    };
  }
}

// Bundle configuration presets
export const bundlePresets = {
  library: {
    formats: ['esm', 'cjs', 'iife'] as BundleFormat[],
    minify: true,
    treeshake: true,
    target: 'es2018' as const
  },
  
  cdn: {
    formats: ['iife'] as BundleFormat[],
    minify: true,
    treeshake: true,
    target: 'es2015' as const
  },
  
  modern: {
    formats: ['esm'] as BundleFormat[],
    minify: true,
    treeshake: true,
    target: 'es2020' as const
  },
  
  development: {
    formats: ['esm'] as BundleFormat[],
    minify: false,
    treeshake: false,
    target: 'esnext' as const,
    sourcemap: true
  }
};

// Bundle analyzer
export class BundleAnalyzer {
  static async analyzeBundles(bundleDir: string): Promise<AnalysisReport> {
    const files = await fs.readdir(bundleDir);
    const bundles = files.filter(file => file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs'));
    
    const analysis: BundleAnalysis[] = [];
    
    for (const bundle of bundles) {
      const filePath = path.join(bundleDir, bundle);
      const content = await fs.readFile(filePath, 'utf-8');
      const size = Buffer.byteLength(content, 'utf8');
      const gzipSize = await gzipSize(content);
      
      analysis.push({
        file: bundle,
        size,
        gzipSize,
        compressionRatio: gzipSize / size,
        format: this.detectFormat(content),
        dependencies: this.extractDependencies(content)
      });
    }
    
    return {
      bundles: analysis,
      recommendations: this.generateRecommendations(analysis)
    };
  }
  
  private static detectFormat(content: string): BundleFormat {
    if (content.includes('module.exports')) return 'cjs';
    if (content.includes('export ')) return 'esm';
    if (content.includes('define(')) return 'amd';
    if (content.includes('(function (global,')) return 'umd';
    return 'iife';
  }
  
  private static extractDependencies(content: string): string[] {
    const deps: string[] = [];
    
    // Extract import statements
    const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const dep = match.match(/from\s+['"]([^'"]+)['"]/)?.[1];
        if (dep) deps.push(dep);
      });
    }
    
    // Extract require statements
    const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g);
    if (requireMatches) {
      requireMatches.forEach(match => {
        const dep = match.match(/require\(['"]([^'"]+)['"]\)/)?.[1];
        if (dep) deps.push(dep);
      });
    }
    
    return [...new Set(deps)];
  }
  
  private static generateRecommendations(analysis: BundleAnalysis[]): string[] {
    const recommendations: string[] = [];
    
    // Size recommendations
    const largeBundles = analysis.filter(bundle => bundle.size > 100 * 1024); // > 100KB
    if (largeBundles.length > 0) {
      recommendations.push(`Consider code splitting for large bundles: ${largeBundles.map(b => b.file).join(', ')}`);
    }
    
    // Compression recommendations
    const poorCompression = analysis.filter(bundle => bundle.compressionRatio > 0.8);
    if (poorCompression.length > 0) {
      recommendations.push(`Poor compression ratio detected. Consider enabling tree-shaking and minification.`);
    }
    
    // Format recommendations
    const hasESM = analysis.some(bundle => bundle.format === 'esm');
    if (!hasESM) {
      recommendations.push('Consider providing an ESM build for better tree-shaking and modern bundlers.');
    }
    
    return recommendations;
  }
}

export interface BundleAnalysis {
  file: string;
  size: number;
  gzipSize: number;
  compressionRatio: number;
  format: BundleFormat;
  dependencies: string[];
}

export interface AnalysisReport {
  bundles: BundleAnalysis[];
  recommendations: string[];
}

// Build configuration helpers
export function createBuildConfig(preset: keyof typeof bundlePresets, overrides?: Partial<BundleOptions>): BundleOptions {
  return {
    input: 'src/praxis.ts',
    output: 'dist',
    ...bundlePresets[preset],
    ...overrides
  };
}

export async function buildAllFormats(input: string, output: string): Promise<BundleStats> {
  const bundler = new CoralBundler({
    input,
    output,
    formats: ['esm', 'cjs', 'iife'],
    minify: true,
    sourcemap: true,
    treeshake: true,
    environment: 'production'
  });
  
  return await bundler.bundle();
}

// Performance optimization utilities
export function optimizeForSize(options: BundleOptions): BundleOptions {
  return {
    ...options,
    minify: true,
    treeshake: true,
    target: 'es2018' // Good balance of features and compatibility
  };
}

export function optimizeForCompatibility(options: BundleOptions): BundleOptions {
  return {
    ...options,
    target: 'es2015',
    formats: ['iife', 'umd'] // Most compatible formats
  };
}

export function optimizeForModern(options: BundleOptions): BundleOptions {
  return {
    ...options,
    target: 'es2020',
    formats: ['esm'], // Modern format only
    treeshake: true
  };
}