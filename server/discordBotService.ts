import { db } from './db.ts';
import { executeBotCommand } from './discord.ts';

class DiscordBotService {
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sequence: number | null = null;
  private sessionId: string | null = null;
  private token: string | null = null;
  private applicationId: string = '1549804529778692237';
  private isRunning = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastPingStart = 0;

  public async start(providedToken?: string): Promise<boolean> {
    const tokenToUse = providedToken || db.get().botConfig.botToken || process.env.DISCORD_BOT_TOKEN;
    if (!tokenToUse || !tokenToUse.trim()) {
      console.log('[RONIGUARD-BOT] No bot token configured.');
      return false;
    }

    this.token = tokenToUse.trim().replace(/^Bot\s+/i, '');

    // Stop previous connection if active
    this.stop();

    console.log('[RONIGUARD-BOT] Initializing Discord Gateway connection...');
    this.isRunning = true;

    try {
      // 1. Fetch current bot application ID and user details
      const userRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bot ${this.token}`,
        },
      });

      if (!userRes.ok) {
        console.error('[RONIGUARD-BOT] Failed to authenticate token with Discord REST API:', userRes.status);
        const state = db.get();
        state.botConfig.isConnected = false;
        db.save();
        return false;
      }

      const botUser = (await userRes.json()) as any;
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

      // 2. Register Slash Commands on Discord
      await this.registerSlashCommands();

      // 3. Connect to Gateway WebSocket
      this.connectGateway();

      return true;
    } catch (err) {
      console.error('[RONIGUARD-BOT] Error starting Discord bot:', err);
      return false;
    }
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

  private async registerSlashCommands() {
    if (!this.token) return;
    try {
      console.log('[RONIGUARD-BOT] Synchronizing slash commands with Discord API...');
      const commands = [
        {
          name: 'panelsetup',
          description: 'Initialize and deploy a new RONIGUARD protection panel',
          options: [
            {
              type: 3, // STRING
              name: 'name',
              description: 'Panel name (e.g. My Hub Panel)',
              required: false,
            },
            {
              type: 3,
              name: 'description',
              description: 'Panel description or notes',
              required: false,
            },
          ],
        },
        {
          name: 'lic',
          description: 'Inspect, manage, and revoke script-specific API license keys',
          options: [
            {
              type: 1, // SUB_COMMAND
              name: 'check',
              description: 'Check status and validity of a license key',
              options: [
                {
                  type: 3,
                  name: 'key',
                  description: 'License key (e.g. RONI-API-...)',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              name: 'info',
              description: 'Look up licensing and loadstring info for a script or key',
              options: [
                {
                  type: 3,
                  name: 'query',
                  description: 'Script name, script ID, or license key',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              name: 'revoke',
              description: 'Revoke an active license key immediately',
              options: [
                {
                  type: 3,
                  name: 'key',
                  description: 'License key to revoke',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              name: 'list',
              description: 'List your active script licenses and associated scripts',
            },
            {
              type: 1,
              name: 'generate',
              description: 'Generate a new API key for a script',
              options: [
                {
                  type: 3,
                  name: 'script',
                  description: 'Target script filename or ID',
                  required: true,
                },
              ],
            },
          ],
        },
        {
          name: 'status',
          description: 'View live RONIGUARD security status, active keys, and panels',
        },
        {
          name: 'whitelist',
          description: 'Manage RONIGUARD user whitelist access',
          options: [
            {
              type: 1, // SUB_COMMAND
              name: 'add',
              description: 'Add a user to the whitelist',
              options: [
                {
                  type: 3, // STRING
                  name: 'user',
                  description: 'Discord ID or platform identifier',
                  required: true,
                },
                {
                  type: 3,
                  name: 'panel',
                  description: 'Panel ID (optional)',
                  required: false,
                },
              ],
            },
            {
              type: 1,
              name: 'remove',
              description: 'Remove a user from the whitelist',
              options: [
                {
                  type: 3,
                  name: 'user',
                  description: 'Discord ID or platform identifier',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              name: 'check',
              description: 'Check if a user is whitelisted',
              options: [
                {
                  type: 3,
                  name: 'user',
                  description: 'Discord ID or platform identifier',
                  required: true,
                },
              ],
            },
          ],
        },
        {
          name: 'key',
          description: 'Manage and generate license keys',
          options: [
            {
              type: 1,
              name: 'generate',
              description: 'Generate a new unique license key',
              options: [
                {
                  type: 3,
                  name: 'type',
                  description: 'Duration (lifetime, 30d, 7d, 24h)',
                  required: false,
                  choices: [
                    { name: 'Lifetime', value: 'lifetime' },
                    { name: '30 Days', value: '30d' },
                    { name: '7 Days', value: '7d' },
                    { name: '24 Hours', value: '24h' },
                  ],
                },
              ],
            },
            {
              type: 1,
              name: 'redeem',
              description: 'Redeem a key for a user',
              options: [
                {
                  type: 3,
                  name: 'key',
                  description: 'The RONI-XXXX license key',
                  required: true,
                },
                {
                  type: 3,
                  name: 'user',
                  description: 'Discord user ID',
                  required: true,
                },
              ],
            },
          ],
        },
        {
          name: 'hwid',
          description: 'Hardware ID lock management',
          options: [
            {
              type: 1,
              name: 'reset',
              description: 'Reset device HWID lock for a user',
              options: [
                {
                  type: 3,
                  name: 'user',
                  description: 'Discord ID or Key to reset',
                  required: true,
                },
              ],
            },
          ],
        },
        {
          name: 'help',
          description: 'List available RONIGUARD commands and owner instructions',
        },
      ];

      const res = await fetch(`https://discord.com/api/v10/applications/${this.applicationId}/commands`, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
      });

      if (res.ok) {
        console.log('[RONIGUARD-BOT] Slash commands registered successfully on Discord!');
      } else {
        const text = await res.text();
        console.warn('[RONIGUARD-BOT] Slash command registration response:', res.status, text);
      }
    } catch (err) {
      console.error('[RONIGUARD-BOT] Failed to register slash commands:', err);
    }
  }

  private connectGateway() {
    if (!this.isRunning || !this.token) return;

    try {
      const wsUrl = 'wss://gateway.discord.gg/?v=10&encoding=json';
      console.log('[RONIGUARD-BOT] Connecting WebSocket to', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[RONIGUARD-BOT] Gateway WebSocket connection established.');
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
        console.warn(`[RONIGUARD-BOT] Gateway connection closed (code: ${event.code}, reason: ${event.reason})`);
        const state = db.get();
        state.botConfig.isConnected = false;
        db.save();

        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }

        // Auto-reconnect if not explicitly stopped
        if (this.isRunning) {
          console.log('[RONIGUARD-BOT] Scheduling auto-reconnection in 5 seconds...');
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
        // Opcode 10: Hello -> Setup Heartbeat & Send Identify
        const interval = d.heartbeat_interval;
        console.log(`[RONIGUARD-BOT] Received Hello. Heartbeat interval: ${interval}ms`);

        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          this.sendHeartbeat();
        }, interval);

        // Send first heartbeat immediately
        this.sendHeartbeat();

        // Send Identify
        this.sendIdentify();
        break;
      }

      case 11: {
        // Opcode 11: Heartbeat ACK -> update ping
        const ping = Date.now() - this.lastPingStart;
        const state = db.get();
        state.botConfig.isConnected = true;
        state.botConfig.lastPing = ping;
        db.save();
        break;
      }

      case 0: {
        // Opcode 0: Dispatch Events
        this.handleDispatch(t, d);
        break;
      }

      case 1: {
        // Heartbeat requested by Discord
        this.sendHeartbeat();
        break;
      }

      case 7: // Reconnect
      case 9: { // Invalid Session
        console.warn('[RONIGUARD-BOT] Gateway requested reconnect/invalid session.');
        this.ws?.close();
        break;
      }
    }
  }

  private sendHeartbeat() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.lastPingStart = Date.now();
    this.ws.send(JSON.stringify({ op: 1, d: this.sequence }));
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
          browser: 'roniguard',
          device: 'roniguard',
        },
        presence: {
          status: 'online',
          activities: [
            {
              name: 'RONIGUARD | /status',
              type: 0, // Playing
            },
          ],
        },
      },
    };

    this.ws.send(JSON.stringify(identifyPayload));
  }

  private async handleDispatch(eventName: string, data: any) {
    if (eventName === 'READY') {
      console.log(`[RONIGUARD-BOT] 🟢 BOT IS NOW ONLINE as @${data.user.username}#${data.user.discriminator || '0'}!`);
      this.sessionId = data.session_id;

      const state = db.get();
      state.botConfig.isConnected = true;
      state.botConfig.botUsername = data.user.username;
      state.botConfig.lastTestedAt = new Date().toISOString();
      db.logAudit('bot_sync', `Discord Bot connected to Gateway as @${data.user.username}`, 'Gateway', 'Discord Bot Service', 'info');
      db.save();
    } else if (eventName === 'INTERACTION_CREATE') {
      await this.handleInteraction(data);
    }
  }

  private async handleInteraction(interaction: any) {
    if (!this.token) return;
    const { id, token, data } = interaction;
    if (!data) return;

    console.log(`[RONIGUARD-BOT] Handling command /${data.name} from user ${interaction.user?.username || interaction.member?.user?.username}`);

    let commandName = data.name;
    const args: Record<string, string> = {};

    // Subcommands handling e.g. /whitelist add <user>
    if (data.options && data.options[0] && data.options[0].type === 1) {
      const sub = data.options[0];
      commandName = `${data.name} ${sub.name}`;
      if (sub.options) {
        for (const opt of sub.options) {
          args[opt.name] = String(opt.value);
        }
      }
    } else if (data.options) {
      for (const opt of data.options) {
        args[opt.name] = String(opt.value);
      }
    }

    let responseMessage = '';
    const caller = interaction.member?.user || interaction.user || {};
    try {
      if (commandName === 'help') {
        responseMessage = `🛡️ **RONIGUARD Lua Security & Licensing System**\n\n**Available Slash Commands:**\n• \`/panelsetup [name] [description]\` — Create and deploy a new security panel\n• \`/lic check <key>\` — Verify validity of a script API key\n• \`/lic info <query>\` — Lookup script and loadstring URL\n• \`/lic revoke <key>\` — Revoke an API key immediately\n• \`/lic list\` — List your active script licenses\n• \`/lic generate <script>\` — Generate a new API key for a script\n• \`/status\` — View system metrics and protection status\n• \`/whitelist add|remove|check <user>\` — Control user whitelist\n• \`/hwid reset <user>\` — Reset device hardware lock\n\n*Manage your panels, scripts, and API keys at https://roniguardreal.wasmer.app*`;
      } else {
        const result = await executeBotCommand({
          commandName,
          args,
          source: 'discord_bot_bridge',
          user: {
            id: caller.id || 'discord_user',
            username: caller.username || 'Discord User',
          },
        });
        responseMessage = `${result.success ? '✅' : '⚠️'} **[RONIGUARD]** ${result.message}`;
      }
    } catch (err: any) {
      responseMessage = `❌ **[RONIGUARD Error]** ${err.message || 'Failed to process command'}`;
    }

    // Respond to interaction via Discord REST API
    try {
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 4, // ChannelMessageWithSource
          data: {
            content: responseMessage,
          },
        }),
      });
    } catch (err) {
      console.error('[RONIGUARD-BOT] Failed to send interaction callback:', err);
    }
  }
}

export const discordBotService = new DiscordBotService();
