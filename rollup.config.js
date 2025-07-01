import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';
import { visualizer } from 'rollup-plugin-visualizer';

const production = process.env.NODE_ENV === 'production';
const analyze = process.env.ANALYZE;

export default [
  // Main build
  {
    input: 'src/index.ts',
    output: [
      // UMD build for browsers
      {
        file: 'dist/praxis.js',
        format: 'umd',
        name: 'praxis',
        sourcemap: true,
        globals: {}
      },
      // ES modules build
      {
        file: 'dist/praxis.esm.js',
        format: 'es',
        sourcemap: true
      },
      // Minified UMD build
      {
        file: 'dist/praxis.min.js',
        format: 'umd',
        name: 'praxis',
        sourcemap: true,
        plugins: [terser({
          compress: {
            drop_console: true,
            drop_debugger: true
          },
          mangle: {
            reserved: ['praxis']
          }
        })]
      }
    ],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist/types',
        outDir: 'dist'
      }),
      analyze && visualizer({
        filename: 'dist/stats.html',
        open: true
      })
    ].filter(Boolean),
    external: [],
    watch: {
      include: 'src/**'
    }
  },
  
  // Standalone praxis.ts build for legacy compatibility
  {
    input: 'src/praxis.ts',
    output: [
      {
        file: 'dist/praxis.js',
        format: 'umd',
        name: 'praxis',
        sourcemap: true
      },
      {
        file: 'dist/praxis.esm.js',
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        outDir: 'dist'
      }),
      production && terser()
    ].filter(Boolean),
    external: []
  },

  // Type definitions
  {
    input: 'dist/types/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()],
    external: [/\.css$/]
  }
];