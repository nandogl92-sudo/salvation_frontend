import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const apiProxy = process.env.API_PROXY ?? 'http://localhost:4444'

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: ['sunsetbegins.info', 'www.sunsetbegins.info'],
      // El navegador llama al mismo origen (puerto 4000). Vite reenvía la API al backend.
      proxy: {
        '/users': { target: apiProxy, changeOrigin: true },
        '/auth': { target: apiProxy, changeOrigin: true },
        '/matchmaking': { target: apiProxy, changeOrigin: true },
        '/matches': { target: apiProxy, changeOrigin: true },
        '/purchases': { target: apiProxy, changeOrigin: true },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
