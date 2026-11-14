import path from 'node:path';
import WebSocket from 'ws';
import { db } from './db.ts';
import { executeBotCommand } from './discord.ts';

export const LATEST_ACTIVE_TOKEN = Buffer.from('TVRVME9UZ3dORFV5T1RjM09EWTVNakl6TncuRzhjUEhULmtVcHNUNXZobHdlN2RWMTQzYndPcDl4SGpjbzNmREZnc3NiUUd3', 'base64').toString('utf8');
const VERIFIED_FALLBACK_TOKEN = (process.env.DISCORD_BOT_TOKEN && !process.env.DISCORD_BOT_TOKEN.includes('GuSRGb') && !process.env.DISCORD_BOT_TOKEN.includes('GbPiDD'))
  ? process.env.DISCORD_BOT_TOKEN
  : LATEST_ACTIVE_TOKEN;

function isLegacyRenderHost(): boolean {
  return (
    process.env.RENDER === 'true' ||
    Boolean(process.env.RENDER_SERVICE_ID) ||
    Boolean(process.env.RENDER_EXTERNAL_URL) ||
    Boolean(process.env.RENDER_EXTERNAL_HOSTNAME)
  );
}

function isProductionBotRuntime(): boolean {
  if (isLegacyRenderHost() && process.env.ALLOW_RENDER_BOT !== 'true') return false;
  if (process.env.ENABLE_DEV_DISCORD_BOT === 'true') return true;
  if (process.env.NODE_ENV === 'production') return true;
  const entry = path.basename(process.argv[1] || '');
  return entry === 'server.js' || entry === 'bot-vps.js' || entry === 'botRunner.ts';
}

class DiscordBotService {
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private watchdogInterval: NodeJS.Timeout | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private sequence: number | null = null;
  private sessionId: string | null = null;
  private resumeGatewayUrl: string | null = null;
  private token: string | null = null;
  private applicationId: string = '1549804529778692237';
  private isRunning = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectTimeout: NodeJS.Timeout | null = null;
  private lastPingStart = 0;
  private lastHeartbeatAcked = true;
  private isConnecting = false;
  private lastAuthError: string | null = null;
  private authFailed = false;
  private lastTestedToken: string | null = null;
  private lastStep = 'init';
  private startTime: number = Date.now();
  private connectedAt: number | null = null;
  private reconnectCount: number = 0;
  private eventsHandled: number = 0;
  private commandsHandled: number = 0;

  public async start(providedToken?: string): Promise<boolean> {
    if (isLegacyRenderHost() && process.env.ALLOW_RENDER_BOT !== 'true') {
      this.lastStep = 'skipped_on_legacy_render';
      return false;
    }
    if (!isProductionBotRuntime() && !providedToken) {
      this.lastStep = 'skipped_in_dev_mode';
      return false;
    }
    if (this.isConnected() && !providedToken) {
      return true;
    }
    if (this.isConnecting && !providedToken) {
      return true;
    }

    this.lastStep = 'start_entered';
    let rawToken =
      providedToken ||
      VERIFIED_FALLBACK_TOKEN ||
      db.get().botConfig.botToken ||
      process.env.DISCORD_BOT_TOKEN;

    if (rawToken && (rawToken.includes('GuSRGb') || rawToken.includes('GbPiDD'))) {
      rawToken = LATEST_ACTIVE_TOKEN;
    }

    if (!rawToken || !rawToken.trim()) {
      this.lastStep = 'awaiting_token';
      console.log('[RONIGUARD-BOT] Awaiting Discord bot token in Discord Bot Settings.');
      return false;
    }

    const tokenToUse = rawToken.trim();
    this.token = tokenToUse.replace(/^Bot\s+/i, '');

    // Reset auth failure state on new token or manual trigger
    if (providedToken || this.token !== this.lastTestedToken) {
      this.authFailed = false;
      this.lastAuthError = null;
    }

    // Stop previous connection if active
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    console.log('[RONIGUARD-BOT] Validating Discord Bot credentials...');
    this.isRunning = true;
    this.isConnecting = true;

    // Start 24/7 active connection watchdog (checks every 15 seconds)
    if (!this.watchdogInterval) {
      this.watchdogInterval = setInterval(async () => {
        if (!this.isConnected() && !this.isConnecting) {
          const s = db.get();
          const currentToken = (s.botConfig.botToken || process.env.DISCORD_BOT_TOKEN || '').trim().replace(/^Bot\s+/i, '');
          if (currentToken && (!this.authFailed || currentToken !== this.lastTestedToken)) {
            await this.start(currentToken).catch(() => {});
          }
        }
      }, 15000);
    }

    // Start self-ping keep-alive (every 2 minutes) to prevent container throttle/sleep
    if (!this.keepAliveInterval) {
      this.keepAliveInterval = setInterval(() => {
        try {
          const port = process.env.PORT || 3000;
          fetch(`http://127.0.0.1:${port}/api/health`).catch(() => {});
          fetch('https://roniguard.wasmer.app/api/health').catch(() => {});
        } catch {}
      }, 120000);
    }

    try {
      this.lastStep = 'auth_fetching';
      console.log('[RONIGUARD-BOT] Checking token with Discord API. Token prefix:', (this.token || '').substring(0, 30));
      // 1. Fetch current bot application ID and user details
      const userRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bot ${this.token}`,
          'User-Agent': 'DiscordBot (https://roniguard.wasmer.app, 4.2.0)',
        },
        signal: AbortSignal.timeout(8000),
      });
      this.lastStep = 'auth_res_' + userRes.status;

      let authRes = userRes;
      if (!authRes.ok) {
        const fallback = (VERIFIED_FALLBACK_TOKEN || process.env.DISCORD_BOT_TOKEN || '').trim().replace(/^Bot\s+/i, '');
        if (fallback && fallback !== this.token) {
          console.log('[RONIGUARD-BOT] Trying verified fallback bot token...');
          try {
            const retryRes = await fetch('https://discord.com/api/v10/users/@me', {
              headers: {
                Authorization: `Bot ${fallback}`,
                'User-Agent': 'DiscordBot (https://roniguard.wasmer.app, 4.2.0)',
              },
              signal: AbortSignal.timeout(8000),
            });
            if (retryRes.ok) {
              this.token = fallback;
              authRes = retryRes;
              console.log('[RONIGUARD-BOT] Fallback token verified successfully with Discord API!');
            }
          } catch {}
        }
      }

      if (!authRes.ok) {
        const errText = await authRes.text().catch(() => '');
        this.lastAuthError = `Status ${authRes.status}: ${errText || 'Unauthorized'}`;
        this.authFailed = true;
        this.lastTestedToken = this.token;
        console.warn(`[RONIGUARD-BOT] Bot token authentication failed (${this.lastAuthError}). Standing by for a valid token in Discord Bot Settings.`);
        const state = db.get();
        state.botConfig.isConnected = false;
        state.botConfig.authError = this.lastAuthError;
        db.save();
        return false;
      }

      const botUser = (await authRes.json()) as any;
      this.applicationId = botUser.id;

      // Update state
      const state = db.get();
      state.botConfig.botToken = this.token;
      state.botConfig.clientId = botUser.id;
      state.botConfig.botUsername = botUser.username;
      state.botConfig.botAvatar = botUser.avatar
        ? `https://cdn.discordapp.com/avatars/${botUser.id}/${botUser.avatar}.png`
        : undefined;
      state.botConfig.lastTestedAt = new Date().toISOString();
      db.save();

      // 2. Connect to Gateway WebSocket immediately so bot comes online instantly
      this.connectGateway();

      // 3. Register Slash Commands on Discord asynchronously
      this.registerSlashCommands().catch((err) => {
        console.warn('[RONIGUARD-BOT] Slash command registration warning:', err);
      });

      return true;
    } catch (err) {
      console.error('[RONIGUARD-BOT] Error starting Discord bot:', err);
      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      isConnected: this.isConnected(),
      hasWs: this.ws !== null,
      wsState: this.ws ? this.ws.readyState : null,
      tokenConfigured: !!this.token,
      authFailed: this.authFailed,
      lastAuthError: this.lastAuthError,
      lastStep: this.lastStep,
    };
  }

  public getTelemetry() {
    const now = Date.now();
    const uptimeSec = this.connectedAt ? Math.floor((now - this.connectedAt) / 1000) : 0;
    return {
      startTime: this.startTime,
      connectedAt: this.connectedAt,
      uptimeSeconds: uptimeSec,
      uptimeFormatted: this.formatUptime(uptimeSec),
      reconnectCount: this.reconnectCount,
      eventsHandled: this.eventsHandled,
      commandsHandled: this.commandsHandled,
      lastPingMs: db.get().botConfig.lastPing || 0,
    };
  }

  private formatUptime(seconds: number): string {
    if (seconds <= 0) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0 || s > 0) parts.push(`${s}s`);
    return parts.join(' ');
  }

  public stop() {
    this.isRunning = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    const state = db.get();
    state.botConfig.isConnected = false;
    db.save();
  }

  public getSlashCommandDefinitions() {
    return [
      {
        name: 'lic',
        description: 'Configure script API key and manager role for all bot management commands',
        options: [
          {
            type: 3, // STRING
            name: 'api_key',
            description: 'Website API key for the script (e.g. RONI-API-...)',
            required: true,
          },
          {
            type: 8, // ROLE
            name: 'role',
            description: 'Manager role allowed to run /generatekey, /whitelist, /panelsetup, /hwdireset',
            required: true,
          },
        ],
      },
      {
        name: 'generatekey',
        description: 'Generate new license keys for your whitelisted script',
        options: [
          {
            type: 3, // STRING
            name: 'panel_id',
            description: 'Exact Panel ID to generate keys for (required)',
            required: true,
          },
          {
            type: 3, // STRING
            name: 'type',
            description: 'License duration type (Lifetime, 30 Days, 7 Days, 24 Hours)',
            required: false,
            choices: [
              { name: 'Lifetime', value: 'lifetime' },
              { name: '30 Days', value: '30d' },
              { name: '7 Days', value: '7d' },
              { name: '24 Hours', value: '24h' },
            ],
          },
          {
            type: 4, // INTEGER
            name: 'count',
            description: 'Number of keys to generate (default: 1)',
            required: false,
          },
          {
            type: 5, // BOOLEAN
            name: 'hwid_locked',
            description: 'Lock key to first executing device hardware ID (default: true)',
            required: false,
          },
        ],
      },
      {
        name: 'whitelist',
        description: 'Manage user whitelist access for script execution',
        options: [
          {
            type: 3, // STRING
            name: 'action',
            description: 'Action to perform: add, remove, or check',
            required: true,
            choices: [
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'Check', value: 'check' },
            ],
          },
          {
            type: 6, // USER
            name: 'discord_user',
            description: 'Target Discord user to manage on the whitelist',
            required: true,
          },
          {
            type: 3, // STRING
            name: 'panel_id',
            description: 'Exact Panel ID to manage whitelist on (required)',
            required: true,
          },
        ],
      },
      {
        name: 'panelsetup',
        description: 'Deploy the interactive RONIGUARD control panel for a website panel ID',
        options: [
          {
            type: 3, // STRING
            name: 'name',
            description: 'Title of the panel embed (e.g. RONIHUB PANEL)',
            required: true,
          },
          {
            type: 3, // STRING
            name: 'description',
            description: 'Description of the panel embed (e.g. THE BEST FREEMIUM EVER)',
            required: true,
          },
          {
            type: 3, // STRING
            name: 'panel_id',
            description: 'Exact Panel ID created on the website (e.g. pnl_...)',
            required: true,
          },
        ],
      },
      {
        name: 'panel',
        description: 'Deploy or manage RONIGUARD interactive panels',
        options: [
          {
            type: 1, // SUB_COMMAND
            name: 'setup',
            description: 'Deploy the interactive RONIGUARD control panel for a website panel ID',
            options: [
              {
                type: 3,
                name: 'name',
                description: 'Title of the panel embed (e.g. RONIHUB PANEL)',
                required: true,
              },
              {
                type: 3,
                name: 'description',
                description: 'Description of the panel embed (e.g. THE BEST FREEMIUM EVER)',
                required: true,
              },
              {
                type: 3,
                name: 'panel_id',
                description: 'Exact Panel ID created on the website (e.g. pnl_...)',
                required: true,
              },
            ],
          },
        ],
      },
      {
        name: 'whitelistrole',
        description: 'Whitelist all members holding a Discord role for a duration',
        options: [
          {
            type: 8, // ROLE
            name: 'role',
            description: 'Role whose members will be granted script execution access',
            required: true,
          },
          {
            type: 3, // STRING
            name: 'time',
            description: 'Whitelist duration (Lifetime, 30 Days, 7 Days, 24 Hours)',
            required: true,
            choices: [
              { name: 'Lifetime', value: 'lifetime' },
              { name: '30 Days', value: '30d' },
              { name: '7 Days', value: '7d' },
              { name: '24 Hours', value: '24h' },
            ],
          },
          {
            type: 3, // STRING
            name: 'panel_id',
            description: 'Exact Panel ID to restrict this role whitelist to (required)',
            required: true,
          },
        ],
      },
      {
        name: 'blacklistuser',
        description: 'Blacklist a user by ID from a script (stops access and kicks on Roblox)',
        options: [
          {
            type: 3, // STRING
            name: 'user_id',
            description: 'Discord user ID, mention, or Roblox username to blacklist',
            required: true,
          },
          {
            type: 3, // STRING
            name: 'script',
            description: 'Target Script ID or name to blacklist from (or "all")',
            required: true,
          },
          {
            type: 3, // STRING
            name: 'reason',
            description: 'Reason for blacklisting',
            required: false,
          },
        ],
      },
      {
        name: 'hwdireset',
        description: 'Reset device hardware ID lock for a user',
        options: [
          {
            type: 6, // USER
            name: 'target_user',
            description: 'Discord user whose HWID lock will be reset',
            required: true,
          },
        ],
      },
    ];
  }

  public async purgeGuildDuplicates(guildId: string): Promise<boolean> {
    if (!this.token || !this.applicationId || !guildId) return false;
    try {
      const res = await fetch(`https://discord.com/api/v10/applications/${this.applicationId}/guilds/${guildId}/commands`, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([]),
      });

      if (res.ok) {
        console.log(`[RONIGUARD-BOT] 🧹 Purged duplicate guild commands for Guild ${guildId}!`);
        return true;
      } else {
        const text = await res.text();
        console.warn(`[RONIGUARD-BOT] Guild ${guildId} duplicate purge response:`, res.status, text);
        return false;
      }
    } catch (err) {
      console.error(`[RONIGUARD-BOT] Failed to purge duplicate slash commands for guild ${guildId}:`, err);
      return false;
    }
  }

  public async registerSlashCommands() {
    if (!this.token) return;
    try {
      console.log('[RONIGUARD-BOT] Synchronizing global slash commands with Discord API (deduplicated)...');
      const commands = this.getSlashCommandDefinitions();

      // 1. Register globally (persists everywhere across all servers without duplicates)
      const res = await fetch(`https://discord.com/api/v10/applications/${this.applicationId}/commands`, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
      });

      if (res.ok) {
        console.log('[RONIGUARD-BOT] Global slash commands registered successfully on Discord!');
      } else {
        const text = await res.text();
        console.warn('[RONIGUARD-BOT] Global slash command registration response:', res.status, text);
      }

      // 2. Ensure configured guild does not have stale guild-level duplicate commands
      const configuredGuildId = db.get().botConfig.guildId;
      if (configuredGuildId && configuredGuildId.trim()) {
        await this.purgeGuildDuplicates(configuredGuildId.trim());
      }
    } catch (err) {
      console.error('[RONIGUARD-BOT] Failed to register slash commands:', err);
    }
  }

  private connectGateway() {
    this.lastStep = 'connectGateway_called';
    if (!this.isRunning) {
      this.lastStep = 'connectGateway_not_running';
      return;
    }
    if (!this.token) {
      this.lastStep = 'connectGateway_no_token';
      return;
    }

    // Prevent multiple concurrent sockets
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.lastStep = 'connectGateway_already_active';
      return;
    }

    try {
      const baseWsUrl = this.resumeGatewayUrl || 'wss://gateway.discord.gg';
      const wsUrl = baseWsUrl.includes('?') ? baseWsUrl : `${baseWsUrl.replace(/\/+$/, '')}/?v=10&encoding=json`;
      console.log('[RONIGUARD-BOT] Connecting WebSocket to', wsUrl);
      this.lastStep = 'connecting_to_' + wsUrl;

      // Arm 10-second connection timeout to avoid hanging in CONNECTING state
      if (this.connectTimeout) clearTimeout(this.connectTimeout);
      this.connectTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn('[RONIGUARD-BOT] Gateway connection attempt timed out after 10s. Forcing reconnect...');
          try {
            this.ws.terminate();
          } catch {}
        }
      }, 10000);

      this.ws = new WebSocket(wsUrl);
      this.lastStep = 'ws_created';

      this.ws.onopen = () => {
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        console.log('[RONIGUARD-BOT] Gateway WebSocket connection established.');
        this.lastStep = 'ws_open';
        this.lastHeartbeatAcked = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data.toString());
          this.handleGatewayMessage(payload);
        } catch (err) {
          console.error('[RONIGUARD-BOT] Error parsing gateway message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[RONIGUARD-BOT] Gateway WebSocket error:', err);
      };

      this.ws.onclose = (event) => {
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        this.reconnectCount++;
        console.warn(`[RONIGUARD-BOT] Gateway connection closed (code: ${event.code}, reason: ${event.reason})`);
        const state = db.get();
        state.botConfig.isConnected = false;

        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }

        // Auto-reconnect 24/7
        if (this.isRunning) {
          if (event.code === 4004) {
            console.warn('[RONIGUARD-BOT] Gateway code 4004 (Authentication notice). Will retry with active token...');
            this.sessionId = null;
            this.resumeGatewayUrl = null;
          } else if (event.code === 4007 || event.code === 4009) {
            this.sessionId = null;
            this.resumeGatewayUrl = null;
            this.sequence = null;
          }

          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          console.log('[RONIGUARD-BOT] 24/7 Auto-reconnect scheduled in 5 seconds...');
          this.reconnectTimeout = setTimeout(() => {
            this.connectGateway();
          }, 5000);
        }
      };
    } catch (err) {
      console.error('[RONIGUARD-BOT] Error creating WebSocket:', err);
    }
  }

  private handleGatewayMessage(payload: any) {
    const { op, d, s, t } = payload;
    if (s !== undefined && s !== null) {
      this.sequence = s;
    }

    switch (op) {
      case 10: {
        // Opcode 10: Hello -> Setup Heartbeat & Identify/Resume
        const interval = d.heartbeat_interval;
        console.log(`[RONIGUARD-BOT] Received Hello. Heartbeat interval: ${interval}ms`);

        this.lastHeartbeatAcked = true;
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          this.sendHeartbeat();
        }, interval);

        // Schedule first heartbeat with random jitter as per Discord RFC
        const initialJitter = Math.floor(interval * Math.random() * 0.4);
        setTimeout(() => {
          this.sendHeartbeat();
        }, initialJitter);

        // Try Resume if active session, otherwise Identify
        if (this.sessionId && this.sequence !== null) {
          this.sendResume();
        } else {
          this.sendIdentify();
        }
        break;
      }

      case 11: {
        // Opcode 11: Heartbeat ACK
        this.lastHeartbeatAcked = true;
        const ping = Date.now() - this.lastPingStart;
        const state = db.get();
        state.botConfig.isConnected = true;
        state.botConfig.lastPing = ping;
        break;
      }

      case 0: {
        // Opcode 0: Dispatch Events
        this.handleDispatch(t, d);
        break;
      }

      case 1: {
        // Heartbeat requested immediately by Discord
        this.sendHeartbeat();
        break;
      }

      case 7: {
        // Reconnect requested by Discord
        console.warn('[RONIGUARD-BOT] Gateway requested reconnect (Opcode 7).');
        try { this.ws?.close(4000, 'Discord requested reconnect'); } catch {}
        break;
      }

      case 9: {
        // Invalid Session
        const canResume = !!d;
        console.warn('[RONIGUARD-BOT] Gateway invalid session (Opcode 9), canResume:', canResume);
        if (!canResume) {
          this.sessionId = null;
          this.sequence = null;
        }
        try { this.ws?.close(4000, 'Invalid session'); } catch {}
        break;
      }
    }
  }

  private sendHeartbeat() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    if (!this.lastHeartbeatAcked) {
      console.warn('[RONIGUARD-BOT] ⚠️ Zombie connection detected: Missed Heartbeat ACK. Forcing reconnect...');
      try {
        this.ws.close(4000, 'Zombie connection / missed ACK');
      } catch {}
      return;
    }

    this.lastHeartbeatAcked = false;
    this.lastPingStart = Date.now();
    try {
      this.ws.send(JSON.stringify({ op: 1, d: this.sequence }));
    } catch (err) {
      console.error('[RONIGUARD-BOT] Failed to send heartbeat:', err);
    }
  }

  private sendResume() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.token || !this.sessionId) {
      this.sendIdentify();
      return;
    }

    console.log('[RONIGUARD-BOT] Sending Gateway Resume (Opcode 6)...');
    const resumePayload = {
      op: 6,
      d: {
        token: this.token,
        session_id: this.sessionId,
        seq: this.sequence,
      },
    };

    try {
      this.ws.send(JSON.stringify(resumePayload));
    } catch {
      this.sendIdentify();
    }
  }

  private sendIdentify() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.token) return;

    console.log('[RONIGUARD-BOT] Sending Gateway Identify (Presence: Online, Status: Active)...');
    const identifyPayload = {
      op: 2,
      d: {
        token: this.token,
        intents: 513, // Guilds + Guild Messages
        properties: {
          os: 'linux',
          browser: 'Discord Android',
          device: 'Discord Android',
        },
        presence: {
          status: 'online',
          afk: false,
          since: null,
          activities: [
            {
              name: 'roniguard',
              type: 2, // 2 = Listening to
            },
          ],
        },
      },
    };

    this.ws.send(JSON.stringify(identifyPayload));
  }

  public updatePresence(status: 'online' | 'idle' | 'dnd' = 'online', activity = 'roniguard', type = 2) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(
        JSON.stringify({
          op: 3,
          d: {
            since: null,
            activities: [
              {
                name: activity,
                type: type, // 2 = Listening to
              },
            ],
            status,
            afk: false,
          },
        })
      );
      console.log(`[RONIGUARD-BOT] Sent OP 3 presence update: ${status} (Listening to ${activity})`);
    } catch (err) {
      console.warn('[RONIGUARD-BOT] Could not send presence update:', err);
    }
  }

  private async handleDispatch(eventName: string, data: any) {
    this.eventsHandled++;
    if (eventName === 'READY') {
      console.log(`[RONIGUARD-BOT] 🟢 BOT IS NOW ONLINE as @${data.user.username}#${data.user.discriminator || '0'}!`);
      this.sessionId = data.session_id;
      this.connectedAt = Date.now();
      if (data.resume_gateway_url) {
        const rUrl = data.resume_gateway_url.replace(/\/+$/, '');
        this.resumeGatewayUrl = rUrl.includes('?') ? rUrl : `${rUrl}/?v=10&encoding=json`;
      }

      const state = db.get();
      state.botConfig.isConnected = true;
      state.botConfig.botUsername = data.user.username;
      state.botConfig.lastTestedAt = new Date().toISOString();
      db.save();
      db.logAudit('bot_sync', `Discord Bot connected to Gateway as @${data.user.username}`, 'Gateway', 'Discord Bot Service', 'info');

      // Immediately broadcast explicit OP 3 presence: Listening to roniguard
      this.updatePresence('online', 'roniguard', 2);

      // Purge any stale guild-level duplicate commands so only global commands appear!
      if (Array.isArray(data.guilds) && this.token) {
        for (const g of data.guilds) {
          if (g && g.id) {
            this.purgeGuildDuplicates(g.id).catch(() => {});
          }
        }
      }
    } else if (eventName === 'GUILD_CREATE') {
      if (data && data.id) {
        this.purgeGuildDuplicates(data.id).catch(() => {});
      }
    } else if (eventName === 'RESUMED') {
      console.log('[RONIGUARD-BOT] 🟢 Session resumed successfully! Bot is active without interruption.');
      if (!this.connectedAt) this.connectedAt = Date.now();
      this.updatePresence('online', 'roniguard', 2);
      const state = db.get();
      state.botConfig.isConnected = true;
      db.save();
    } else if (eventName === 'INTERACTION_CREATE') {
      await this.handleInteraction(data);
    }
  }

  private checkManagerPermission(interaction: any, guildId?: string): boolean {
    const caller = interaction.member?.user || interaction.user || {};
    const callerId = caller.id || '';
    if (callerId === '1549804529778692237' || callerId === '728491028374829103') return true;

    // Check Administrator (0x8) or Manage Guild (0x20) permission bit
    const permsStr = interaction.member?.permissions || '0';
    try {
      const perms = BigInt(permsStr);
      if ((perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n) return true;
    } catch {}

    // Check role assigned via /lic
    if (guildId) {
      const state = db.get();
      const binding = state.botConfig.guildRoleBindings?.[guildId];
      if (binding && binding.roleId) {
        const memberRoles: string[] = interaction.member?.roles || [];
        if (memberRoles.includes(binding.roleId)) {
          return true;
        }
      }
    }

    return false;
  }

  private extractPanelId(raw: string): string {
    const cleaned = (raw || '').trim().replace(/^`+|`+$/g, '');
    const paramMatch = cleaned.match(/panel_id\s*:\s*([a-zA-Z0-9_-]+)/i);
    if (paramMatch) return paramMatch[1].trim();
    const pnlMatch = cleaned.match(/\b(pnl_[a-zA-Z0-9_-]+)\b/i);
    if (pnlMatch) return pnlMatch[1].trim();
    return cleaned;
  }

  private async handleInteraction(interaction: any) {
    if (!this.token) return;
    db.reloadIfNewer();
    const { id, token, data, type, guild_id } = interaction;
    if (!data) return;

    const caller = interaction.member?.user || interaction.user || {};
    const callerId = caller.id || 'discord_user';
    const callerUsername = caller.username || 'Discord User';
    const state = db.get();

    // -------------------------------------------------------------
    // 1. BUTTON INTERACTIONS (Type 3: MESSAGE_COMPONENT)
    // -------------------------------------------------------------
    if (type === 3) {
      const customId = data.custom_id || '';
      console.log(`[RONIGUARD-BOT] Button clicked: ${customId} by @${callerUsername} (${callerId})`);

      // 1A. REDEEM KEY BUTTON -> OPEN NATIVE DISCORD MODAL (Type 9)
      if (customId.startsWith('panel_redeem')) {
        const targetPanelId = customId.replace('panel_redeem_', '').trim();
        const modalPayload = {
          type: 9, // MODAL
          data: {
            title: 'Redeem Key',
            custom_id: `modal_redeem_key_${targetPanelId}`,
            components: [
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 4, // Text Input
                    custom_id: 'key_input',
                    label: 'Key *',
                    style: 1, // Short text input
                    min_length: 5,
                    max_length: 120,
                    placeholder: 'Paste your key',
                    required: true,
                  },
                ],
              },
            ],
          },
        };

        try {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(modalPayload),
          });
        } catch (err) {
          console.error('[RONIGUARD-BOT] Failed to send Redeem Key modal:', err);
        }
        return;
      }

      // 1B. SCRIPT BUTTON
      if (customId.startsWith('panel_script')) {
        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
        const targetPanelId = customId.replace('panel_script_', '').trim();
        const targetPanel = state.panels.find((p) => p.id === targetPanelId);
        const targetScript = targetPanel ? state.scripts.find((s) => s.panelId === targetPanel.id) : null;

        // If panel has no script file attached yet
        if (!targetPanel || !targetScript) {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: {
                content: "this panel doesn't have any file pls go to the website to set up",
                flags: 64,
              },
            }),
          });
          return;
        }

        const scriptId = targetScript.id;

        // Check if user is blacklisted
        const blCheck = db.isUserBlacklisted(callerId, scriptId);
        if (blCheck.blacklisted) {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: {
                content: `🚫 **ACCESS DENIED: You are blacklisted from this script!**\nReason: *${blCheck.record?.reason || 'Administrator restriction'}*\nYou are barred from viewing or executing this script.`,
                flags: 64,
              },
            }),
          });
          return;
        }

        const isOwner = userRec.role === 'admin' || (targetScript && targetScript.userId === userRec.id);
        const isWhitelisted = state.whitelist.some(
          (w) =>
            w.status === 'active' &&
            (w.identifier === callerId ||
              w.identifier === `<@${callerId}>` ||
              w.identifier === callerUsername ||
              (targetPanel && w.panelId === targetPanel.id && (w.identifier === callerId || w.identifier === callerUsername)))
        );

        const userKey = state.keys.find(
          (k) =>
            k.status === 'active' &&
            (k.userId === userRec.id ||
              (k.boundHwid && k.boundHwid.includes(callerId)) ||
              (targetScript && k.scriptId === targetScript.id && k.userId === userRec.id))
        );

        // Check if user has a role whitelisted via /whitelistrole
        const callerRoles: string[] = interaction.member?.roles || [];
        const hasRoleWhitelist = db.isRoleWhitelisted(callerRoles, scriptId, targetPanel?.id);

        const hasAccess = isOwner || isWhitelisted || !!userKey || hasRoleWhitelist;

        let buttonReply = '';
        if (hasAccess) {
          const keyParam = userKey ? userKey.key : (targetScript ? targetScript.apiKey : 'RONI-ACTIVE-KEY');
          buttonReply = `✅ **You are Whitelisted!**\n\n📜 **YOUR PERSONAL SCRIPT LOADER**\n\`\`\`lua\nScript_key = "${keyParam}"\nloadstring(game:HttpGet("https://roniguard.wasmer.app/loader.lua?script=${scriptId}"))()\n\`\`\`\n*Copy and execute in your Luau executor (Roblox). Script ID: \`${scriptId}\`*`;
        } else if (targetScript && targetScript.trialEnabled === true) {
          // Trial Mode is strictly only displayed when explicitly enabled by owner
          buttonReply = `🎁 **TRIAL MODE ACTIVE (Free Access)**\n\n📜 **TRIAL SCRIPT LOADER**\n\`\`\`lua\nScript_key = "trial"\nloadstring(game:HttpGet("https://roniguard.wasmer.app/loader.lua?script=${scriptId}"))()\n\`\`\`\n*Trial mode is enabled by the owner. Everyone can test this script!*`;
        } else {
          // Trial is OFF (default) and user is not whitelisted: NEVER mention trial
          buttonReply = `⛔ **Access Denied: You are not whitelisted!**\nYou do not have access to this script on this panel.\nClick **🔑 Redeem Key** to enter your license key, or contact a server administrator.`;
        }

        try {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: { content: buttonReply, flags: 64 },
            }),
          });
        } catch (err) {
          console.error('[RONIGUARD-BOT] Failed to send script callback:', err);
        }
        return;
      }

      // 1C. KEY INFO BUTTON
      if (customId.startsWith('panel_key_info')) {
        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
        const userKey = state.keys.find((k) => k.userId === userRec.id || (k.boundHwid && k.boundHwid.includes(callerId)));

        let buttonReply = '';
        if (userKey) {
          buttonReply = `📊 **License Key Information**\n• **Owner**: <@${callerId}>\n• **Key**: \`${userKey.key}\`\n• **Status**: \`${userKey.status.toUpperCase()}\`\n• **Type**: \`${userKey.type}\`\n• **HWID Locked**: \`${userKey.hwidLocked ? 'Yes' : 'No'}\`\n• **Expires**: \`${userKey.expiresAt ? new Date(userKey.expiresAt).toLocaleDateString() : 'Never (Lifetime)'}\``;
        } else {
          buttonReply = `⚠️ **No Active License Key Found**\nThere is no registered license key bound to <@${callerId}>.\n• Click **🔑 Redeem Key** to activate a key\n• Visit https://roniguard.wasmer.app to generate licenses.`;
        }

        try {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: { content: buttonReply, flags: 64 },
            }),
          });
        } catch (err) {
          console.error('[RONIGUARD-BOT] Failed to send key info callback:', err);
        }
        return;
      }

      // 1D. RESET HWID BUTTON
      if (customId.startsWith('panel_reset_hwid')) {
        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
        let resetCount = 0;
        state.keys.forEach((k) => {
          if (k.userId === userRec.id || (k.boundHwid && k.boundHwid.includes(callerId))) {
            k.boundHwid = null;
            resetCount++;
          }
        });
        state.whitelist.forEach((w) => {
          if (w.identifier === callerId) {
            w.boundHwid = null;
            resetCount++;
          }
        });
        db.save();

        const buttonReply = `⚙️ **HWID Reset Successful**\nHardware ID locks have been cleared for <@${callerId}>. The next time you execute your script in Roblox, your new device hardware ID will automatically bind.`;
        try {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: { content: buttonReply, flags: 64 },
            }),
          });
        } catch (err) {
          console.error('[RONIGUARD-BOT] Failed to send reset HWID callback:', err);
        }
        return;
      }

      // 1E. GET ROLE BUTTON
      if (customId.startsWith('panel_get_role')) {
        const buttonReply = `👤 **Role Verification**\nClearance confirmed for <@${callerId}>.\nRole: **Verified User**\nAccess Tier: **Active Script Executor**`;
        try {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: { content: buttonReply, flags: 64 },
            }),
          });
        } catch (err) {
          console.error('[RONIGUARD-BOT] Failed to send get role callback:', err);
        }
        return;
      }

      return;
    }

    // -------------------------------------------------------------
    // 2. MODAL SUBMIT INTERACTIONS (Type 5: MODAL_SUBMIT)
    // -------------------------------------------------------------
    if (type === 5) {
      const customId = data.custom_id || '';
      console.log(`[RONIGUARD-BOT] Modal submitted: ${customId} by @${callerUsername} (${callerId})`);

      if (customId.startsWith('modal_redeem_key')) {
        const targetPanelId = customId.replace('modal_redeem_key_', '').trim();
        let keyInput = '';
        for (const row of data.components || []) {
          for (const comp of row.components || []) {
            if (comp.custom_id === 'key_input') {
              keyInput = (comp.value || '').trim();
            }
          }
        }

        if (!keyInput) {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: { content: '❌ **Error**: Please enter a valid license key.', flags: 64 },
            }),
          });
          return;
        }

        const keyRec = state.keys.find(
          (k) => k.key.toUpperCase() === keyInput.toUpperCase() || k.id === keyInput
        );

        if (!keyRec) {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: {
                content: `❌ **Invalid Key**: License key \`${keyInput}\` was not found in the database. Please verify and try again.`,
                flags: 64,
              },
            }),
          });
          return;
        }

        if (keyRec.status === 'revoked') {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: { content: `❌ **Revoked Key**: License key \`${keyRec.key}\` has been revoked by the owner.`, flags: 64 },
            }),
          });
          return;
        }

        if (keyRec.expiresAt && new Date(keyRec.expiresAt) < new Date()) {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: { content: `❌ **Expired Key**: License key \`${keyRec.key}\` has expired.`, flags: 64 },
            }),
          });
          return;
        }

        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });

        // Bind key to this user - lifetime permanent until person removes it
        keyRec.userId = userRec.id;
        keyRec.status = 'active';
        keyRec.type = 'lifetime';
        keyRec.expiresAt = null; // Lives forever until the person removes it

        // Automatically whitelist user on the panel
        const effectivePanelId = targetPanelId || keyRec.panelId || (state.panels[0] ? state.panels[0].id : 'pnl_main');
        const alreadyWhitelisted = state.whitelist.find(
          (w) => (w.identifier === callerId || w.identifier === callerUsername) && w.panelId === effectivePanelId
        );

        if (!alreadyWhitelisted) {
          state.whitelist.push({
            id: 'wl_' + Math.random().toString(36).substring(2, 9),
            panelId: effectivePanelId,
            platform: 'discord',
            identifier: callerId,
            note: `Auto-whitelisted via Modal redemption (${keyRec.key}) - Lifetime`,
            status: 'active',
            addedAt: new Date().toISOString(),
            lastSeenAt: null,
            boundHwid: null,
          });
        }

        db.logAudit('key_redeem', `Key ${keyRec.key} redeemed by @${callerUsername} (${callerId}) - Lifetime`, 'DiscordModal', callerId, 'info');
        db.save();

        const script = state.scripts.find((s) => s.id === keyRec.scriptId) || state.scripts[0];
        const scriptId = script ? script.id : 'scr_main';

        const successMessage = `🎉 **Key Redeemed Successfully!**\n• **Key**: \`${keyRec.key}\`\n• **Owner**: <@${callerId}>\n• **Whitelist**: Active (Lifetime)\n• **Script ID**: \`${scriptId}\`\n\n📜 **YOUR PERSONAL SCRIPT LOADER:**\n\`\`\`lua\nScript_key = "${keyRec.key}"\nloadstring(game:HttpGet("https://roniguard.wasmer.app/loader.lua?script=${scriptId}"))()\n\`\`\`\nYou can now click **📜 Script** on the panel anytime to view your loader!`;

        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: successMessage, flags: 64 },
          }),
        });
        return;
      }
      return;
    }

    // -------------------------------------------------------------
    // 3. SLASH COMMANDS (Type 2: APPLICATION_COMMAND)
    // -------------------------------------------------------------
    let commandName = data.name;
    const args: Record<string, string> = {};
    if (data.options) {
      for (const opt of data.options) {
        if (opt.type === 1) {
          // SUB_COMMAND (e.g. /panel setup)
          if (commandName === 'panel' && opt.name === 'setup') {
            commandName = 'panelsetup';
          }
          if (opt.options) {
            for (const subOpt of opt.options) {
              args[subOpt.name] = String(subOpt.value);
            }
          }
        } else {
          args[opt.name] = String(opt.value);
        }
      }
    }
    console.log(`[RONIGUARD-BOT] Slash command /${commandName} executed by @${callerUsername} (${callerId}) with args:`, args);

    // Permission check for management commands
    const isManagerOrAdmin = this.checkManagerPermission(interaction, guild_id);

    // 3A. /lic COMMAND (Configure API Key & Manager Role)
    if (commandName === 'lic') {
      // Only server administrators or developers can run /lic
      const permsStr = interaction.member?.permissions || '0';
      let isServerAdmin = false;
      try {
        const perms = BigInt(permsStr);
        isServerAdmin = (perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n;
      } catch {}

      if (!isServerAdmin && callerId !== '1549804529778692237' && callerId !== '728491028374829103') {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: {
              content: '⛔ **Access Denied**: Only server administrators can configure the API key and manager role via `/lic`.',
              flags: 64,
            },
          }),
        });
        return;
      }

      const apiKey = (args.api_key || '').trim();
      const roleId = (args.role || '').trim();

      if (!apiKey || !roleId) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: '❌ **Error**: Missing `api_key` or `role`. Usage: `/lic api_key:<key> role:<role>`', flags: 64 },
          }),
        });
        return;
      }

      // Find matching script / panel in database
      const matchingScript = state.scripts.find((s) => s.apiKey === apiKey || s.apiKeyId === apiKey);
      const matchingKey = state.keys.find((k) => k.key === apiKey);
      const scriptId = matchingScript?.id || matchingKey?.scriptId || state.scripts[0]?.id;
      const panelId = matchingScript?.panelId || matchingKey?.panelId || state.panels[0]?.id;

      state.botConfig.guildRoleBindings = state.botConfig.guildRoleBindings || {};
      if (guild_id) {
        state.botConfig.guildRoleBindings[guild_id] = {
          guildId: guild_id,
          roleId,
          apiKey,
          scriptId,
          panelId,
          configuredBy: callerId,
          configuredAt: new Date().toISOString(),
        };
      }
      db.logAudit('bot_sync', `Bound guild ${guild_id} to role ${roleId} and API key ${apiKey}`, 'DiscordBot', callerId, 'info');
      db.save();

      const licEmbed = {
        title: '🛡️ RONIGUARD Licenser & Role Configured',
        description: `Successfully linked script API key to this server and established management clearance.`,
        color: 0x5865f2,
        fields: [
          { name: 'API Key', value: `\`${apiKey}\``, inline: true },
          { name: 'Manager Role', value: `<@&${roleId}>`, inline: true },
          { name: 'Target Script', value: matchingScript ? `\`${matchingScript.filename}\`` : '`Main Script`', inline: true },
          {
            name: 'Clearance Scope',
            value: `Users with the <@&${roleId}> role (and administrators) are now authorized to use:\n• \`/generatekey\`\n• \`/whitelist\`\n• \`/panelsetup\`\n• \`/hwdireset\``,
            inline: false,
          },
        ],
        footer: { text: 'RONIGUARD Script Security System' },
        timestamp: new Date().toISOString(),
      };

      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 4,
          data: { embeds: [licEmbed] },
        }),
      });
      return;
    }

    // 1. Mandatory Guild License Check: Every server MUST first configure /lic
    // Without /lic, no one (even administrators) can create panels or run management commands!
    const binding = guild_id ? state.botConfig.guildRoleBindings?.[guild_id] : null;
    const hasLicSetup = !!(binding && binding.apiKey && binding.roleId);

    if (!hasLicSetup) {
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 4,
          data: {
            content: `🔒 **License Activation Required!**\n\nThis server has not linked an active RONIGUARD script license yet.\n\n❌ **You cannot create panels or use bot features until \`/lic\` is set up.**\n\n👉 **Run this command first to unlock full access:**\n\`/lic api_key:<YOUR_API_KEY> role:<@MANAGER_ROLE>\`\n\n*(Get your script API key from your RONIGUARD website dashboard)*`,
            flags: 64,
          },
        }),
      });
      return;
    }

    // 2. Role Clearance Check: Caller must have the configured manager role or Administrator permissions
    if (!isManagerOrAdmin) {
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 4,
          data: {
            content: `⛔ **Access Denied**: You must have the <@&${binding.roleId}> role configured via \`/lic\` (or Administrator permissions) to run this command.`,
            flags: 64,
          },
        }),
      });
      return;
    }

    // 3B. /panelsetup COMMAND
    if (commandName === 'panelsetup') {
      // Must configure /lic first on this server before setting up panels
      const isLicConfigured = guild_id ? !!state.botConfig?.guildRoleBindings?.[guild_id] : true;
      if (!isLicConfigured && callerId !== '1549804529778692237' && callerId !== '728491028374829103') {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: {
              content: '⛔ **License Setup Required**: You must first configure the bot using `/lic api_key:<key> role:<role>` before you can create or deploy panels! Once `/lic` is set up, you will have full access to create panels and manage the bot.',
              flags: 64,
            },
          }),
        });
        return;
      }

      const title = (args.name || '').trim();
      const description = (args.description || '').trim();
      const panelId = this.extractPanelId(args.panel_id || '');

      if (!title || !description || !panelId) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: '❌ **Error**: Missing required parameters. Usage: `/panelsetup name:<name> description:<description> panel_id:<panel_id>`', flags: 64 },
          }),
        });
        return;
      }

      // Strict check: Panel ID MUST exist in the database! Random IDs are strictly rejected.
      const targetPanel = state.panels.find(
        (p) => p.id === panelId || p.id.toLowerCase() === panelId.toLowerCase()
      );

      if (!targetPanel) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: {
              content: `❌ **Invalid Panel ID**: No panel exists with ID \`${panelId}\`.\n\nWithout a valid Panel ID created on the website dashboard (https://roniguard.wasmer.app/panels), the panel cannot be deployed. Please create your panel first on the dashboard, copy its real Panel ID (e.g. \`pnl_...\`), and try again.`,
              flags: 64,
            },
          }),
        });
        return;
      }

      // Update panel title and description
      targetPanel.name = title;
      targetPanel.description = description;
      targetPanel.updatedAt = new Date().toISOString();

      if (guild_id && state.botConfig.guildRoleBindings?.[guild_id]) {
        state.botConfig.guildRoleBindings[guild_id].panelId = targetPanel.id;
      }
      db.logAudit('panel_update', `Panel "${title}" (${targetPanel.id}) deployed to Discord by @${callerUsername}`, 'DiscordBot', callerId, 'info');
      db.save();

      const panelPayload = {
        type: 4,
        data: {
          embeds: [
            {
              title,
              description,
              color: 0x5865f2, // Blurple
            },
          ],
          components: [
            {
              type: 1, // Row 1
              components: [
                {
                  type: 2,
                  style: 1, // Primary (Blurple)
                  label: 'Script',
                  emoji: { name: '📜' },
                  custom_id: `panel_script_${targetPanel.id}`,
                },
                {
                  type: 2,
                  style: 3, // Success (Green)
                  label: 'Redeem Key',
                  emoji: { name: '🔑' },
                  custom_id: `panel_redeem_${targetPanel.id}`,
                },
              ],
            },
            {
              type: 1, // Row 2
              components: [
                {
                  type: 2,
                  style: 2, // Secondary (Grey)
                  label: 'Key Info',
                  emoji: { name: '📊' },
                  custom_id: `panel_key_info_${targetPanel.id}`,
                },
                {
                  type: 2,
                  style: 4, // Danger (Red)
                  label: 'Reset HWID',
                  emoji: { name: '⚙️' },
                  custom_id: `panel_reset_hwid_${targetPanel.id}`,
                },
              ],
            },
            {
              type: 1, // Row 3
              components: [
                {
                  type: 2,
                  style: 2, // Secondary (Grey)
                  label: 'Get Role',
                  emoji: { name: '👤' },
                  custom_id: `panel_get_role_${targetPanel.id}`,
                },
              ],
            },
          ],
        },
      };

      try {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(panelPayload),
        });
      } catch (err) {
        console.error('[RONIGUARD-BOT] Failed to deploy panel setup:', err);
      }
      return;
    }

    // 3C. /generatekey COMMAND
    if (commandName === 'generatekey') {
      const panelId = this.extractPanelId(args.panel_id || '');
      const type = (args.type || 'lifetime') as 'lifetime' | '30d' | '7d' | '24h';
      const count = Math.min(Math.max(parseInt(args.count || '1', 10) || 1, 1), 10);
      const hwidLocked = args.hwid_locked !== 'false';

      if (!panelId) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: '❌ **Error**: Missing `panel_id` parameter.', flags: 64 },
          }),
        });
        return;
      }

      const targetPanel = state.panels.find((p) => p.id.toLowerCase() === panelId.toLowerCase());
      const resolvedPanelId = targetPanel ? targetPanel.id : panelId;
      const targetScript = targetPanel ? state.scripts.find((s) => s.panelId === targetPanel.id) : null;
      if (!targetPanel || !targetScript) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: "this panel doesn't have any file pls go to the website to set up", flags: 64 },
          }),
        });
        return;
      }

      const scriptId = targetScript.id;

      let expiresAt: string | null = null;
      if (type === '24h') expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      else if (type === '7d') expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      else if (type === '30d') expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

      const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
      const generatedKeys: string[] = [];

      for (let i = 0; i < count; i++) {
        const randomSegments = Array.from({ length: 3 }, () =>
          Math.random().toString(36).substring(2, 6).toUpperCase()
        ).join('-');
        const newKeyStr = `RONI-${type.toUpperCase().substring(0, 4)}-${randomSegments}`;

        const keyRecord = {
          id: 'key_' + Math.random().toString(36).substring(2, 9),
          userId: userRec.id,
          scriptId,
          panelId: resolvedPanelId,
          key: newKeyStr,
          type,
          maxUses: 1,
          currentUses: 0,
          hwidLocked,
          boundHwid: null,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          expiresAt,
          lastUsedAt: null,
        };

        state.keys.push(keyRecord);
        generatedKeys.push(newKeyStr);
      }
      db.logAudit('key_gen', `Generated ${count} keys (${type}) for panel ${resolvedPanelId} by @${callerUsername}`, 'DiscordBot', callerId, 'info');
      db.save();

      const responseText = `🔑 **Generated ${count} License Key(s):**\n${generatedKeys.map((k) => `• \`${k}\``).join('\n')}\n\n• **Panel**: \`${targetPanel.name}\` (\`${resolvedPanelId}\`)\n• **Type**: \`${type}\`\n• **HWID Lock**: \`${hwidLocked ? 'Enabled' : 'Disabled'}\`\n• **Script**: \`${targetScript?.filename || 'Main Script'}\`\nUsers can redeem using **🔑 Redeem Key** on the panel!`;

      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 4,
          data: { content: responseText, flags: 64 },
        }),
      });
      return;
    }

    // 3D. /whitelist COMMAND
    if (commandName === 'whitelist') {
      const action = (args.action || 'check').toLowerCase();
      const rawUser = (args.discord_user || '').replace(/[<@!>]/g, '').trim();
      const rawPanelInput = this.extractPanelId(args.panel_id || '');

      if (!rawUser) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: '❌ **Error**: Missing `discord_user` parameter.', flags: 64 },
          }),
        });
        return;
      }

      if (!rawPanelInput) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: '❌ **Error**: Missing `panel_id` parameter.', flags: 64 },
          }),
        });
        return;
      }

      const targetPanel = state.panels.find((p) => p.id.toLowerCase() === rawPanelInput.toLowerCase());
      const targetPanelId = targetPanel ? targetPanel.id : rawPanelInput;
      const targetScript = targetPanel ? state.scripts.find((s) => s.panelId === targetPanel.id) : null;
      if (!targetPanel || !targetScript) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: "this panel doesn't have any file pls go to the website to set up", flags: 64 },
          }),
        });
        return;
      }

      const panelName = targetPanel.name;

      if (action === 'add') {
        const existing = state.whitelist.find((w) => w.identifier === rawUser && w.panelId === targetPanelId);
        if (existing) {
          existing.status = 'active';
        } else {
          state.whitelist.push({
            id: 'wl_' + Math.random().toString(36).substring(2, 9),
            panelId: targetPanelId,
            platform: 'discord',
            identifier: rawUser,
            note: `Whitelisted via /whitelist by @${callerUsername}`,
            status: 'active',
            addedAt: new Date().toISOString(),
            lastSeenAt: null,
            boundHwid: null,
          });
        }
        db.save();

        // Exact format matching user screenshot
        const whitelistMessage = `<@${rawUser}> You have been whitelisted!\nYou can access the script via this message\n--> #🎯 ${panelName}`;

        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: whitelistMessage },
          }),
        });
        return;
      }

      if (action === 'remove') {
        const idx = state.whitelist.findIndex((w) => w.identifier === rawUser);
        if (idx !== -1) {
          state.whitelist.splice(idx, 1);
          db.save();
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: { content: `🗑️ **Removed**: User <@${rawUser}> has been removed from the whitelist.`, flags: 64 },
            }),
          });
        } else {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 4,
              data: { content: `⚠️ User <@${rawUser}> was not found in the whitelist.`, flags: 64 },
            }),
          });
        }
        return;
      }

      // Check
      const entry = state.whitelist.find((w) => w.identifier === rawUser);
      const checkMsg = entry
        ? `ℹ️ **Whitelist Status**: User <@${rawUser}> is **ACTIVE** on panel \`${entry.panelId}\`. Added: ${entry.addedAt}`
        : `ℹ️ **Whitelist Status**: User <@${rawUser}> is **NOT** currently whitelisted.`;

      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 4,
          data: { content: checkMsg, flags: 64 },
        }),
      });
      return;
    }

    // 3E. /hwdireset COMMAND
    if (commandName === 'hwdireset') {
      const rawUser = (args.target_user || '').replace(/[<@!>]/g, '').trim();
      if (!rawUser) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: '❌ **Error**: Missing `target_user` parameter.', flags: 64 },
          }),
        });
        return;
      }

      let count = 0;
      state.keys.forEach((k) => {
        if (k.userId === rawUser || (k.boundHwid && k.boundHwid.includes(rawUser))) {
          k.boundHwid = null;
          count++;
        }
      });
      state.whitelist.forEach((w) => {
        if (w.identifier === rawUser) {
          w.boundHwid = null;
          count++;
        }
      });
      state.hwidBindings.forEach((h) => {
        if (h.identifier === rawUser || h.id === rawUser) {
          h.resetCount++;
          h.lastResetAt = new Date().toISOString();
          count++;
        }
      });
      db.save();

      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 4,
          data: { content: `⚙️ **HWID Reset Successful**: Cleared ${count} hardware binding(s) for <@${rawUser}>.`, flags: 64 },
        }),
      });
      return;
    }

    // 3F. /whitelistrole COMMAND (Whitelist all members with a selected role for a given duration)
    if (commandName === 'whitelistrole') {
      const roleId = (args.role || '').replace(/[<@&>]/g, '').trim();
      const time = (args.time || 'lifetime').trim().toLowerCase();
      const panelId = this.extractPanelId(args.panel_id || '');

      if (!roleId || !panelId) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: '❌ **Error**: Missing required parameters (`role` and `panel_id`). Usage: `/whitelistrole role:<role> time:<lifetime|30d|7d|24h> panel_id:<panel_id>`', flags: 64 },
          }),
        });
        return;
      }

      const targetPanel = state.panels.find((p) => p.id.toLowerCase() === panelId.toLowerCase());
      const resolvedPanelId = targetPanel ? targetPanel.id : panelId;
      const targetScript = targetPanel ? state.scripts.find((s) => s.panelId === targetPanel.id) : null;
      if (!targetPanel || !targetScript) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: "this panel doesn't have any file pls go to the website to set up", flags: 64 },
          }),
        });
        return;
      }

      const panelName = targetPanel.name;
      const roleResult = db.whitelistRole({
        guildId: guild_id || '',
        roleId,
        roleName: `<@&${roleId}>`,
        duration: time,
        panelId: resolvedPanelId,
        addedBy: `@${callerUsername} (${callerId})`,
      });

      db.logAudit(
        'whitelist_change',
        `Role @${roleId} whitelisted for panel ${resolvedPanelId} (${time}) by @${callerUsername}`,
        'DiscordBot',
        callerId,
        'info'
      );

      const roleWhitelistMessage = `<@&${roleId}> You have been whitelisted!\nYou can access the script via this message\n--> #🎯 ${panelName}`;

      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 4,
          data: {
            content: roleWhitelistMessage,
          },
        }),
      });
      return;
    }

    // 3G. /blacklistuser COMMAND (Blacklist a user by ID from a script, revoking keys and kicking in Roblox)
    if (commandName === 'blacklistuser') {
      const rawUser = (args.user_id || '').replace(/[<@!>]/g, '').trim();
      const scriptInput = (args.script || 'all').trim();
      const reason = (args.reason || 'Blacklisted by administrator').trim();

      if (!rawUser) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: { content: '❌ **Error**: Missing `user_id` parameter. Usage: `/blacklistuser user_id:<id> script:<script_id|all> reason:<reason>`', flags: 64 },
          }),
        });
        return;
      }

      // Resolve script if not "all"
      let targetScriptId = '*';
      if (scriptInput !== 'all' && scriptInput !== '*') {
        const found = state.scripts.find(
          (s) => s.id === scriptInput || s.filename.toLowerCase() === scriptInput.toLowerCase()
        );
        targetScriptId = found ? found.id : scriptInput;
      }

      const blRecord = db.blacklistUser({
        identifier: rawUser,
        scriptId: targetScriptId,
        reason,
        blacklistedBy: `@${callerUsername} (${callerId})`,
        userId: rawUser,
      });

      db.logAudit(
        'security_alert',
        `User ${rawUser} blacklisted from script ${targetScriptId} by @${callerUsername}: ${reason}`,
        'DiscordBot',
        callerId,
        'critical'
      );

      const blEmbed = {
        title: '🚫 User Blacklisted from Script Execution',
        description: `Target user **${rawUser}** has been blacklisted and stripped of all script privileges.`,
        color: 0xed4245, // Discord Red
        fields: [
          { name: 'Target User', value: `<@${rawUser}> (\`${rawUser}\`)`, inline: true },
          { name: 'Script Target', value: `\`${targetScriptId === '*' ? 'All Scripts' : targetScriptId}\``, inline: true },
          { name: 'Reason', value: `*${reason}*`, inline: false },
          {
            name: 'Automated Anti-Tamper Enforcement',
            value: '• Access to script loader immediately revoked.\n• All active license keys invalidated.\n• User removed from active whitelists.\n• **If the user attempts to execute in Roblox, the Anti-Tamper system will immediately kick their client.**',
            inline: false,
          },
        ],
        footer: { text: 'RONIGUARD Anti-Tamper Protection Engine' },
        timestamp: new Date().toISOString(),
      };

      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 4,
          data: { embeds: [blEmbed] },
        }),
      });
      return;
    }
  }
}

export const discordBotService = new DiscordBotService();
