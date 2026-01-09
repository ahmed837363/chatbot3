import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5501,
        host: '127.0.0.1',
        allowedHosts: ['localhost', '127.0.0.1', '.trycloudflare.com', '.loca.lt'],
        proxy: {
          // Local Automatic1111 / WebUI API (DirectML fork) running on 7861
          '/sdapi': {
            target: 'http://127.0.0.1:7861',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
