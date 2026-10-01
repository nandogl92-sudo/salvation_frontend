import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // El navegador llama al mismo origen (puerto 4000). Vite reenvía la API al backend.
      proxy: {
        '/users': 'http://localhost:4444',
        '/auth': 'http://localhost:4444',
        '/matchmaking': 'http://localhost:4444',
        '/matches': 'http://localhost:4444',
        '/purchases': 'http://localhost:4444',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
