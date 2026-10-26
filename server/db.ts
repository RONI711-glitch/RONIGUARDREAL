import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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
  panelId: string;
  filename: string;
  originalSize: number;
  protectedSize: number;
  status: 'ready' | 'obfuscated' | 'failed';
  originalFilename: string;
  originalFileId: string;
  protectedFileId: string | null;
  buildCount: number;
  lastBuiltAt: string | null;
  createdAt: string;
}

export interface BuildRecord {
  id: string;
  scriptId: string;
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
  panelId: string;
  scriptId?: string;
  key: string;
  type: 'lifetime' | '30d' | '7d' | '24h';
  maxUses: number;
  currentUses: number;
  hwidLocked: boolean;
  boundHwid: string | null;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string | null;
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
  eventType: 'login' | 'source_recovery' | 'build' | 'key_gen' | 'whitelist_change' | 'hwid_reset' | 'bot_sync' | 'security_alert' | 'panel_update';
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

function getDefaultState(): RoniguardState {
  const salt = generateRandomHex(16);
  const initialPassword = process.env.OWNER_INITIAL_PASSWORD || 'RoniguardOwner2026!';
  const initialRecoveryKey = 'RONI-RECOVER-' + crypto.randomBytes(8).toString('hex').toUpperCase();

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
    panels: [
      {
        id: defaultPanelId,
        name: 'Prime Suite Core',
        description: 'Main production scripts protection suite with Discord bot synchronization.',
        status: 'active',
        protectionProfile: 'advanced',
        whitelistEnabled: true,
        keyAuthEnabled: true,
        hwidLockEnabled: true,
        maxHwidResets: 3,
        scriptCount: 1,
        createdAt: now,
        updatedAt: now,
      },
    ],
    scripts: [],
    builds: [],
    whitelist: [
      {
        id: 'wl_owner_' + crypto.randomBytes(4).toString('hex'),
        panelId: defaultPanelId,
        platform: 'discord',
        identifier: '728491028374829103',
        note: 'Primary Owner Discord ID',
        status: 'active',
        addedAt: now,
        lastSeenAt: now,
        boundHwid: 'HWID_HWID_7b19a42f5e',
      },
    ],
    keys: [
      {
        id: 'key_master_' + crypto.randomBytes(4).toString('hex'),
        panelId: defaultPanelId,
        key: 'RONI-VVIP-2026-X892',
        type: 'lifetime',
        maxUses: 1,
        currentUses: 0,
        hwidLocked: true,
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
        scopes: ['bot:sync', 'whitelist:read', 'whitelist:write', 'keys:validate', 'hwid:reset'],
        createdAt: now,
        lastUsedAt: null,
        status: 'active',
        rateLimitPerMin: 120,
      },
    ],
    auditLogs: [
      {
        id: 'log_init_' + crypto.randomBytes(4).toString('hex'),
        eventType: 'security_alert',
        details: 'RONIGUARD initialized for owner ronizz.edit@gmail.com with secure zero-leak storage.',
        ip: '127.0.0.1',
        userAgent: 'RONIGUARD System Core',
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
          name: 'whitelist add',
          description: 'Add a user (Discord ID or Roblox ID) to a panel whitelist',
          options: ['user: string', 'panel: string?'],
          category: 'Access Management',
          implementedInBot: true,
        },
        {
          name: 'whitelist remove',
          description: 'Revoke access for a user from a panel whitelist',
          options: ['user: string'],
          category: 'Access Management',
          implementedInBot: true,
        },
        {
          name: 'whitelist check',
          description: 'Check active whitelist and HWID status for a user',
          options: ['user: string'],
          category: 'Access Management',
          implementedInBot: true,
        },
        {
          name: 'key generate',
          description: 'Generate a new unique cryptographically verified license key',
          options: ['type: lifetime | 30d | 7d', 'panel: string?'],
          category: 'License Keys',
          implementedInBot: true,
        },
        {
          name: 'key redeem',
          description: 'Redeem an active license key for a user and bind HWID',
          options: ['key: string', 'user: string'],
          category: 'License Keys',
          implementedInBot: true,
        },
        {
          name: 'hwid reset',
          description: 'Reset device HWID lock for a user within allowed quota',
          options: ['user: string'],
          category: 'Hardware Lock',
          implementedInBot: true,
        },
        {
          name: 'script get',
          description: 'Fetch the protected loader or download output for an authorized user',
          options: ['panel: string', 'format: loader | bytecode'],
          category: 'Script Distribution',
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
      defaultEngine: 'Vykus-VM-Obfuscator',
      defaultProfile: 'advanced',
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
        // Ensure owner email is always the configured owner identity
        parsed.owner.email = 'ronizz.edit@gmail.com';
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
    // Keep max 1000 logs
    if (this.state.auditLogs.length > 1000) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 1000);
    }
    this.save();
  }
}

export const db = new Store();
