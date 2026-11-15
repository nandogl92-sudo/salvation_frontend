import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {agreedHourIcs} from './src/profile/calendarEvent';

const calendarPlugin = (): Plugin => ({
  name: 'frizeplay-calendar',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const raw = req.url ?? '';
      const pathOnly = raw.split('?')[0];
      if (pathOnly !== '/frizeplay-calendar.ics') return next();
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const query = new URL(raw, 'http://localhost').searchParams;
      const hour = Number(query.get('hour'));
      const ics = agreedHourIcs(
        query.get('day') ?? '',
        hour,
        query.get('seat') ?? 'frizeplay',
        query.get('rival') ?? '',
        query.get('games') ?? '',
      );
      if (!ics) {
        res.statusCode = 400;
        res.end();
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline; filename="frizeplay.ics"');
      res.setHeader('Cache-Control', 'no-store');
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(ics);
    });
  },
});

const apiProxy = process.env.API_PROXY ?? 'http://localhost:4444'

export default defineConfig(() => {
  return {
    plugins: [calendarPlugin(), react(), tailwindcss()],
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
        '/matches': { target: apiProxy, changeOrigin: true, ws: true, timeout: 0, proxyTimeout: 0 },
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
