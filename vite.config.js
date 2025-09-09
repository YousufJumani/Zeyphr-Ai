import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
  target: 'https://dolphin-app-zxvu8.ondigitalocean.app',
        changeOrigin: true,
        // Remove the rewrite - keep the /api prefix for backend compatibility
      }
    }
  }
});
