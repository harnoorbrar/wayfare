import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/drive3d.ts',
      name: 'WayfareDrive3D',
      formats: ['iife'],
      fileName: () => 'drive3d.js',
    },
    outDir: 'js',
    emptyOutDir: false,
    target: 'es2018',
    sourcemap: false,
  },
});
