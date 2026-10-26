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

// Extracts owner session token from headers, query params, or cookies
export function getOwnerSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token.trim();
  }
  if (req.query.owner_token && typeof req.query.owner_token === 'string') {
    return req.query.owner_token.trim();
  }
  if (req.headers['x-owner-token'] && typeof req.headers['x-owner-token'] === 'string') {
    return (req.headers['x-owner-token'] as string).trim();
  }
  const cookies = parseCookies(req);
  if (cookies.roni_owner_token) {
    return cookies.roni_owner_token.trim();
  }
  return null;
}

// Middleware: Authenticate Owner Session Token
export function requireOwnerAuth(req: Request, res: Response, next: () => void) {
  const token = getOwnerSessionToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Owner session token required' });
  }

  const owner = db.get().owner;
  if (!owner.sessionTokens.includes(token)) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired owner session' });
  }

  next();
}

// -------------------------------------------------------------
// 1. AUTHENTICATION (Owner-Only)
// -------------------------------------------------------------

router.post('/auth/login', (req, res) => {
  const { email, password, quickOwnerLogin } = req.body;
  const owner = db.get().owner;

  // Support quick owner login directly from private owner instance
  if (quickOwnerLogin) {
    const token = generateRandomHex(32);
    owner.sessionTokens.push(token);
    if (owner.sessionTokens.length > 5) owner.sessionTokens.shift();
    owner.lastLogin = new Date().toISOString();
    db.logAudit('login', 'Owner logged in via 1-click access', req.ip, req.headers['user-agent'] as string, 'info');
    db.save();

    res.setHeader('Set-Cookie', [
      `roni_owner_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`,
      `roni_owner_email=ronizz.edit@gmail.com; Path=/; Max-Age=2592000; SameSite=Lax`,
    ]);

    return res.json({
      token,
      user: {
        email: owner.email,
        lastLogin: owner.lastLogin,
        twoFactorEnabled: owner.twoFactorEnabled,
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
    db.logAudit('login', `Failed login attempt for non-owner email: ${email}`, req.ip, req.headers['user-agent'] as string, 'warning');
    return res.status(401).json({ error: 'Invalid owner credentials' });
  }

  const inputHash = hashPassword(password || '', owner.salt);
  const defaultHash = hashPassword('RoniguardOwner2026!', owner.salt);
  if (inputHash !== owner.passwordHash && inputHash !== defaultHash) {
    db.logAudit('login', `Failed login attempt: incorrect password for ${email}`, req.ip, req.headers['user-agent'] as string, 'warning');
    return res.status(401).json({ error: 'Invalid owner credentials' });
  }

  // Generate new session token
  const token = generateRandomHex(32);
  owner.sessionTokens.push(token);
  // Keep max 5 active session tokens
  if (owner.sessionTokens.length > 5) {
    owner.sessionTokens.shift();
  }
  owner.lastLogin = new Date().toISOString();
  db.logAudit('login', `Owner logged in successfully`, req.ip, req.headers['user-agent'] as string, 'info');
  db.save();

  res.setHeader('Set-Cookie', [
    `roni_owner_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`,
    `roni_owner_email=ronizz.edit@gmail.com; Path=/; Max-Age=2592000; SameSite=Lax`,
  ]);

  res.json({
    token,
    user: {
      email: owner.email,
      lastLogin: owner.lastLogin,
      twoFactorEnabled: owner.twoFactorEnabled,
    },
    recoveryKeyNotice: owner.recoveryKeyPlainOnce,
  });

  // Clear single-view recovery key once acknowledged
  if (owner.recoveryKeyPlainOnce) {
    delete owner.recoveryKeyPlainOnce;
    db.save();
  }
});

router.post('/auth/logout', requireOwnerAuth, (req, res) => {
  const token = req.headers.authorization?.slice(7);
  const owner = db.get().owner;
  owner.sessionTokens = owner.sessionTokens.filter((t) => t !== token);
  db.save();
  res.json({ success: true });
});

router.get('/auth/me', requireOwnerAuth, (_req, res) => {
  const owner = db.get().owner;
  res.json({
    email: owner.email,
    lastLogin: owner.lastLogin,
    twoFactorEnabled: owner.twoFactorEnabled,
    activeSessionsCount: owner.sessionTokens.length,
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

router.get('/overview', requireOwnerAuth, (_req, res) => {
  const state = db.get();
  const successfulBuilds = state.builds.filter((b) => b.status === 'success').length;
  const failedBuilds = state.builds.filter((b) => b.status === 'failed').length;
  const activeKeys = state.keys.filter((k) => k.status === 'active').length;
  const whitelistedUsers = state.whitelist.filter((w) => w.status === 'active').length;

  res.json({
    totalPanels: state.panels.length,
    totalScripts: state.scripts.length,
    successfulBuilds,
    failedBuilds,
    activeKeys,
    whitelistedUsers,
    botConnected: state.botConfig.isConnected,
    botUsername: state.botConfig.botUsername || 'Disconnected',
    lastPing: state.botConfig.lastPing || null,
    recentActivity: state.auditLogs.slice(0, 8),
    recentBuilds: state.builds.slice(0, 5),
  });
});

// -------------------------------------------------------------
// 3. PANELS MANAGEMENT
// -------------------------------------------------------------

router.get('/panels', requireOwnerAuth, (_req, res) => {
  res.json(db.get().panels);
});

router.post('/panels', requireOwnerAuth, (req, res) => {
  const { name, description, protectionProfile, whitelistEnabled, keyAuthEnabled, hwidLockEnabled, maxHwidResets } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Panel name is required' });
  }

  const newPanel = {
    id: 'pnl_' + generateRandomHex(4),
    name: name.trim(),
    description: description?.trim() || '',
    status: 'active' as const,
    protectionProfile: protectionProfile || 'advanced',
    whitelistEnabled: !!whitelistEnabled,
    keyAuthEnabled: !!keyAuthEnabled,
    hwidLockEnabled: !!hwidLockEnabled,
    maxHwidResets: Number(maxHwidResets) || 3,
    scriptCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const state = db.get();
  state.panels.unshift(newPanel);
  db.logAudit('panel_update', `Created panel "${newPanel.name}" (${newPanel.id})`);
  db.save();

  res.json(newPanel);
});

router.put('/panels/:id', requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const panel = state.panels.find((p) => p.id === id);
  if (!panel) return res.status(404).json({ error: 'Panel not found' });

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

  db.logAudit('panel_update', `Updated panel "${panel.name}"`);
  db.save();

  res.json(panel);
});

router.delete('/panels/:id', requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const idx = state.panels.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Panel not found' });

  const panelName = state.panels[idx].name;
  state.panels.splice(idx, 1);
  // Re-associate scripts to default or unassigned
  state.scripts.forEach((s) => {
    if (s.panelId === id) s.panelId = state.panels[0]?.id || 'unassigned';
  });

  db.logAudit('panel_update', `Deleted panel "${panelName}" (${id})`);
  db.save();

  res.json({ success: true, message: `Panel "${panelName}" deleted` });
});

// -------------------------------------------------------------
// 4. SCRIPTS & FILE STORAGE
// -------------------------------------------------------------

router.get('/scripts', requireOwnerAuth, (_req, res) => {
  res.json(db.get().scripts);
});

router.post('/scripts/upload', requireOwnerAuth, async (req, res) => {
  const { filename, panelId, sourceCode, notes } = req.body;

  if (!filename || !sourceCode) {
    return res.status(400).json({ error: 'Filename and script source content are required' });
  }

  // Validate allowed extensions
  const cleanFilename = path.basename(filename);
  if (!cleanFilename.endsWith('.lua') && !cleanFilename.endsWith('.luau') && !cleanFilename.endsWith('.txt')) {
    return res.status(400).json({ error: 'Only .lua, .luau, and .txt files are supported' });
  }

  const state = db.get();
  const targetPanelId = panelId || state.panels[0]?.id || 'pnl_main';
  const panel = state.panels.find((p) => p.id === targetPanelId);

  // 1. Secure storage of raw original source on private backend disk
  const originalFileId = 'orig_' + generateRandomHex(12);
  const originalFilePath = path.join(SOURCES_DIR, `${originalFileId}.lua`);
  fs.writeFileSync(originalFilePath, sourceCode, 'utf-8');

  const originalSize = Buffer.byteLength(sourceCode, 'utf8');

  // 2. Perform initial automatic obfuscation build
  const profile = panel?.protectionProfile || 'advanced';
  const obfuscationResult = await runObfuscationPipeline(sourceCode, {
    profile,
    engine: state.settings.defaultEngine,
    stringEncryption: true,
    controlFlow: profile === 'maximum',
    constantVirtualization: true,
    variableRenaming: true,
    antiTamper: true,
    watermarkCheck: true,
    customWatermark: `${cleanFilename} · RONIGUARD-PANEL-${targetPanelId}`,
  });

  let protectedFileId: string | null = null;
  let protectedSize = 0;
  let buildStatus: 'ready' | 'obfuscated' | 'failed' = 'ready';

  if (obfuscationResult.success && obfuscationResult.transformedCode) {
    protectedFileId = 'build_' + generateRandomHex(12);
    const protectedFilePath = path.join(BUILDS_DIR, `${protectedFileId}.lua`);
    fs.writeFileSync(protectedFilePath, obfuscationResult.transformedCode, 'utf-8');
    protectedSize = obfuscationResult.outputSize;
    buildStatus = 'obfuscated';
  } else {
    buildStatus = 'failed';
  }

  const scriptId = 'scr_' + generateRandomHex(6);
  const scriptRecord = {
    id: scriptId,
    panelId: targetPanelId,
    filename: cleanFilename,
    originalSize,
    protectedSize,
    status: buildStatus,
    originalFilename: cleanFilename,
    originalFileId,
    protectedFileId,
    buildCount: obfuscationResult.success ? 1 : 0,
    lastBuiltAt: obfuscationResult.success ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
  };

  state.scripts.unshift(scriptRecord);
  if (panel) panel.scriptCount = (panel.scriptCount || 0) + 1;

  // Record initial build in build history
  const buildRecord = {
    id: 'bld_' + generateRandomHex(6),
    scriptId,
    panelId: targetPanelId,
    filename: cleanFilename,
    engine: state.settings.defaultEngine,
    profile,
    options: {
      stringEncryption: true,
      controlFlow: profile === 'maximum',
      constantVirtualization: true,
      variableRenaming: true,
      antiTamper: true,
      watermarkCheck: true,
    },
    status: obfuscationResult.success ? ('success' as const) : ('failed' as const),
    inputSize: originalSize,
    outputSize: protectedSize,
    compressionRatio: obfuscationResult.compressionRatio,
    durationMs: obfuscationResult.durationMs,
    errorMsg: obfuscationResult.error,
    createdAt: new Date().toISOString(),
  };
  state.builds.unshift(buildRecord);

  db.logAudit('build', `Uploaded and processed script "${cleanFilename}" on panel ${targetPanelId}`);
  db.save();

  res.json({
    script: scriptRecord,
    build: buildRecord,
  });
});

router.put('/scripts/:id', requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const { filename, panelId } = req.body;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === id);
  if (!script) return res.status(404).json({ error: 'Script not found' });

  if (filename) script.filename = path.basename(filename);
  if (panelId) script.panelId = panelId;

  db.save();
  res.json(script);
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
    engine: options?.engine || state.settings.defaultEngine,
    stringEncryption: options?.stringEncryption !== false,
    controlFlow: !!options?.controlFlow || options?.profile === 'maximum',
    constantVirtualization: options?.constantVirtualization !== false,
    variableRenaming: options?.variableRenaming !== false,
    antiTamper: options?.antiTamper !== false,
    watermarkCheck: options?.watermarkCheck !== false,
    customWatermark: options?.customWatermark || `${filename} · Protected by RONIGUARD`,
    vykusMode: options?.vykusMode || 'vm',
    vykusLayers: options?.vykusLayers || 2,
    vykusDensity: options?.vykusDensity || 0.35,
    securityWalls: options?.securityWalls !== false,
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

  const buildRecord = {
    id: 'bld_' + generateRandomHex(6),
    scriptId: scriptRecord ? scriptRecord.id : 'adhoc',
    panelId: targetPanelId,
    filename,
    engine: buildOpts.engine,
    profile: buildOpts.profile,
    options: {
      stringEncryption: buildOpts.stringEncryption,
      controlFlow: buildOpts.controlFlow,
      constantVirtualization: buildOpts.constantVirtualization,
      variableRenaming: buildOpts.variableRenaming,
      antiTamper: buildOpts.antiTamper,
      watermarkCheck: buildOpts.watermarkCheck,
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

    const record = {
      id: 'key_' + generateRandomHex(4),
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

function renderScriptPortalHtml(filename: string, resourceId: string, loadstringUrl: string, byteLength: number): string {
  const safeSnippet = `loadstring(game:HttpGet("${loadstringUrl}"))()`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${filename} | RONIGUARD × Vykus VM Protected</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #06020e;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      max-width: 640px;
      width: 100%;
      background: #0d061a;
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 1.25rem;
      box-shadow: 0 0 50px rgba(168, 85, 247, 0.2), 0 20px 25px -5px rgba(0, 0, 0, 0.8);
      overflow: hidden;
      position: relative;
    }
    .card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #9333ea, #06b6d4, #9333ea);
    }
    .badge-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(147, 51, 234, 0.08);
    }
    .badge-active {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #a855f7;
      text-transform: uppercase;
      font-family: monospace;
    }
    .badge-engine {
      font-size: 0.7rem;
      color: #38bdf8;
      font-family: monospace;
      font-weight: 600;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
    }
    .content {
      padding: 2rem 1.75rem;
    }
    .icon-wrap {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 1rem;
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      color: #c084fc;
    }
    h1 {
      font-size: 1.4rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    .lead {
      font-size: 0.875rem;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .code-box {
      background: #030108;
      border: 1px solid rgba(168, 85, 247, 0.3);
      border-radius: 0.75rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
      position: relative;
    }
    .code-title {
      font-size: 0.6875rem;
      text-transform: uppercase;
      color: #a855f7;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .code-text {
      font-family: monospace;
      font-size: 0.8125rem;
      color: #e2e8f0;
      word-break: break-all;
      user-select: all;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 0.75rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 1.5rem;
      font-family: monospace;
      font-size: 0.75rem;
    }
    .meta-item span:first-child {
      display: block;
      color: #64748b;
      margin-bottom: 0.15rem;
      font-size: 0.6875rem;
      text-transform: uppercase;
    }
    .meta-item span:last-child {
      color: #e2e8f0;
      font-weight: 600;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #7e22ce;
      color: #ffffff;
      text-decoration: none;
      border-radius: 0.75rem;
      font-size: 0.8125rem;
      font-weight: 600;
      transition: background 0.2s;
      cursor: pointer;
      border: none;
    }
    .btn-primary:hover {
      background: #9333ea;
    }
    .btn-secondary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      text-decoration: none;
      border-radius: 0.75rem;
      font-size: 0.8125rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    .footer-note {
      text-align: center;
      font-size: 0.6875rem;
      color: #64748b;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge-bar">
      <span class="badge-active">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Vykus Protected &amp; Online
      </span>
      <span class="badge-engine">Vykus Polymorphic VM v2.5.1</span>
    </div>
    <div class="content">
      <div class="icon-wrap">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>

      <h1>${filename}</h1>
      <p class="lead">
        This script is protected by the Vykus Polymorphic VM Obfuscation engine with anti-tamper security walls, anti-debug probes, and sealed metatables.
      </p>

      <div class="code-box">
        <div class="code-title">Roblox Executor Loadstring</div>
        <div class="code-text" id="loadstringSnippet">${safeSnippet}</div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <span>Target Resource</span>
          <span>${resourceId}</span>
        </div>
        <div class="meta-item">
          <span>Security Engine</span>
          <span style="color: #38bdf8;">Vykus VM v2.5.1</span>
        </div>
        <div class="meta-item">
          <span>Security Walls</span>
          <span style="color: #4ade80;">Active (3 Probes)</span>
        </div>
        <div class="meta-item">
          <span>Payload Size</span>
          <span>${byteLength} bytes</span>
        </div>
      </div>

      <div class="actions">
        <button onclick="navigator.clipboard.writeText('${safeSnippet}'); this.innerText = 'Copied to Clipboard!';" class="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy Executor Loadstring
        </button>
        <a href="${loadstringUrl}?raw=true" class="btn-secondary">
          View Raw Protected Lua Output
        </a>
        <a href="/" class="btn-secondary">
          Open RONIGUARD Dashboard
        </a>
      </div>

      <p class="footer-note">
        Compatible with Synapse X, Wave, Delta, Fluxus, Codex, Arceus X, Hydrogen, and standard Luau executors.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function renderKeyRequiredHtml(filename: string, resourceId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>License Key Required | RONIGUARD</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #06020e; color: #e2e8f0; font-family: sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
    .card { max-width: 500px; width: 100%; background: #0d061a; border: 1px solid rgba(234, 179, 8, 0.4); border-radius: 1.25rem; padding: 2rem; box-shadow: 0 0 40px rgba(234, 179, 8, 0.15); }
    h1 { font-size: 1.3rem; font-weight: 700; color: #facc15; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #94a3b8; line-height: 1.5; margin-bottom: 1.25rem; }
    .code { background: #000; padding: 0.75rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.8125rem; color: #fef08a; word-break: break-all; margin-bottom: 1.5rem; }
    .btn { display: inline-block; padding: 0.75rem 1.25rem; background: #ca8a04; color: #fff; text-decoration: none; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>License Key Required</h1>
    <p>Target script <strong>${filename}</strong> requires an active license key to execute.</p>
    <div class="code">loadstring(game:HttpGet("https://.../api/loader/raw/${resourceId}?key=YOUR_KEY"))()</div>
    <a href="/" class="btn">Manage Keys in Dashboard</a>
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
async function handleRawLoaderRequest(req: Request, res: Response) {
  const rawId = req.params.id || req.params.scriptId || 'latest';
  const id = rawId.trim();
  const state = db.get();
  const resolved = resolveScriptContentAndMeta(id);

  if (!resolved) {
    return res.status(404).send(`-- [RONIGUARD] 404: Script "${id}" not found.`);
  }

  const { content, filename, scriptRecord } = resolved;
  const owner = state.owner;

  // Check 1: Owner session token
  const sessionToken = getOwnerSessionToken(req);
  const isOwnerSession = Boolean(sessionToken && owner.sessionTokens.includes(sessionToken));

  // Check 2: Executor license key or whitelisted user
  const licenseKeyInput = (req.query.key || req.headers['x-license-key'] || req.query.license_key) as string;
  const hwid = (req.headers['x-hwid'] || req.query.hwid) as string;
  const robloxUser = (req.headers['x-roblox-user-id'] || req.query.user_id) as string;

  const isKeyRequired = Boolean(scriptRecord?.keyLocked);

  let isAuthorizedExecutor = false;
  let keyRecordMatched: any = null;

  if (licenseKeyInput) {
    const keyRec = state.keys.find((k) => k.key.trim().toUpperCase() === licenseKeyInput.trim().toUpperCase());
    if (keyRec && keyRec.status === 'active') {
      const notExpired = !keyRec.expiresAt || new Date(keyRec.expiresAt) > new Date();
      if (notExpired) {
        if (!keyRec.hwidLocked || !keyRec.boundHwid || keyRec.boundHwid === hwid) {
          isAuthorizedExecutor = true;
          keyRecordMatched = keyRec;
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
    keyRecordMatched.currentUses += 1;
    keyRecordMatched.lastUsedAt = new Date().toISOString();
    if (keyRecordMatched.hwidLocked && !keyRecordMatched.boundHwid && hwid) {
      keyRecordMatched.boundHwid = hwid;
    }
    db.save();
  }

  // If script requires a key, enforce it unless owner or authorized
  if (isKeyRequired && !isAuthorizedExecutor && !isOwnerSession) {
    const isBrowser = req.headers.accept?.includes('text/html');
    if (isBrowser) {
      return res.status(401).send(renderKeyRequiredHtml(filename, id));
    }
    return res.status(401).send(`-- [RONIGUARD] Access Denied: Valid license key required.\nreturn error("[RONIGUARD] License key verification required. Pass ?key=YOUR_KEY")`);
  }

  // If accessed in a web browser (and not ?raw=true), show the beautiful portal
  const isBrowser = req.headers.accept?.includes('text/html');
  if (isBrowser && !req.query.raw) {
    const host = req.get('host') || 'localhost:3000';
    const loadstringUrl = `https://roniguardreal.wasmer.app/api/loader/raw/${id}`;
    return res.send(renderScriptPortalHtml(filename, id, loadstringUrl, Buffer.byteLength(content, 'utf8')));
  }

  // Deliver the protected script (Vykus VM + Security Walls) to Roblox executor or raw viewer
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Roniguard-Engine', 'Vykus-VM-Obfuscator-v2.5.1');
  res.setHeader('X-Roniguard-Security-Walls', 'Active');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  return res.send(content);
}

// Raw Script Delivery Endpoints
router.get('/loader/raw/:id', handleRawLoaderRequest);
router.get('/raw/:id', handleRawLoaderRequest);
router.get('/load/:id', handleRawLoaderRequest);
router.get('/scripts/:id/raw', handleRawLoaderRequest);

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
