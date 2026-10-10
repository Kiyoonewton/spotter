import { defineConfig } from '@lovable.dev/vite-tanstack-config';

export default defineConfig({
  tanstackStart: {
    // Route SSR and server-function requests through src/server.ts.
    server: { entry: 'server' },
  },
  vite: {
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: ['spotter.kiyoo'],
      proxy: {
        '/api': {
          target: process.env['VITE_API_PROXY_TARGET'] ?? 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  },
});
