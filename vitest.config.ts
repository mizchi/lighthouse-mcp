import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    includeSource: ['src/**/*.{js,ts}'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    fileParallelism: false,
    exclude: ['node_modules', 'dist', 'tmp', '**/*.config.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'dist/',
        '*.config.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
});
