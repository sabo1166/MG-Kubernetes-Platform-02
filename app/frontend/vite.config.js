import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy API calls to a locally running backend.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
    },
  },
});
