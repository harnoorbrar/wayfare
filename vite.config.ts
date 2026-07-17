import { defineConfig } from 'vitest/config';

// Builds the typed domain layer into a single IIFE the legacy index.html
// loads as <script src="js/core.js"> (window.WayfareCore). scripts/build.js
// copies the output into www/ for the Capacitor shell.
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'WayfareCore',
      formats: ['iife'],
      fileName: () => 'core.js',
    },
    outDir: 'js',
    emptyOutDir: true,
    target: 'es2018',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
