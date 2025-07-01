import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'benchmarks/',
        'scripts/',
        'tools/',
        'examples/',
        'docs/'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache']
  },
  esbuild: {
    target: 'es2022'
  }
});