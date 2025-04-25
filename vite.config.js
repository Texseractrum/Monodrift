import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    minify: 'terser',
    assetsDir: 'assets',
    sourcemap: false,
    // Ensure everything is properly bundled
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  base: '/'
}); 