import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'feather-icons': ['feather-icons'],
        }
      }
    }
  },
  server: {
    open: true,
    port: 3000,
    strictPort: true
  },
  publicDir: 'public',
  assetsInclude: ['**/*.md']
});
