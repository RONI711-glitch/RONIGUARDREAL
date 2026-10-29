export interface UserProfile {
  id: string;
  discordId: string;
  username: string;
  discriminator?: string;
  avatar: string | null;
  email: string | null;
  role: 'user' | 'admin';
  lastLoginAt: string;
  activeSessionsCount?: number;
}

export interface OwnerProfile {
  email: string;
  lastLogin: string | null;
  twoFactorEnabled: boolean;
  activeSessionsCount?: number;
}

export interface Panel {
  id: string;
  userId?: string;
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

export interface ScriptItem {
  id: string;
  userId?: string;
  panelId: string;
  filename: string;
  originalSize: number;
  protectedSize: number;
  status: 'ready' | 'obfuscated' | 'failed' | 'processing';
  originalFilename: string;
  originalFileId: string;
  protectedFileId: string | null;
  apiKey?: string;
  apiKeyId?: string;
  isObfuscated?: boolean;
  buildCount: number;
  lastBuiltAt: string | null;
  createdAt: string;
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

export interface LicenseItem {
  id: string;
  userId?: string;
  scriptId: string;
  scriptName?: string;
  panelId: string;
  key: string;
  type: 'lifetime' | '30d' | '7d' | '24h';
  maxUses: number;
  currentUses: number;
  hwidLocked: boolean;
  boundHwid: string | null;
  status: 'active' | 'revoked' | 'expired';
  isObfuscated?: boolean;
  loadstringUrl?: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt?: string | null;
  lastUsedAt: string | null;
}

export interface BuildHistoryItem {
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

export interface WhitelistEntry {
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

export interface LicenseKey {
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

export interface HwidBinding {
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

export interface ApiCredential {
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

export interface AuditLog {
  id: string;
  eventType: 'login' | 'source_recovery' | 'build' | 'key_gen' | 'whitelist_change' | 'hwid_reset' | 'bot_sync' | 'security_alert' | 'panel_update';
  details: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface DiscordBotStatus {
  isConnected: boolean;
  botUsername?: string;
  botAvatar?: string;
  lastPing?: number;
  lastTestedAt?: string;
  hasTokenConfigured: boolean;
  clientId: string;
  guildId: string;
  webhookConfigured: boolean;
  registeredCommands: {
    name: string;
    description: string;
    options?: string[];
    category: string;
    implementedInBot: boolean;
  }[];
}

export interface OverviewMetrics {
  totalPanels: number;
  totalScripts: number;
  successfulBuilds: number;
  failedBuilds: number;
  activeKeys: number;
  whitelistedUsers: number;
  botConnected: boolean;
  botUsername: string;
  lastPing: number | null;
  recentActivity: AuditLog[];
  recentBuilds: BuildHistoryItem[];
}

export interface SourceRecoveryItem {
  scriptId: string;
  filename: string;
  panelId: string;
  uploadDate: string;
  originalSize: number;
  sourceAvailable: boolean;
  buildCount: number;
}

export interface SystemSettings {
  projectName: string;
  defaultEngine: string;
  defaultProfile: 'basic' | 'advanced' | 'maximum';
  maxFileSizeMb: number;
  requirePasswordForSourceRecovery: boolean;
  autoPurgeBuildHistoryDays: number;
  ownerEmail: string;
}

export interface ObfuscationEngineInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  supportedProfiles: string[];
  supportedTargets: string[];
  isDefault: boolean;
}
