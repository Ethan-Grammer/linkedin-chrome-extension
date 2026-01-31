import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          // Keep HTML files in root
          if (assetInfo.name?.endsWith('.html')) {
            return '[name][extname]';
          }
          // Keep CSS files in root with proper naming
          if (assetInfo.name?.endsWith('.css')) {
            return '[name][extname]';
          }
          return '[name][extname]';
        },
      },
    },
    copyPublicDir: true,
  },
});
