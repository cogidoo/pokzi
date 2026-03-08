import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ mode }) => ({
  base: mode === 'gh-pages' ? '/pokzi/' : '/',
  plugins: [svelte()],
  server: {
    watch: {
      ignored: ['**/coverage/**', '**/playwright-report/**', '**/docs/**'],
    },
  },
  resolve: {
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,svelte}'],
      exclude: ['src/main.ts', 'src/vite-env.d.ts', 'src/types/**', 'src/styles/**', 'src/test/**'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
}));
