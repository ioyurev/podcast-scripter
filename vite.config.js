import { defineConfig } from 'vite';

export default defineConfig({
  base: '/podcast-scripter/',
  root: '.',
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
    open: true,
    port: 3000,
    strictPort: true
  },
  publicDir: 'public',
  assetsInclude: ['**/*.md']
});
