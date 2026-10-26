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

      const keyRecord = {
        id: 'key_' + Math.random().toString(36).substring(2, 9),
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

    case 'status': {
      return {
        success: true,
        message: `RONIGUARD Status: Panels: ${state.panels.length} | Scripts: ${state.scripts.length} | Active Keys: ${state.keys.filter((k) => k.status === 'active').length} | Whitelist: ${state.whitelist.length} | Bot Online: ${state.botConfig.isConnected ? 'Yes' : 'No'}`,
        data: {
          panelsCount: state.panels.length,
          scriptsCount: state.scripts.length,
          keysCount: state.keys.length,
          whitelistCount: state.whitelist.length,
          isConnected: state.botConfig.isConnected,
        },
      };
    }

    default:
      return {
        success: false,
        message: `Command "${commandName}" is recognized by registry but requires custom client handler.`,
      };
  }
}
