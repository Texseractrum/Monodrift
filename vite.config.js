import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: false, // Allow fallback to next available port
    hmr: {
      port: 5174 // Separate WebSocket port
    },
    fs: {
      // Allow serving files from one level up
      allow: ['..']
    },
    // Configure MIME types for GLB files
    middlewareMode: true,
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        // Set correct MIME type for GLB files
        if (req.url.endsWith('.glb')) {
          res.setHeader('Content-Type', 'model/gltf-binary');
        }
        next();
      });
    }
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
    },
    // Make sure public directory is copied
    copyPublicDir: true
  },
  base: '/'
}); 