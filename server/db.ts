import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface UserRecord {
  id: string;
  discordId: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string | null;
  role: 'user' | 'admin';
  sessionTokens: string[];
  createdAt: string;
  lastLoginAt: string;
  masterApiKey?: string;
  monthlyObfuscations?: number;
  obfuscationMonth?: string;
}

export interface OwnerRecord {
  email: string;
  passwordHash: string;
  salt: string;
  recoveryKeyHash: string;
  recoveryKeyPlainOnce?: string;
  sessionTokens: string[];
  lastLogin: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface PanelRecord {
  id: string;
  userId: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  protectionProfile: 'basic' | 'advanced' | 'maximum';
  whitelistEnabled: boolean;
  keyAuthEnabled: boolean;
  hwidLockEnabled: boolean;
  maxHwidResets: number;
  scriptCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptRecord {
  id: string;
  userId: string;
  panelId: string;
  filename: string;
  originalSize: number;
  protectedSize: number;
  status: 'ready' | 'obfuscated' | 'failed' | 'processing';
  originalFilename: string;
  originalFileId: string;
  protectedFileId: string | null;
  apiKey: string;
  apiKeyId: string;
  isObfuscated: boolean;
  buildCount: number;
  lastBuiltAt: string | null;
  createdAt: string;
  keyLocked?: boolean;
  trialEnabled?: boolean;
  updateCount?: number;
}

export interface ScriptJobStage {
  id: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp?: string;
}

export interface ScriptJobRecord {
  id: string;
  scriptId: string;
  userId: string;
  panelId: string;
  scriptName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentStageIndex: number;
  currentStage: string;
  progressPercent: number;
  stages: ScriptJobStage[];
  obfuscationEnabled: boolean;
  apiKey?: string;
  error?: string;
  sourceCodeLength: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BuildRecord {
  id: string;
  scriptId: string;
  userId?: string;
  panelId: string;
  filename: string;
  engine: string;
  profile: 'basic' | 'advanced' | 'maximum';
  options: {
    stringEncryption: boolean;
    controlFlow: boolean;
    constantVirtualization: boolean;
    variableRenaming: boolean;
    antiTamper: boolean;
    watermarkCheck: boolean;
  };
  status: 'success' | 'failed';
  inputSize: number;
  outputSize: number;
  compressionRatio: number;
  durationMs: number;
  errorMsg?: string;
  createdAt: string;
}

export interface WhitelistRecord {
  id: string;
  userId?: string;
  panelId: string;
  platform: 'discord' | 'roblox' | 'steam' | 'custom';
  identifier: string;
  note: string;
  status: 'active' | 'suspended';
  addedAt: string;
  expiresAt?: string | null;
  lastSeenAt: string | null;
  boundHwid: string | null;
}

export interface BlacklistRecord {
  id: string;
  userId?: string;
  identifier: string;
  scriptId: string;
  reason: string;
  blacklistedBy: string;
  createdAt: string;
}

export interface KeyRecord {
  id: string;
  userId: string;
  scriptId: string;
  panelId: string;
  key: string;
  type: 'lifetime' | '30d' | '7d' | '24h';
  maxUses: number;
  currentUses: number;
  hwidLocked: boolean;
  boundHwid: string | null;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string | null;
  revokedAt?: string | null;
  lastUsedAt: string | null;
}

export interface HwidRecord {
  id: string;
  identifier: string;
  deviceLabel: string;
  hwidHash: string;
  status: 'bound' | 'revoked';
  resetCount: number;
  maxResets: number;
  lastResetAt: string | null;
  boundAt: string;
}

export interface ApiCredentialRecord {
  id: string;
  name: string;
  prefix: string;
  keyHash: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  status: 'active' | 'revoked';
  rateLimitPerMin: number;
}

export interface AuditLogRecord {
  id: string;
  eventType: 'login' | 'source_recovery' | 'build' | 'key_gen' | 'key_revoked' | 'key_regenerated' | 'key_redeem' | 'whitelist_change' | 'hwid_reset' | 'bot_sync' | 'security_alert' | 'panel_update' | 'script_process' | 'script_update';
  details: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface GuildRoleBinding {
  guildId: string;
  roleId: string;
  apiKey: string;
  scriptId?: string;
  panelId?: string;
  configuredBy: string;
  configuredAt: string;
}

export interface DiscordBotConfig {
  botToken: string;
  clientId: string;
  guildId: string;
  webhookUrl: string;
  bridgeUrl: string;
  bridgeSecret: string;
  isConnected: boolean;
  authError?: string;
  botUsername?: string;
  botAvatar?: string;
  lastPing?: number;
  lastTestedAt?: string;
  guildRoleBindings?: Record<string, GuildRoleBinding>;
  roleWhitelistRules?: Record<string, { roleId: string; roleName?: string; duration: string; expiresAt?: string | null; panelId?: string; addedAt: string; addedBy?: string }>;
  registeredCommands: {
    name: string;
    description: string;
    options?: string[];
    category: string;
    implementedInBot: boolean;
  }[];
}

export interface AntiTamperRecord {
  id: string;
  scriptId: string;
  panelId: string;
  apiKey: string;
  integrityHash: string; // SHA-256 of protected script content
  signature: string; // HMAC-SHA256 signature
  scriptLength: number;
  status: 'guaranteed' | 'tampered' | 'quarantined';
  totalVerifications: number;
  passedVerifications: number;
  failedVerifications: number;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityEventRecord {
  id: string;
  scriptId?: string;
  panelId?: string;
  apiKey?: string;
  eventType:
    | 'tamper_detected'
    | 'integrity_verified'
    | 'signature_invalid'
    | 'signature_mismatch'
    | 'content_tampered'
    | 'license_revoked'
    | 'revoked_license'
    | 'license_expired'
    | 'expired_license'
    | 'missing_license'
    | 'suspicious_request'
    | 'user_blacklisted';
  severity: 'info' | 'warning' | 'critical';
  reason: string;
  ip: string;
  userAgent?: string;
  hwid?: string;
  timestamp: string;
}

export interface RoniguardState {
  owner: OwnerRecord;
  users: UserRecord[];
  jobs: ScriptJobRecord[];
  panels: PanelRecord[];
  scripts: ScriptRecord[];
  builds: BuildRecord[];
  whitelist: WhitelistRecord[];
  blacklist: BlacklistRecord[];
  keys: KeyRecord[];
  hwidBindings: HwidRecord[];
  apiCredentials: ApiCredentialRecord[];
  auditLogs: AuditLogRecord[];
  antiTamper: AntiTamperRecord[];
  securityEvents: SecurityEventRecord[];
  botConfig: DiscordBotConfig;
  settings: {
    projectName: string;
    defaultEngine: string;
    defaultProfile: 'basic' | 'advanced' | 'maximum';
    maxFileSizeMb: number;
    requirePasswordForSourceRecovery: boolean;
    autoPurgeBuildHistoryDays: number;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'roniguard_store.json');
export const SOURCES_DIR = path.join(DATA_DIR, 'sources');
export const BUILDS_DIR = path.join(DATA_DIR, 'builds');

// Ensure storage directories exist
[DATA_DIR, SOURCES_DIR, BUILDS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function generateRandomHex(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export const SCRIPT_PROCESSING_STAGES: { id: number; name: string }[] = [
  { id: 1, name: 'Saving script configuration' },
  { id: 2, name: 'Validating submitted source' },
  { id: 3, name: 'Preparing script' },
  { id: 4, name: 'Applying RONIGUARD MAX' },
  { id: 5, name: 'Validating generated output' },
  { id: 6, name: 'Associating script with its panel' },
  { id: 7, name: 'Creating script-specific API key' },
  { id: 8, name: 'Saving final result' },
];

const LATEST_ACTIVE_TOKEN = Buffer.from('TVRVME9UZ3dORFV5T1RjM09EWTVNakl6TncuRzhjUEhULmtVcHNUNXZobHdlN2RWMTQzYndPcDl4SGpjbzNmREZnc3NiUUd3', 'base64').toString('utf8');
const envCandidate = (process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN || '').trim();
export const DEFAULT_ACTIVE_BOT_TOKEN = (envCandidate && !envCandidate.includes('GuSRGb') && !envCandidate.includes('GbPiDD'))
  ? envCandidate
  : LATEST_ACTIVE_TOKEN;
export const SERVER_HMAC_SECRET = process.env.ANTI_TAMPER_SECRET || 'RONIGUARD_SECURE_HMAC_MASTER_KEY_2026_X79';

function getDefaultState(): RoniguardState {
  const salt = generateRandomHex(16);
  const initialPassword = process.env.OWNER_INITIAL_PASSWORD || 'RoniguardOwner2026!';
  const initialRecoveryKey = 'RONI-RECOVER-' + crypto.randomBytes(8).toString('hex').toUpperCase();

  const defaultUserId = 'usr_owner';
  const defaultPanelId = 'pnl_main_' + crypto.randomBytes(4).toString('hex');
  const defaultScriptId = 'scr_main_default';
  const defaultKeyStr = 'RONI-API-DEFAULT-KEY';
  const now = new Date().toISOString();

  const sampleLua = `-- [RONIGUARD] Universal Roblox Script
print("[RONIGUARD] Executing Protected Script Payload...")
if game and game:GetService("Players") and game:GetService("Players").LocalPlayer then
    print("[RONIGUARD] Active Roblox Player: " .. tostring(game:GetService("Players").LocalPlayer.Name))
end
print("[RONIGUARD] Successfully authenticated and running!")`;

  try {
    const srcFile = path.join(SOURCES_DIR, `src_${defaultScriptId}.lua`);
    const bldFile = path.join(BUILDS_DIR, `bld_${defaultScriptId}.lua`);
    if (!fs.existsSync(srcFile)) fs.writeFileSync(srcFile, sampleLua, 'utf-8');
    if (!fs.existsSync(bldFile)) fs.writeFileSync(bldFile, sampleLua, 'utf-8');
  } catch {}

  const defaultHash = crypto.createHash('sha256').update(sampleLua).digest('hex');
  const defaultSig = crypto.createHmac('sha256', SERVER_HMAC_SECRET).update(`${defaultScriptId}:${defaultKeyStr}:${defaultHash}`).digest('hex');

  return {
    owner: {
      email: '',
      passwordHash: hashPassword(initialPassword, salt),
      salt,
      recoveryKeyHash: hashPassword(initialRecoveryKey, salt),
      recoveryKeyPlainOnce: initialRecoveryKey,
      sessionTokens: [],
      lastLogin: null,
      twoFactorEnabled: false,
      createdAt: now,
    },
    users: [
      {
        id: defaultUserId,
        discordId: '1549804529778692237',
        username: 'roniguard_owner',
        discriminator: '0',
        avatar: null,
        email: null,
        role: 'admin',
        sessionTokens: [],
        createdAt: now,
        lastLoginAt: now,
      },
    ],
    jobs: [],
    panels: [
      {
        id: defaultPanelId,
        userId: defaultUserId,
        name: 'RONIHUB PANEL',
        description: 'THE BEST FREEMIUM EVER',
        status: 'active',
        protectionProfile: 'maximum',
        whitelistEnabled: true,
        keyAuthEnabled: true,
        hwidLockEnabled: true,
        maxHwidResets: 3,
        scriptCount: 1,
        createdAt: now,
        updatedAt: now,
      },
    ],
    scripts: [
      {
        id: defaultScriptId,
        userId: defaultUserId,
        panelId: defaultPanelId,
        filename: 'main.lua',
        originalFilename: 'main.lua',
        originalFileId: `src_${defaultScriptId}`,
        protectedFileId: `bld_${defaultScriptId}`,
        originalSize: sampleLua.length,
        protectedSize: sampleLua.length,
        status: 'ready',
        apiKey: defaultKeyStr,
        apiKeyId: 'key_default',
        isObfuscated: false,
        trialEnabled: false,
        buildCount: 1,
        lastBuiltAt: now,
        createdAt: now,
      },
    ],
    builds: [],
    whitelist: [
      {
        id: 'wl_owner',
        panelId: defaultPanelId,
        platform: 'discord',
        identifier: '1549804529778692237',
        note: 'Default Owner Whitelist',
        status: 'active',
        addedAt: now,
        lastSeenAt: null,
        boundHwid: null,
      },
    ],
    blacklist: [],
    keys: [
      {
        id: 'key_default',
        userId: defaultUserId,
        scriptId: defaultScriptId,
        panelId: defaultPanelId,
        key: defaultKeyStr,
        type: 'lifetime',
        maxUses: 99999,
        currentUses: 0,
        hwidLocked: false,
        boundHwid: null,
        status: 'active',
        createdAt: now,
        expiresAt: null,
        lastUsedAt: null,
      },
    ],
    hwidBindings: [
      {
        id: 'hwid_1_' + crypto.randomBytes(4).toString('hex'),
        identifier: 'Owner Test Device',
        deviceLabel: 'Windows 11 Workstation (x86_64)',
        hwidHash: 'a7c93e41b2f09988d4c1a5b6e7f8091a',
        status: 'bound',
        resetCount: 0,
        maxResets: 5,
        lastResetAt: null,
        boundAt: now,
      },
    ],
    apiCredentials: [
      {
        id: 'api_default_' + crypto.randomBytes(4).toString('hex'),
        name: 'Discord Bot Production Bridge',
        prefix: 'roni_live_bot_',
        keyHash: crypto.createHash('sha256').update('roni_live_bot_seed_token').digest('hex'),
        scopes: ['all', 'read_scripts', 'verify_keys', 'manage_whitelist', 'bot_bridge'],
        createdAt: now,
        lastUsedAt: now,
        status: 'active',
        rateLimitPerMin: 200,
      },
    ],
    auditLogs: [
      {
        id: 'log_init_' + crypto.randomBytes(4).toString('hex'),
        eventType: 'login',
        details: 'RONIGUARD Multi-Tenant System Initialized',
        ip: '127.0.0.1',
        userAgent: 'System Boot',
        timestamp: now,
        severity: 'info',
      },
    ],
    antiTamper: [
      {
        id: 'at_default',
        scriptId: defaultScriptId,
        panelId: defaultPanelId,
        apiKey: defaultKeyStr,
        integrityHash: defaultHash,
        signature: defaultSig,
        scriptLength: sampleLua.length,
        status: 'guaranteed',
        totalVerifications: 0,
        passedVerifications: 0,
        failedVerifications: 0,
        lastVerifiedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    securityEvents: [
      {
        id: 'se_init',
        scriptId: defaultScriptId,
        panelId: defaultPanelId,
        apiKey: defaultKeyStr,
        eventType: 'integrity_verified',
        severity: 'info',
        reason: 'Automated Anti-Tamper integrity signature initialized.',
        ip: '127.0.0.1',
        timestamp: now,
      },
    ],
    botConfig: {
      botToken: DEFAULT_ACTIVE_BOT_TOKEN,
      clientId: '1549804529778692237',
      guildId: process.env.DISCORD_GUILD_ID || '',
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
      bridgeUrl: process.env.DISCORD_BRIDGE_API_URL || '',
      bridgeSecret: process.env.DISCORD_BRIDGE_SECRET || '',
      isConnected: false,
      roleWhitelistRules: {},
      registeredCommands: [
        {
          name: 'whitelistrole',
          description: 'Whitelist all members holding a role for a specified duration',
          options: ['role: role', 'time: string', 'panel_id: string?'],
          category: 'Whitelist',
          implementedInBot: true,
        },
        {
          name: 'blacklistuser',
          description: 'Blacklist a user by ID from a script or all scripts',
          options: ['user_id: string', 'script: string', 'reason: string?'],
          category: 'Security',
          implementedInBot: true,
        },
        {
          name: 'panelsetup',
          description: 'Pick and deploy one of your website panels using its website name & description',
          options: ['panel: string'],
          category: 'Panels',
          implementedInBot: true,
        },
        {
          name: 'lic',
          description: 'Configure script API key and manager role',
          options: ['api_key: string', 'role: role'],
          category: 'Licenses',
          implementedInBot: true,
        },
        {
          name: 'generatekey',
          description: 'Generate new license keys',
          options: ['type: string?', 'count: int?', 'hwid_locked: bool?'],
          category: 'Licenses',
          implementedInBot: true,
        },
        {
          name: 'whitelist',
          description: 'Manage whitelist access',
          options: ['action: string', 'discord_user: user'],
          category: 'Security',
          implementedInBot: true,
        },
        {
          name: 'hwdireset',
          description: 'Reset device HWID lock',
          options: ['target_user: user'],
          category: 'Security',
          implementedInBot: true,
        },
      ],
    },
    settings: {
      projectName: 'RONIGUARD',
      defaultEngine: 'RONIGUARD MAX',
      defaultProfile: 'maximum',
      maxFileSizeMb: 10,
      requirePasswordForSourceRecovery: true,
      autoPurgeBuildHistoryDays: 60,
    },
  };
}

class Store {
  private state: RoniguardState;
  private lastMtimeMs: number = 0;

  constructor() {
    this.state = this.load();
  }

  private load(): RoniguardState {
    try {
      if (fs.existsSync(DB_FILE)) {
        try {
          this.lastMtimeMs = fs.statSync(DB_FILE).mtimeMs;
        } catch {}
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        parsed.users = parsed.users || [];
        parsed.jobs = parsed.jobs || [];
        parsed.panels = parsed.panels || [];
        parsed.scripts = parsed.scripts || [];
        parsed.whitelist = parsed.whitelist || [];
        parsed.blacklist = parsed.blacklist || [];
        parsed.keys = parsed.keys || [];
        parsed.antiTamper = parsed.antiTamper || [];
        parsed.securityEvents = parsed.securityEvents || [];
        parsed.botConfig = parsed.botConfig || {};
        parsed.botConfig.roleWhitelistRules = parsed.botConfig.roleWhitelistRules || {};
        parsed.botConfig.botToken = DEFAULT_ACTIVE_BOT_TOKEN;
        parsed.botConfig.clientId = '1549804529778692237';

        // Filter out unwanted dummy / preview keys
        parsed.keys = parsed.keys.filter((k: KeyRecord) =>
          k.key !== 'RONI-LIFETIME-OWNER' &&
          k.key !== 'RONI-30D-PREVIEW' &&
          !k.key.includes('PREVIEW')
        );

        // Completely strip all emails across all records (zero email persistence)
        if (parsed.owner) parsed.owner.email = null;
        parsed.users.forEach((u: UserRecord) => {
          u.email = null;
          if (!u.masterApiKey) {
            u.masterApiKey = 'RONI-MASTER-' + crypto.randomBytes(8).toString('hex').toUpperCase();
          }
        });

        // Ensure default owner user exists in users table with NO email
        if (!parsed.users.some((u: UserRecord) => u.role === 'admin')) {
          parsed.users.unshift({
            id: 'usr_owner',
            discordId: '728491028374829103',
            username: 'roniguard_owner',
            discriminator: '0',
            avatar: null,
            email: null,
            role: 'admin',
            masterApiKey: 'RONI-MASTER-' + crypto.randomBytes(8).toString('hex').toUpperCase(),
            sessionTokens: [],
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          });
        }

        // Auto-seed initial panel, script, and key if database has 0 scripts
        const defaultUid = parsed.users[0]?.id || 'usr_owner';
        const nowStr = new Date().toISOString();
        if (parsed.panels.length === 0) {
          parsed.panels.push({
            id: 'pnl_main_default',
            userId: defaultUid,
            name: 'RONIHUB PANEL',
            description: 'THE BEST FREEMIUM EVER',
            status: 'active',
            protectionProfile: 'maximum',
            whitelistEnabled: true,
            keyAuthEnabled: true,
            hwidLockEnabled: true,
            maxHwidResets: 3,
            scriptCount: 1,
            createdAt: nowStr,
            updatedAt: nowStr,
          });
        }

        if (parsed.scripts.length === 0) {
          const sampleLua = `-- [RONIGUARD] Universal Roblox Script
print("[RONIGUARD] Executing Protected Script Payload...")
if game and game:GetService("Players") and game:GetService("Players").LocalPlayer then
    print("[RONIGUARD] Active Roblox Player: " .. tostring(game:GetService("Players").LocalPlayer.Name))
end
print("[RONIGUARD] Successfully authenticated and running!")`;

          try {
            const srcPath = path.join(SOURCES_DIR, 'src_scr_main_default.lua');
            const bldPath = path.join(BUILDS_DIR, 'bld_scr_main_default.lua');
            fs.writeFileSync(srcPath, sampleLua, 'utf-8');
            fs.writeFileSync(bldPath, sampleLua, 'utf-8');
          } catch {}

          parsed.scripts.push({
            id: 'scr_main_default',
            userId: defaultUid,
            panelId: parsed.panels[0].id,
            filename: 'main.lua',
            originalFilename: 'main.lua',
            originalFileId: 'src_scr_main_default',
            protectedFileId: 'bld_scr_main_default',
            originalSize: 220,
            protectedSize: 220,
            status: 'ready',
            apiKey: 'RONI-API-DEFAULT-KEY',
            apiKeyId: 'key_default',
            isObfuscated: false,
            trialEnabled: false,
            buildCount: 1,
            lastBuiltAt: nowStr,
            createdAt: nowStr,
          });
        }

        if (parsed.keys.length === 0) {
          parsed.keys.push({
            id: 'key_default',
            userId: defaultUid,
            scriptId: parsed.scripts[0].id,
            panelId: parsed.panels[0].id,
            key: 'RONI-API-DEFAULT-KEY',
            type: 'lifetime',
            maxUses: 99999,
            currentUses: 0,
            hwidLocked: false,
            boundHwid: null,
            status: 'active',
            createdAt: nowStr,
            expiresAt: null,
            lastUsedAt: null,
          });
        }

        // Migrate any panel or script without userId
        parsed.panels.forEach((p: PanelRecord) => {
          if (!p.userId) p.userId = defaultUid;
        });
        parsed.scripts.forEach((s: ScriptRecord) => {
          if (!s.userId) s.userId = defaultUid;
          if (s.isObfuscated === undefined) s.isObfuscated = true;
          // By default, trial mode is OFF unless user explicitly enabled it
          if (s.trialEnabled === undefined) s.trialEnabled = false;
        });
        parsed.keys.forEach((k: KeyRecord) => {
          if (!k.userId) k.userId = defaultUid;
          if (!k.scriptId && parsed.scripts[0]) k.scriptId = parsed.scripts[0].id;
        });

        // Ensure every existing script has an automatic Anti-Tamper signature
        if (parsed.scripts.length > 0 && parsed.antiTamper.length === 0) {
          for (const s of parsed.scripts) {
            const sampleLua = `-- [RONIGUARD] Universal Roblox Script
print("[RONIGUARD] Executing Protected Script Payload...")
if game and game:GetService("Players") and game:GetService("Players").LocalPlayer then
    print("[RONIGUARD] Active Roblox Player: " .. tostring(game:GetService("Players").LocalPlayer.Name))
end
print("[RONIGUARD] Successfully authenticated and running!")`;
            const key = s.apiKey || 'RONI-API-DEFAULT-KEY';
            const norm = sampleLua.replace(/\r\n/g, '\n').trim();
            const h = crypto.createHash('sha256').update(norm, 'utf-8').digest('hex');
            const sig = crypto.createHmac('sha256', SERVER_HMAC_SECRET).update(`${s.id}:${key}:${h}`).digest('hex');
            parsed.antiTamper.push({
              id: 'at_' + crypto.randomBytes(6).toString('hex'),
              scriptId: s.id,
              panelId: s.panelId,
              apiKey: key,
              integrityHash: h,
              signature: sig,
              scriptLength: sampleLua.length,
              status: 'guaranteed',
              totalVerifications: 1,
              passedVerifications: 1,
              failedVerifications: 0,
              lastVerifiedAt: nowStr,
              createdAt: nowStr,
              updatedAt: nowStr,
            });
          }
        }

        return parsed;
      }
    } catch (err) {
      console.error('Error loading DB file, generating default:', err);
    }
    const defaultState = getDefaultState();
    this.saveState(defaultState);
    return defaultState;
  }

  private saveState(stateToSave: RoniguardState): void {
    try {
      const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(stateToSave, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
      try {
        this.lastMtimeMs = fs.statSync(DB_FILE).mtimeMs;
      } catch {}
    } catch (err) {
      console.error('Error saving state:', err);
    }
  }

  public reloadIfNewer(): void {
    try {
      if (fs.existsSync(DB_FILE)) {
        const currentMtime = fs.statSync(DB_FILE).mtimeMs;
        if (currentMtime > this.lastMtimeMs) {
          this.state = this.load();
        }
      }
    } catch {}
  }

  public save(): void {
    this.saveState(this.state);
  }

  public get(): RoniguardState {
    return this.state;
  }

  // User Management
  public findOrCreateDiscordUser(discordUser: {
    id?: string;
    discordId?: string;
    username: string;
    discriminator?: string;
    avatar?: string | null;
    email?: string | null;
    role?: 'user' | 'admin';
  }): UserRecord {
    const dId = discordUser.discordId || discordUser.id || 'usr_discord';
    let user = this.state.users.find((u) => u.discordId === dId);
    const now = new Date().toISOString();

    let resolvedAvatar = discordUser.avatar || null;
    if (resolvedAvatar && !resolvedAvatar.startsWith('http')) {
      resolvedAvatar = `https://cdn.discordapp.com/avatars/${dId}/${resolvedAvatar}.${resolvedAvatar.startsWith('a_') ? 'gif' : 'png'}?size=256`;
    } else if (!resolvedAvatar) {
      const defaultIndex = /^\d+$/.test(dId) ? Number((BigInt(dId) >> 22n) % 6n) : 0;
      resolvedAvatar = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }

    if (!user) {
      const isOwner = dId === '728491028374829103' || discordUser.role === 'admin';

      user = {
        id: 'usr_' + dId,
        discordId: dId,
        username: discordUser.username,
        discriminator: discordUser.discriminator || '0',
        avatar: resolvedAvatar,
        email: null,
        role: discordUser.role || (isOwner ? 'admin' : 'user'),
        sessionTokens: [],
        createdAt: now,
        lastLoginAt: now,
        masterApiKey: 'RONI-MASTER-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
      };
      this.state.users.push(user);
      this.logAudit('login', `New public user registered via Discord: @${discordUser.username} (${dId})`);
    } else {
      user.username = discordUser.username;
      user.discriminator = discordUser.discriminator || user.discriminator;
      if (resolvedAvatar) user.avatar = resolvedAvatar;
      user.email = null;
      if (discordUser.role) user.role = discordUser.role;
      user.lastLoginAt = now;
      if (!user.masterApiKey) {
        user.masterApiKey = 'RONI-MASTER-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      }
    }

    this.save();
    return user;
  }

  public getUserBySessionToken(token: string): UserRecord | null {
    if (!token) return null;
    let user = this.state.users.find((u) => u.sessionTokens && u.sessionTokens.includes(token));
    if (!user) {
      this.state = this.load();
      user = this.state.users.find((u) => u.sessionTokens && u.sessionTokens.includes(token));
    }
    if (user) {
      user.email = null;
      if (!user.masterApiKey) {
        user.masterApiKey = 'RONI-MASTER-' + crypto.randomBytes(6).toString('hex').toUpperCase();
        this.save();
      }
      return user;
    }

    // Check owner fallback
    if (this.state.owner.sessionTokens && this.state.owner.sessionTokens.includes(token)) {
      let ownerUser = this.state.users.find((u) => u.role === 'admin');
      if (!ownerUser) {
        ownerUser = this.findOrCreateDiscordUser({
          id: '728491028374829103',
          username: 'roniguard_owner',
        });
      }
      ownerUser.email = null;
      if (!ownerUser.masterApiKey) {
        ownerUser.masterApiKey = 'RONI-MASTER-' + crypto.randomBytes(6).toString('hex').toUpperCase();
        this.save();
      }
      return ownerUser;
    }
    return null;
  }

  public getUserById(userId: string): UserRecord | undefined {
    const user = this.state.users.find((u) => u.id === userId || u.discordId === userId);
    if (user && !user.masterApiKey) {
      user.masterApiKey = 'RONI-MASTER-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      this.save();
    }
    return user;
  }

  public resetUserMasterApiKey(userId: string): string {
    const user = this.state.users.find((u) => u.id === userId || u.discordId === userId);
    if (!user) {
      throw new Error('User account not found');
    }
    const newKey = 'RONI-MASTER-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    user.masterApiKey = newKey;
    this.save();
    return newKey;
  }

  // Job Management
  public createJob(data: {
    scriptId: string;
    userId: string;
    panelId: string;
    scriptName: string;
    obfuscationEnabled: boolean;
    sourceCodeLength: number;
    apiKey?: string;
  }): ScriptJobRecord {
    const now = new Date().toISOString();
    const job: ScriptJobRecord = {
      id: 'job_' + generateRandomHex(8),
      scriptId: data.scriptId,
      userId: data.userId,
      panelId: data.panelId,
      scriptName: data.scriptName,
      status: 'processing',
      currentStageIndex: 0,
      currentStage: SCRIPT_PROCESSING_STAGES[0].name,
      progressPercent: 10,
      stages: SCRIPT_PROCESSING_STAGES.map((s, idx) => ({
        id: s.id,
        name: s.name,
        status: idx === 0 ? 'in_progress' : 'pending',
        timestamp: idx === 0 ? now : undefined,
      })),
      obfuscationEnabled: data.obfuscationEnabled,
      sourceCodeLength: data.sourceCodeLength,
      apiKey: data.apiKey,
      createdAt: now,
      updatedAt: now,
    };

    this.state.jobs.unshift(job);
    // Keep max 200 jobs
    if (this.state.jobs.length > 200) {
      this.state.jobs = this.state.jobs.slice(0, 200);
    }
    this.save();
    return job;
  }

  public getJob(jobId: string): ScriptJobRecord | undefined {
    return this.state.jobs.find((j) => j.id === jobId);
  }

  public updateJob(jobId: string, updates: Partial<ScriptJobRecord>): ScriptJobRecord | undefined {
    const job = this.state.jobs.find((j) => j.id === jobId);
    if (!job) return undefined;
    Object.assign(job, updates);
    job.updatedAt = new Date().toISOString();
    this.save();
    return job;
  }

  public getUserQuotas(userId: string) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const user = this.state.users.find((u) => u.id === userId || u.discordId === userId);
    const monthlyObf = (user?.obfuscationMonth === currentMonth ? user.monthlyObfuscations : 0) || 0;

    const panelsCount = this.state.panels.filter((p) => p.userId === userId).length;
    const scriptsCount = this.state.scripts.filter((s) => s.userId === userId).length;
    const keysCount = this.state.keys.filter((k) => k.userId === userId).length;
    const whitelistCount = this.state.whitelist.filter((w) => w.userId === userId).length;
    const totalKeysAndWhitelist = keysCount + whitelistCount;

    return {
      monthlyObfuscations: { current: monthlyObf, max: 15 },
      panels: { current: panelsCount, max: 5 },
      scripts: { current: scriptsCount, max: 10 },
      keysAndWhitelist: { current: totalKeysAndWhitelist, max: 1000 },
      maxScriptUpdates: 10,
    };
  }

  public checkAndIncrementMonthlyObfuscation(user: UserRecord): { allowed: boolean; current: number; max: number } {
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (user.obfuscationMonth !== currentMonth) {
      user.obfuscationMonth = currentMonth;
      user.monthlyObfuscations = 0;
    }
    const current = user.monthlyObfuscations || 0;
    const max = 15;
    if (user.role !== 'admin' && current >= max) {
      return { allowed: false, current, max };
    }
    user.monthlyObfuscations = current + 1;
    this.save();
    return { allowed: true, current: user.monthlyObfuscations, max };
  }

  public logAudit(
    eventType: AuditLogRecord['eventType'],
    details: string,
    ip = '127.0.0.1',
    userAgent = 'RONIGUARD Web',
    severity: AuditLogRecord['severity'] = 'info'
  ): void {
    const entry: AuditLogRecord = {
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      eventType,
      details,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      severity,
    };
    this.state.auditLogs.unshift(entry);
    if (this.state.auditLogs.length > 1000) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 1000);
    }
    this.save();
  }

  // --- AUTOMATIC ANTI-TAMPER SECURITY ENGINE ---
  public computeIntegritySignature(scriptId: string, apiKey: string, scriptContent: string): { hash: string; signature: string } {
    const normalized = scriptContent.replace(/\r\n/g, '\n').trim();
    const hash = crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex');
    const signature = crypto.createHmac('sha256', SERVER_HMAC_SECRET)
      .update(`${scriptId}:${apiKey}:${hash}`)
      .digest('hex');
    return { hash, signature };
  }

  public registerAntiTamper(data: {
    scriptId: string;
    panelId: string;
    apiKey: string;
    scriptContent: string;
  }): AntiTamperRecord {
    const { hash, signature } = this.computeIntegritySignature(data.scriptId, data.apiKey, data.scriptContent);
    const now = new Date().toISOString();

    let record = this.state.antiTamper.find((r) => r.scriptId === data.scriptId);
    if (record) {
      record.panelId = data.panelId;
      record.apiKey = data.apiKey;
      record.integrityHash = hash;
      record.signature = signature;
      record.scriptLength = data.scriptContent.length;
      record.status = 'guaranteed';
      record.updatedAt = now;
    } else {
      record = {
        id: 'at_' + crypto.randomBytes(6).toString('hex'),
        scriptId: data.scriptId,
        panelId: data.panelId,
        apiKey: data.apiKey,
        integrityHash: hash,
        signature,
        scriptLength: data.scriptContent.length,
        status: 'guaranteed',
        totalVerifications: 0,
        passedVerifications: 0,
        failedVerifications: 0,
        lastVerifiedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.state.antiTamper.unshift(record);
    }

    this.logSecurityEvent({
      scriptId: data.scriptId,
      panelId: data.panelId,
      apiKey: data.apiKey,
      eventType: 'integrity_verified',
      severity: 'info',
      reason: `Automated Anti-Tamper signature generated and registered (SHA-256: ${hash.slice(0, 12)}...)`,
    });

    this.save();
    return record;
  }

  public logSecurityEvent(data: {
    scriptId?: string;
    panelId?: string;
    apiKey?: string;
    eventType: SecurityEventRecord['eventType'];
    severity: SecurityEventRecord['severity'];
    reason: string;
    ip?: string;
    hwid?: string;
  }): SecurityEventRecord {
    const entry: SecurityEventRecord = {
      id: 'se_' + crypto.randomBytes(6).toString('hex'),
      scriptId: data.scriptId,
      panelId: data.panelId,
      apiKey: data.apiKey,
      eventType: data.eventType,
      severity: data.severity,
      reason: data.reason,
      ip: data.ip || '127.0.0.1',
      hwid: data.hwid,
      timestamp: new Date().toISOString(),
    };
    this.state.securityEvents.unshift(entry);
    if (this.state.securityEvents.length > 500) {
      this.state.securityEvents = this.state.securityEvents.slice(0, 500);
    }
    this.save();
    return entry;
  }

  public verifyAntiTamper(data: {
    scriptId: string;
    apiKey: string;
    clientHash?: string;
    signature?: string;
    hwid?: string;
    ip?: string;
  }): { verified: boolean; error?: string; reason?: string; record?: AntiTamperRecord } {
    const record = this.state.antiTamper.find((r) => r.scriptId === data.scriptId);
    const ip = data.ip || '127.0.0.1';

    if (!record) {
      this.logSecurityEvent({
        scriptId: data.scriptId,
        apiKey: data.apiKey,
        eventType: 'signature_mismatch',
        severity: 'critical',
        reason: 'Verification rejected: No registered Anti-Tamper signature exists for this script.',
        ip,
        hwid: data.hwid,
      });
      return { verified: false, error: 'NO_SIGNATURE_REGISTERED', reason: 'Script integrity signature not found on server.' };
    }

    record.totalVerifications++;

    // 1. Check if script is quarantined
    if (record.status === 'quarantined') {
      record.failedVerifications++;
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: 'tamper_detected',
        severity: 'critical',
        reason: 'Verification rejected: Script has been placed in quarantine by security policy.',
        ip,
        hwid: data.hwid,
      });
      this.save();
      return { verified: false, error: 'SCRIPT_QUARANTINED', reason: 'Script is currently quarantined.' };
    }

    // Check blacklist before proceeding
    const blHwid = data.hwid ? this.isUserBlacklisted(data.hwid, data.scriptId) : { blacklisted: false };
    if (blHwid.blacklisted) {
      record.failedVerifications++;
      record.status = 'tampered';
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: 'user_blacklisted',
        severity: 'critical',
        reason: `Verification rejected: Hardware ID (${data.hwid}) is blacklisted by administrator.`,
        ip,
        hwid: data.hwid,
      });
      this.save();
      return { verified: false, error: 'USER_BLACKLISTED', reason: 'You have been blacklisted from this script by the owner.' };
    }

    // 2. License check
    const keyRecord = this.state.keys.find((k) => k.key === data.apiKey);
    if (!keyRecord) {
      record.failedVerifications++;
      record.status = 'tampered';
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: 'missing_license',
        severity: 'warning',
        reason: 'Verification rejected: API key / License not found.',
        ip,
        hwid: data.hwid,
      });
      this.save();
      return { verified: false, error: 'INVALID_LICENSE', reason: 'License key does not exist.' };
    }

    if (keyRecord.status === 'revoked') {
      record.failedVerifications++;
      record.status = 'tampered';
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: 'revoked_license',
        severity: 'critical',
        reason: `Verification rejected: License status is ${keyRecord.status}.`,
        ip,
        hwid: data.hwid,
      });
      this.save();
      return { verified: false, error: 'LICENSE_REVOKED', reason: 'License key has been revoked.' };
    }

    if (keyRecord.status === 'expired' || (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date())) {
      record.failedVerifications++;
      record.status = 'tampered';
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: 'expired_license',
        severity: 'warning',
        reason: 'Verification rejected: License key has expired.',
        ip,
        hwid: data.hwid,
      });
      this.save();
      return { verified: false, error: 'LICENSE_EXPIRED', reason: 'License key has expired.' };
    }

    // Check script association
    if (keyRecord.scriptId && keyRecord.scriptId !== data.scriptId) {
      record.failedVerifications++;
      record.status = 'tampered';
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: 'tamper_detected',
        severity: 'critical',
        reason: 'Verification rejected: License key belongs to a different script.',
        ip,
        hwid: data.hwid,
      });
      this.save();
      return { verified: false, error: 'UNAUTHORIZED_SCRIPT', reason: 'License key is not authorized for this script.' };
    }

    // 3. Signature verification
    if (data.signature && data.signature !== record.signature) {
      record.failedVerifications++;
      record.status = 'tampered';
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: 'signature_mismatch',
        severity: 'critical',
        reason: 'Verification rejected: HMAC integrity signature mismatch (tampering detected).',
        ip,
        hwid: data.hwid,
      });
      this.save();
      return { verified: false, error: 'SIGNATURE_MISMATCH', reason: 'Integrity signature mismatch. Code modification detected.' };
    }

    // 4. Hash verification if provided by client
    if (data.clientHash && data.clientHash !== record.integrityHash) {
      record.failedVerifications++;
      record.status = 'tampered';
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: 'content_tampered',
        severity: 'critical',
        reason: 'Verification rejected: Client script content SHA-256 hash does not match server signature.',
        ip,
        hwid: data.hwid,
      });
      this.save();
      return { verified: false, error: 'CONTENT_TAMPERED', reason: 'Script payload has been altered or decrypted.' };
    }

    // 5. HWID lock check if key is locked
    if (keyRecord.hwidLocked) {
      if (!data.hwid) {
        record.failedVerifications++;
        this.logSecurityEvent({
          scriptId: data.scriptId,
          panelId: record.panelId,
          apiKey: data.apiKey,
          eventType: 'suspicious_request',
          severity: 'warning',
          reason: 'Verification rejected: HWID required but not provided.',
          ip,
        });
        this.save();
        return { verified: false, error: 'HWID_REQUIRED', reason: 'Hardware ID is required for this license.' };
      }
      if (keyRecord.boundHwid && keyRecord.boundHwid !== data.hwid) {
        record.failedVerifications++;
        this.logSecurityEvent({
          scriptId: data.scriptId,
          panelId: record.panelId,
          apiKey: data.apiKey,
          eventType: 'suspicious_request',
          severity: 'critical',
          reason: 'Verification rejected: Hardware ID does not match bound device.',
          ip,
          hwid: data.hwid,
        });
        this.save();
        return { verified: false, error: 'HWID_MISMATCH', reason: 'Hardware ID does not match registered device.' };
      }
      if (!keyRecord.boundHwid) {
        keyRecord.boundHwid = data.hwid;
      }
    }

    // All checks passed!
    record.passedVerifications++;
    record.lastVerifiedAt = new Date().toISOString();
    record.status = 'guaranteed';
    keyRecord.currentUses++;
    keyRecord.lastUsedAt = new Date().toISOString();

    this.logSecurityEvent({
      scriptId: data.scriptId,
      panelId: record.panelId,
      apiKey: data.apiKey,
      eventType: 'integrity_verified',
      severity: 'info',
      reason: 'Automated Anti-Tamper verification successful. Integrity guaranteed.',
      ip,
      hwid: data.hwid,
    });

    this.save();
    return { verified: true, record };
  }

  public getAntiTamperOverview() {
    const records = this.state.antiTamper || [];
    const events = this.state.securityEvents || [];

    const totalProtected = records.length;
    const guaranteedCount = records.filter((r) => r.status === 'guaranteed').length;
    const tamperedCount = records.filter((r) => r.status === 'tampered').length;
    const quarantinedCount = records.filter((r) => r.status === 'quarantined').length;

    let totalVerifications = 0;
    let passedVerifications = 0;
    let failedVerifications = 0;

    for (const r of records) {
      totalVerifications += r.totalVerifications || 0;
      passedVerifications += r.passedVerifications || 0;
      failedVerifications += r.failedVerifications || 0;
    }

    return {
      totalProtected,
      guaranteedCount,
      tamperedCount,
      quarantinedCount,
      totalVerifications,
      passedVerifications,
      failedVerifications,
      records: records.slice(0, 50),
      recentEvents: events.slice(0, 50),
    };
  }

  public quarantineScript(scriptId: string, reason = 'Administrative quarantine'): boolean {
    const record = this.state.antiTamper.find((r) => r.scriptId === scriptId);
    if (!record) return false;
    record.status = 'quarantined';
    record.updatedAt = new Date().toISOString();
    this.logSecurityEvent({
      scriptId,
      panelId: record.panelId,
      apiKey: record.apiKey,
      eventType: 'suspicious_request',
      severity: 'critical',
      reason: `Script placed in quarantine: ${reason}`,
    });
    this.save();
    return true;
  }

  public reverifyScript(scriptId: string): { success: boolean; message: string; record?: AntiTamperRecord } {
    const script = this.state.scripts.find((s) => s.id === scriptId);
    if (!script) return { success: false, message: 'Script not found' };

    let content = '';
    try {
      const bldPath = path.join(BUILDS_DIR, `${script.protectedFileId}.lua`);
      if (fs.existsSync(bldPath)) {
        content = fs.readFileSync(bldPath, 'utf-8');
      } else {
        const srcPath = path.join(SOURCES_DIR, `${script.originalFileId}.lua`);
        if (fs.existsSync(srcPath)) content = fs.readFileSync(srcPath, 'utf-8');
      }
    } catch (e: any) {
      return { success: false, message: 'Could not read script payload: ' + e.message };
    }

    if (!content) {
      return { success: false, message: 'Script file content is empty' };
    }

    const key = script.apiKey || 'RONI-API-DEFAULT-KEY';
    const record = this.registerAntiTamper({
      scriptId: script.id,
      panelId: script.panelId,
      apiKey: key,
      scriptContent: content,
    });

    return { success: true, message: 'Script integrity re-computed and guaranteed.', record };
  }

  // --- BLACKLIST & ROLE WHITELIST MANAGEMENT ---
  public isUserBlacklisted(
    identifier?: string,
    scriptId?: string
  ): { blacklisted: boolean; record?: BlacklistRecord } {
    if (!identifier) return { blacklisted: false };
    const cleanId = identifier.trim().toLowerCase().replace(/^<@!?/, '').replace(/>$/, '');
    const record = (this.state.blacklist || []).find((b) => {
      const matchId =
        b.identifier.toLowerCase() === cleanId ||
        (b.userId && b.userId.toLowerCase() === cleanId);
      if (!matchId) return false;
      if (!scriptId || b.scriptId === '*' || b.scriptId === scriptId) {
        return true;
      }
      return false;
    });
    return { blacklisted: !!record, record };
  }

  public blacklistUser(data: {
    identifier: string;
    scriptId?: string;
    reason?: string;
    blacklistedBy?: string;
    userId?: string;
  }): BlacklistRecord {
    this.state.blacklist = this.state.blacklist || [];
    const cleanId = data.identifier.trim().replace(/^<@!?/, '').replace(/>$/, '');
    const scriptId = data.scriptId || '*';
    const reason = data.reason || 'Blacklisted by administrator';
    const blacklistedBy = data.blacklistedBy || 'admin';
    const now = new Date().toISOString();

    let existing = this.state.blacklist.find(
      (b) => b.identifier.toLowerCase() === cleanId.toLowerCase() && b.scriptId === scriptId
    );
    if (!existing) {
      existing = {
        id: 'bl_' + crypto.randomBytes(6).toString('hex'),
        userId: data.userId,
        identifier: cleanId,
        scriptId,
        reason,
        blacklistedBy,
        createdAt: now,
      };
      this.state.blacklist.unshift(existing);
    } else {
      existing.reason = reason;
      existing.blacklistedBy = blacklistedBy;
    }

    // Automatically revoke any active keys associated with this identifier/user
    this.state.keys.forEach((k) => {
      if (k.userId === cleanId || k.boundHwid === cleanId) {
        if (!scriptId || scriptId === '*' || k.scriptId === scriptId) {
          k.status = 'revoked';
          k.revokedAt = now;
        }
      }
    });

    // Remove user from active whitelist for this script
    this.state.whitelist = this.state.whitelist.filter((w) => {
      if (w.identifier.toLowerCase() === cleanId.toLowerCase()) {
        if (!scriptId || scriptId === '*' || w.panelId === scriptId) {
          return false;
        }
      }
      return true;
    });

    this.logSecurityEvent({
      scriptId: scriptId !== '*' ? scriptId : undefined,
      eventType: 'user_blacklisted',
      severity: 'critical',
      reason: `Target ${cleanId} blacklisted from script ${scriptId}: ${reason}`,
    });

    this.save();
    return existing;
  }

  public removeBlacklist(identifier: string, scriptId?: string): boolean {
    this.state.blacklist = this.state.blacklist || [];
    const cleanId = identifier.trim().toLowerCase().replace(/^<@!?/, '').replace(/>$/, '');
    const initialLen = this.state.blacklist.length;
    this.state.blacklist = this.state.blacklist.filter((b) => {
      if (b.identifier.toLowerCase() === cleanId) {
        if (!scriptId || b.scriptId === '*' || b.scriptId === scriptId) {
          return false;
        }
      }
      return true;
    });
    const changed = this.state.blacklist.length !== initialLen;
    if (changed) this.save();
    return changed;
  }

  public getBlacklist(scriptId?: string): BlacklistRecord[] {
    this.state.blacklist = this.state.blacklist || [];
    if (!scriptId) return this.state.blacklist;
    return this.state.blacklist.filter(
      (b) => b.scriptId === '*' || b.scriptId === scriptId
    );
  }

  public whitelistRole(data: {
    guildId: string;
    roleId: string;
    roleName: string;
    duration: string;
    panelId?: string;
    addedBy?: string;
  }): { rule: any; count: number } {
    let expiresAt: string | null = null;
    const now = new Date();
    const dur = data.duration.toLowerCase();
    if (dur.includes('24h') || dur.includes('1d') || dur.includes('day')) {
      expiresAt = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
    } else if (dur.includes('7d') || dur.includes('week')) {
      expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();
    } else if (dur.includes('30d') || dur.includes('month')) {
      expiresAt = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
    } // otherwise lifetime: null

    this.state.botConfig.roleWhitelistRules = this.state.botConfig.roleWhitelistRules || {};
    const rule = {
      roleId: data.roleId,
      roleName: data.roleName,
      duration: data.duration,
      expiresAt,
      panelId: data.panelId,
      addedAt: now.toISOString(),
      addedBy: data.addedBy || 'admin',
    };
    this.state.botConfig.roleWhitelistRules[data.roleId] = rule;
    this.save();
    return { rule, count: 1 };
  }

  public isRoleWhitelisted(roleIds: string[], scriptId?: string, panelId?: string): boolean {
    const rules = this.state.botConfig.roleWhitelistRules || {};
    const now = new Date();
    for (const rId of roleIds) {
      const rule = rules[rId];
      if (rule) {
        if (rule.expiresAt && new Date(rule.expiresAt) < now) {
          continue; // expired
        }
        if (rule.panelId && panelId && rule.panelId !== panelId) {
          continue;
        }
        return true;
      }
    }
    return false;
  }
}

export const db = new Store();
