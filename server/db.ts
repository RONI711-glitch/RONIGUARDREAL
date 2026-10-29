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
  lastSeenAt: string | null;
  boundHwid: string | null;
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

export interface DiscordBotConfig {
  botToken: string;
  clientId: string;
  guildId: string;
  webhookUrl: string;
  bridgeUrl: string;
  bridgeSecret: string;
  isConnected: boolean;
  botUsername?: string;
  botAvatar?: string;
  lastPing?: number;
  lastTestedAt?: string;
  registeredCommands: {
    name: string;
    description: string;
    options?: string[];
    category: string;
    implementedInBot: boolean;
  }[];
}

export interface RoniguardState {
  owner: OwnerRecord;
  users: UserRecord[];
  jobs: ScriptJobRecord[];
  panels: PanelRecord[];
  scripts: ScriptRecord[];
  builds: BuildRecord[];
  whitelist: WhitelistRecord[];
  keys: KeyRecord[];
  hwidBindings: HwidRecord[];
  apiCredentials: ApiCredentialRecord[];
  auditLogs: AuditLogRecord[];
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

function getDefaultState(): RoniguardState {
  const salt = generateRandomHex(16);
  const initialPassword = process.env.OWNER_INITIAL_PASSWORD || 'RoniguardOwner2026!';
  const initialRecoveryKey = 'RONI-RECOVER-' + crypto.randomBytes(8).toString('hex').toUpperCase();

  const defaultUserId = 'usr_owner';
  const defaultPanelId = 'pnl_main_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();

  return {
    owner: {
      email: 'ronizz.edit@gmail.com',
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
        discordId: '728491028374829103',
        username: 'roniguard_owner',
        discriminator: '0',
        avatar: null,
        email: 'ronizz.edit@gmail.com',
        role: 'admin',
        sessionTokens: [],
        createdAt: now,
        lastLoginAt: now,
      },
    ],
    jobs: [],
    panels: [],
    scripts: [],
    builds: [],
    whitelist: [],
    keys: [],
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
    botConfig: {
      botToken: process.env.DISCORD_BOT_TOKEN || '',
      clientId: process.env.DISCORD_CLIENT_ID || '',
      guildId: process.env.DISCORD_GUILD_ID || '',
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
      bridgeUrl: process.env.DISCORD_BRIDGE_API_URL || '',
      bridgeSecret: process.env.DISCORD_BRIDGE_SECRET || '',
      isConnected: false,
      registeredCommands: [
        {
          name: 'panelsetup',
          description: 'Set up or configure a security panel for your Discord scripts',
          options: ['name: string?'],
          category: 'Panels',
          implementedInBot: true,
        },
        {
          name: 'lic',
          description: 'Manage and verify script-specific API keys',
          options: ['action: check | info | revoke | list', 'target: string?'],
          category: 'Licenses',
          implementedInBot: true,
        },
        {
          name: 'status',
          description: 'Display bot connection health, active builds, and key stats',
          options: [],
          category: 'Diagnostics',
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

  constructor() {
    this.state = this.load();
  }

  private load(): RoniguardState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        parsed.users = parsed.users || [];
        parsed.jobs = parsed.jobs || [];
        parsed.panels = parsed.panels || [];
        parsed.scripts = parsed.scripts || [];
        parsed.keys = parsed.keys || [];

        // Ensure default owner user exists in users table
        if (!parsed.users.some((u: UserRecord) => u.role === 'admin')) {
          parsed.users.unshift({
            id: 'usr_owner',
            discordId: '728491028374829103',
            username: 'roniguard_owner',
            discriminator: '0',
            avatar: null,
            email: 'ronizz.edit@gmail.com',
            role: 'admin',
            sessionTokens: [],
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          });
        }

        // Migrate any panel or script without userId
        const defaultUid = parsed.users[0]?.id || 'usr_owner';
        parsed.panels.forEach((p: PanelRecord) => {
          if (!p.userId) p.userId = defaultUid;
        });
        parsed.scripts.forEach((s: ScriptRecord) => {
          if (!s.userId) s.userId = defaultUid;
          if (s.isObfuscated === undefined) s.isObfuscated = true;
        });
        parsed.keys.forEach((k: KeyRecord) => {
          if (!k.userId) k.userId = defaultUid;
          if (!k.scriptId && parsed.scripts[0]) k.scriptId = parsed.scripts[0].id;
        });

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
    } catch (err) {
      console.error('Error saving state:', err);
    }
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

    if (!user) {
      const isOwner =
        dId === '728491028374829103' ||
        discordUser.role === 'admin' ||
        discordUser.email === 'ronizz.edit@gmail.com' ||
        discordUser.email === 'ronihub02@gmail.com' ||
        this.state.users.length === 0;

      user = {
        id: 'usr_' + dId,
        discordId: dId,
        username: discordUser.username,
        discriminator: discordUser.discriminator || '0',
        avatar: discordUser.avatar || null,
        email: discordUser.email || null,
        role: discordUser.role || (isOwner ? 'admin' : 'user'),
        sessionTokens: [],
        createdAt: now,
        lastLoginAt: now,
      };
      this.state.users.push(user);
      this.logAudit('login', `New public user registered via Discord: @${discordUser.username} (${dId})`);
    } else {
      user.username = discordUser.username;
      user.discriminator = discordUser.discriminator || user.discriminator;
      if (discordUser.avatar !== undefined) user.avatar = discordUser.avatar;
      if (discordUser.email) user.email = discordUser.email;
      if (discordUser.role) user.role = discordUser.role;
      user.lastLoginAt = now;
    }

    this.save();
    return user;
  }

  public getUserBySessionToken(token: string): UserRecord | null {
    if (!token) return null;
    const user = this.state.users.find((u) => u.sessionTokens && u.sessionTokens.includes(token));
    if (user) return user;

    // Check owner fallback
    if (this.state.owner.sessionTokens && this.state.owner.sessionTokens.includes(token)) {
      let ownerUser = this.state.users.find((u) => u.role === 'admin');
      if (!ownerUser) {
        ownerUser = this.findOrCreateDiscordUser({
          id: '728491028374829103',
          username: 'roniguard_owner',
          email: 'ronizz.edit@gmail.com',
        });
      }
      return ownerUser;
    }
    return null;
  }

  public getUserById(userId: string): UserRecord | undefined {
    return this.state.users.find((u) => u.id === userId || u.discordId === userId);
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
}

export const db = new Store();
