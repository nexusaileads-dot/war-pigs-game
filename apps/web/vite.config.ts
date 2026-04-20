import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = (env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      host: '0.0.0.0',
      port: parseInt(env.PORT || '5173', 10),
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true
        }
      }
    },
    preview: {
      host: '0.0.0.0',
      port: parseInt(env.PORT || '8080', 10),
      allowedHosts: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      chunkSizeWarningLimit: 2000
    }
  };
});
