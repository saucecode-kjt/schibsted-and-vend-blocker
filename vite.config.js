import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { packageExtension } from './scripts/package-extension.mjs';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'build',
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('src/features/schibsted-and-vend-blocker/schibsted-and-vend-blocker.js', import.meta.url)),
      formats: ['iife'],
      name: 'SchibstedAndVendBlocker',
      fileName: () => 'content-scripts/schibsted-and-vend-blocker.js',
    },
  },
  plugins: [
    {
      name: 'package-extension-targets',
      closeBundle() {
        packageExtension();
      },
    },
  ],
});
