import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/components/ui/**',
        'src/**/*.d.ts',
        'src/**/types.ts',
        'src/test/**',
        'src/app/**/*.tsx',           // page files — routing/markup only
        'src/**/*.stories.{ts,tsx}',
      ],
      // Hard gate: CI fails below these thresholds.
      // NOTE: Thresholds are only enforced when running `vitest run --coverage`.
      // Enable after Phase 2 unit tests are complete.
      // thresholds: {
      //   statements: 80,
      //   branches: 80,
      //   functions: 80,
      //   lines: 80,
      // },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
