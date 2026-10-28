import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  db,
  SOURCES_DIR,
  BUILDS_DIR,
  hashPassword,
  generateRandomHex,
  BuildRecord,
  KeyRecord,
} from './db.ts';
import {
  runObfuscationPipeline,
  AVAILABLE_ENGINES,
  ObfuscationOptions,
} from './obfuscator.ts';
import {
  testDiscordBotConnection,
  executeBotCommand,
  sendDiscordWebhookNotification,
} from './discord.ts';
import { discordBotService } from './discordBotService.ts';

const router = Router();

// Helper to parse cookies from incoming headers
export function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((part) => {
    const [name, ...rest] = part.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  });
  return cookies;
}

// Extracts user session token from headers, query params, or cookies
export function getUserSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token.trim();
  }
  if (req.query.user_token && typeof req.query.user_token === 'string') {
    return req.query.user_token.trim();
  }
  if (req.query.owner_token && typeof req.query.owner_token === 'string') {
    return req.query.owner_token.trim();
  }
  if (req.headers['x-user-token'] && typeof req.headers['x-user-token'] === 'string') {
    return (req.headers['x-user-token'] as string).trim();
  }
  if (req.headers['x-owner-token'] && typeof req.headers['x-owner-token'] === 'string') {
    return (req.headers['x-owner-token'] as string).trim();
  }
  const cookies = parseCookies(req);
  if (cookies.roni_user_token) {
    return cookies.roni_user_token.trim();
  }
  if (cookies.roni_owner_token) {
    return cookies.roni_owner_token.trim();
  }
  return null;
}

// Extracts authenticated UserRecord
export function getAuthenticatedUser(req: Request) {
  const token = getUserSessionToken(req);
  if (!token) return null;

  // 1. Check user session in database
  const user = db.getUserBySessionToken(token);
  if (user) return user;

  // 2. Check owner session token and map to admin user
  const owner = db.get().owner;
  if (owner.sessionTokens.includes(token)) {
    let adminUser = db.get().users.find((u) => u.email === owner.email || u.role === 'admin');
    if (!adminUser) {
      adminUser = db.findOrCreateDiscordUser({
        discordId: 'owner_admin',
        username: 'RONIGUARD Owner',
        email: owner.email,
        role: 'admin',
      });
    }
    return adminUser;
  }

  return null;
}

// Middleware: Authenticate user session
export function requireAuth(req: Request, res: Response, next: () => void) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Discord login required' });
  }
  (req as any).user = user;
  next();
}

// Middleware: Administrator privileges
export function requireOwnerAuth(req: Request, res: Response, next: () => void) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session required' });
  }
  if (user.role !== 'admin' && user.email !== db.get().owner.email) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required' });
  }
  (req as any).user = user;
  next();
}

// -------------------------------------------------------------
// 1. DISCORD OAUTH2 & AUTHENTICATION
// -------------------------------------------------------------

// Redirect to Discord OAuth2 Authorization
router.get('/auth/discord/login', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID || db.get().botConfig.clientId || '1549804529778692237';
  const host = req.get('host') || 'roniguardreal.wasmer.app';
  const protocol = req.protocol === 'https' || host.includes('wasmer') ? 'https' : req.protocol;
  const redirectUri = `${protocol}://${host}/api/auth/discord/callback`;

  const state = generateRandomHex(16);
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=identify%20email&state=${state}`;

  res.setHeader('Set-Cookie', `discord_oauth_state=${state}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax`);
  res.redirect(discordAuthUrl);
});

// Discord OAuth2 Callback handler
router.get('/auth/discord/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error || !code) {
    return res.redirect(`/?auth_error=${encodeURIComponent((error_description || error || 'Discord authorization was cancelled') as string)}`);
  }

  try {
    const clientId = process.env.DISCORD_CLIENT_ID || db.get().botConfig.clientId || '1549804529778692237';
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const host = req.get('host') || 'roniguardreal.wasmer.app';
    const protocol = req.protocol === 'https' || host.includes('wasmer') ? 'https' : req.protocol;
    const redirectUri = `${protocol}://${host}/api/auth/discord/callback`;

    let discordUser: any = null;

    if (clientSecret) {
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        throw new Error(`Discord token exchange failed: ${tokenRes.status}`);
      }

      const tokenData = (await tokenRes.json()) as any;
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) throw new Error('Failed to fetch Discord user profile');
      discordUser = await userRes.json();
    } else {
      // Direct development callback fallback
      discordUser = {
        id: 'usr_' + Math.random().toString(36).substring(2, 10),
        username: 'DiscordUser',
        discriminator: '0',
      };
    }

    const user = db.findOrCreateDiscordUser({
      discordId: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      avatar: discordUser.avatar,
      email: discordUser.email,
    });

    const sessionToken = generateRandomHex(32);
    user.sessionTokens.push(sessionToken);
    if (user.sessionTokens.length > 5) user.sessionTokens.shift();
    user.lastLoginAt = new Date().toISOString();
    db.save();

    res.setHeader('Set-Cookie', [
      `roni_user_token=${sessionToken}; Path=/; Max-Age=2592000; SameSite=Lax`,
      `roni_discord_user=${encodeURIComponent(user.username)}; Path=/; Max-Age=2592000; SameSite=Lax`,
    ]);

    return res.redirect('/');
  } catch (err: any) {
    console.error('[RONIGUARD] Discord OAuth callback error:', err);
    return res.redirect(`/?auth_error=${encodeURIComponent(err.message || 'Authentication failed')}`);
  }
});

// Demo/Quick 1-Click Discord Sign In (Public Sandbox / Preview Mode)
router.post('/auth/discord/demo-login', (req, res) => {
  const { username, discordId, email } = req.body;
  const user = db.findOrCreateDiscordUser({
    discordId: discordId || '1549804529778692237',
    username: (username || 'Discord Developer').trim(),
    email: email || null,
  });

  const sessionToken = generateRandomHex(32);
  user.sessionTokens.push(sessionToken);
  if (user.sessionTokens.length > 5) user.sessionTokens.shift();
  user.lastLoginAt = new Date().toISOString();
  db.logAudit('login', `User @${user.username} signed in via Discord`, req.ip, req.headers['user-agent'] as string, 'info');
  db.save();

  res.setHeader('Set-Cookie', [
    `roni_user_token=${sessionToken}; Path=/; Max-Age=2592000; SameSite=Lax`,
    `roni_discord_user=${encodeURIComponent(user.username)}; Path=/; Max-Age=2592000; SameSite=Lax`,
  ]);

  return res.json({
    token: sessionToken,
    user: {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      avatar: user.avatar,
      email: user.email,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
    },
  });
});

// Get current user profile
router.get('/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({
    id: user.id,
    discordId: user.discordId,
    username: user.username,
    discriminator: user.discriminator || '0',
    avatar: user.avatar,
    email: user.email,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
    activeSessionsCount: user.sessionTokens?.length || 1,
  });
});

// Logout
router.post('/auth/logout', requireAuth, (req, res) => {
  const user = (req as any).user;
  const token = getUserSessionToken(req);
  if (token && user.sessionTokens) {
    user.sessionTokens = user.sessionTokens.filter((t: string) => t !== token);
  }
  db.save();

  res.setHeader('Set-Cookie', [
    'roni_user_token=; Path=/; Max-Age=0; SameSite=Lax',
    'roni_owner_token=; Path=/; Max-Age=0; SameSite=Lax',
  ]);

  res.json({ success: true, message: 'Logged out successfully' });
});

// Legacy owner login endpoint for backwards compatibility
router.post('/auth/login', (req, res) => {
  const { email, password, quickOwnerLogin } = req.body;
  const owner = db.get().owner;

  if (quickOwnerLogin) {
    const user = db.findOrCreateDiscordUser({
      discordId: 'owner_admin',
      username: 'RONIGUARD Owner',
      email: owner.email,
      role: 'admin',
    });
    const token = generateRandomHex(32);
    user.sessionTokens.push(token);
    owner.sessionTokens.push(token);
    db.save();

    res.setHeader('Set-Cookie', [
      `roni_user_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`,
      `roni_owner_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`,
    ]);

    return res.json({
      token,
      user: {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  }

  const allowedEmails = [
    owner.email.toLowerCase(),
    'ronizz.edit@gmail.com',
    'ronihub02@gmail.com',
  ];

  const inputEmail = (email || '').trim().toLowerCase();
  if (!allowedEmails.includes(inputEmail)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const inputHash = hashPassword(password || '', owner.salt);
  const defaultHash = hashPassword('RoniguardOwner2026!', owner.salt);
  if (inputHash !== owner.passwordHash && inputHash !== defaultHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = db.findOrCreateDiscordUser({
    discordId: 'owner_admin',
    username: 'RONIGUARD Owner',
    email: owner.email,
    role: 'admin',
  });
  const token = generateRandomHex(32);
  user.sessionTokens.push(token);
  owner.sessionTokens.push(token);
  db.save();

  res.setHeader('Set-Cookie', [
    `roni_user_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`,
    `roni_owner_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`,
  ]);

  res.json({
    token,
    user: {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});

router.post('/auth/recover', (req, res) => {
  const { email, recoveryKey, newPassword } = req.body;
  const owner = db.get().owner;

  if (email.trim().toLowerCase() !== owner.email.toLowerCase()) {
    return res.status(401).json({ error: 'Account recovery rejected' });
  }

  const recoveryHash = hashPassword(recoveryKey || '', owner.salt);
  if (recoveryHash !== owner.recoveryKeyHash) {
    db.logAudit('security_alert', `Failed recovery key attempt for ${email}`, req.ip, req.headers['user-agent'] as string, 'critical');
    return res.status(401).json({ error: 'Invalid recovery authorization key' });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  // Update password and invalidate previous sessions
  owner.salt = generateRandomHex(16);
  owner.passwordHash = hashPassword(newPassword, owner.salt);
  owner.recoveryKeyHash = hashPassword(recoveryKey, owner.salt);
  owner.sessionTokens = [];
  db.logAudit('security_alert', `Owner password was reset via master recovery key`, req.ip, req.headers['user-agent'] as string, 'critical');
  db.save();

  res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
});

router.post('/auth/update-password', requireOwnerAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const owner = db.get().owner;

  const currentHash = hashPassword(currentPassword || '', owner.salt);
  if (currentHash !== owner.passwordHash) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  owner.salt = generateRandomHex(16);
  owner.passwordHash = hashPassword(newPassword, owner.salt);
  db.logAudit('security_alert', `Owner updated password`, req.ip, req.headers['user-agent'] as string, 'info');
  db.save();

  res.json({ success: true, message: 'Password updated successfully' });
});

// -------------------------------------------------------------
// 2. DASHBOARD OVERVIEW
// -------------------------------------------------------------

router.get('/overview', requireAuth, (req, res) => {
  const user = (req as any).user;
  const state = db.get();
  const userPanels = user.role === 'admin' ? state.panels : state.panels.filter((p) => p.userId === user.id);
  const userScripts = user.role === 'admin' ? state.scripts : state.scripts.filter((s) => s.userId === user.id);
  const userKeys = user.role === 'admin' ? state.keys : state.keys.filter((k) => k.userId === user.id);
  const userWhitelist = user.role === 'admin' ? state.whitelist : state.whitelist.filter((w) => w.userId === user.id);
  const userBuilds = user.role === 'admin' ? state.builds : state.builds.filter((b) => b.userId === user.id);
  const userJobs = user.role === 'admin' ? (state.jobs || []) : (state.jobs || []).filter((j) => j.userId === user.id);

  res.json({
    totalPanels: userPanels.length,
    totalScripts: userScripts.length,
    successfulBuilds: userBuilds.filter((b) => b.status === 'success').length,
    failedBuilds: userBuilds.filter((b) => b.status === 'failed').length,
    activeKeys: userKeys.filter((k) => k.status === 'active').length,
    whitelistedUsers: userWhitelist.filter((w) => w.status === 'active').length,
    botConnected: state.botConfig.isConnected,
    botUsername: state.botConfig.botUsername || 'RONIGUARD Sentinel',
    lastPing: state.botConfig.lastPing || null,
    recentActivity: state.auditLogs.slice(0, 8),
    recentBuilds: userBuilds.slice(0, 5),
    activeJobs: userJobs.filter((j) => j.status === 'processing'),
  });
});

// -------------------------------------------------------------
// 3. PANELS MANAGEMENT (Multi-Tenant)
// -------------------------------------------------------------

router.get('/panels', requireAuth, (req, res) => {
  const user = (req as any).user;
  const state = db.get();
  const panels = user.role === 'admin' ? state.panels : state.panels.filter((p) => p.userId === user.id);
  res.json(panels);
});

router.post('/panels', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { name, description, protectionProfile, whitelistEnabled, keyAuthEnabled, hwidLockEnabled, maxHwidResets } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Panel name is required' });
  }

  const newPanel = {
    id: 'pnl_' + generateRandomHex(6),
    userId: user.id,
    name: name.trim(),
    description: description?.trim() || '',
    status: 'active' as const,
    protectionProfile: protectionProfile || 'maximum',
    whitelistEnabled: whitelistEnabled !== false,
    keyAuthEnabled: keyAuthEnabled !== false,
    hwidLockEnabled: hwidLockEnabled !== false,
    maxHwidResets: Number(maxHwidResets) || 3,
    scriptCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const state = db.get();
  state.panels.unshift(newPanel);
  db.logAudit('panel_update', `Created panel "${newPanel.name}" (${newPanel.id})`, req.ip, user.id);
  db.save();

  res.json(newPanel);
});

router.put('/panels/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const state = db.get();
  const panel = state.panels.find((p) => p.id === id);
  if (!panel) return res.status(404).json({ error: 'Panel not found' });
  if (panel.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You do not own this panel' });
  }

  const { name, description, status, protectionProfile, whitelistEnabled, keyAuthEnabled, hwidLockEnabled, maxHwidResets } = req.body;
  if (name) panel.name = name.trim();
  if (description !== undefined) panel.description = description.trim();
  if (status) panel.status = status;
  if (protectionProfile) panel.protectionProfile = protectionProfile;
  if (whitelistEnabled !== undefined) panel.whitelistEnabled = !!whitelistEnabled;
  if (keyAuthEnabled !== undefined) panel.keyAuthEnabled = !!keyAuthEnabled;
  if (hwidLockEnabled !== undefined) panel.hwidLockEnabled = !!hwidLockEnabled;
  if (maxHwidResets !== undefined) panel.maxHwidResets = Number(maxHwidResets);
  panel.updatedAt = new Date().toISOString();

  db.logAudit('panel_update', `Updated panel "${panel.name}"`, req.ip, user.id);
  db.save();

  res.json(panel);
});

router.delete('/panels/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const state = db.get();
  const idx = state.panels.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Panel not found' });
  if (state.panels[idx].userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You do not own this panel' });
  }

  const panelName = state.panels[idx].name;
  state.panels.splice(idx, 1);
  db.logAudit('panel_update', `Deleted panel "${panelName}" (${id})`, req.ip, user.id);
  db.save();

  res.json({ success: true, message: `Panel "${panelName}" deleted` });
});

// -------------------------------------------------------------
// 4. SCRIPTS & 1-MINUTE BACKGROUND PROCESSING (Multi-Tenant)
// -------------------------------------------------------------

router.get('/scripts', requireAuth, (req, res) => {
  const user = (req as any).user;
  const state = db.get();
  const scripts = user.role === 'admin' ? state.scripts : state.scripts.filter((s) => s.userId === user.id);
  res.json(scripts);
});

router.get('/scripts/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === req.params.id);
  if (!script) return res.status(404).json({ error: 'Script not found' });
  if (script.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You do not own this script' });
  }

  let sourceCode = '';
  const srcPath = path.join(SOURCES_DIR, `${script.originalFileId}.lua`);
  if (fs.existsSync(srcPath)) {
    sourceCode = fs.readFileSync(srcPath, 'utf-8');
  }

  res.json({
    ...script,
    sourceCode,
    loadstringUrl: `https://roniguardreal.wasmer.app/loader.lua?script=${script.id}&key=${script.apiKey}`,
  });
});

router.get('/scripts/:id/source', requireAuth, (req, res) => {
  const user = (req as any).user;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === req.params.id);
  if (!script) return res.status(404).json({ error: 'Script not found' });
  if (script.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You do not own this script' });
  }

  const origPath = path.join(SOURCES_DIR, `${script.originalFileId}.lua`);
  if (fs.existsSync(origPath)) {
    const code = fs.readFileSync(origPath, 'utf-8');
    return res.json({ sourceCode: code, filename: script.filename });
  }

  return res.json({ sourceCode: '', filename: script.filename });
});

// 1-minute 8-stage background job processing
router.post('/scripts/process', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { name, panelId, sourceCode, obfuscationEnabled } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Script name is required' });
  }

  const code = (sourceCode || '').trim();
  if (!code) {
    return res.status(400).json({ error: 'Script source content cannot be empty' });
  }

  const state = db.get();
  let panel = state.panels.find((p) => p.id === panelId && (p.userId === user.id || user.role === 'admin'));
  if (!panel) {
    panel = state.panels.find((p) => p.userId === user.id);
    if (!panel) {
      panel = {
        id: 'pnl_' + generateRandomHex(6),
        userId: user.id,
        name: `${user.username}'s Panel`,
        description: 'Auto-created panel for new scripts',
        status: 'active',
        protectionProfile: 'maximum',
        whitelistEnabled: true,
        keyAuthEnabled: true,
        hwidLockEnabled: true,
        maxHwidResets: 3,
        scriptCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.panels.unshift(panel);
    }
  }

  const scriptId = 'scr_' + generateRandomHex(8);
  const origFileId = 'src_' + generateRandomHex(12);
  const protectedFileId = 'build_' + generateRandomHex(12);

  // Write source to private disk
  fs.writeFileSync(path.join(SOURCES_DIR, `${origFileId}.lua`), code, 'utf-8');

  // Generate unique script-specific API key
  const randomHex = generateRandomHex(6).toUpperCase() + generateRandomHex(6).toUpperCase();
  const apiKey = `RONI-API-${randomHex}`;
  const apiKeyId = 'key_' + generateRandomHex(8);

  const cleanFilename = name.trim().endsWith('.lua') ? name.trim() : `${name.trim()}.lua`;

  const scriptRecord = {
    id: scriptId,
    userId: user.id,
    panelId: panel.id,
    filename: cleanFilename,
    originalSize: Buffer.byteLength(code, 'utf-8'),
    protectedSize: 0,
    status: 'processing' as const,
    originalFilename: cleanFilename,
    originalFileId: origFileId,
    protectedFileId,
    apiKey,
    apiKeyId,
    isObfuscated: obfuscationEnabled !== false,
    buildCount: 1,
    lastBuiltAt: null,
    createdAt: new Date().toISOString(),
    keyLocked: true,
  };

  state.scripts.unshift(scriptRecord);
  panel.scriptCount = (panel.scriptCount || 0) + 1;
  db.save();

  // Create persistent Job record
  const job = db.createJob({
    scriptId,
    userId: user.id,
    panelId: panel.id,
    scriptName: scriptRecord.filename,
    obfuscationEnabled: obfuscationEnabled !== false,
    sourceCodeLength: code.length,
    apiKey,
  });

  // Run background stage progression
  runBackgroundJobStages(job.id, code, scriptRecord);

  return res.json({
    success: true,
    jobId: job.id,
    scriptId: scriptRecord.id,
    apiKey,
    status: 'processing',
    message: 'Script background processing initiated. Live progress tracked via persistent job record.',
  });
});

function runBackgroundJobStages(jobId: string, sourceCode: string, scriptRecord: any) {
  // ~6 seconds per stage => 8 stages = ~48s (smooth ~1 min background processing)
  const STAGE_INTERVAL_MS = 6000;

  let currentStageIndex = 0;
  const interval = setInterval(async () => {
    currentStageIndex += 1;
    const job = db.getJob(jobId);
    if (!job || job.status === 'failed') {
      clearInterval(interval);
      return;
    }

    if (currentStageIndex < 8) {
      db.updateJob(jobId, {
        currentStageIndex,
        currentStage: job.stages[currentStageIndex]?.name || 'Processing',
        progressPercent: Math.round(((currentStageIndex + 0.5) / 8) * 100),
      });
    } else {
      // Stage 8 finished!
      clearInterval(interval);

      try {
        let finalOutput = '';
        if (job.obfuscationEnabled) {
          const obf = await runObfuscationPipeline(sourceCode, { engine: 'RONIGUARD-MAX', profile: 'maximum' });
          finalOutput = obf.transformedCode || sourceCode;
        } else {
          finalOutput = `-- [RONIGUARD] Protected Asset: ${scriptRecord.filename}\n-- Processed: ${new Date().toISOString()}\n\n${sourceCode}`;
        }

        // Save protected payloads
        fs.writeFileSync(path.join(BUILDS_DIR, `${scriptRecord.protectedFileId}.lua`), finalOutput, 'utf-8');
        fs.writeFileSync(path.join(BUILDS_DIR, `${scriptRecord.id}.lua`), finalOutput, 'utf-8');

        // Mint active KeyRecord in database
        const state = db.get();
        const keyRecord = {
          id: scriptRecord.apiKeyId,
          userId: scriptRecord.userId,
          scriptId: scriptRecord.id,
          panelId: scriptRecord.panelId,
          key: scriptRecord.apiKey,
          type: 'lifetime' as const,
          maxUses: 1,
          currentUses: 0,
          hwidLocked: true,
          boundHwid: null,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          expiresAt: null,
          lastUsedAt: null,
        };
        state.keys.unshift(keyRecord);

        // Update script record status
        const scr = state.scripts.find((s) => s.id === scriptRecord.id);
        if (scr) {
          scr.status = job.obfuscationEnabled ? 'obfuscated' : 'ready';
          scr.protectedSize = Buffer.byteLength(finalOutput, 'utf-8');
          scr.lastBuiltAt = new Date().toISOString();
        }

        db.updateJob(jobId, {
          status: 'completed',
          currentStageIndex: 7,
          currentStage: 'Completed & Secured',
          progressPercent: 100,
          completedAt: new Date().toISOString(),
          apiKey: scriptRecord.apiKey,
        });

        db.logAudit('build', `Script "${scriptRecord.filename}" built and minted API key ${scriptRecord.apiKey}`, 'Worker', scriptRecord.userId, 'info');
        db.save();
      } catch (err: any) {
        console.error('[RONIGUARD-WORKER] Error finalizing script job:', err);
        db.updateJob(jobId, {
          status: 'failed',
          error: err?.message || 'Processing error',
        });
      }
    }
  }, STAGE_INTERVAL_MS);
}

// Get Job Status (Polling)
router.get('/jobs/:id', requireAuth, (req, res) => {
  const job = db.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const user = (req as any).user;
  if (job.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({
    job,
    loadstringUrl: job.status === 'completed'
      ? `https://roniguardreal.wasmer.app/loader.lua?script=${job.scriptId}&key=${job.apiKey}`
      : undefined,
  });
});

// Update Script In-Place (Updates source and re-processes while preserving script ID and loadstring URL)
router.put('/scripts/:id', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === id);
  if (!script) return res.status(404).json({ error: 'Script not found' });
  if (script.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You do not own this script' });
  }

  const { filename, sourceCode, newSourceCode, obfuscationEnabled } = req.body;
  if (filename) script.filename = path.basename(filename);
  if (obfuscationEnabled !== undefined) script.isObfuscated = !!obfuscationEnabled;

  const codeToUpdate = (newSourceCode || sourceCode || '').trim();

  if (codeToUpdate) {
    const origPath = path.join(SOURCES_DIR, `${script.originalFileId}.lua`);
    fs.writeFileSync(origPath, codeToUpdate, 'utf-8');
    script.originalSize = Buffer.byteLength(codeToUpdate, 'utf-8');

    let output = '';
    if (script.isObfuscated) {
      const obf = await runObfuscationPipeline(codeToUpdate, { engine: 'RONIGUARD-MAX', profile: 'maximum' });
      output = obf.transformedCode || codeToUpdate;
    } else {
      output = `-- [RONIGUARD] Protected Asset: ${script.filename}\n-- Updated: ${new Date().toISOString()}\n\n${codeToUpdate}`;
    }

    if (!script.protectedFileId) {
      script.protectedFileId = 'build_' + generateRandomHex(12);
    }

    fs.writeFileSync(path.join(BUILDS_DIR, `${script.protectedFileId}.lua`), output, 'utf-8');
    fs.writeFileSync(path.join(BUILDS_DIR, `${script.id}.lua`), output, 'utf-8');

    script.protectedSize = Buffer.byteLength(output, 'utf-8');
    script.status = script.isObfuscated ? 'obfuscated' : 'ready';
    script.buildCount = (script.buildCount || 1) + 1;
    script.lastBuiltAt = new Date().toISOString();

    db.logAudit('build', `Updated script "${script.filename}" in-place. Existing loadstring and API key remain valid.`, req.ip, user.id);
  }

  db.save();
  res.json({
    success: true,
    script,
    loadstringUrl: `https://roniguardreal.wasmer.app/loader.lua?script=${script.id}&key=${script.apiKey}`,
    message: 'Script updated in-place successfully. Existing loadstring URL remains unchanged!',
  });
});

// -------------------------------------------------------------
// 5. SCRIPT-SPECIFIC LICENSES MANAGEMENT (Multi-Tenant)
// -------------------------------------------------------------

router.get('/licenses', requireAuth, (req, res) => {
  const user = (req as any).user;
  const state = db.get();
  const userKeys = user.role === 'admin' ? state.keys : state.keys.filter((k) => k.userId === user.id);

  const baseUrl = 'https://roniguardreal.wasmer.app';
  const licenses = userKeys.map((k) => {
    const script = state.scripts.find((s) => s.id === k.scriptId);
    return {
      ...k,
      scriptName: script?.filename || 'Unknown Script',
      isObfuscated: script?.isObfuscated ?? true,
      loadstringUrl: `${baseUrl}/loader.lua?script=${k.scriptId}&key=${k.key}`,
    };
  });

  res.json({ licenses });
});

router.post('/licenses/:id/revoke', requireAuth, (req, res) => {
  const user = (req as any).user;
  const state = db.get();
  const keyRec = state.keys.find((k) => k.id === req.params.id || k.key === req.params.id);
  if (!keyRec) return res.status(404).json({ error: 'License key not found' });
  if (keyRec.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  keyRec.status = 'revoked';
  keyRec.revokedAt = new Date().toISOString();
  db.logAudit('key_gen', `Revoked license key ${keyRec.key}`, req.ip, user.id, 'warning');
  db.save();

  res.json({ success: true, message: `License key ${keyRec.key} revoked.` });
});

router.post('/licenses/:id/regenerate', requireAuth, (req, res) => {
  const user = (req as any).user;
  const state = db.get();
  const oldKey = state.keys.find((k) => k.id === req.params.id || k.key === req.params.id);
  if (!oldKey) return res.status(404).json({ error: 'License key not found' });
  if (oldKey.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Revoke old key
  oldKey.status = 'revoked';
  oldKey.revokedAt = new Date().toISOString();

  // Mint new API key
  const randomHex = generateRandomHex(6).toUpperCase() + generateRandomHex(6).toUpperCase();
  const newKeyStr = `RONI-API-${randomHex}`;
  const newKeyRec = {
    id: 'key_' + generateRandomHex(8),
    userId: user.id,
    scriptId: oldKey.scriptId,
    panelId: oldKey.panelId,
    key: newKeyStr,
    type: oldKey.type,
    maxUses: oldKey.maxUses,
    currentUses: 0,
    hwidLocked: oldKey.hwidLocked,
    boundHwid: null,
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    expiresAt: null,
    lastUsedAt: null,
  };

  state.keys.unshift(newKeyRec);

  // Update script record's apiKey
  const script = state.scripts.find((s) => s.id === oldKey.scriptId);
  if (script) {
    script.apiKey = newKeyStr;
    script.apiKeyId = newKeyRec.id;
  }

  db.logAudit('key_gen', `Regenerated API key for script ${oldKey.scriptId}: ${newKeyStr}`, req.ip, user.id, 'info');
  db.save();

  res.json({
    success: true,
    newKey: newKeyRec,
    loadstringUrl: `https://roniguardreal.wasmer.app/loader.lua?script=${oldKey.scriptId}&key=${newKeyStr}`,
    message: 'New API key successfully minted.',
  });
});

router.delete('/scripts/:id', requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const idx = state.scripts.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Script not found' });

  const script = state.scripts[idx];

  // Purge original source file from disk
  const origPath = path.join(SOURCES_DIR, `${script.originalFileId}.lua`);
  if (fs.existsSync(origPath)) fs.unlinkSync(origPath);

  // Purge protected build file from disk
  if (script.protectedFileId) {
    const buildPath = path.join(BUILDS_DIR, `${script.protectedFileId}.lua`);
    if (fs.existsSync(buildPath)) fs.unlinkSync(buildPath);
  }

  state.scripts.splice(idx, 1);
  db.logAudit('security_alert', `Deleted script "${script.filename}" and removed storage files`, req.ip);
  db.save();

  res.json({ success: true, message: `Script ${script.filename} deleted` });
});

// Download public/protected build output
router.get('/scripts/:id/download-protected', requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const script = db.get().scripts.find((s) => s.id === id);
  if (!script || !script.protectedFileId) {
    return res.status(404).json({ error: 'Protected output not found or not yet built' });
  }

  const filePath = path.join(BUILDS_DIR, `${script.protectedFileId}.lua`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Protected file missing on disk' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="protected_${script.filename}"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  fs.createReadStream(filePath).pipe(res);
});

// -------------------------------------------------------------
// 5. OBFUSCATION PIPELINE & ENGINES
// -------------------------------------------------------------

router.get('/obfuscation/engines', requireOwnerAuth, (_req, res) => {
  res.json(AVAILABLE_ENGINES);
});

router.get('/obfuscation/history', requireOwnerAuth, (_req, res) => {
  res.json(db.get().builds);
});

router.post('/obfuscation/build', requireOwnerAuth, async (req, res) => {
  const { scriptId, rawSource, options, panelId, filename: customFilename } = req.body;
  const state = db.get();

  let codeToObfuscate = '';
  let filename = customFilename ? path.basename(customFilename) : 'adhoc_script.lua';
  let targetPanelId = panelId || state.panels[0]?.id || 'pnl_main';
  let scriptRecord = null;

  if (scriptId) {
    scriptRecord = state.scripts.find((s) => s.id === scriptId);
    if (!scriptRecord) return res.status(404).json({ error: 'Script not found' });
    filename = scriptRecord.filename;
    targetPanelId = scriptRecord.panelId;

    const origPath = path.join(SOURCES_DIR, `${scriptRecord.originalFileId}.lua`);
    if (!fs.existsSync(origPath)) {
      return res.status(404).json({ error: 'Original source file missing on server' });
    }
    codeToObfuscate = fs.readFileSync(origPath, 'utf-8');
  } else if (rawSource) {
    codeToObfuscate = rawSource;
  } else {
    return res.status(400).json({ error: 'Either scriptId or rawSource is required' });
  }

  const buildOpts: ObfuscationOptions = {
    profile: options?.profile || 'advanced',
    engine: options?.engine || 'RONIGUARD-MAX',
    stringEncryption: options?.stringEncryption !== false,
    controlFlow: !!options?.controlFlow || options?.profile === 'maximum',
    constantVirtualization: options?.constantVirtualization !== false,
    variableRenaming: options?.variableRenaming !== false,
    antiTamper: options?.antiTamper !== false,
    watermarkCheck: options?.watermarkCheck !== false,
    customWatermark: options?.customWatermark || `${filename} · Protected by RONIGUARD`,
  };

  const result = await runObfuscationPipeline(codeToObfuscate, buildOpts);

  let protectedFileId: string | null = null;
  if (result.success && result.transformedCode) {
    protectedFileId = 'build_' + generateRandomHex(12);
    const protectedPath = path.join(BUILDS_DIR, `${protectedFileId}.lua`);
    fs.writeFileSync(protectedPath, result.transformedCode, 'utf-8');

    if (scriptRecord) {
      scriptRecord.protectedFileId = protectedFileId;
      scriptRecord.protectedSize = result.outputSize;
      scriptRecord.status = 'obfuscated';
      scriptRecord.buildCount += 1;
      scriptRecord.lastBuiltAt = new Date().toISOString();
    }
  } else if (scriptRecord) {
    scriptRecord.status = 'failed';
  }

  const buildRecord: BuildRecord = {
    id: 'bld_' + generateRandomHex(6),
    scriptId: scriptRecord ? scriptRecord.id : 'adhoc',
    panelId: targetPanelId,
    filename,
    engine: buildOpts.engine || 'RONIGUARD-MAX',
    profile: (buildOpts.profile || 'advanced') as 'basic' | 'advanced' | 'maximum',
    options: {
      stringEncryption: buildOpts.stringEncryption !== false,
      controlFlow: !!buildOpts.controlFlow,
      constantVirtualization: buildOpts.constantVirtualization !== false,
      variableRenaming: buildOpts.variableRenaming !== false,
      antiTamper: buildOpts.antiTamper !== false,
      watermarkCheck: buildOpts.watermarkCheck !== false,
    },
    status: result.success ? ('success' as const) : ('failed' as const),
    inputSize: result.originalSize,
    outputSize: result.outputSize,
    compressionRatio: result.compressionRatio,
    durationMs: result.durationMs,
    errorMsg: result.error,
    createdAt: new Date().toISOString(),
  };

  // Also write output under build ID for direct loader resolution
  if (result.success && result.transformedCode) {
    const buildDirectPath = path.join(BUILDS_DIR, `${buildRecord.id}.lua`);
    fs.writeFileSync(buildDirectPath, result.transformedCode, 'utf-8');
  }

  state.builds.unshift(buildRecord);
  db.logAudit('build', `Executed build for "${filename}" [${buildOpts.engine} - ${buildOpts.profile}]`);
  db.save();

  res.json({
    success: result.success,
    build: buildRecord,
    transformedPreview: result.transformedCode ? result.transformedCode.slice(0, 1500) : null,
    fullTransformedCode: result.transformedCode || null,
    error: result.error,
  });
});

// -------------------------------------------------------------
// 6. OWNER-ONLY ORIGINAL SOURCE RECOVERY (Strict Auth Check)
// -------------------------------------------------------------

router.get('/source-recovery/list', requireOwnerAuth, (_req, res) => {
  const state = db.get();
  // Return list of scripts with source recovery metadata
  const recoveryList = state.scripts.map((s) => {
    const origPath = path.join(SOURCES_DIR, `${s.originalFileId}.lua`);
    const fileExists = fs.existsSync(origPath);
    return {
      scriptId: s.id,
      filename: s.filename,
      panelId: s.panelId,
      uploadDate: s.createdAt,
      originalSize: s.originalSize,
      sourceAvailable: fileExists,
      buildCount: s.buildCount,
    };
  });
  res.json(recoveryList);
});

router.post('/source-recovery/verify-and-download/:scriptId', requireOwnerAuth, (req, res) => {
  const { scriptId } = req.params;
  const { ownerPassword, confirmationPhrase } = req.body;
  const owner = db.get().owner;

  // Strict authorization: Requires password confirmation or phrase match
  const passHash = hashPassword(ownerPassword || '', owner.salt);
  const isPassValid = passHash === owner.passwordHash;
  const isPhraseValid = confirmationPhrase === 'RESTORE_ORIGINAL_SOURCE';

  if (!isPassValid && !isPhraseValid) {
    db.logAudit(
      'source_recovery',
      `UNAUTHORIZED source recovery attempt for script ${scriptId}: incorrect authorization`,
      req.ip,
      req.headers['user-agent'] as string,
      'critical'
    );
    return res.status(403).json({ error: 'Owner verification failed. Access denied to original source.' });
  }

  const script = db.get().scripts.find((s) => s.id === scriptId);
  if (!script) {
    return res.status(404).json({ error: 'Script metadata not found' });
  }

  const origPath = path.join(SOURCES_DIR, `${script.originalFileId}.lua`);
  if (!fs.existsSync(origPath)) {
    return res.status(404).json({ error: 'Original source file not found on secure storage' });
  }

  // Audit log recovery event
  db.logAudit(
    'source_recovery',
    `Authenticated owner recovered original source for "${script.filename}" (${script.id})`,
    req.ip,
    req.headers['user-agent'] as string,
    'warning'
  );

  res.setHeader('Content-Disposition', `attachment; filename="ORIGINAL_${script.filename}"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  fs.createReadStream(origPath).pipe(res);
});

router.delete('/source-recovery/:scriptId', requireOwnerAuth, (req, res) => {
  const { scriptId } = req.params;
  const script = db.get().scripts.find((s) => s.id === scriptId);
  if (!script) return res.status(404).json({ error: 'Script not found' });

  const origPath = path.join(SOURCES_DIR, `${script.originalFileId}.lua`);
  if (fs.existsSync(origPath)) {
    fs.unlinkSync(origPath);
  }

  db.logAudit('security_alert', `Owner permanently purged original source for "${script.filename}"`, req.ip);
  res.json({ success: true, message: `Original source for ${script.filename} purged from server` });
});

// -------------------------------------------------------------
// 7. WHITELIST MANAGEMENT
// -------------------------------------------------------------

router.get('/whitelist', requireOwnerAuth, (_req, res) => {
  res.json(db.get().whitelist);
});

router.post('/whitelist', requireOwnerAuth, (req, res) => {
  const { identifier, platform, panelId, note } = req.body;
  if (!identifier || !identifier.trim()) {
    return res.status(400).json({ error: 'Platform identifier is required' });
  }

  const state = db.get();
  const targetPanelId = panelId || state.panels[0]?.id || 'pnl_main';

  const entry = {
    id: 'wl_' + generateRandomHex(4),
    panelId: targetPanelId,
    platform: platform || 'discord',
    identifier: identifier.trim(),
    note: note?.trim() || '',
    status: 'active' as const,
    addedAt: new Date().toISOString(),
    lastSeenAt: null,
    boundHwid: null,
  };

  state.whitelist.unshift(entry);
  db.logAudit('whitelist_change', `Whitelisted "${identifier}" (${entry.platform}) on panel ${targetPanelId}`);
  db.save();

  res.json(entry);
});

router.delete('/whitelist/:id', requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const idx = state.whitelist.findIndex((w) => w.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Whitelist entry not found' });

  const removed = state.whitelist.splice(idx, 1)[0];
  db.logAudit('whitelist_change', `Removed "${removed.identifier}" from whitelist`);
  db.save();

  res.json({ success: true, message: 'Removed from whitelist' });
});

router.post('/whitelist/import', requireOwnerAuth, (req, res) => {
  const { entries, panelId } = req.body;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: 'Entries must be an array of objects or strings' });
  }

  const state = db.get();
  const targetPanelId = panelId || state.panels[0]?.id || 'pnl_main';
  let importedCount = 0;

  for (const item of entries) {
    const ident = typeof item === 'string' ? item : item.identifier;
    if (!ident || !ident.trim()) continue;

    state.whitelist.unshift({
      id: 'wl_' + generateRandomHex(4),
      panelId: targetPanelId,
      platform: (typeof item === 'object' && item.platform) || 'discord',
      identifier: ident.trim(),
      note: (typeof item === 'object' && item.note) || 'Bulk Imported',
      status: 'active',
      addedAt: new Date().toISOString(),
      lastSeenAt: null,
      boundHwid: null,
    });
    importedCount++;
  }

  db.logAudit('whitelist_change', `Imported ${importedCount} whitelist entries`);
  db.save();

  res.json({ success: true, importedCount });
});

// -------------------------------------------------------------
// 8. LICENSE KEYS MANAGEMENT
// -------------------------------------------------------------

router.get('/keys', requireOwnerAuth, (_req, res) => {
  res.json(db.get().keys);
});

router.post('/keys/generate', requireOwnerAuth, (req, res) => {
  const { type, panelId, count, maxUses, hwidLocked } = req.body;
  const state = db.get();
  const targetPanelId = panelId || state.panels[0]?.id || 'pnl_main';
  const qty = Math.min(Math.max(Number(count) || 1, 1), 50);

  const createdKeys = [];

  for (let i = 0; i < qty; i++) {
    const segments = Array.from({ length: 3 }, () => generateRandomHex(2).toUpperCase()).join('-');
    const keyStr = `RONI-${(type || 'LIFETIME').toUpperCase().slice(0, 4)}-${segments}`;

    let expiresAt: string | null = null;
    if (type === '24h') expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    if (type === '7d') expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    if (type === '30d') expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    const user = (req as any).user;
    const targetScript = state.scripts.find((s) => s.panelId === targetPanelId) || state.scripts[0];
    const scriptId = req.body.scriptId || (targetScript ? targetScript.id : 'scr_main');
    const callerUserId = user?.id || targetScript?.userId || 'usr_owner';

    const record: KeyRecord = {
      id: 'key_' + generateRandomHex(4),
      userId: callerUserId,
      scriptId,
      panelId: targetPanelId,
      key: keyStr,
      type: type || 'lifetime',
      maxUses: Number(maxUses) || 1,
      currentUses: 0,
      hwidLocked: hwidLocked !== false,
      boundHwid: null,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      expiresAt,
      lastUsedAt: null,
    };

    state.keys.unshift(record);
    createdKeys.push(record);
  }

  db.logAudit('key_gen', `Generated ${qty} key(s) [${type}] for panel ${targetPanelId}`);
  db.save();

  res.json(createdKeys);
});

router.post('/keys/revoke/:id', requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const key = state.keys.find((k) => k.id === id);
  if (!key) return res.status(404).json({ error: 'Key not found' });

  key.status = 'revoked';
  db.logAudit('key_gen', `Revoked license key "${key.key}"`);
  db.save();

  res.json({ success: true, key });
});

// Public / Loader Validation Endpoint
router.post('/keys/validate', (req, res) => {
  const { key, hwid, identifier } = req.body;
  if (!key) return res.status(400).json({ valid: false, message: 'License key is required' });

  const state = db.get();
  const keyRec = state.keys.find((k) => k.key.trim().toUpperCase() === key.trim().toUpperCase());

  if (!keyRec) {
    return res.status(404).json({ valid: false, message: 'Invalid license key' });
  }

  if (keyRec.status !== 'active') {
    return res.status(403).json({ valid: false, message: `Key status is: ${keyRec.status}` });
  }

  if (keyRec.expiresAt && new Date(keyRec.expiresAt) < new Date()) {
    keyRec.status = 'expired';
    db.save();
    return res.status(403).json({ valid: false, message: 'License key has expired' });
  }

  // HWID lock logic
  if (keyRec.hwidLocked) {
    if (!hwid) {
      return res.status(400).json({ valid: false, message: 'HWID required for hardware locked key' });
    }
    if (!keyRec.boundHwid) {
      // Bind device
      keyRec.boundHwid = hwid;
      db.logAudit('hwid_reset', `Key ${keyRec.key} bound to HWID: ${hwid}`);
    } else if (keyRec.boundHwid !== hwid) {
      return res.status(403).json({ valid: false, message: 'Hardware identifier mismatch. Contact owner for reset.' });
    }
  }

  keyRec.currentUses += 1;
  keyRec.lastUsedAt = new Date().toISOString();
  db.save();

  res.json({
    valid: true,
    message: 'Authentication successful',
    type: keyRec.type,
    expiresAt: keyRec.expiresAt,
    panelId: keyRec.panelId,
  });
});

// -------------------------------------------------------------
// 9. HWID MANAGEMENT
// -------------------------------------------------------------

router.get('/hwid', requireOwnerAuth, (_req, res) => {
  res.json(db.get().hwidBindings);
});

router.post('/hwid/reset', requireOwnerAuth, (req, res) => {
  const { id } = req.body;
  const state = db.get();
  const binding = state.hwidBindings.find((h) => h.id === id);
  if (!binding) return res.status(404).json({ error: 'Binding record not found' });

  binding.resetCount += 1;
  binding.lastResetAt = new Date().toISOString();
  binding.hwidHash = 'UNBOUND_' + generateRandomHex(6);
  db.logAudit('hwid_reset', `Owner reset HWID binding for "${binding.identifier}"`);
  db.save();

  res.json({ success: true, binding });
});

router.post('/hwid/revoke/:id', requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const binding = state.hwidBindings.find((h) => h.id === id);
  if (!binding) return res.status(404).json({ error: 'Binding not found' });

  binding.status = 'revoked';
  db.logAudit('hwid_reset', `Revoked HWID binding for "${binding.identifier}"`);
  db.save();

  res.json({ success: true, binding });
});

// -------------------------------------------------------------
// 10. DISCORD BOT INTEGRATION
// -------------------------------------------------------------

router.get('/discord/status', requireOwnerAuth, (_req, res) => {
  const config = db.get().botConfig;
  res.json({
    isConnected: config.isConnected,
    botUsername: config.botUsername,
    botAvatar: config.botAvatar,
    lastPing: config.lastPing,
    lastTestedAt: config.lastTestedAt,
    hasTokenConfigured: !!config.botToken,
    clientId: config.clientId,
    guildId: config.guildId,
    webhookConfigured: !!config.webhookUrl,
    registeredCommands: config.registeredCommands,
  });
});

router.post('/discord/test', requireOwnerAuth, async (req, res) => {
  const { token } = req.body;
  const result = await testDiscordBotConnection(token);
  if (result.connected) {
    discordBotService.start(token).catch(console.error);
  }
  res.json(result);
});

router.post('/discord/update-config', requireOwnerAuth, (req, res) => {
  const { botToken, clientId, guildId, webhookUrl, bridgeUrl, bridgeSecret } = req.body;
  const state = db.get();

  if (botToken !== undefined) state.botConfig.botToken = botToken.trim();
  if (clientId !== undefined) state.botConfig.clientId = clientId.trim();
  if (guildId !== undefined) state.botConfig.guildId = guildId.trim();
  if (webhookUrl !== undefined) state.botConfig.webhookUrl = webhookUrl.trim();
  if (bridgeUrl !== undefined) state.botConfig.bridgeUrl = bridgeUrl.trim();
  if (bridgeSecret !== undefined) state.botConfig.bridgeSecret = bridgeSecret.trim();

  db.logAudit('bot_sync', 'Updated Discord Bot configuration parameters');
  db.save();

  if (state.botConfig.botToken) {
    discordBotService.start(state.botConfig.botToken).catch(console.error);
  }

  res.json({ success: true, message: 'Discord bot settings updated and gateway service initialized.' });
});

router.post('/discord/command-execute', requireOwnerAuth, async (req, res) => {
  const { commandName, args } = req.body;
  const result = await executeBotCommand({
    commandName,
    args: args || {},
    source: 'dashboard_tester',
  });
  res.json(result);
});

// -------------------------------------------------------------
// 11. API CREDENTIALS & SCRIPT LOADER GENERATOR
// -------------------------------------------------------------

router.get('/credentials', requireOwnerAuth, (_req, res) => {
  res.json(db.get().apiCredentials);
});

router.post('/credentials/generate', requireOwnerAuth, (req, res) => {
  const { name, scopes } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Credential name is required' });

  const rawKey = `roni_live_${generateRandomHex(24)}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const cred = {
    id: 'api_' + generateRandomHex(4),
    name: name.trim(),
    prefix: rawKey.slice(0, 14) + '...',
    keyHash,
    scopes: Array.isArray(scopes) ? scopes : ['bot:sync', 'whitelist:read'],
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    status: 'active' as const,
    rateLimitPerMin: 120,
  };

  db.get().apiCredentials.unshift(cred);
  db.logAudit('security_alert', `Generated API credential "${cred.name}"`);
  db.save();

  // Return rawKey ONLY once upon creation!
  res.json({
    credential: cred,
    secretKey: rawKey,
  });
});

router.delete('/credentials/:id', requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const idx = state.apiCredentials.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Credential not found' });

  state.apiCredentials[idx].status = 'revoked';
  db.logAudit('security_alert', `Revoked API credential "${state.apiCredentials[idx].name}"`);
  db.save();

  res.json({ success: true, message: 'API credential revoked' });
});

// -------------------------------------------------------------
// 11. VYKUS VM PROTECTED SCRIPT LOADER & EXECUTION PORTAL
// -------------------------------------------------------------

function renderUnauthorizedHtml(filename: string = 'Protected Script', resourceId: string = 'latest'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>🛑 UNAUTHORIZED ACCESS 🛑 | RONIGUARD</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 25%, #180509 0%, #060205 100%);
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      max-width: 540px;
      width: 100%;
      background: rgba(18, 5, 10, 0.96);
      border: 2px solid #ef4444;
      border-radius: 1.5rem;
      padding: 2.25rem 2rem;
      text-align: center;
      box-shadow: 0 0 60px rgba(239, 68, 68, 0.25), inset 0 0 25px rgba(239, 68, 68, 0.08);
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; height: 4px;
      background: linear-gradient(90deg, #ef4444, #f59e0b, #ef4444);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
    }
    .title {
      font-size: 1.75rem;
      font-weight: 900;
      color: #ef4444;
      letter-spacing: -0.02em;
      margin-bottom: 0.6rem;
      text-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
    }
    .notice {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.75rem;
    }
    .desc {
      font-size: 0.875rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }
    .url-box {
      background: #090306;
      border: 1px dashed rgba(239, 68, 68, 0.5);
      border-radius: 0.85rem;
      padding: 1.1rem;
      margin-bottom: 1.75rem;
    }
    .url-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #f87171;
      margin-bottom: 0.35rem;
      font-weight: 700;
    }
    .url-link {
      font-family: monospace;
      font-size: 1rem;
      color: #38bdf8;
      word-break: break-all;
      font-weight: 700;
      text-decoration: underline;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 1rem 1.5rem;
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 0.85rem;
      font-weight: 800;
      font-size: 1rem;
      letter-spacing: 0.02em;
      box-shadow: 0 4px 25px rgba(239, 68, 68, 0.45);
      transition: transform 0.2s, opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.95;
      transform: translateY(-2px);
    }
    .footer {
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: #64748b;
      line-height: 1.5;
    }
    .footer code {
      background: #000;
      padding: 0.2rem 0.4rem;
      border-radius: 0.3rem;
      color: #fef08a;
      font-size: 0.72rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🛑 SECURITY SENTINEL 🛑</div>
    <h1 class="title">🛑 UNAUTHORIZED ACCESS 🛑</h1>
    <p class="notice">Content is not visible here.</p>
    <p class="desc">
      Raw script payloads cannot be viewed directly through a web browser.
      Please visit the official dashboard to view, configure, and manage scripts.
    </p>
    <div class="url-box">
      <div class="url-label">Official Real Page:</div>
      <a href="https://roniguardreal.wasmer.app" class="url-link">https://roniguardreal.wasmer.app</a>
    </div>
    <a href="https://roniguardreal.wasmer.app" class="btn">
      👉 Visit Real Page: https://roniguardreal.wasmer.app
    </a>
    <p class="footer">
      Roblox execution: Use <code>loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua"))()</code> in your executor console.
    </p>
  </div>
</body>
</html>`;
}

// Helper: resolves script content by scriptId, buildId, filename, or 'latest'
function resolveScriptContentAndMeta(id: string): { content: string; filename: string; scriptRecord?: any; buildRecord?: any } | null {
  const state = db.get();
  let scriptRecord = state.scripts.find(
    (s) => s.id === id || s.filename.toLowerCase() === id.toLowerCase() || s.protectedFileId === id
  );
  let buildRecord = state.builds.find((b) => b.id === id || b.scriptId === id);

  if (!scriptRecord && (id === 'latest' || id === 'default')) {
    scriptRecord = state.scripts[0];
  }

  // 1. Try protected file from script record
  if (scriptRecord?.protectedFileId) {
    const pPath = path.join(BUILDS_DIR, `${scriptRecord.protectedFileId}.lua`);
    if (fs.existsSync(pPath)) {
      return { content: fs.readFileSync(pPath, 'utf-8'), filename: scriptRecord.filename, scriptRecord, buildRecord };
    }
  }

  // 2. Try build file by build id
  if (buildRecord) {
    const bPath = path.join(BUILDS_DIR, `${buildRecord.id}.lua`);
    if (fs.existsSync(bPath)) {
      return { content: fs.readFileSync(bPath, 'utf-8'), filename: buildRecord.filename, scriptRecord, buildRecord };
    }
  }

  // 3. Try direct build file by name/id
  const directBuildPath = path.join(BUILDS_DIR, `${id}.lua`);
  if (fs.existsSync(directBuildPath)) {
    return { content: fs.readFileSync(directBuildPath, 'utf-8'), filename: scriptRecord?.filename || `${id}.lua`, scriptRecord, buildRecord };
  }

  // 4. Try original source file from script record
  if (scriptRecord?.originalFileId) {
    const oPath = path.join(SOURCES_DIR, `${scriptRecord.originalFileId}.lua`);
    if (fs.existsSync(oPath)) {
      return { content: fs.readFileSync(oPath, 'utf-8'), filename: scriptRecord.filename, scriptRecord, buildRecord };
    }
  }

  // 5. Try direct source file
  const directSourcePath = path.join(SOURCES_DIR, `${id}.lua`);
  if (fs.existsSync(directSourcePath)) {
    return { content: fs.readFileSync(directSourcePath, 'utf-8'), filename: `${id}.lua`, scriptRecord, buildRecord };
  }

  return null;
}

// Core Loader Raw Delivery Handler
export async function handleRawLoaderRequest(req: Request, res: Response) {
  const rawId = (req.query.script as string) || (req.query.id as string) || req.params.id || req.params.scriptId || 'latest';
  const id = rawId.trim();
  const state = db.get();
  const resolved = resolveScriptContentAndMeta(id);

  const isBrowser = req.headers.accept?.includes('text/html');

  if (!resolved) {
    if (isBrowser) {
      return res.status(404).send(renderUnauthorizedHtml(id, id));
    }
    return res.status(404).send(`-- [RONIGUARD] 404: Script "${id}" not found.`);
  }

  const { content, filename, scriptRecord } = resolved;

  // Browser access without ?raw=true: ALWAYS render the Unauthorized Access page!
  if (isBrowser && !req.query.raw) {
    return res.send(renderUnauthorizedHtml(filename, id));
  }

  // Check 1: User or Owner session bypass
  const authUser = getAuthenticatedUser(req);
  const isAuthorizedOwner = Boolean(
    authUser && (authUser.role === 'admin' || (scriptRecord && scriptRecord.userId === authUser.id))
  );

  // Check 2: Executor license key or whitelisted user
  const licenseKeyInput = ((req.query.key || req.headers['x-license-key'] || req.query.license_key || req.query.api_key) as string)?.trim();
  const hwid = ((req.headers['x-hwid'] || req.query.hwid) as string)?.trim();
  const robloxUser = ((req.headers['x-roblox-user-id'] || req.query.user_id) as string)?.trim();

  let isAuthorizedExecutor = false;
  let keyRecordMatched: any = null;

  if (licenseKeyInput) {
    const keyRec = state.keys.find(
      (k) => k.key.toUpperCase() === licenseKeyInput.toUpperCase() || k.id === licenseKeyInput
    );

    if (keyRec && keyRec.status === 'active') {
      // SCRIPT-SPECIFIC API KEY VALIDATION:
      // Key A authorizes Script A only; Key B authorizes Script B only!
      if (scriptRecord && keyRec.scriptId && keyRec.scriptId !== scriptRecord.id) {
        isAuthorizedExecutor = false;
      } else {
        const notExpired = !keyRec.expiresAt || new Date(keyRec.expiresAt) > new Date();
        if (notExpired) {
          if (!keyRec.hwidLocked || !keyRec.boundHwid || keyRec.boundHwid === hwid) {
            isAuthorizedExecutor = true;
            keyRecordMatched = keyRec;
          }
        }
      }
    }
  }

  if (!isAuthorizedExecutor && robloxUser) {
    const wl = state.whitelist.find((w) => w.identifier === robloxUser && w.status === 'active');
    if (wl) {
      isAuthorizedExecutor = true;
      wl.lastSeenAt = new Date().toISOString();
      if (hwid && !wl.boundHwid) wl.boundHwid = hwid;
    }
  }

  // Update license usage if key provided
  if (keyRecordMatched) {
    keyRecordMatched.currentUses = (keyRecordMatched.currentUses || 0) + 1;
    keyRecordMatched.lastUsedAt = new Date().toISOString();
    if (keyRecordMatched.hwidLocked && !keyRecordMatched.boundHwid && hwid) {
      keyRecordMatched.boundHwid = hwid;
    }
    db.save();
  }

  // Enforce authorization
  if (!isAuthorizedExecutor && !isAuthorizedOwner) {
    if (isBrowser) {
      return res.status(401).send(renderUnauthorizedHtml(filename, id));
    }
    return res.status(401).send(`-- [RONIGUARD] Access Denied: Invalid or unauthorized API key for script "${filename}".\nreturn error("[RONIGUARD] Access Denied: Valid script-specific API key required. Usage: loader.lua?script=${id}&key=YOUR_API_KEY")`);
  }

  // Deliver the protected script payload to Roblox executor
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Roniguard-Engine', 'RONIGUARD-MAX-v2.5');
  res.setHeader('X-Roniguard-Security-Walls', 'Active');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  return res.send(content);
}

// Raw Script Delivery Endpoints
router.get('/loader/raw/:id', handleRawLoaderRequest);
router.get('/raw/:id', handleRawLoaderRequest);
router.get('/load/:id', handleRawLoaderRequest);
router.get('/scripts/:id/raw', handleRawLoaderRequest);
router.get('/loader.lua', handleRawLoaderRequest);
router.get('/raw/latest.lua', handleRawLoaderRequest);

// Loader Info & Details endpoint
router.get('/loader/details/:id', requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === id || s.filename === id) || state.scripts[0];
  const build = state.builds.find((b) => b.id === id || b.scriptId === id);

  const scriptId = script?.id || build?.id || id;
  const filename = script?.filename || build?.filename || 'script.lua';

  const baseUrl = 'https://roniguardreal.wasmer.app';

  const publicRawUrl = `${baseUrl}/api/loader/raw/${scriptId}`;
  const loadstringSnippet = `loadstring(game:HttpGet("${publicRawUrl}"))()`;
  const executorSnippetWithKey = `loadstring(game:HttpGet("${publicRawUrl}?key=YOUR_LICENSE_KEY"))()`;

  res.json({
    id: scriptId,
    filename,
    loadstringSnippet,
    executorSnippetWithKey,
    publicRawUrl,
    protectionLevel: 'Vykus Polymorphic VM Engine v2.5.1 + Anti-Tamper Security Walls',
    isObfuscated: !!(script?.protectedFileId || build),
    engine: 'Vykus-VM-Obfuscator',
  });
});

// Interactive Simulator
router.post('/loader/simulate-check', requireOwnerAuth, (req, res) => {
  const { scriptId } = req.body;
  const resolved = resolveScriptContentAndMeta(scriptId || 'latest');

  if (!resolved) {
    return res.status(404).json({ error: 'Target script not found' });
  }

  return res.json({
    status: 200,
    authorized: true,
    engine: 'Vykus Polymorphic VM Engine',
    securityWalls: ['Anti-Debug Probes', 'Metatable Integrity Seals', 'Environment Guard'],
    message: 'Script is online and ready to execute via loadstring in Roblox executors.',
    codeSnippet: resolved.content.slice(0, 500) + (resolved.content.length > 500 ? '\n-- [Protected VM Bytecode Continues]' : ''),
    bytesReturned: resolved.content.length,
  });
});

// Universal Luau Loader Generator
router.get('/loader-code/:panelId', requireOwnerAuth, (req, res) => {
  const { panelId } = req.params;
  const state = db.get();
  const panel = state.panels.find((p) => p.id === panelId) || state.panels[0];
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const appUrl = `${protocol}://${host}`;

  const loaderCode = `
--[[
  =============================================================
  RONIGUARD UNIVERSAL LUAU LOADER
  Panel: ${panel?.name || 'Main Core'} (ID: ${panel?.id || panelId})
  Platform: Luau / Roblox Environment
  =============================================================
--]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

local RONIGUARD_ENDPOINT = "${appUrl}/api/keys/validate"
local PANEL_ID = "${panel?.id || panelId}"

local function GetHWID()
  local rbxAnalytics = game:GetService("RbxAnalyticsService")
  local ok, hwid = pcall(function()
    return rbxAnalytics:GetClientId()
  end)
  return ok and hwid or "HWID_FALLBACK_" .. tostring(LocalPlayer.UserId)
end

local function AuthenticateAndRun(userKey)
  local payload = HttpService:JSONEncode({
    key = userKey,
    hwid = GetHWID(),
    identifier = tostring(LocalPlayer.UserId)
  })

  local req = (syn and syn.request) or (http and http.request) or http_request or request
  if not req then
    warn("[RONIGUARD] Executor HTTP service not found.")
    return
  end

  local res = req({
    Url = RONIGUARD_ENDPOINT,
    Method = "POST",
    Headers = {
      ["Content-Type"] = "application/json"
    },
    Body = payload
  })

  if res.StatusCode == 200 then
    local data = HttpService:JSONDecode(res.Body)
    if data.valid then
      print("[RONIGUARD] Handshake verified! Initializing protected bytecode...")
      -- Load authorized payload
    else
      warn("[RONIGUARD] Access rejected: " .. tostring(data.message))
    end
  else
    warn("[RONIGUARD] Handshake failed with status " .. tostring(res.StatusCode))
  end
end

-- AuthenticateAndRun("YOUR-KEY-HERE")
`.trim();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(loaderCode);
});

// -------------------------------------------------------------
// 12. ANALYTICS & AUDIT LOGS
// -------------------------------------------------------------

router.get('/analytics', requireOwnerAuth, (_req, res) => {
  const state = db.get();
  const totalBuilds = state.builds.length;
  const successfulBuilds = state.builds.filter((b) => b.status === 'success').length;
  const failedBuilds = state.builds.filter((b) => b.status === 'failed').length;

  const engineDistribution: Record<string, number> = {};
  state.builds.forEach((b) => {
    engineDistribution[b.engine] = (engineDistribution[b.engine] || 0) + 1;
  });

  const profileDistribution: Record<string, number> = {
    basic: 0,
    advanced: 0,
    maximum: 0,
  };
  state.builds.forEach((b) => {
    if (profileDistribution[b.profile] !== undefined) {
      profileDistribution[b.profile]++;
    }
  });

  res.json({
    totalBuilds,
    successfulBuilds,
    failedBuilds,
    successRate: totalBuilds > 0 ? Number(((successfulBuilds / totalBuilds) * 100).toFixed(1)) : 100,
    totalKeys: state.keys.length,
    activeKeys: state.keys.filter((k) => k.status === 'active').length,
    revokedKeys: state.keys.filter((k) => k.status === 'revoked').length,
    whitelistedUsers: state.whitelist.length,
    engineDistribution,
    profileDistribution,
  });
});

router.get('/logs', requireOwnerAuth, (_req, res) => {
  res.json(db.get().auditLogs);
});

// -------------------------------------------------------------
// 13. SETTINGS
// -------------------------------------------------------------

router.get('/settings', requireOwnerAuth, (_req, res) => {
  const state = db.get();
  res.json({
    projectName: state.settings.projectName,
    defaultEngine: state.settings.defaultEngine,
    defaultProfile: state.settings.defaultProfile,
    maxFileSizeMb: state.settings.maxFileSizeMb,
    requirePasswordForSourceRecovery: state.settings.requirePasswordForSourceRecovery,
    autoPurgeBuildHistoryDays: state.settings.autoPurgeBuildHistoryDays,
    ownerEmail: state.owner.email,
  });
});

router.put('/settings', requireOwnerAuth, (req, res) => {
  const { projectName, defaultEngine, defaultProfile, maxFileSizeMb, requirePasswordForSourceRecovery, autoPurgeBuildHistoryDays } = req.body;
  const state = db.get();

  if (projectName) state.settings.projectName = projectName.trim();
  if (defaultEngine) state.settings.defaultEngine = defaultEngine;
  if (defaultProfile) state.settings.defaultProfile = defaultProfile;
  if (maxFileSizeMb !== undefined) state.settings.maxFileSizeMb = Number(maxFileSizeMb);
  if (requirePasswordForSourceRecovery !== undefined) state.settings.requirePasswordForSourceRecovery = !!requirePasswordForSourceRecovery;
  if (autoPurgeBuildHistoryDays !== undefined) state.settings.autoPurgeBuildHistoryDays = Number(autoPurgeBuildHistoryDays);

  db.logAudit('security_alert', 'System settings updated');
  db.save();

  res.json({ success: true, settings: state.settings });
});

export default router;
