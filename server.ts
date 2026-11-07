import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import apiRouter, {
  handleRawLoaderRequest,
  handleTwoPhaseLoader,
  handleTwoPhaseAuth,
  handleTwoPhasePayload,
  handleHealthz,
} from './server/routes.ts';
import { discordBotService } from './server/discordBotService.ts';

dotenv.config();

// Crash Shield: Prevent unhandled errors or gateway socket glitches from terminating the Node process
process.on('uncaughtException', (err) => {
  console.error('[RONIGUARD-CRASH-SHIELD] Uncaught Exception trapped safely:', err);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[RONIGUARD-CRASH-SHIELD] Unhandled Rejection trapped safely:', reason);
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parsing with large limit for script uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Trust reverse proxies for IP detection (e.g. Cloud Run, Wasmer Edge)
app.set('trust proxy', 1);

// Top-level loader & V4 handshake interception: catches any requests before static/Vite middlewares
app.use((req, res, next) => {
  const p = req.path.toLowerCase();

  // Root health endpoints
  if (p === '/healthz' || p === '/health') {
    return handleHealthz(req, res);
  }

  // V4 Handshake Endpoints
  if (p === '/files/v4/auth' || p === '/v4/auth') {
    return handleTwoPhaseAuth(req, res);
  }
  if (p === '/files/v4/payload' || p === '/v4/payload') {
    return handleTwoPhasePayload(req, res);
  }
  if (p.startsWith('/files/v4/loaders') || p.startsWith('/v4/loaders') || p === '/files/v4/loader.lua') {
    return handleTwoPhaseLoader(req, res);
  }

  // Legacy, v4 & universal loader endpoints
  if (
    p === '/loader.lua' ||
    p === '/loader' ||
    p.endsWith('.lua') ||
    p.includes('loader') ||
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

// V4 Two-Phase Edge Handshake Routes
app.all(['/files/v4/auth', '/v4/auth'], handleTwoPhaseAuth);
app.get(['/files/v4/payload', '/v4/payload'], handleTwoPhasePayload);
app.get(['/files/v4/loaders/:scriptId', '/files/v4/loaders/:scriptId.lua', '/files/v4/loader.lua'], handleTwoPhaseLoader);

// Central Healthz endpoints
app.get('/healthz', handleHealthz);
app.get('/health', handleHealthz);
app.get('/api/healthz', handleHealthz);

app.use('/api', apiRouter);

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
}

startServer().catch((err) => {
  console.error('[RONIGUARD] Failed to start server:', err);
  process.exit(1);
});
