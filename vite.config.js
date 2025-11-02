import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        viewer: 'viewer.html'
      },
      output: {
        manualChunks: {
          'feather-icons': ['feather-icons'],
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    strictPort: true
  },
  publicDir: 'public',
  assetsInclude: ['**/*.md'],
  optimizeDeps: {
    include: ['feather-icons']
  }
});
