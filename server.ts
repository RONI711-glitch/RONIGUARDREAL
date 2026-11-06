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

// Top-level loader interception middleware: catches any requests to loader.lua or raw endpoints
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    p === '/loader.lua' ||
    p === '/loader' ||
    p.startsWith('/raw/') ||
    p.startsWith('/load/') ||
    p.startsWith('/api/loader') ||
    p.startsWith('/api/raw/')
  ) {
    return handleRawLoaderRequest(req, res);
  }
  next();
});

// Direct root & API endpoints for Roblox loadstrings and raw script delivery
const rawLoaderEndpoints = [
  '/loader.lua',
  '/loader',
  '/raw/:id',
  '/load/:id',
  '/raw/latest.lua',
  '/raw/latest',
  '/api/loader',
  '/api/loader.lua',
  '/api/loader/raw',
  '/api/loader/raw/:id',
  '/api/raw/:id',
  '/api/load/:id',
  '/api/raw/latest.lua',
  '/api/raw/latest',
  '/api/scripts/:id/raw',
  '/scripts/:id/raw',
];
rawLoaderEndpoints.forEach((ep) => {
  app.get(ep, handleRawLoaderRequest);
});

app.use('/api', apiRouter);
app.get('/health', (_req, res) => {
  res.redirect('/api/health');
});

// Root OAuth fallbacks to ensure zero-404 during Discord authorization redirects
const oauthCallbackPaths = [
  '/auth/discord/callback',
  '/auth/callback',
  '/oauth/callback',
  '/discord/callback',
  '/callback',
];
oauthCallbackPaths.forEach((p) => {
  app.get(p, (req, res) => {
    res.redirect('/api/auth/discord/callback' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
  });
});

const oauthLoginPaths = [
  '/auth/discord/login',
  '/auth/login',
  '/oauth/login',
  '/login/discord',
];
oauthLoginPaths.forEach((p) => {
  app.get(p, (req, res) => {
    res.redirect('/api/auth/discord/login' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
  });
});

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

  // Launch Discord Bot Gateway Service immediately
  discordBotService.start().catch((err) => {
    console.warn('[RONIGUARD] Discord Bot Gateway background start notice:', err);
  });

  const primaryServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RONIGUARD] Server online at http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });

  // Dual listener for Wasmer Edge container environments which route to 8080
  if (PORT !== 8080) {
    try {
      const secondaryApp = app.listen(8080, '0.0.0.0', () => {
        console.log('[RONIGUARD] Wasmer Edge port 8080 listener active');
      });
      secondaryApp.on('error', () => {
        // Port 8080 in use or restricted, primary listener on PORT is sufficient
      });
    } catch {}
  }
}

startServer().catch((err) => {
  console.error('[RONIGUARD] Failed to start server:', err);
  process.exit(1);
});
