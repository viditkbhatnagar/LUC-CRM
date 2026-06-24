import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: /api → Express on :4000 so cookies & paths behave like production
// (where Express serves the built SPA on the same origin).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
