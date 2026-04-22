import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3091,
    proxy: {
      '/api': {
        target: process.env.VITE_LIBRECHAT_URL ?? 'http://localhost:3080',
        changeOrigin: true,
      },
      '/ext': {
        target: process.env.VITE_EXT_URL ?? 'http://localhost:3092',
        changeOrigin: true,
      },
    },
  },
});
