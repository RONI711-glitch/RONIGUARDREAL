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
          description: 'Deploy the interactive RONIHUB control panel with buttons',
          options: [
            {
              type: 3, // STRING
              name: 'name',
              description: 'Panel title (e.g. RONIHUB PANEL)',
              required: false,
            },
            {
              type: 3,
              name: 'description',
              description: 'Panel description (e.g. THE BEST FREEMIUM EVER)',
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
          name: 'status',
          description: 'View live RONIGUARD security and licensing status',
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
    const { id, token, data, type } = interaction;
    if (!data) return;

    const caller = interaction.member?.user || interaction.user || {};
    const callerId = caller.id || 'discord_user';
    const callerUsername = caller.username || 'Discord User';
    const state = db.get();

    // 1. Handle Button Clicks (Interaction Type 3)
    if (type === 3) {
      const customId = data.custom_id || '';
      console.log(`[RONIGUARD-BOT] Button clicked: ${customId} by @${callerUsername} (${callerId})`);

      let buttonReply = '';
      if (customId.startsWith('panel_script')) {
        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
        const userScript = state.scripts.find((s) => s.userId === userRec.id) || state.scripts[0];
        const userKey = state.keys.find((k) => k.userId === userRec.id && k.status === 'active') || state.keys[0];

        const scriptParam = userScript ? userScript.id : 'scr_main';
        const keyParam = userKey ? userKey.key : (userScript ? userScript.apiKey : 'RONI-FREE-KEY');
        const loadstring = `loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua?script=${scriptParam}&key=${keyParam}"))()`;

        buttonReply = `📜 **RONIHUB SCRIPT LOADER**\n\`\`\`lua\n${loadstring}\n\`\`\`\n*Copy and run this script in your Luau executor (Roblox). Content is protected by RONIGUARD MAX.*`;
      } else if (customId.startsWith('panel_redeem')) {
        buttonReply = `🔑 **Redeem License Key**\nTo link and verify your key with your Discord account (<@${callerId}>), use the command:\n\`/lic check <your_key>\`\nor redeem it on the web dashboard at https://roniguardreal.wasmer.app`;
      } else if (customId.startsWith('panel_key_info')) {
        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
        const userKey = state.keys.find((k) => k.userId === userRec.id || (k.boundHwid && k.boundHwid.includes(callerId)));

        if (userKey) {
          buttonReply = `📊 **License Key Information**\n• **Owner**: <@${callerId}>\n• **Key**: \`${userKey.key}\`\n• **Status**: \`${userKey.status.toUpperCase()}\`\n• **Type**: \`${userKey.type}\`\n• **HWID Locked**: \`${userKey.hwidLocked ? 'Yes' : 'No'}\`\n• **Expires**: \`${userKey.expiresAt ? new Date(userKey.expiresAt).toLocaleDateString() : 'Never (Lifetime)'}\``;
        } else {
          buttonReply = `⚠️ **No Active License Key Found**\nThere is no registered license key bound to <@${callerId}>.\n• Use \`/lic check <key>\` to redeem your key\n• Click **Free Key** to get one at https://roniguardreal.wasmer.app`;
        }
      } else if (customId.startsWith('panel_reset_hwid')) {
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

        buttonReply = `⚙️ **HWID Reset Successful**\nHardware ID locks have been cleared for <@${callerId}>. The next time you execute the script in Roblox, your new device hardware ID will automatically bind.`;
      } else if (customId.startsWith('panel_get_role')) {
        buttonReply = `👤 **Role Verification**\nClearance confirmed for <@${callerId}>.\nRole: **Verified User**\nAccess Tier: **Active Script Executor**`;
      } else if (customId.startsWith('panel_free_key')) {
        buttonReply = `🔗 **Free Key Access**\nGet your free key or manage your script hub at:\nhttps://roniguardreal.wasmer.app`;
      } else {
        buttonReply = `✅ Action received for ${customId}`;
      }

      try {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 4,
            data: {
              content: buttonReply,
              flags: 64, // Ephemeral: only visible to user who clicked
            },
          }),
        });
      } catch (err) {
        console.error('[RONIGUARD-BOT] Failed to send button callback:', err);
      }
      return;
    }

    // 2. Handle Slash Commands (Interaction Type 2)
    console.log(`[RONIGUARD-BOT] Handling command /${data.name} from user ${callerUsername}`);

    let commandName = data.name;
    const args: Record<string, string> = {};

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

    // Special rich response for /panelsetup to render the exact embed and button layout
    if (commandName === 'panelsetup') {
      const title = (args.name || 'RONIHUB PANEL').trim();
      const description = (args.description || 'THE BEST FREEMIUM EVER').trim();

      const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
      let targetPanel = state.panels.find((p) => p.userId === userRec.id && p.name.toLowerCase() === title.toLowerCase());
      if (!targetPanel) {
        targetPanel = {
          id: 'pnl_' + Math.random().toString(36).substring(2, 9),
          userId: userRec.id,
          name: title,
          description,
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
        state.panels.unshift(targetPanel);
        db.save();
      }

      const panelPayload = {
        type: 4,
        data: {
          embeds: [
            {
              title,
              description,
              color: 5793266, // #5865F2 Blurple
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
            {
              type: 1, // Row 4
              components: [
                {
                  type: 2,
                  style: 2, // Secondary (Grey)
                  label: 'Free Key',
                  emoji: { name: '🔗' },
                  custom_id: `panel_free_key_${targetPanel.id}`,
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
        console.error('[RONIGUARD-BOT] Failed to send panel callback:', err);
      }
      return;
    }

    // Standard command processing
    let responseMessage = '';
    try {
      const result = await executeBotCommand({
        commandName,
        args,
        source: 'discord_bot_bridge',
        user: {
          id: callerId,
          username: callerUsername,
        },
      });
      responseMessage = `${result.success ? '✅' : '⚠️'} **[RONIGUARD]** ${result.message}`;
    } catch (err: any) {
      responseMessage = `❌ **[RONIGUARD Error]** ${err.message || 'Failed to process command'}`;
    }

    try {
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 4,
          data: {
            content: responseMessage,
          },
        }),
      });
    } catch (err) {
      console.error('[RONIGUARD-BOT] Failed to send command callback:', err);
    }
  }
}

export const discordBotService = new DiscordBotService();
