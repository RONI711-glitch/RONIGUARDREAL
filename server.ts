import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import apiRouter, { handleRawLoaderRequest } from './server/routes.ts';
import { discordBotService } from './server/discordBotService.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parsing with large limit for script uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Trust reverse proxies for IP detection (e.g. Cloud Run)
app.set('trust proxy', 1);

// Mount API routes
app.use('/api', apiRouter);

// Direct root endpoints for Roblox loadstrings
app.get('/loader.lua', handleRawLoaderRequest);
app.get('/raw/:id', handleRawLoaderRequest);
app.get('/load/:id', handleRawLoaderRequest);
app.get('/raw/latest.lua', handleRawLoaderRequest);

// Development vs Production serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RONIGUARD] Server online at http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
    console.log(`[RONIGUARD] Configured owner: ronizz.edit@gmail.com`);

    // Launch Discord Bot Gateway Service
    discordBotService.start().catch((err) => {
      console.warn('[RONIGUARD] Discord Bot Gateway background start notice:', err);
    });
  });
}

startServer().catch((err) => {
  console.error('[RONIGUARD] Failed to start server:', err);
  process.exit(1);
});
