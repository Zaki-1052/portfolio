// vitest.config.ts
// Standalone from vite.config.ts to avoid the vitest-nested-vite plugin type
// collision. Pure-logic tests (node env) don't need the react/tailwind plugins;
// only the '@' alias is shared. '.test.ts' (not '.tsx') keeps the no-jsdom
// constraint self-enforcing.
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
