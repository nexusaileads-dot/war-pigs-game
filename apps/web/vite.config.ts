import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // 👇 THIS IS THE FIX FOR THE 503 ERROR 👇
  preview: {
    host: '0.0.0.0', // Forces Vite to expose the app to the outside world
    port: parseInt(process.env.PORT || '8080'), // Reads Railway's dynamic port
    allowedHosts: true, // Prevents Vite from blocking the Railway domain
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
