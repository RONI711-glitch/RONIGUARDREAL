import { db } from './db.ts';

export interface DiscordTestResult {
  connected: boolean;
  botUser?: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    bot: boolean;
  };
  pingMs?: number;
  error?: string;
  diagnostics: string[];
}

export interface BotCommandExecution {
  commandName: string;
  args: Record<string, string>;
  source: 'dashboard_tester' | 'discord_bot_bridge';
  user?: {
    id: string;
    username: string;
  };
}

export async function testDiscordBotConnection(token?: string): Promise<DiscordTestResult> {
  const activeToken = token || db.get().botConfig.botToken || process.env.DISCORD_BOT_TOKEN;
  const diagnostics: string[] = [];

  if (!activeToken || activeToken.trim() === '') {
    diagnostics.push('No Discord bot token provided or found in server environment.');
    return {
      connected: false,
      error: 'Bot token is missing. Please configure DISCORD_BOT_TOKEN in Settings or .env file.',
      diagnostics,
    };
  }

  diagnostics.push('Attempting authenticated handshake with Discord REST API v10...');
  const start = Date.now();

  try {
    const formattedToken = activeToken.startsWith('Bot ') ? activeToken : `Bot ${activeToken}`;
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: formattedToken,
        'User-Agent': 'RONIGUARD-Bot-Bridge (v3.0.0, https://roniguard.internal)',
      },
    });

    const pingMs = Date.now() - start;

    if (response.status === 401) {
      diagnostics.push('HTTP 401 Unauthorized: The Discord API rejected the provided token.');
      return {
        connected: false,
        pingMs,
        error: 'Invalid Discord Bot Token. Please check your Discord Developer Portal bot credentials.',
        diagnostics,
      };
    }

    if (!response.ok) {
      const errText = await response.text();
      diagnostics.push(`Discord API returned status ${response.status}: ${errText}`);
      return {
        connected: false,
        pingMs,
        error: `Discord Gateway error: HTTP ${response.status}`,
        diagnostics,
      };
    }

    const botUser = (await response.json()) as any;
    diagnostics.push(`Successfully authenticated as @${botUser.username}#${botUser.discriminator || '0'} (ID: ${botUser.id}).`);
    diagnostics.push(`Gateway round-trip latency: ${pingMs}ms.`);

    // Update DB bot configuration state
    const state = db.get();
    state.botConfig.isConnected = true;
    state.botConfig.botUsername = `${botUser.username}`;
    state.botConfig.botAvatar = botUser.avatar
      ? `https://cdn.discordapp.com/avatars/${botUser.id}/${botUser.avatar}.png`
      : undefined;
    state.botConfig.lastPing = pingMs;
    state.botConfig.lastTestedAt = new Date().toISOString();
    db.save();

    return {
      connected: true,
      botUser,
      pingMs,
      diagnostics,
    };
  } catch (err: any) {
    diagnostics.push(`Network or fetch failure: ${err?.message || 'Connection aborted'}`);
    return {
      connected: false,
      error: `Network error connecting to Discord API: ${err?.message}`,
      diagnostics,
    };
  }
}

export async function sendDiscordWebhookNotification(
  title: string,
  description: string,
  fields: { name: string; value: string; inline?: boolean }[] = [],
  color = 0x9333ea // Neon purple
): Promise<boolean> {
  const webhookUrl = db.get().botConfig.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    return false;
  }

  try {
    const embed = {
      title: `[RONIGUARD] ${title}`,
      description,
      color,
      fields,
      footer: {
        text: 'RONIGUARD Lua Security Shield · Authenticated Dispatcher',
      },
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'RONIGUARD Sentinel',
        embeds: [embed],
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('Failed to send Discord webhook:', err);
    return false;
  }
}

// Executes a bot command through the integrated backend handler
export async function executeBotCommand(execution: BotCommandExecution): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  const { commandName, args } = execution;
  const state = db.get();

  switch (commandName) {
    case 'whitelist add': {
      const user = args.user;
      if (!user) return { success: false, message: 'Missing required argument: user' };
      const panelId = args.panel || (state.panels[0] ? state.panels[0].id : 'default');

      // Check duplicate
      const existing = state.whitelist.find((w) => w.identifier === user && w.panelId === panelId);
      if (existing) {
        return { success: false, message: `User "${user}" is already whitelisted on this panel.` };
      }

      const newEntry = {
        id: 'wl_' + Math.random().toString(36).substring(2, 9),
        panelId,
        platform: 'discord' as const,
        identifier: user,
        note: `Added via Discord Command (${execution.source})`,
        status: 'active' as const,
        addedAt: new Date().toISOString(),
        lastSeenAt: null,
        boundHwid: null,
      };

      state.whitelist.push(newEntry);
      db.logAudit('whitelist_change', `Whitelisted user ${user} on panel ${panelId}`, 'BotBridge', 'Discord Command');
      db.save();

      await sendDiscordWebhookNotification(
        'Whitelist Updated',
        `User \`${user}\` was successfully whitelisted on panel \`${panelId}\`.`,
        [{ name: 'Added At', value: newEntry.addedAt, inline: true }]
      );

      return {
        success: true,
        message: `User ${user} has been granted whitelist access.`,
        data: newEntry,
      };
    }

    case 'whitelist remove': {
      const user = args.user;
      if (!user) return { success: false, message: 'Missing required argument: user' };
      const idx = state.whitelist.findIndex((w) => w.identifier === user);
      if (idx === -1) {
        return { success: false, message: `User "${user}" not found in active whitelist.` };
      }

      state.whitelist.splice(idx, 1);
      db.logAudit('whitelist_change', `Revoked whitelist for user ${user}`, 'BotBridge', 'Discord Command');
      db.save();

      return { success: true, message: `User ${user} was removed from the whitelist.` };
    }

    case 'whitelist check': {
      const user = args.user;
      if (!user) return { success: false, message: 'Missing required argument: user' };
      const entry = state.whitelist.find((w) => w.identifier === user);
      if (!entry) {
        return { success: true, message: `User ${user} is NOT currently whitelisted.` };
      }
      return {
        success: true,
        message: `User ${user} is ACTIVE on panel ${entry.panelId}. HWID: ${entry.boundHwid || 'Not yet bound'}. Added: ${entry.addedAt}`,
        data: entry,
      };
    }

    case 'key generate': {
      const type = (args.type || 'lifetime') as 'lifetime' | '30d' | '7d' | '24h';
      const panelId = args.panel || (state.panels[0] ? state.panels[0].id : 'default');
      const randomSegments = Array.from({ length: 3 }, () =>
        Math.random().toString(36).substring(2, 6).toUpperCase()
      ).join('-');
      const newKeyStr = `RONI-${type.toUpperCase().substring(0, 4)}-${randomSegments}`;

      let expiresAt: string | null = null;
      if (type === '24h') {
        expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      } else if (type === '7d') {
        expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      } else if (type === '30d') {
        expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      }

      const callerUserId = execution.user?.id || 'usr_owner';
      const targetScript = state.scripts.find((s) => s.panelId === panelId) || state.scripts[0];
      const scriptId = args.script || (targetScript ? targetScript.id : 'scr_main');

      const keyRecord = {
        id: 'key_' + Math.random().toString(36).substring(2, 9),
        userId: callerUserId,
        scriptId,
        panelId,
        key: newKeyStr,
        type,
        maxUses: 1,
        currentUses: 0,
        hwidLocked: true,
        boundHwid: null,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        expiresAt,
        lastUsedAt: null,
      };

      state.keys.push(keyRecord);
      db.logAudit('key_gen', `Generated key ${newKeyStr} (${type}) for panel ${panelId}`, 'BotBridge', 'Discord Command');
      db.save();

      return {
        success: true,
        message: `Generated License Key: \`${newKeyStr}\` [Type: ${type}]`,
        data: keyRecord,
      };
    }

    case 'hwid reset': {
      const user = args.user;
      if (!user) return { success: false, message: 'Missing required argument: user' };
      const wl = state.whitelist.find((w) => w.identifier === user);
      const keyRec = state.keys.find((k) => k.boundHwid && (k.key === user || k.boundHwid.includes(user)));
      const binding = state.hwidBindings.find((h) => h.identifier === user || h.hwidHash === user);

      let resetDone = false;
      if (wl && wl.boundHwid) {
        wl.boundHwid = null;
        resetDone = true;
      }
      if (keyRec && keyRec.boundHwid) {
        keyRec.boundHwid = null;
        resetDone = true;
      }
      if (binding) {
        binding.boundAt = new Date().toISOString();
        binding.resetCount += 1;
        binding.lastResetAt = new Date().toISOString();
        resetDone = true;
      }

      if (!resetDone) {
        return { success: false, message: `No active HWID binding found for "${user}".` };
      }

      db.logAudit('hwid_reset', `HWID reset for user ${user}`, 'BotBridge', 'Discord Command');
      db.save();

      return {
        success: true,
        message: `HWID device lock successfully cleared for user "${user}". Next execution will bind new hardware ID.`,
      };
    }

    case 'panelsetup': {
      try {
        const discordId = execution.user?.id || args.user_id || 'owner_discord';
        const discordUsername = execution.user?.username || args.username || 'Owner';
        const userRec = db.findOrCreateDiscordUser({
          discordId,
          username: discordUsername,
        });

        const panelName = (args.name || args.panel_name || `${discordUsername}'s Panel`).trim();
        const panelDesc = (args.description || 'Configured via Discord /panelsetup command').trim();

        const panelId = 'pnl_' + Math.random().toString(36).substring(2, 9);
        const newPanel = {
          id: panelId,
          userId: userRec.id,
          name: panelName,
          description: panelDesc,
          status: 'active' as const,
          protectionProfile: 'maximum' as const,
          whitelistEnabled: true,
          keyAuthEnabled: true,
          hwidLockEnabled: true,
          maxHwidResets: 3,
          scriptCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        state.panels.unshift(newPanel);
        db.logAudit('panel_update', `Panel "${panelName}" created via /panelsetup by @${discordUsername}`, 'DiscordBot', discordId, 'info');
        db.save();

        await sendDiscordWebhookNotification(
          'Panel Created via Discord',
          `Panel **${panelName}** (\`${panelId}\`) was deployed by <@${discordId}>.`,
          [
            { name: 'Panel ID', value: `\`${panelId}\``, inline: true },
            { name: 'Security Profile', value: 'Maximum (RONIGUARD MAX)', inline: true },
            { name: 'Owner', value: `@${discordUsername}`, inline: true },
          ]
        );

        return {
          success: true,
          message: `Panel **${panelName}** was successfully initialized!\n• **Panel ID**: \`${panelId}\`\n• **Status**: Active (Key Auth, Whitelist & HWID Locks Enabled)\n• **Owner**: <@${discordId}>\nYou can now attach scripts to this panel via the dashboard at https://roniguardreal.wasmer.app`,
          data: newPanel,
        };
      } catch (err: any) {
        console.error('[RONIGUARD-BOT] Error in panelsetup handler:', err);
        return {
          success: false,
          message: `Failed to configure panel: ${err?.message || 'Database transaction error'}`,
        };
      }
    }

    case 'lic':
    case 'lic check': {
      const keyInput = (args.key || args.license || args.id || '').trim();
      if (!keyInput) {
        return {
          success: false,
          message: 'Missing license key. Usage: `/lic check <key>` or `/lic revoke <key>`',
        };
      }

      const keyRecord = state.keys.find(
        (k) => k.key.toUpperCase() === keyInput.toUpperCase() || k.id === keyInput
      );

      if (!keyRecord) {
        return {
          success: false,
          message: `License key \`${keyInput}\` was not found in the RONIGUARD database.`,
        };
      }

      const script = state.scripts.find((s) => s.id === keyRecord.scriptId);
      const isExpired = keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date();
      const statusLabel = isExpired ? 'EXPIRED' : keyRecord.status.toUpperCase();

      return {
        success: true,
        message: `**License Key Details:**\n• **Key**: \`${keyRecord.key}\`\n• **Status**: ${statusLabel === 'ACTIVE' ? '🟢 ACTIVE' : '🔴 ' + statusLabel}\n• **Target Script**: ${script ? `"${script.filename}" (\`${script.id}\`)` : `\`${keyRecord.scriptId || 'N/A'}\``}\n• **Type**: ${keyRecord.type}\n• **Executions**: ${keyRecord.currentUses} / ${keyRecord.maxUses || 'Unlimited'}\n• **HWID Binding**: ${keyRecord.boundHwid ? `\`${keyRecord.boundHwid.substring(0, 16)}...\`` : 'Not yet bound'}\n• **Created**: ${keyRecord.createdAt.split('T')[0]}`,
        data: keyRecord,
      };
    }

    case 'lic info': {
      const query = (args.query || args.script || args.key || '').trim();
      if (!query) {
        return {
          success: false,
          message: 'Usage: `/lic info <script_name_or_key>`',
        };
      }

      // Find by key
      let keyRec = state.keys.find((k) => k.key.toUpperCase() === query.toUpperCase() || k.id === query);
      let scriptRec = keyRec
        ? state.scripts.find((s) => s.id === keyRec?.scriptId)
        : state.scripts.find((s) => s.id === query || s.filename.toLowerCase() === query.toLowerCase());

      if (!keyRec && scriptRec) {
        keyRec = state.keys.find((k) => k.scriptId === scriptRec?.id && k.status === 'active');
      }

      if (!scriptRec && !keyRec) {
        return {
          success: false,
          message: `No license record or script matching "${query}" was found.`,
        };
      }

      return {
        success: true,
        message: `**Script Licensing Information:**\n• **Script**: "${scriptRec?.filename || 'Unknown'}" (\`${scriptRec?.id || 'N/A'}\`)\n• **Active API Key**: \`${keyRec?.key || scriptRec?.apiKey || 'No key issued'}\`\n• **Status**: ${keyRec?.status === 'active' ? '🟢 ACTIVE' : '🔴 ' + (keyRec?.status || 'inactive')}\n• **Loadstring**: \`loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua?script=${scriptRec?.id || ''}&key=${keyRec?.key || ''}"))()\``,
      };
    }

    case 'lic revoke': {
      const keyInput = (args.key || args.license || '').trim();
      if (!keyInput) {
        return { success: false, message: 'Missing key to revoke. Usage: `/lic revoke <key>`' };
      }

      const keyRec = state.keys.find(
        (k) => k.key.toUpperCase() === keyInput.toUpperCase() || k.id === keyInput
      );

      if (!keyRec) {
        return { success: false, message: `Key \`${keyInput}\` does not exist.` };
      }

      if (keyRec.status === 'revoked') {
        return { success: false, message: `Key \`${keyRec.key}\` is already revoked.` };
      }

      keyRec.status = 'revoked';
      keyRec.revokedAt = new Date().toISOString();
      db.logAudit('key_gen', `Revoked license key ${keyRec.key} via Discord /lic revoke`, 'DiscordBot', execution.user?.id || 'unknown', 'warning');
      db.save();

      return {
        success: true,
        message: `🛑 License key \`${keyRec.key}\` for script \`${keyRec.scriptId}\` has been **revoked**. All future executor requests will be denied.`,
      };
    }

    case 'lic list': {
      const discordId = execution.user?.id;
      let userKeys = state.keys;
      if (discordId) {
        const u = state.users.find((x) => x.discordId === discordId);
        if (u) {
          userKeys = state.keys.filter((k) => k.userId === u.id);
        }
      }

      const active = userKeys.filter((k) => k.status === 'active');
      if (active.length === 0) {
        return {
          success: true,
          message: 'No active script licenses found. Create and process a script at https://roniguardreal.wasmer.app to generate an API key.',
        };
      }

      const lines = active.slice(0, 5).map((k) => {
        const s = state.scripts.find((scr) => scr.id === k.scriptId);
        return `• \`${k.key}\` → "${s?.filename || k.scriptId}" (${k.type})`;
      });

      return {
        success: true,
        message: `**Active Script Licenses (${active.length}):**\n${lines.join('\n')}${active.length > 5 ? `\n*+${active.length - 5} more on dashboard*` : ''}`,
      };
    }

    case 'lic generate': {
      const scriptInput = (args.script || args.name || '').trim();
      if (!scriptInput) {
        return { success: false, message: 'Usage: `/lic generate <script_name_or_id>`' };
      }

      const script = state.scripts.find(
        (s) => s.id === scriptInput || s.filename.toLowerCase() === scriptInput.toLowerCase()
      );

      if (!script) {
        return { success: false, message: `Script "${scriptInput}" not found.` };
      }

      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
      const newKey = `RONI-API-${randomHex}`;
      const newKeyRec = {
        id: 'key_' + Math.random().toString(36).substring(2, 9),
        userId: script.userId,
        scriptId: script.id,
        panelId: script.panelId,
        key: newKey,
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

      state.keys.push(newKeyRec);
      script.apiKey = newKey;
      script.apiKeyId = newKeyRec.id;
      db.logAudit('key_gen', `Issued new API key ${newKey} for script "${script.filename}"`, 'DiscordBot', execution.user?.id || 'unknown');
      db.save();

      return {
        success: true,
        message: `✅ New API key generated for script **"${script.filename}"**:\n• **API Key**: \`${newKey}\`\n• **Loadstring**: \`loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua?script=${script.id}&key=${newKey}"))()\``,
        data: newKeyRec,
      };
    }

    default:
      return {
        success: false,
        message: `Command "${commandName}" is recognized by registry but requires custom client handler.`,
      };
  }
}
