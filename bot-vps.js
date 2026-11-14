// server/discordBotService.ts
import path2 from "node:path";
import WebSocket from "ws";

// server/db.ts
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
var DATA_DIR = path.resolve(process.cwd(), "data");
var DB_FILE = path.join(DATA_DIR, "roniguard_store.json");
var SOURCES_DIR = path.join(DATA_DIR, "sources");
var BUILDS_DIR = path.join(DATA_DIR, "builds");
[DATA_DIR, SOURCES_DIR, BUILDS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1e5, 64, "sha512").toString("hex");
}
function generateRandomHex(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}
var SCRIPT_PROCESSING_STAGES = [
  { id: 1, name: "Saving script configuration" },
  { id: 2, name: "Validating submitted source" },
  { id: 3, name: "Preparing script" },
  { id: 4, name: "Applying RONIGUARD MAX" },
  { id: 5, name: "Validating generated output" },
  { id: 6, name: "Associating script with its panel" },
  { id: 7, name: "Creating script-specific API key" },
  { id: 8, name: "Saving final result" }
];
var LATEST_ACTIVE_TOKEN = Buffer.from("TVRVME9UZ3dORFV5T1RjM09EWTVNakl6TncuRzhjUEhULmtVcHNUNXZobHdlN2RWMTQzYndPcDl4SGpjbzNmREZnc3NiUUd3", "base64").toString("utf8");
var envCandidate = (process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN || "").trim();
var DEFAULT_ACTIVE_BOT_TOKEN = envCandidate && !envCandidate.includes("GuSRGb") && !envCandidate.includes("GbPiDD") ? envCandidate : LATEST_ACTIVE_TOKEN;
var SERVER_HMAC_SECRET = process.env.ANTI_TAMPER_SECRET || "RONIGUARD_SECURE_HMAC_MASTER_KEY_2026_X79";
function getDefaultState() {
  const salt = generateRandomHex(16);
  const initialPassword = process.env.OWNER_INITIAL_PASSWORD || "RoniguardOwner2026!";
  const initialRecoveryKey = "RONI-RECOVER-" + crypto.randomBytes(8).toString("hex").toUpperCase();
  const defaultUserId = "usr_owner";
  const defaultPanelId = "pnl_main_" + crypto.randomBytes(4).toString("hex");
  const defaultScriptId = "scr_main_default";
  const defaultKeyStr = "RONI-API-DEFAULT-KEY";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const sampleLua = `-- [RONIGUARD] Universal Roblox Script
print("[RONIGUARD] Executing Protected Script Payload...")
if game and game:GetService("Players") and game:GetService("Players").LocalPlayer then
    print("[RONIGUARD] Active Roblox Player: " .. tostring(game:GetService("Players").LocalPlayer.Name))
end
print("[RONIGUARD] Successfully authenticated and running!")`;
  try {
    const srcFile = path.join(SOURCES_DIR, `src_${defaultScriptId}.lua`);
    const bldFile = path.join(BUILDS_DIR, `bld_${defaultScriptId}.lua`);
    if (!fs.existsSync(srcFile)) fs.writeFileSync(srcFile, sampleLua, "utf-8");
    if (!fs.existsSync(bldFile)) fs.writeFileSync(bldFile, sampleLua, "utf-8");
  } catch {
  }
  const defaultHash = crypto.createHash("sha256").update(sampleLua).digest("hex");
  const defaultSig = crypto.createHmac("sha256", SERVER_HMAC_SECRET).update(`${defaultScriptId}:${defaultKeyStr}:${defaultHash}`).digest("hex");
  return {
    owner: {
      email: "",
      passwordHash: hashPassword(initialPassword, salt),
      salt,
      recoveryKeyHash: hashPassword(initialRecoveryKey, salt),
      recoveryKeyPlainOnce: initialRecoveryKey,
      sessionTokens: [],
      lastLogin: null,
      twoFactorEnabled: false,
      createdAt: now
    },
    users: [
      {
        id: defaultUserId,
        discordId: "1549804529778692237",
        username: "roniguard_owner",
        discriminator: "0",
        avatar: null,
        email: null,
        role: "admin",
        sessionTokens: [],
        createdAt: now,
        lastLoginAt: now
      }
    ],
    jobs: [],
    panels: [
      {
        id: defaultPanelId,
        userId: defaultUserId,
        name: "RONIHUB PANEL",
        description: "THE BEST FREEMIUM EVER",
        status: "active",
        protectionProfile: "maximum",
        whitelistEnabled: true,
        keyAuthEnabled: true,
        hwidLockEnabled: true,
        maxHwidResets: 3,
        scriptCount: 1,
        createdAt: now,
        updatedAt: now
      }
    ],
    scripts: [
      {
        id: defaultScriptId,
        userId: defaultUserId,
        panelId: defaultPanelId,
        filename: "main.lua",
        originalFilename: "main.lua",
        originalFileId: `src_${defaultScriptId}`,
        protectedFileId: `bld_${defaultScriptId}`,
        originalSize: sampleLua.length,
        protectedSize: sampleLua.length,
        status: "ready",
        apiKey: defaultKeyStr,
        apiKeyId: "key_default",
        isObfuscated: false,
        trialEnabled: false,
        buildCount: 1,
        lastBuiltAt: now,
        createdAt: now
      }
    ],
    builds: [],
    whitelist: [
      {
        id: "wl_owner",
        panelId: defaultPanelId,
        platform: "discord",
        identifier: "1549804529778692237",
        note: "Default Owner Whitelist",
        status: "active",
        addedAt: now,
        lastSeenAt: null,
        boundHwid: null
      }
    ],
    blacklist: [],
    keys: [
      {
        id: "key_default",
        userId: defaultUserId,
        scriptId: defaultScriptId,
        panelId: defaultPanelId,
        key: defaultKeyStr,
        type: "lifetime",
        maxUses: 99999,
        currentUses: 0,
        hwidLocked: false,
        boundHwid: null,
        status: "active",
        createdAt: now,
        expiresAt: null,
        lastUsedAt: null
      }
    ],
    hwidBindings: [
      {
        id: "hwid_1_" + crypto.randomBytes(4).toString("hex"),
        identifier: "Owner Test Device",
        deviceLabel: "Windows 11 Workstation (x86_64)",
        hwidHash: "a7c93e41b2f09988d4c1a5b6e7f8091a",
        status: "bound",
        resetCount: 0,
        maxResets: 5,
        lastResetAt: null,
        boundAt: now
      }
    ],
    apiCredentials: [
      {
        id: "api_default_" + crypto.randomBytes(4).toString("hex"),
        name: "Discord Bot Production Bridge",
        prefix: "roni_live_bot_",
        keyHash: crypto.createHash("sha256").update("roni_live_bot_seed_token").digest("hex"),
        scopes: ["all", "read_scripts", "verify_keys", "manage_whitelist", "bot_bridge"],
        createdAt: now,
        lastUsedAt: now,
        status: "active",
        rateLimitPerMin: 200
      }
    ],
    auditLogs: [
      {
        id: "log_init_" + crypto.randomBytes(4).toString("hex"),
        eventType: "login",
        details: "RONIGUARD Multi-Tenant System Initialized",
        ip: "127.0.0.1",
        userAgent: "System Boot",
        timestamp: now,
        severity: "info"
      }
    ],
    antiTamper: [
      {
        id: "at_default",
        scriptId: defaultScriptId,
        panelId: defaultPanelId,
        apiKey: defaultKeyStr,
        integrityHash: defaultHash,
        signature: defaultSig,
        scriptLength: sampleLua.length,
        status: "guaranteed",
        totalVerifications: 0,
        passedVerifications: 0,
        failedVerifications: 0,
        lastVerifiedAt: null,
        createdAt: now,
        updatedAt: now
      }
    ],
    securityEvents: [
      {
        id: "se_init",
        scriptId: defaultScriptId,
        panelId: defaultPanelId,
        apiKey: defaultKeyStr,
        eventType: "integrity_verified",
        severity: "info",
        reason: "Automated Anti-Tamper integrity signature initialized.",
        ip: "127.0.0.1",
        timestamp: now
      }
    ],
    botConfig: {
      botToken: DEFAULT_ACTIVE_BOT_TOKEN,
      clientId: "1549804529778692237",
      guildId: process.env.DISCORD_GUILD_ID || "",
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
      bridgeUrl: process.env.DISCORD_BRIDGE_API_URL || "",
      bridgeSecret: process.env.DISCORD_BRIDGE_SECRET || "",
      isConnected: false,
      roleWhitelistRules: {},
      registeredCommands: [
        {
          name: "whitelistrole",
          description: "Whitelist all members holding a role for a specified duration",
          options: ["role: role", "time: string", "panel_id: string?"],
          category: "Whitelist",
          implementedInBot: true
        },
        {
          name: "blacklistuser",
          description: "Blacklist a user by ID from a script or all scripts",
          options: ["user_id: string", "script: string", "reason: string?"],
          category: "Security",
          implementedInBot: true
        },
        {
          name: "panelsetup",
          description: "Deploy interactive control panel for a website panel ID",
          options: ["name: string", "description: string", "panel_id: string"],
          category: "Panels",
          implementedInBot: true
        },
        {
          name: "lic",
          description: "Configure script API key and manager role",
          options: ["api_key: string", "role: role"],
          category: "Licenses",
          implementedInBot: true
        },
        {
          name: "generatekey",
          description: "Generate new license keys",
          options: ["type: string?", "count: int?", "hwid_locked: bool?"],
          category: "Licenses",
          implementedInBot: true
        },
        {
          name: "whitelist",
          description: "Manage whitelist access",
          options: ["action: string", "discord_user: user"],
          category: "Security",
          implementedInBot: true
        },
        {
          name: "hwdireset",
          description: "Reset device HWID lock",
          options: ["target_user: user"],
          category: "Security",
          implementedInBot: true
        }
      ]
    },
    settings: {
      projectName: "RONIGUARD",
      defaultEngine: "RONIGUARD MAX",
      defaultProfile: "maximum",
      maxFileSizeMb: 10,
      requirePasswordForSourceRecovery: true,
      autoPurgeBuildHistoryDays: 60
    }
  };
}
var Store = class {
  constructor() {
    this.lastMtimeMs = 0;
    this.state = this.load();
  }
  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        try {
          this.lastMtimeMs = fs.statSync(DB_FILE).mtimeMs;
        } catch {
        }
        const data = fs.readFileSync(DB_FILE, "utf-8");
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
        parsed.botConfig.clientId = "1549804529778692237";
        parsed.keys = parsed.keys.filter(
          (k) => k.key !== "RONI-LIFETIME-OWNER" && k.key !== "RONI-30D-PREVIEW" && !k.key.includes("PREVIEW")
        );
        if (parsed.owner) parsed.owner.email = null;
        parsed.users.forEach((u) => {
          u.email = null;
          if (!u.masterApiKey) {
            u.masterApiKey = "RONI-MASTER-" + crypto.randomBytes(8).toString("hex").toUpperCase();
          }
        });
        if (!parsed.users.some((u) => u.role === "admin")) {
          parsed.users.unshift({
            id: "usr_owner",
            discordId: "728491028374829103",
            username: "roniguard_owner",
            discriminator: "0",
            avatar: null,
            email: null,
            role: "admin",
            masterApiKey: "RONI-MASTER-" + crypto.randomBytes(8).toString("hex").toUpperCase(),
            sessionTokens: [],
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        const defaultUid = parsed.users[0]?.id || "usr_owner";
        const nowStr = (/* @__PURE__ */ new Date()).toISOString();
        if (parsed.panels.length === 0) {
          parsed.panels.push({
            id: "pnl_main_default",
            userId: defaultUid,
            name: "RONIHUB PANEL",
            description: "THE BEST FREEMIUM EVER",
            status: "active",
            protectionProfile: "maximum",
            whitelistEnabled: true,
            keyAuthEnabled: true,
            hwidLockEnabled: true,
            maxHwidResets: 3,
            scriptCount: 1,
            createdAt: nowStr,
            updatedAt: nowStr
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
            const srcPath = path.join(SOURCES_DIR, "src_scr_main_default.lua");
            const bldPath = path.join(BUILDS_DIR, "bld_scr_main_default.lua");
            fs.writeFileSync(srcPath, sampleLua, "utf-8");
            fs.writeFileSync(bldPath, sampleLua, "utf-8");
          } catch {
          }
          parsed.scripts.push({
            id: "scr_main_default",
            userId: defaultUid,
            panelId: parsed.panels[0].id,
            filename: "main.lua",
            originalFilename: "main.lua",
            originalFileId: "src_scr_main_default",
            protectedFileId: "bld_scr_main_default",
            originalSize: 220,
            protectedSize: 220,
            status: "ready",
            apiKey: "RONI-API-DEFAULT-KEY",
            apiKeyId: "key_default",
            isObfuscated: false,
            trialEnabled: false,
            buildCount: 1,
            lastBuiltAt: nowStr,
            createdAt: nowStr
          });
        }
        if (parsed.keys.length === 0) {
          parsed.keys.push({
            id: "key_default",
            userId: defaultUid,
            scriptId: parsed.scripts[0].id,
            panelId: parsed.panels[0].id,
            key: "RONI-API-DEFAULT-KEY",
            type: "lifetime",
            maxUses: 99999,
            currentUses: 0,
            hwidLocked: false,
            boundHwid: null,
            status: "active",
            createdAt: nowStr,
            expiresAt: null,
            lastUsedAt: null
          });
        }
        parsed.panels.forEach((p) => {
          if (!p.userId) p.userId = defaultUid;
        });
        parsed.scripts.forEach((s) => {
          if (!s.userId) s.userId = defaultUid;
          if (s.isObfuscated === void 0) s.isObfuscated = true;
          if (s.trialEnabled === void 0) s.trialEnabled = false;
        });
        parsed.keys.forEach((k) => {
          if (!k.userId) k.userId = defaultUid;
          if (!k.scriptId && parsed.scripts[0]) k.scriptId = parsed.scripts[0].id;
        });
        if (parsed.scripts.length > 0 && parsed.antiTamper.length === 0) {
          for (const s of parsed.scripts) {
            const sampleLua = `-- [RONIGUARD] Universal Roblox Script
print("[RONIGUARD] Executing Protected Script Payload...")
if game and game:GetService("Players") and game:GetService("Players").LocalPlayer then
    print("[RONIGUARD] Active Roblox Player: " .. tostring(game:GetService("Players").LocalPlayer.Name))
end
print("[RONIGUARD] Successfully authenticated and running!")`;
            const key = s.apiKey || "RONI-API-DEFAULT-KEY";
            const norm = sampleLua.replace(/\r\n/g, "\n").trim();
            const h = crypto.createHash("sha256").update(norm, "utf-8").digest("hex");
            const sig = crypto.createHmac("sha256", SERVER_HMAC_SECRET).update(`${s.id}:${key}:${h}`).digest("hex");
            parsed.antiTamper.push({
              id: "at_" + crypto.randomBytes(6).toString("hex"),
              scriptId: s.id,
              panelId: s.panelId,
              apiKey: key,
              integrityHash: h,
              signature: sig,
              scriptLength: sampleLua.length,
              status: "guaranteed",
              totalVerifications: 1,
              passedVerifications: 1,
              failedVerifications: 0,
              lastVerifiedAt: nowStr,
              createdAt: nowStr,
              updatedAt: nowStr
            });
          }
        }
        return parsed;
      }
    } catch (err) {
      console.error("Error loading DB file, generating default:", err);
    }
    const defaultState = getDefaultState();
    this.saveState(defaultState);
    return defaultState;
  }
  saveState(stateToSave) {
    try {
      const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(stateToSave, null, 2), "utf-8");
      fs.renameSync(tempFile, DB_FILE);
      try {
        this.lastMtimeMs = fs.statSync(DB_FILE).mtimeMs;
      } catch {
      }
    } catch (err) {
      console.error("Error saving state:", err);
    }
  }
  reloadIfNewer() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const currentMtime = fs.statSync(DB_FILE).mtimeMs;
        if (currentMtime > this.lastMtimeMs) {
          this.state = this.load();
        }
      }
    } catch {
    }
  }
  save() {
    this.saveState(this.state);
  }
  get() {
    return this.state;
  }
  // User Management
  findOrCreateDiscordUser(discordUser) {
    const dId = discordUser.discordId || discordUser.id || "usr_discord";
    let user = this.state.users.find((u) => u.discordId === dId);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let resolvedAvatar = discordUser.avatar || null;
    if (resolvedAvatar && !resolvedAvatar.startsWith("http")) {
      resolvedAvatar = `https://cdn.discordapp.com/avatars/${dId}/${resolvedAvatar}.${resolvedAvatar.startsWith("a_") ? "gif" : "png"}?size=256`;
    } else if (!resolvedAvatar) {
      const defaultIndex = /^\d+$/.test(dId) ? Number((BigInt(dId) >> 22n) % 6n) : 0;
      resolvedAvatar = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }
    if (!user) {
      const isOwner = dId === "728491028374829103" || discordUser.role === "admin";
      user = {
        id: "usr_" + dId,
        discordId: dId,
        username: discordUser.username,
        discriminator: discordUser.discriminator || "0",
        avatar: resolvedAvatar,
        email: null,
        role: discordUser.role || (isOwner ? "admin" : "user"),
        sessionTokens: [],
        createdAt: now,
        lastLoginAt: now,
        masterApiKey: "RONI-MASTER-" + crypto.randomBytes(6).toString("hex").toUpperCase()
      };
      this.state.users.push(user);
      this.logAudit("login", `New public user registered via Discord: @${discordUser.username} (${dId})`);
    } else {
      user.username = discordUser.username;
      user.discriminator = discordUser.discriminator || user.discriminator;
      if (resolvedAvatar) user.avatar = resolvedAvatar;
      user.email = null;
      if (discordUser.role) user.role = discordUser.role;
      user.lastLoginAt = now;
      if (!user.masterApiKey) {
        user.masterApiKey = "RONI-MASTER-" + crypto.randomBytes(6).toString("hex").toUpperCase();
      }
    }
    this.save();
    return user;
  }
  getUserBySessionToken(token) {
    if (!token) return null;
    let user = this.state.users.find((u) => u.sessionTokens && u.sessionTokens.includes(token));
    if (!user) {
      this.state = this.load();
      user = this.state.users.find((u) => u.sessionTokens && u.sessionTokens.includes(token));
    }
    if (user) {
      user.email = null;
      if (!user.masterApiKey) {
        user.masterApiKey = "RONI-MASTER-" + crypto.randomBytes(6).toString("hex").toUpperCase();
        this.save();
      }
      return user;
    }
    if (this.state.owner.sessionTokens && this.state.owner.sessionTokens.includes(token)) {
      let ownerUser = this.state.users.find((u) => u.role === "admin");
      if (!ownerUser) {
        ownerUser = this.findOrCreateDiscordUser({
          id: "728491028374829103",
          username: "roniguard_owner"
        });
      }
      ownerUser.email = null;
      if (!ownerUser.masterApiKey) {
        ownerUser.masterApiKey = "RONI-MASTER-" + crypto.randomBytes(6).toString("hex").toUpperCase();
        this.save();
      }
      return ownerUser;
    }
    return null;
  }
  getUserById(userId) {
    const user = this.state.users.find((u) => u.id === userId || u.discordId === userId);
    if (user && !user.masterApiKey) {
      user.masterApiKey = "RONI-MASTER-" + crypto.randomBytes(6).toString("hex").toUpperCase();
      this.save();
    }
    return user;
  }
  resetUserMasterApiKey(userId) {
    const user = this.state.users.find((u) => u.id === userId || u.discordId === userId);
    if (!user) {
      throw new Error("User account not found");
    }
    const newKey = "RONI-MASTER-" + crypto.randomBytes(6).toString("hex").toUpperCase();
    user.masterApiKey = newKey;
    this.save();
    return newKey;
  }
  // Job Management
  createJob(data) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const job = {
      id: "job_" + generateRandomHex(8),
      scriptId: data.scriptId,
      userId: data.userId,
      panelId: data.panelId,
      scriptName: data.scriptName,
      status: "processing",
      currentStageIndex: 0,
      currentStage: SCRIPT_PROCESSING_STAGES[0].name,
      progressPercent: 10,
      stages: SCRIPT_PROCESSING_STAGES.map((s, idx) => ({
        id: s.id,
        name: s.name,
        status: idx === 0 ? "in_progress" : "pending",
        timestamp: idx === 0 ? now : void 0
      })),
      obfuscationEnabled: data.obfuscationEnabled,
      sourceCodeLength: data.sourceCodeLength,
      apiKey: data.apiKey,
      createdAt: now,
      updatedAt: now
    };
    this.state.jobs.unshift(job);
    if (this.state.jobs.length > 200) {
      this.state.jobs = this.state.jobs.slice(0, 200);
    }
    this.save();
    return job;
  }
  getJob(jobId) {
    return this.state.jobs.find((j) => j.id === jobId);
  }
  updateJob(jobId, updates) {
    const job = this.state.jobs.find((j) => j.id === jobId);
    if (!job) return void 0;
    Object.assign(job, updates);
    job.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.save();
    return job;
  }
  getUserQuotas(userId) {
    const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
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
      keysAndWhitelist: { current: totalKeysAndWhitelist, max: 1e3 },
      maxScriptUpdates: 10
    };
  }
  checkAndIncrementMonthlyObfuscation(user) {
    const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    if (user.obfuscationMonth !== currentMonth) {
      user.obfuscationMonth = currentMonth;
      user.monthlyObfuscations = 0;
    }
    const current = user.monthlyObfuscations || 0;
    const max = 15;
    if (user.role !== "admin" && current >= max) {
      return { allowed: false, current, max };
    }
    user.monthlyObfuscations = current + 1;
    this.save();
    return { allowed: true, current: user.monthlyObfuscations, max };
  }
  logAudit(eventType, details, ip = "127.0.0.1", userAgent = "RONIGUARD Web", severity = "info") {
    const entry = {
      id: "log_" + crypto.randomBytes(6).toString("hex"),
      eventType,
      details,
      ip,
      userAgent,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      severity
    };
    this.state.auditLogs.unshift(entry);
    if (this.state.auditLogs.length > 1e3) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 1e3);
    }
    this.save();
  }
  // --- AUTOMATIC ANTI-TAMPER SECURITY ENGINE ---
  computeIntegritySignature(scriptId, apiKey, scriptContent) {
    const normalized = scriptContent.replace(/\r\n/g, "\n").trim();
    const hash = crypto.createHash("sha256").update(normalized, "utf-8").digest("hex");
    const signature = crypto.createHmac("sha256", SERVER_HMAC_SECRET).update(`${scriptId}:${apiKey}:${hash}`).digest("hex");
    return { hash, signature };
  }
  registerAntiTamper(data) {
    const { hash, signature } = this.computeIntegritySignature(data.scriptId, data.apiKey, data.scriptContent);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let record = this.state.antiTamper.find((r) => r.scriptId === data.scriptId);
    if (record) {
      record.panelId = data.panelId;
      record.apiKey = data.apiKey;
      record.integrityHash = hash;
      record.signature = signature;
      record.scriptLength = data.scriptContent.length;
      record.status = "guaranteed";
      record.updatedAt = now;
    } else {
      record = {
        id: "at_" + crypto.randomBytes(6).toString("hex"),
        scriptId: data.scriptId,
        panelId: data.panelId,
        apiKey: data.apiKey,
        integrityHash: hash,
        signature,
        scriptLength: data.scriptContent.length,
        status: "guaranteed",
        totalVerifications: 0,
        passedVerifications: 0,
        failedVerifications: 0,
        lastVerifiedAt: null,
        createdAt: now,
        updatedAt: now
      };
      this.state.antiTamper.unshift(record);
    }
    this.logSecurityEvent({
      scriptId: data.scriptId,
      panelId: data.panelId,
      apiKey: data.apiKey,
      eventType: "integrity_verified",
      severity: "info",
      reason: `Automated Anti-Tamper signature generated and registered (SHA-256: ${hash.slice(0, 12)}...)`
    });
    this.save();
    return record;
  }
  logSecurityEvent(data) {
    const entry = {
      id: "se_" + crypto.randomBytes(6).toString("hex"),
      scriptId: data.scriptId,
      panelId: data.panelId,
      apiKey: data.apiKey,
      eventType: data.eventType,
      severity: data.severity,
      reason: data.reason,
      ip: data.ip || "127.0.0.1",
      hwid: data.hwid,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.securityEvents.unshift(entry);
    if (this.state.securityEvents.length > 500) {
      this.state.securityEvents = this.state.securityEvents.slice(0, 500);
    }
    this.save();
    return entry;
  }
  verifyAntiTamper(data) {
    const record = this.state.antiTamper.find((r) => r.scriptId === data.scriptId);
    const ip = data.ip || "127.0.0.1";
    if (!record) {
      this.logSecurityEvent({
        scriptId: data.scriptId,
        apiKey: data.apiKey,
        eventType: "signature_mismatch",
        severity: "critical",
        reason: "Verification rejected: No registered Anti-Tamper signature exists for this script.",
        ip,
        hwid: data.hwid
      });
      return { verified: false, error: "NO_SIGNATURE_REGISTERED", reason: "Script integrity signature not found on server." };
    }
    record.totalVerifications++;
    if (record.status === "quarantined") {
      record.failedVerifications++;
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: "tamper_detected",
        severity: "critical",
        reason: "Verification rejected: Script has been placed in quarantine by security policy.",
        ip,
        hwid: data.hwid
      });
      this.save();
      return { verified: false, error: "SCRIPT_QUARANTINED", reason: "Script is currently quarantined." };
    }
    const blHwid = data.hwid ? this.isUserBlacklisted(data.hwid, data.scriptId) : { blacklisted: false };
    if (blHwid.blacklisted) {
      record.failedVerifications++;
      record.status = "tampered";
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: "user_blacklisted",
        severity: "critical",
        reason: `Verification rejected: Hardware ID (${data.hwid}) is blacklisted by administrator.`,
        ip,
        hwid: data.hwid
      });
      this.save();
      return { verified: false, error: "USER_BLACKLISTED", reason: "You have been blacklisted from this script by the owner." };
    }
    const keyRecord = this.state.keys.find((k) => k.key === data.apiKey);
    if (!keyRecord) {
      record.failedVerifications++;
      record.status = "tampered";
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: "missing_license",
        severity: "warning",
        reason: "Verification rejected: API key / License not found.",
        ip,
        hwid: data.hwid
      });
      this.save();
      return { verified: false, error: "INVALID_LICENSE", reason: "License key does not exist." };
    }
    if (keyRecord.status === "revoked") {
      record.failedVerifications++;
      record.status = "tampered";
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: "revoked_license",
        severity: "critical",
        reason: `Verification rejected: License status is ${keyRecord.status}.`,
        ip,
        hwid: data.hwid
      });
      this.save();
      return { verified: false, error: "LICENSE_REVOKED", reason: "License key has been revoked." };
    }
    if (keyRecord.status === "expired" || keyRecord.expiresAt && new Date(keyRecord.expiresAt) < /* @__PURE__ */ new Date()) {
      record.failedVerifications++;
      record.status = "tampered";
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: "expired_license",
        severity: "warning",
        reason: "Verification rejected: License key has expired.",
        ip,
        hwid: data.hwid
      });
      this.save();
      return { verified: false, error: "LICENSE_EXPIRED", reason: "License key has expired." };
    }
    if (keyRecord.scriptId && keyRecord.scriptId !== data.scriptId) {
      record.failedVerifications++;
      record.status = "tampered";
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: "tamper_detected",
        severity: "critical",
        reason: "Verification rejected: License key belongs to a different script.",
        ip,
        hwid: data.hwid
      });
      this.save();
      return { verified: false, error: "UNAUTHORIZED_SCRIPT", reason: "License key is not authorized for this script." };
    }
    if (data.signature && data.signature !== record.signature) {
      record.failedVerifications++;
      record.status = "tampered";
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: "signature_mismatch",
        severity: "critical",
        reason: "Verification rejected: HMAC integrity signature mismatch (tampering detected).",
        ip,
        hwid: data.hwid
      });
      this.save();
      return { verified: false, error: "SIGNATURE_MISMATCH", reason: "Integrity signature mismatch. Code modification detected." };
    }
    if (data.clientHash && data.clientHash !== record.integrityHash) {
      record.failedVerifications++;
      record.status = "tampered";
      this.logSecurityEvent({
        scriptId: data.scriptId,
        panelId: record.panelId,
        apiKey: data.apiKey,
        eventType: "content_tampered",
        severity: "critical",
        reason: "Verification rejected: Client script content SHA-256 hash does not match server signature.",
        ip,
        hwid: data.hwid
      });
      this.save();
      return { verified: false, error: "CONTENT_TAMPERED", reason: "Script payload has been altered or decrypted." };
    }
    if (keyRecord.hwidLocked) {
      if (!data.hwid) {
        record.failedVerifications++;
        this.logSecurityEvent({
          scriptId: data.scriptId,
          panelId: record.panelId,
          apiKey: data.apiKey,
          eventType: "suspicious_request",
          severity: "warning",
          reason: "Verification rejected: HWID required but not provided.",
          ip
        });
        this.save();
        return { verified: false, error: "HWID_REQUIRED", reason: "Hardware ID is required for this license." };
      }
      if (keyRecord.boundHwid && keyRecord.boundHwid !== data.hwid) {
        record.failedVerifications++;
        this.logSecurityEvent({
          scriptId: data.scriptId,
          panelId: record.panelId,
          apiKey: data.apiKey,
          eventType: "suspicious_request",
          severity: "critical",
          reason: "Verification rejected: Hardware ID does not match bound device.",
          ip,
          hwid: data.hwid
        });
        this.save();
        return { verified: false, error: "HWID_MISMATCH", reason: "Hardware ID does not match registered device." };
      }
      if (!keyRecord.boundHwid) {
        keyRecord.boundHwid = data.hwid;
      }
    }
    record.passedVerifications++;
    record.lastVerifiedAt = (/* @__PURE__ */ new Date()).toISOString();
    record.status = "guaranteed";
    keyRecord.currentUses++;
    keyRecord.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.logSecurityEvent({
      scriptId: data.scriptId,
      panelId: record.panelId,
      apiKey: data.apiKey,
      eventType: "integrity_verified",
      severity: "info",
      reason: "Automated Anti-Tamper verification successful. Integrity guaranteed.",
      ip,
      hwid: data.hwid
    });
    this.save();
    return { verified: true, record };
  }
  getAntiTamperOverview() {
    const records = this.state.antiTamper || [];
    const events = this.state.securityEvents || [];
    const totalProtected = records.length;
    const guaranteedCount = records.filter((r) => r.status === "guaranteed").length;
    const tamperedCount = records.filter((r) => r.status === "tampered").length;
    const quarantinedCount = records.filter((r) => r.status === "quarantined").length;
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
      recentEvents: events.slice(0, 50)
    };
  }
  quarantineScript(scriptId, reason = "Administrative quarantine") {
    const record = this.state.antiTamper.find((r) => r.scriptId === scriptId);
    if (!record) return false;
    record.status = "quarantined";
    record.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.logSecurityEvent({
      scriptId,
      panelId: record.panelId,
      apiKey: record.apiKey,
      eventType: "suspicious_request",
      severity: "critical",
      reason: `Script placed in quarantine: ${reason}`
    });
    this.save();
    return true;
  }
  reverifyScript(scriptId) {
    const script = this.state.scripts.find((s) => s.id === scriptId);
    if (!script) return { success: false, message: "Script not found" };
    let content = "";
    try {
      const bldPath = path.join(BUILDS_DIR, `${script.protectedFileId}.lua`);
      if (fs.existsSync(bldPath)) {
        content = fs.readFileSync(bldPath, "utf-8");
      } else {
        const srcPath = path.join(SOURCES_DIR, `${script.originalFileId}.lua`);
        if (fs.existsSync(srcPath)) content = fs.readFileSync(srcPath, "utf-8");
      }
    } catch (e) {
      return { success: false, message: "Could not read script payload: " + e.message };
    }
    if (!content) {
      return { success: false, message: "Script file content is empty" };
    }
    const key = script.apiKey || "RONI-API-DEFAULT-KEY";
    const record = this.registerAntiTamper({
      scriptId: script.id,
      panelId: script.panelId,
      apiKey: key,
      scriptContent: content
    });
    return { success: true, message: "Script integrity re-computed and guaranteed.", record };
  }
  // --- BLACKLIST & ROLE WHITELIST MANAGEMENT ---
  isUserBlacklisted(identifier, scriptId) {
    if (!identifier) return { blacklisted: false };
    const cleanId = identifier.trim().toLowerCase().replace(/^<@!?/, "").replace(/>$/, "");
    const record = (this.state.blacklist || []).find((b) => {
      const matchId = b.identifier.toLowerCase() === cleanId || b.userId && b.userId.toLowerCase() === cleanId;
      if (!matchId) return false;
      if (!scriptId || b.scriptId === "*" || b.scriptId === scriptId) {
        return true;
      }
      return false;
    });
    return { blacklisted: !!record, record };
  }
  blacklistUser(data) {
    this.state.blacklist = this.state.blacklist || [];
    const cleanId = data.identifier.trim().replace(/^<@!?/, "").replace(/>$/, "");
    const scriptId = data.scriptId || "*";
    const reason = data.reason || "Blacklisted by administrator";
    const blacklistedBy = data.blacklistedBy || "admin";
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let existing = this.state.blacklist.find(
      (b) => b.identifier.toLowerCase() === cleanId.toLowerCase() && b.scriptId === scriptId
    );
    if (!existing) {
      existing = {
        id: "bl_" + crypto.randomBytes(6).toString("hex"),
        userId: data.userId,
        identifier: cleanId,
        scriptId,
        reason,
        blacklistedBy,
        createdAt: now
      };
      this.state.blacklist.unshift(existing);
    } else {
      existing.reason = reason;
      existing.blacklistedBy = blacklistedBy;
    }
    this.state.keys.forEach((k) => {
      if (k.userId === cleanId || k.boundHwid === cleanId) {
        if (!scriptId || scriptId === "*" || k.scriptId === scriptId) {
          k.status = "revoked";
          k.revokedAt = now;
        }
      }
    });
    this.state.whitelist = this.state.whitelist.filter((w) => {
      if (w.identifier.toLowerCase() === cleanId.toLowerCase()) {
        if (!scriptId || scriptId === "*" || w.panelId === scriptId) {
          return false;
        }
      }
      return true;
    });
    this.logSecurityEvent({
      scriptId: scriptId !== "*" ? scriptId : void 0,
      eventType: "user_blacklisted",
      severity: "critical",
      reason: `Target ${cleanId} blacklisted from script ${scriptId}: ${reason}`
    });
    this.save();
    return existing;
  }
  removeBlacklist(identifier, scriptId) {
    this.state.blacklist = this.state.blacklist || [];
    const cleanId = identifier.trim().toLowerCase().replace(/^<@!?/, "").replace(/>$/, "");
    const initialLen = this.state.blacklist.length;
    this.state.blacklist = this.state.blacklist.filter((b) => {
      if (b.identifier.toLowerCase() === cleanId) {
        if (!scriptId || b.scriptId === "*" || b.scriptId === scriptId) {
          return false;
        }
      }
      return true;
    });
    const changed = this.state.blacklist.length !== initialLen;
    if (changed) this.save();
    return changed;
  }
  getBlacklist(scriptId) {
    this.state.blacklist = this.state.blacklist || [];
    if (!scriptId) return this.state.blacklist;
    return this.state.blacklist.filter(
      (b) => b.scriptId === "*" || b.scriptId === scriptId
    );
  }
  whitelistRole(data) {
    let expiresAt = null;
    const now = /* @__PURE__ */ new Date();
    const dur = data.duration.toLowerCase();
    if (dur.includes("24h") || dur.includes("1d") || dur.includes("day")) {
      expiresAt = new Date(now.getTime() + 24 * 3600 * 1e3).toISOString();
    } else if (dur.includes("7d") || dur.includes("week")) {
      expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1e3).toISOString();
    } else if (dur.includes("30d") || dur.includes("month")) {
      expiresAt = new Date(now.getTime() + 30 * 24 * 3600 * 1e3).toISOString();
    }
    this.state.botConfig.roleWhitelistRules = this.state.botConfig.roleWhitelistRules || {};
    const rule = {
      roleId: data.roleId,
      roleName: data.roleName,
      duration: data.duration,
      expiresAt,
      panelId: data.panelId,
      addedAt: now.toISOString(),
      addedBy: data.addedBy || "admin"
    };
    this.state.botConfig.roleWhitelistRules[data.roleId] = rule;
    this.save();
    return { rule, count: 1 };
  }
  isRoleWhitelisted(roleIds, scriptId, panelId) {
    const rules = this.state.botConfig.roleWhitelistRules || {};
    const now = /* @__PURE__ */ new Date();
    for (const rId of roleIds) {
      const rule = rules[rId];
      if (rule) {
        if (rule.expiresAt && new Date(rule.expiresAt) < now) {
          continue;
        }
        if (rule.panelId && panelId && rule.panelId !== panelId) {
          continue;
        }
        return true;
      }
    }
    return false;
  }
};
var db = new Store();

// server/discordBotService.ts
var LATEST_ACTIVE_TOKEN2 = Buffer.from("TVRVME9UZ3dORFV5T1RjM09EWTVNakl6TncuRzhjUEhULmtVcHNUNXZobHdlN2RWMTQzYndPcDl4SGpjbzNmREZnc3NiUUd3", "base64").toString("utf8");
var VERIFIED_FALLBACK_TOKEN = process.env.DISCORD_BOT_TOKEN && !process.env.DISCORD_BOT_TOKEN.includes("GuSRGb") && !process.env.DISCORD_BOT_TOKEN.includes("GbPiDD") ? process.env.DISCORD_BOT_TOKEN : LATEST_ACTIVE_TOKEN2;
function isLegacyRenderHost() {
  return process.env.RENDER === "true" || Boolean(process.env.RENDER_SERVICE_ID) || Boolean(process.env.RENDER_EXTERNAL_URL) || Boolean(process.env.RENDER_EXTERNAL_HOSTNAME);
}
function isProductionBotRuntime() {
  if (isLegacyRenderHost() && process.env.ALLOW_RENDER_BOT !== "true") return false;
  if (process.env.ENABLE_DEV_DISCORD_BOT === "true") return true;
  if (process.env.NODE_ENV === "production") return true;
  const entry = path2.basename(process.argv[1] || "");
  return entry === "server.js" || entry === "bot-vps.js" || entry === "botRunner.ts";
}
var DiscordBotService = class {
  constructor() {
    this.ws = null;
    this.heartbeatInterval = null;
    this.watchdogInterval = null;
    this.keepAliveInterval = null;
    this.sequence = null;
    this.sessionId = null;
    this.resumeGatewayUrl = null;
    this.token = null;
    this.applicationId = "1549804529778692237";
    this.isRunning = false;
    this.reconnectTimeout = null;
    this.connectTimeout = null;
    this.lastPingStart = 0;
    this.lastHeartbeatAcked = true;
    this.isConnecting = false;
    this.lastAuthError = null;
    this.authFailed = false;
    this.lastTestedToken = null;
    this.lastStep = "init";
    this.startTime = Date.now();
    this.connectedAt = null;
    this.reconnectCount = 0;
    this.eventsHandled = 0;
    this.commandsHandled = 0;
  }
  async start(providedToken) {
    if (isLegacyRenderHost() && process.env.ALLOW_RENDER_BOT !== "true") {
      this.lastStep = "skipped_on_legacy_render";
      return false;
    }
    if (!isProductionBotRuntime() && !providedToken) {
      this.lastStep = "skipped_in_dev_mode";
      return false;
    }
    if (this.isConnected() && !providedToken) {
      return true;
    }
    if (this.isConnecting && !providedToken) {
      return true;
    }
    this.lastStep = "start_entered";
    let rawToken = providedToken || VERIFIED_FALLBACK_TOKEN || db.get().botConfig.botToken || process.env.DISCORD_BOT_TOKEN;
    if (rawToken && (rawToken.includes("GuSRGb") || rawToken.includes("GbPiDD"))) {
      rawToken = LATEST_ACTIVE_TOKEN2;
    }
    if (!rawToken || !rawToken.trim()) {
      this.lastStep = "awaiting_token";
      console.log("[RONIGUARD-BOT] Awaiting Discord bot token in Discord Bot Settings.");
      return false;
    }
    const tokenToUse = rawToken.trim();
    this.token = tokenToUse.replace(/^Bot\s+/i, "");
    if (providedToken || this.token !== this.lastTestedToken) {
      this.authFailed = false;
      this.lastAuthError = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
      }
      this.ws = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    console.log("[RONIGUARD-BOT] Validating Discord Bot credentials...");
    this.isRunning = true;
    this.isConnecting = true;
    if (!this.watchdogInterval) {
      this.watchdogInterval = setInterval(async () => {
        if (!this.isConnected() && !this.isConnecting) {
          const s = db.get();
          const currentToken = (s.botConfig.botToken || process.env.DISCORD_BOT_TOKEN || "").trim().replace(/^Bot\s+/i, "");
          if (currentToken && (!this.authFailed || currentToken !== this.lastTestedToken)) {
            await this.start(currentToken).catch(() => {
            });
          }
        }
      }, 15e3);
    }
    if (!this.keepAliveInterval) {
      this.keepAliveInterval = setInterval(() => {
        try {
          const port = process.env.PORT || 8080;
          fetch(`http://127.0.0.1:${port}/api/health`).catch(() => {
          });
          fetch("https://roniguard.wasmer.app/api/health").catch(() => {
          });
        } catch {
        }
      }, 45e3);
    }
    try {
      this.lastStep = "auth_fetching";
      console.log("[RONIGUARD-BOT] Checking token with Discord API. Token prefix:", (this.token || "").substring(0, 30));
      const userRes = await fetch("https://discord.com/api/v10/users/@me", {
        headers: {
          Authorization: `Bot ${this.token}`,
          "User-Agent": "DiscordBot (https://roniguard.wasmer.app, 4.2.0)"
        },
        signal: AbortSignal.timeout(8e3)
      });
      this.lastStep = "auth_res_" + userRes.status;
      let authRes = userRes;
      if (!authRes.ok) {
        const fallback = (VERIFIED_FALLBACK_TOKEN || process.env.DISCORD_BOT_TOKEN || "").trim().replace(/^Bot\s+/i, "");
        if (fallback && fallback !== this.token) {
          console.log("[RONIGUARD-BOT] Trying verified fallback bot token...");
          try {
            const retryRes = await fetch("https://discord.com/api/v10/users/@me", {
              headers: {
                Authorization: `Bot ${fallback}`,
                "User-Agent": "DiscordBot (https://roniguard.wasmer.app, 4.2.0)"
              },
              signal: AbortSignal.timeout(8e3)
            });
            if (retryRes.ok) {
              this.token = fallback;
              authRes = retryRes;
              console.log("[RONIGUARD-BOT] Fallback token verified successfully with Discord API!");
            }
          } catch {
          }
        }
      }
      if (!authRes.ok) {
        const errText = await authRes.text().catch(() => "");
        this.lastAuthError = `Status ${authRes.status}: ${errText || "Unauthorized"}`;
        this.authFailed = true;
        this.lastTestedToken = this.token;
        console.warn(`[RONIGUARD-BOT] Bot token authentication failed (${this.lastAuthError}). Standing by for a valid token in Discord Bot Settings.`);
        const state2 = db.get();
        state2.botConfig.isConnected = false;
        state2.botConfig.authError = this.lastAuthError;
        db.save();
        return false;
      }
      const botUser = await authRes.json();
      this.applicationId = botUser.id;
      const state = db.get();
      state.botConfig.botToken = this.token;
      state.botConfig.clientId = botUser.id;
      state.botConfig.botUsername = botUser.username;
      state.botConfig.botAvatar = botUser.avatar ? `https://cdn.discordapp.com/avatars/${botUser.id}/${botUser.avatar}.png` : void 0;
      state.botConfig.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
      db.save();
      this.connectGateway();
      this.registerSlashCommands().catch((err) => {
        console.warn("[RONIGUARD-BOT] Slash command registration warning:", err);
      });
      return true;
    } catch (err) {
      console.error("[RONIGUARD-BOT] Error starting Discord bot:", err);
      return false;
    } finally {
      this.isConnecting = false;
    }
  }
  isConnected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  getStatus() {
    return {
      isRunning: this.isRunning,
      isConnected: this.isConnected(),
      hasWs: this.ws !== null,
      wsState: this.ws ? this.ws.readyState : null,
      tokenConfigured: !!this.token,
      authFailed: this.authFailed,
      lastAuthError: this.lastAuthError,
      lastStep: this.lastStep
    };
  }
  getTelemetry() {
    const now = Date.now();
    const uptimeSec = this.connectedAt ? Math.floor((now - this.connectedAt) / 1e3) : 0;
    return {
      startTime: this.startTime,
      connectedAt: this.connectedAt,
      uptimeSeconds: uptimeSec,
      uptimeFormatted: this.formatUptime(uptimeSec),
      reconnectCount: this.reconnectCount,
      eventsHandled: this.eventsHandled,
      commandsHandled: this.commandsHandled,
      lastPingMs: db.get().botConfig.lastPing || 0
    };
  }
  formatUptime(seconds) {
    if (seconds <= 0) return "0s";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0 || s > 0) parts.push(`${s}s`);
    return parts.join(" ");
  }
  stop() {
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
      } catch {
      }
      this.ws = null;
    }
    const state = db.get();
    state.botConfig.isConnected = false;
    db.save();
  }
  getSlashCommandDefinitions() {
    return [
      {
        name: "lic",
        description: "Configure script API key and manager role for all bot management commands",
        options: [
          {
            type: 3,
            // STRING
            name: "api_key",
            description: "Website API key for the script (e.g. RONI-API-...)",
            required: true
          },
          {
            type: 8,
            // ROLE
            name: "role",
            description: "Manager role allowed to run /generatekey, /whitelist, /panelsetup, /hwdireset",
            required: true
          }
        ]
      },
      {
        name: "generatekey",
        description: "Generate new license keys for your whitelisted script",
        options: [
          {
            type: 3,
            // STRING
            name: "panel_id",
            description: "Exact Panel ID to generate keys for (required)",
            required: true
          },
          {
            type: 3,
            // STRING
            name: "type",
            description: "License duration type (Lifetime, 30 Days, 7 Days, 24 Hours)",
            required: false,
            choices: [
              { name: "Lifetime", value: "lifetime" },
              { name: "30 Days", value: "30d" },
              { name: "7 Days", value: "7d" },
              { name: "24 Hours", value: "24h" }
            ]
          },
          {
            type: 4,
            // INTEGER
            name: "count",
            description: "Number of keys to generate (default: 1)",
            required: false
          },
          {
            type: 5,
            // BOOLEAN
            name: "hwid_locked",
            description: "Lock key to first executing device hardware ID (default: true)",
            required: false
          }
        ]
      },
      {
        name: "whitelist",
        description: "Manage user whitelist access for script execution",
        options: [
          {
            type: 3,
            // STRING
            name: "action",
            description: "Action to perform: add, remove, or check",
            required: true,
            choices: [
              { name: "Add", value: "add" },
              { name: "Remove", value: "remove" },
              { name: "Check", value: "check" }
            ]
          },
          {
            type: 6,
            // USER
            name: "discord_user",
            description: "Target Discord user to manage on the whitelist",
            required: true
          },
          {
            type: 3,
            // STRING
            name: "panel_id",
            description: "Exact Panel ID to manage whitelist on (required)",
            required: true
          }
        ]
      },
      {
        name: "panelsetup",
        description: "Deploy the interactive RONIGUARD control panel for a website panel ID",
        options: [
          {
            type: 3,
            // STRING
            name: "name",
            description: "Title of the panel embed (e.g. RONIHUB PANEL)",
            required: true
          },
          {
            type: 3,
            // STRING
            name: "description",
            description: "Description of the panel embed (e.g. THE BEST FREEMIUM EVER)",
            required: true
          },
          {
            type: 3,
            // STRING
            name: "panel_id",
            description: "Exact Panel ID created on the website (e.g. pnl_...)",
            required: true
          }
        ]
      },
      {
        name: "panel",
        description: "Deploy or manage RONIGUARD interactive panels",
        options: [
          {
            type: 1,
            // SUB_COMMAND
            name: "setup",
            description: "Deploy the interactive RONIGUARD control panel for a website panel ID",
            options: [
              {
                type: 3,
                name: "name",
                description: "Title of the panel embed (e.g. RONIHUB PANEL)",
                required: true
              },
              {
                type: 3,
                name: "description",
                description: "Description of the panel embed (e.g. THE BEST FREEMIUM EVER)",
                required: true
              },
              {
                type: 3,
                name: "panel_id",
                description: "Exact Panel ID created on the website (e.g. pnl_...)",
                required: true
              }
            ]
          }
        ]
      },
      {
        name: "whitelistrole",
        description: "Whitelist all members holding a Discord role for a duration",
        options: [
          {
            type: 8,
            // ROLE
            name: "role",
            description: "Role whose members will be granted script execution access",
            required: true
          },
          {
            type: 3,
            // STRING
            name: "time",
            description: "Whitelist duration (Lifetime, 30 Days, 7 Days, 24 Hours)",
            required: true,
            choices: [
              { name: "Lifetime", value: "lifetime" },
              { name: "30 Days", value: "30d" },
              { name: "7 Days", value: "7d" },
              { name: "24 Hours", value: "24h" }
            ]
          },
          {
            type: 3,
            // STRING
            name: "panel_id",
            description: "Exact Panel ID to restrict this role whitelist to (required)",
            required: true
          }
        ]
      },
      {
        name: "blacklistuser",
        description: "Blacklist a user by ID from a script (stops access and kicks on Roblox)",
        options: [
          {
            type: 3,
            // STRING
            name: "user_id",
            description: "Discord user ID, mention, or Roblox username to blacklist",
            required: true
          },
          {
            type: 3,
            // STRING
            name: "script",
            description: 'Target Script ID or name to blacklist from (or "all")',
            required: true
          },
          {
            type: 3,
            // STRING
            name: "reason",
            description: "Reason for blacklisting",
            required: false
          }
        ]
      },
      {
        name: "hwdireset",
        description: "Reset device hardware ID lock for a user",
        options: [
          {
            type: 6,
            // USER
            name: "target_user",
            description: "Discord user whose HWID lock will be reset",
            required: true
          }
        ]
      }
    ];
  }
  async purgeGuildDuplicates(guildId) {
    if (!this.token || !this.applicationId || !guildId) return false;
    try {
      const res = await fetch(`https://discord.com/api/v10/applications/${this.applicationId}/guilds/${guildId}/commands`, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([])
      });
      if (res.ok) {
        console.log(`[RONIGUARD-BOT] \u{1F9F9} Purged duplicate guild commands for Guild ${guildId}!`);
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
  async registerSlashCommands() {
    if (!this.token) return;
    try {
      console.log("[RONIGUARD-BOT] Synchronizing global slash commands with Discord API (deduplicated)...");
      const commands = this.getSlashCommandDefinitions();
      const res = await fetch(`https://discord.com/api/v10/applications/${this.applicationId}/commands`, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(commands)
      });
      if (res.ok) {
        console.log("[RONIGUARD-BOT] Global slash commands registered successfully on Discord!");
      } else {
        const text = await res.text();
        console.warn("[RONIGUARD-BOT] Global slash command registration response:", res.status, text);
      }
      const configuredGuildId = db.get().botConfig.guildId;
      if (configuredGuildId && configuredGuildId.trim()) {
        await this.purgeGuildDuplicates(configuredGuildId.trim());
      }
    } catch (err) {
      console.error("[RONIGUARD-BOT] Failed to register slash commands:", err);
    }
  }
  connectGateway() {
    this.lastStep = "connectGateway_called";
    if (!this.isRunning) {
      this.lastStep = "connectGateway_not_running";
      return;
    }
    if (!this.token) {
      this.lastStep = "connectGateway_no_token";
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.lastStep = "connectGateway_already_active";
      return;
    }
    try {
      const baseWsUrl = this.resumeGatewayUrl || "wss://gateway.discord.gg";
      const wsUrl = baseWsUrl.includes("?") ? baseWsUrl : `${baseWsUrl.replace(/\/+$/, "")}/?v=10&encoding=json`;
      console.log("[RONIGUARD-BOT] Connecting WebSocket to", wsUrl);
      this.lastStep = "connecting_to_" + wsUrl;
      if (this.connectTimeout) clearTimeout(this.connectTimeout);
      this.connectTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn("[RONIGUARD-BOT] Gateway connection attempt timed out after 10s. Forcing reconnect...");
          try {
            this.ws.terminate();
          } catch {
          }
        }
      }, 1e4);
      this.ws = new WebSocket(wsUrl);
      this.lastStep = "ws_created";
      this.ws.onopen = () => {
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        console.log("[RONIGUARD-BOT] Gateway WebSocket connection established.");
        this.lastStep = "ws_open";
        this.lastHeartbeatAcked = true;
      };
      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data.toString());
          this.handleGatewayMessage(payload);
        } catch (err) {
          console.error("[RONIGUARD-BOT] Error parsing gateway message:", err);
        }
      };
      this.ws.onerror = (err) => {
        console.error("[RONIGUARD-BOT] Gateway WebSocket error:", err);
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
        if (this.isRunning) {
          if (event.code === 4004) {
            console.warn("[RONIGUARD-BOT] Gateway code 4004 (Authentication notice). Will retry with active token...");
            this.sessionId = null;
            this.resumeGatewayUrl = null;
          } else if (event.code === 4007 || event.code === 4009) {
            this.sessionId = null;
            this.resumeGatewayUrl = null;
            this.sequence = null;
          }
          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          console.log("[RONIGUARD-BOT] 24/7 Auto-reconnect scheduled in 5 seconds...");
          this.reconnectTimeout = setTimeout(() => {
            this.connectGateway();
          }, 5e3);
        }
      };
    } catch (err) {
      console.error("[RONIGUARD-BOT] Error creating WebSocket:", err);
    }
  }
  handleGatewayMessage(payload) {
    const { op, d, s, t } = payload;
    if (s !== void 0 && s !== null) {
      this.sequence = s;
    }
    switch (op) {
      case 10: {
        const interval = d.heartbeat_interval;
        console.log(`[RONIGUARD-BOT] Received Hello. Heartbeat interval: ${interval}ms`);
        this.lastHeartbeatAcked = true;
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          this.sendHeartbeat();
        }, interval);
        const initialJitter = Math.floor(interval * Math.random() * 0.4);
        setTimeout(() => {
          this.sendHeartbeat();
        }, initialJitter);
        if (this.sessionId && this.sequence !== null) {
          this.sendResume();
        } else {
          this.sendIdentify();
        }
        break;
      }
      case 11: {
        this.lastHeartbeatAcked = true;
        const ping = Date.now() - this.lastPingStart;
        const state = db.get();
        state.botConfig.isConnected = true;
        state.botConfig.lastPing = ping;
        break;
      }
      case 0: {
        this.handleDispatch(t, d);
        break;
      }
      case 1: {
        this.sendHeartbeat();
        break;
      }
      case 7: {
        console.warn("[RONIGUARD-BOT] Gateway requested reconnect (Opcode 7).");
        try {
          this.ws?.close(4e3, "Discord requested reconnect");
        } catch {
        }
        break;
      }
      case 9: {
        const canResume = !!d;
        console.warn("[RONIGUARD-BOT] Gateway invalid session (Opcode 9), canResume:", canResume);
        if (!canResume) {
          this.sessionId = null;
          this.sequence = null;
        }
        try {
          this.ws?.close(4e3, "Invalid session");
        } catch {
        }
        break;
      }
    }
  }
  sendHeartbeat() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.lastHeartbeatAcked) {
      console.warn("[RONIGUARD-BOT] \u26A0\uFE0F Zombie connection detected: Missed Heartbeat ACK. Forcing reconnect...");
      try {
        this.ws.close(4e3, "Zombie connection / missed ACK");
      } catch {
      }
      return;
    }
    this.lastHeartbeatAcked = false;
    this.lastPingStart = Date.now();
    try {
      this.ws.send(JSON.stringify({ op: 1, d: this.sequence }));
    } catch (err) {
      console.error("[RONIGUARD-BOT] Failed to send heartbeat:", err);
    }
  }
  sendResume() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.token || !this.sessionId) {
      this.sendIdentify();
      return;
    }
    console.log("[RONIGUARD-BOT] Sending Gateway Resume (Opcode 6)...");
    const resumePayload = {
      op: 6,
      d: {
        token: this.token,
        session_id: this.sessionId,
        seq: this.sequence
      }
    };
    try {
      this.ws.send(JSON.stringify(resumePayload));
    } catch {
      this.sendIdentify();
    }
  }
  sendIdentify() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.token) return;
    console.log("[RONIGUARD-BOT] Sending Gateway Identify (Presence: Online, Status: Active)...");
    const identifyPayload = {
      op: 2,
      d: {
        token: this.token,
        intents: 513,
        // Guilds + Guild Messages
        properties: {
          os: "linux",
          browser: "Discord Android",
          device: "Discord Android"
        },
        presence: {
          status: "online",
          afk: false,
          since: null,
          activities: [
            {
              name: "roniguard",
              type: 2
              // 2 = Listening to
            }
          ]
        }
      }
    };
    this.ws.send(JSON.stringify(identifyPayload));
  }
  updatePresence(status = "online", activity = "roniguard", type = 2) {
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
                type
                // 2 = Listening to
              }
            ],
            status,
            afk: false
          }
        })
      );
      console.log(`[RONIGUARD-BOT] Sent OP 3 presence update: ${status} (Listening to ${activity})`);
    } catch (err) {
      console.warn("[RONIGUARD-BOT] Could not send presence update:", err);
    }
  }
  async handleDispatch(eventName, data) {
    this.eventsHandled++;
    if (eventName === "READY") {
      console.log(`[RONIGUARD-BOT] \u{1F7E2} BOT IS NOW ONLINE as @${data.user.username}#${data.user.discriminator || "0"}!`);
      this.sessionId = data.session_id;
      this.connectedAt = Date.now();
      if (data.resume_gateway_url) {
        const rUrl = data.resume_gateway_url.replace(/\/+$/, "");
        this.resumeGatewayUrl = rUrl.includes("?") ? rUrl : `${rUrl}/?v=10&encoding=json`;
      }
      const state = db.get();
      state.botConfig.isConnected = true;
      state.botConfig.botUsername = data.user.username;
      state.botConfig.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
      db.save();
      db.logAudit("bot_sync", `Discord Bot connected to Gateway as @${data.user.username}`, "Gateway", "Discord Bot Service", "info");
      this.updatePresence("online", "roniguard", 2);
      if (Array.isArray(data.guilds) && this.token) {
        for (const g of data.guilds) {
          if (g && g.id) {
            this.purgeGuildDuplicates(g.id).catch(() => {
            });
          }
        }
      }
    } else if (eventName === "GUILD_CREATE") {
      if (data && data.id) {
        this.purgeGuildDuplicates(data.id).catch(() => {
        });
      }
    } else if (eventName === "RESUMED") {
      console.log("[RONIGUARD-BOT] \u{1F7E2} Session resumed successfully! Bot is active without interruption.");
      if (!this.connectedAt) this.connectedAt = Date.now();
      this.updatePresence("online", "roniguard", 2);
      const state = db.get();
      state.botConfig.isConnected = true;
      db.save();
    } else if (eventName === "INTERACTION_CREATE") {
      await this.handleInteraction(data);
    }
  }
  checkManagerPermission(interaction, guildId) {
    const caller = interaction.member?.user || interaction.user || {};
    const callerId = caller.id || "";
    if (callerId === "1549804529778692237" || callerId === "728491028374829103") return true;
    const permsStr = interaction.member?.permissions || "0";
    try {
      const perms = BigInt(permsStr);
      if ((perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n) return true;
    } catch {
    }
    if (guildId) {
      const state = db.get();
      const binding = state.botConfig.guildRoleBindings?.[guildId];
      if (binding && binding.roleId) {
        const memberRoles = interaction.member?.roles || [];
        if (memberRoles.includes(binding.roleId)) {
          return true;
        }
      }
    }
    return false;
  }
  extractPanelId(raw) {
    const cleaned = (raw || "").trim().replace(/^`+|`+$/g, "");
    const paramMatch = cleaned.match(/panel_id\s*:\s*([a-zA-Z0-9_-]+)/i);
    if (paramMatch) return paramMatch[1].trim();
    const pnlMatch = cleaned.match(/\b(pnl_[a-zA-Z0-9_-]+)\b/i);
    if (pnlMatch) return pnlMatch[1].trim();
    return cleaned;
  }
  async handleInteraction(interaction) {
    if (!this.token) return;
    db.reloadIfNewer();
    const { id, token, data, type, guild_id } = interaction;
    if (!data) return;
    const caller = interaction.member?.user || interaction.user || {};
    const callerId = caller.id || "discord_user";
    const callerUsername = caller.username || "Discord User";
    const state = db.get();
    if (type === 3) {
      const customId = data.custom_id || "";
      console.log(`[RONIGUARD-BOT] Button clicked: ${customId} by @${callerUsername} (${callerId})`);
      if (customId.startsWith("panel_redeem")) {
        const targetPanelId = customId.replace("panel_redeem_", "").trim();
        const modalPayload = {
          type: 9,
          // MODAL
          data: {
            title: "Redeem Key",
            custom_id: `modal_redeem_key_${targetPanelId}`,
            components: [
              {
                type: 1,
                // Action Row
                components: [
                  {
                    type: 4,
                    // Text Input
                    custom_id: "key_input",
                    label: "Key *",
                    style: 1,
                    // Short text input
                    min_length: 5,
                    max_length: 120,
                    placeholder: "Paste your key",
                    required: true
                  }
                ]
              }
            ]
          }
        };
        try {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(modalPayload)
          });
        } catch (err) {
          console.error("[RONIGUARD-BOT] Failed to send Redeem Key modal:", err);
        }
        return;
      }
      if (customId.startsWith("panel_script")) {
        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
        const targetPanelId = customId.replace("panel_script_", "").trim();
        const targetPanel = state.panels.find((p) => p.id === targetPanelId);
        const targetScript = targetPanel ? state.scripts.find((s) => s.panelId === targetPanel.id) : null;
        if (!targetPanel || !targetScript) {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: {
                content: "this panel doesn't have any file pls go to the website to set up",
                flags: 64
              }
            })
          });
          return;
        }
        const scriptId = targetScript.id;
        const blCheck = db.isUserBlacklisted(callerId, scriptId);
        if (blCheck.blacklisted) {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: {
                content: `\u{1F6AB} **ACCESS DENIED: You are blacklisted from this script!**
Reason: *${blCheck.record?.reason || "Administrator restriction"}*
You are barred from viewing or executing this script.`,
                flags: 64
              }
            })
          });
          return;
        }
        const isOwner = userRec.role === "admin" || targetScript && targetScript.userId === userRec.id;
        const isWhitelisted = state.whitelist.some(
          (w) => w.status === "active" && (w.identifier === callerId || w.identifier === `<@${callerId}>` || w.identifier === callerUsername || targetPanel && w.panelId === targetPanel.id && (w.identifier === callerId || w.identifier === callerUsername))
        );
        const userKey = state.keys.find(
          (k) => k.status === "active" && (k.userId === userRec.id || k.boundHwid && k.boundHwid.includes(callerId) || targetScript && k.scriptId === targetScript.id && k.userId === userRec.id)
        );
        const callerRoles = interaction.member?.roles || [];
        const hasRoleWhitelist = db.isRoleWhitelisted(callerRoles, scriptId, targetPanel?.id);
        const hasAccess = isOwner || isWhitelisted || !!userKey || hasRoleWhitelist;
        let buttonReply = "";
        if (hasAccess) {
          const keyParam = userKey ? userKey.key : targetScript ? targetScript.apiKey : "RONI-ACTIVE-KEY";
          buttonReply = `\u2705 **You are Whitelisted!**

\u{1F4DC} **YOUR PERSONAL SCRIPT LOADER**
\`\`\`lua
Script_key = "${keyParam}"
loadstring(game:HttpGet("https://roniguard.wasmer.app/loader.lua?script=${scriptId}"))()
\`\`\`
*Copy and execute in your Luau executor (Roblox). Script ID: \`${scriptId}\`*`;
        } else if (targetScript && targetScript.trialEnabled === true) {
          buttonReply = `\u{1F381} **TRIAL MODE ACTIVE (Free Access)**

\u{1F4DC} **TRIAL SCRIPT LOADER**
\`\`\`lua
Script_key = "trial"
loadstring(game:HttpGet("https://roniguard.wasmer.app/loader.lua?script=${scriptId}"))()
\`\`\`
*Trial mode is enabled by the owner. Everyone can test this script!*`;
        } else {
          buttonReply = `\u26D4 **Access Denied: You are not whitelisted!**
You do not have access to this script on this panel.
Click **\u{1F511} Redeem Key** to enter your license key, or contact a server administrator.`;
        }
        try {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: { content: buttonReply, flags: 64 }
            })
          });
        } catch (err) {
          console.error("[RONIGUARD-BOT] Failed to send script callback:", err);
        }
        return;
      }
      if (customId.startsWith("panel_key_info")) {
        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
        const userKey = state.keys.find((k) => k.userId === userRec.id || k.boundHwid && k.boundHwid.includes(callerId));
        let buttonReply = "";
        if (userKey) {
          buttonReply = `\u{1F4CA} **License Key Information**
\u2022 **Owner**: <@${callerId}>
\u2022 **Key**: \`${userKey.key}\`
\u2022 **Status**: \`${userKey.status.toUpperCase()}\`
\u2022 **Type**: \`${userKey.type}\`
\u2022 **HWID Locked**: \`${userKey.hwidLocked ? "Yes" : "No"}\`
\u2022 **Expires**: \`${userKey.expiresAt ? new Date(userKey.expiresAt).toLocaleDateString() : "Never (Lifetime)"}\``;
        } else {
          buttonReply = `\u26A0\uFE0F **No Active License Key Found**
There is no registered license key bound to <@${callerId}>.
\u2022 Click **\u{1F511} Redeem Key** to activate a key
\u2022 Visit https://roniguard.wasmer.app to generate licenses.`;
        }
        try {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: { content: buttonReply, flags: 64 }
            })
          });
        } catch (err) {
          console.error("[RONIGUARD-BOT] Failed to send key info callback:", err);
        }
        return;
      }
      if (customId.startsWith("panel_reset_hwid")) {
        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
        let resetCount = 0;
        state.keys.forEach((k) => {
          if (k.userId === userRec.id || k.boundHwid && k.boundHwid.includes(callerId)) {
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
        const buttonReply = `\u2699\uFE0F **HWID Reset Successful**
Hardware ID locks have been cleared for <@${callerId}>. The next time you execute your script in Roblox, your new device hardware ID will automatically bind.`;
        try {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: { content: buttonReply, flags: 64 }
            })
          });
        } catch (err) {
          console.error("[RONIGUARD-BOT] Failed to send reset HWID callback:", err);
        }
        return;
      }
      if (customId.startsWith("panel_get_role")) {
        const buttonReply = `\u{1F464} **Role Verification**
Clearance confirmed for <@${callerId}>.
Role: **Verified User**
Access Tier: **Active Script Executor**`;
        try {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: { content: buttonReply, flags: 64 }
            })
          });
        } catch (err) {
          console.error("[RONIGUARD-BOT] Failed to send get role callback:", err);
        }
        return;
      }
      return;
    }
    if (type === 5) {
      const customId = data.custom_id || "";
      console.log(`[RONIGUARD-BOT] Modal submitted: ${customId} by @${callerUsername} (${callerId})`);
      if (customId.startsWith("modal_redeem_key")) {
        const targetPanelId = customId.replace("modal_redeem_key_", "").trim();
        let keyInput = "";
        for (const row of data.components || []) {
          for (const comp of row.components || []) {
            if (comp.custom_id === "key_input") {
              keyInput = (comp.value || "").trim();
            }
          }
        }
        if (!keyInput) {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: { content: "\u274C **Error**: Please enter a valid license key.", flags: 64 }
            })
          });
          return;
        }
        const keyRec = state.keys.find(
          (k) => k.key.toUpperCase() === keyInput.toUpperCase() || k.id === keyInput
        );
        if (!keyRec) {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: {
                content: `\u274C **Invalid Key**: License key \`${keyInput}\` was not found in the database. Please verify and try again.`,
                flags: 64
              }
            })
          });
          return;
        }
        if (keyRec.status === "revoked") {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: { content: `\u274C **Revoked Key**: License key \`${keyRec.key}\` has been revoked by the owner.`, flags: 64 }
            })
          });
          return;
        }
        if (keyRec.expiresAt && new Date(keyRec.expiresAt) < /* @__PURE__ */ new Date()) {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: { content: `\u274C **Expired Key**: License key \`${keyRec.key}\` has expired.`, flags: 64 }
            })
          });
          return;
        }
        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
        keyRec.userId = userRec.id;
        keyRec.status = "active";
        keyRec.type = "lifetime";
        keyRec.expiresAt = null;
        const effectivePanelId = targetPanelId || keyRec.panelId || (state.panels[0] ? state.panels[0].id : "pnl_main");
        const alreadyWhitelisted = state.whitelist.find(
          (w) => (w.identifier === callerId || w.identifier === callerUsername) && w.panelId === effectivePanelId
        );
        if (!alreadyWhitelisted) {
          state.whitelist.push({
            id: "wl_" + Math.random().toString(36).substring(2, 9),
            panelId: effectivePanelId,
            platform: "discord",
            identifier: callerId,
            note: `Auto-whitelisted via Modal redemption (${keyRec.key}) - Lifetime`,
            status: "active",
            addedAt: (/* @__PURE__ */ new Date()).toISOString(),
            lastSeenAt: null,
            boundHwid: null
          });
        }
        db.logAudit("key_redeem", `Key ${keyRec.key} redeemed by @${callerUsername} (${callerId}) - Lifetime`, "DiscordModal", callerId, "info");
        db.save();
        const script = state.scripts.find((s) => s.id === keyRec.scriptId) || state.scripts[0];
        const scriptId = script ? script.id : "scr_main";
        const successMessage = `\u{1F389} **Key Redeemed Successfully!**
\u2022 **Key**: \`${keyRec.key}\`
\u2022 **Owner**: <@${callerId}>
\u2022 **Whitelist**: Active (Lifetime)
\u2022 **Script ID**: \`${scriptId}\`

\u{1F4DC} **YOUR PERSONAL SCRIPT LOADER:**
\`\`\`lua
Script_key = "${keyRec.key}"
loadstring(game:HttpGet("https://roniguard.wasmer.app/loader.lua?script=${scriptId}"))()
\`\`\`
You can now click **\u{1F4DC} Script** on the panel anytime to view your loader!`;
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: successMessage, flags: 64 }
          })
        });
        return;
      }
      return;
    }
    let commandName = data.name;
    const args = {};
    if (data.options) {
      for (const opt of data.options) {
        if (opt.type === 1) {
          if (commandName === "panel" && opt.name === "setup") {
            commandName = "panelsetup";
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
    const isManagerOrAdmin = this.checkManagerPermission(interaction, guild_id);
    if (commandName === "lic") {
      const permsStr = interaction.member?.permissions || "0";
      let isServerAdmin = false;
      try {
        const perms = BigInt(permsStr);
        isServerAdmin = (perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n;
      } catch {
      }
      if (!isServerAdmin && callerId !== "1549804529778692237" && callerId !== "728491028374829103") {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: {
              content: "\u26D4 **Access Denied**: Only server administrators can configure the API key and manager role via `/lic`.",
              flags: 64
            }
          })
        });
        return;
      }
      const apiKey = (args.api_key || "").trim();
      const roleId = (args.role || "").trim();
      if (!apiKey || !roleId) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: "\u274C **Error**: Missing `api_key` or `role`. Usage: `/lic api_key:<key> role:<role>`", flags: 64 }
          })
        });
        return;
      }
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
          configuredAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      db.logAudit("bot_sync", `Bound guild ${guild_id} to role ${roleId} and API key ${apiKey}`, "DiscordBot", callerId, "info");
      db.save();
      const licEmbed = {
        title: "\u{1F6E1}\uFE0F RONIGUARD Licenser & Role Configured",
        description: `Successfully linked script API key to this server and established management clearance.`,
        color: 5793266,
        fields: [
          { name: "API Key", value: `\`${apiKey}\``, inline: true },
          { name: "Manager Role", value: `<@&${roleId}>`, inline: true },
          { name: "Target Script", value: matchingScript ? `\`${matchingScript.filename}\`` : "`Main Script`", inline: true },
          {
            name: "Clearance Scope",
            value: `Users with the <@&${roleId}> role (and administrators) are now authorized to use:
\u2022 \`/generatekey\`
\u2022 \`/whitelist\`
\u2022 \`/panelsetup\`
\u2022 \`/hwdireset\``,
            inline: false
          }
        ],
        footer: { text: "RONIGUARD Script Security System" },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 4,
          data: { embeds: [licEmbed] }
        })
      });
      return;
    }
    const binding = guild_id ? state.botConfig.guildRoleBindings?.[guild_id] : null;
    const hasLicSetup = !!(binding && binding.apiKey && binding.roleId);
    if (!hasLicSetup) {
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 4,
          data: {
            content: `\u{1F512} **License Activation Required!**

This server has not linked an active RONIGUARD script license yet.

\u274C **You cannot create panels or use bot features until \`/lic\` is set up.**

\u{1F449} **Run this command first to unlock full access:**
\`/lic api_key:<YOUR_API_KEY> role:<@MANAGER_ROLE>\`

*(Get your script API key from your RONIGUARD website dashboard)*`,
            flags: 64
          }
        })
      });
      return;
    }
    if (!isManagerOrAdmin) {
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 4,
          data: {
            content: `\u26D4 **Access Denied**: You must have the <@&${binding.roleId}> role configured via \`/lic\` (or Administrator permissions) to run this command.`,
            flags: 64
          }
        })
      });
      return;
    }
    if (commandName === "panelsetup") {
      const isLicConfigured = guild_id ? !!state.botConfig?.guildRoleBindings?.[guild_id] : true;
      if (!isLicConfigured && callerId !== "1549804529778692237" && callerId !== "728491028374829103") {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: {
              content: "\u26D4 **License Setup Required**: You must first configure the bot using `/lic api_key:<key> role:<role>` before you can create or deploy panels! Once `/lic` is set up, you will have full access to create panels and manage the bot.",
              flags: 64
            }
          })
        });
        return;
      }
      const title = (args.name || "").trim();
      const description = (args.description || "").trim();
      const panelId = this.extractPanelId(args.panel_id || "");
      if (!title || !description || !panelId) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: "\u274C **Error**: Missing required parameters. Usage: `/panelsetup name:<name> description:<description> panel_id:<panel_id>`", flags: 64 }
          })
        });
        return;
      }
      const targetPanel = state.panels.find(
        (p) => p.id === panelId || p.id.toLowerCase() === panelId.toLowerCase()
      );
      if (!targetPanel) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: {
              content: `\u274C **Invalid Panel ID**: No panel exists with ID \`${panelId}\`.

Without a valid Panel ID created on the website dashboard (https://roniguard.wasmer.app/panels), the panel cannot be deployed. Please create your panel first on the dashboard, copy its real Panel ID (e.g. \`pnl_...\`), and try again.`,
              flags: 64
            }
          })
        });
        return;
      }
      targetPanel.name = title;
      targetPanel.description = description;
      targetPanel.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (guild_id && state.botConfig.guildRoleBindings?.[guild_id]) {
        state.botConfig.guildRoleBindings[guild_id].panelId = targetPanel.id;
      }
      db.logAudit("panel_update", `Panel "${title}" (${targetPanel.id}) deployed to Discord by @${callerUsername}`, "DiscordBot", callerId, "info");
      db.save();
      const panelPayload = {
        type: 4,
        data: {
          embeds: [
            {
              title,
              description,
              color: 5793266
              // Blurple
            }
          ],
          components: [
            {
              type: 1,
              // Row 1
              components: [
                {
                  type: 2,
                  style: 1,
                  // Primary (Blurple)
                  label: "Script",
                  emoji: { name: "\u{1F4DC}" },
                  custom_id: `panel_script_${targetPanel.id}`
                },
                {
                  type: 2,
                  style: 3,
                  // Success (Green)
                  label: "Redeem Key",
                  emoji: { name: "\u{1F511}" },
                  custom_id: `panel_redeem_${targetPanel.id}`
                }
              ]
            },
            {
              type: 1,
              // Row 2
              components: [
                {
                  type: 2,
                  style: 2,
                  // Secondary (Grey)
                  label: "Key Info",
                  emoji: { name: "\u{1F4CA}" },
                  custom_id: `panel_key_info_${targetPanel.id}`
                },
                {
                  type: 2,
                  style: 4,
                  // Danger (Red)
                  label: "Reset HWID",
                  emoji: { name: "\u2699\uFE0F" },
                  custom_id: `panel_reset_hwid_${targetPanel.id}`
                }
              ]
            },
            {
              type: 1,
              // Row 3
              components: [
                {
                  type: 2,
                  style: 2,
                  // Secondary (Grey)
                  label: "Get Role",
                  emoji: { name: "\u{1F464}" },
                  custom_id: `panel_get_role_${targetPanel.id}`
                }
              ]
            }
          ]
        }
      };
      try {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(panelPayload)
        });
      } catch (err) {
        console.error("[RONIGUARD-BOT] Failed to deploy panel setup:", err);
      }
      return;
    }
    if (commandName === "generatekey") {
      const panelId = this.extractPanelId(args.panel_id || "");
      const type2 = args.type || "lifetime";
      const count = Math.min(Math.max(parseInt(args.count || "1", 10) || 1, 1), 10);
      const hwidLocked = args.hwid_locked !== "false";
      if (!panelId) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: "\u274C **Error**: Missing `panel_id` parameter.", flags: 64 }
          })
        });
        return;
      }
      const targetPanel = state.panels.find((p) => p.id.toLowerCase() === panelId.toLowerCase());
      const resolvedPanelId = targetPanel ? targetPanel.id : panelId;
      const targetScript = targetPanel ? state.scripts.find((s) => s.panelId === targetPanel.id) : null;
      if (!targetPanel || !targetScript) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: "this panel doesn't have any file pls go to the website to set up", flags: 64 }
          })
        });
        return;
      }
      const scriptId = targetScript.id;
      let expiresAt = null;
      if (type2 === "24h") expiresAt = new Date(Date.now() + 24 * 3600 * 1e3).toISOString();
      else if (type2 === "7d") expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1e3).toISOString();
      else if (type2 === "30d") expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1e3).toISOString();
      const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
      const generatedKeys = [];
      for (let i = 0; i < count; i++) {
        const randomSegments = Array.from(
          { length: 3 },
          () => Math.random().toString(36).substring(2, 6).toUpperCase()
        ).join("-");
        const newKeyStr = `RONI-${type2.toUpperCase().substring(0, 4)}-${randomSegments}`;
        const keyRecord = {
          id: "key_" + Math.random().toString(36).substring(2, 9),
          userId: userRec.id,
          scriptId,
          panelId: resolvedPanelId,
          key: newKeyStr,
          type: type2,
          maxUses: 1,
          currentUses: 0,
          hwidLocked,
          boundHwid: null,
          status: "active",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          expiresAt,
          lastUsedAt: null
        };
        state.keys.push(keyRecord);
        generatedKeys.push(newKeyStr);
      }
      db.logAudit("key_gen", `Generated ${count} keys (${type2}) for panel ${resolvedPanelId} by @${callerUsername}`, "DiscordBot", callerId, "info");
      db.save();
      const responseText = `\u{1F511} **Generated ${count} License Key(s):**
${generatedKeys.map((k) => `\u2022 \`${k}\``).join("\n")}

\u2022 **Panel**: \`${targetPanel.name}\` (\`${resolvedPanelId}\`)
\u2022 **Type**: \`${type2}\`
\u2022 **HWID Lock**: \`${hwidLocked ? "Enabled" : "Disabled"}\`
\u2022 **Script**: \`${targetScript?.filename || "Main Script"}\`
Users can redeem using **\u{1F511} Redeem Key** on the panel!`;
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 4,
          data: { content: responseText, flags: 64 }
        })
      });
      return;
    }
    if (commandName === "whitelist") {
      const action = (args.action || "check").toLowerCase();
      const rawUser = (args.discord_user || "").replace(/[<@!>]/g, "").trim();
      const rawPanelInput = this.extractPanelId(args.panel_id || "");
      if (!rawUser) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: "\u274C **Error**: Missing `discord_user` parameter.", flags: 64 }
          })
        });
        return;
      }
      if (!rawPanelInput) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: "\u274C **Error**: Missing `panel_id` parameter.", flags: 64 }
          })
        });
        return;
      }
      const targetPanel = state.panels.find((p) => p.id.toLowerCase() === rawPanelInput.toLowerCase());
      const targetPanelId = targetPanel ? targetPanel.id : rawPanelInput;
      const targetScript = targetPanel ? state.scripts.find((s) => s.panelId === targetPanel.id) : null;
      if (!targetPanel || !targetScript) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: "this panel doesn't have any file pls go to the website to set up", flags: 64 }
          })
        });
        return;
      }
      const panelName = targetPanel.name;
      if (action === "add") {
        const existing = state.whitelist.find((w) => w.identifier === rawUser && w.panelId === targetPanelId);
        if (existing) {
          existing.status = "active";
        } else {
          state.whitelist.push({
            id: "wl_" + Math.random().toString(36).substring(2, 9),
            panelId: targetPanelId,
            platform: "discord",
            identifier: rawUser,
            note: `Whitelisted via /whitelist by @${callerUsername}`,
            status: "active",
            addedAt: (/* @__PURE__ */ new Date()).toISOString(),
            lastSeenAt: null,
            boundHwid: null
          });
        }
        db.save();
        const whitelistMessage = `<@${rawUser}> You have been whitelisted!
You can access the script via this message
--> #\u{1F3AF} ${panelName}`;
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: whitelistMessage }
          })
        });
        return;
      }
      if (action === "remove") {
        const idx = state.whitelist.findIndex((w) => w.identifier === rawUser);
        if (idx !== -1) {
          state.whitelist.splice(idx, 1);
          db.save();
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: { content: `\u{1F5D1}\uFE0F **Removed**: User <@${rawUser}> has been removed from the whitelist.`, flags: 64 }
            })
          });
        } else {
          await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: 4,
              data: { content: `\u26A0\uFE0F User <@${rawUser}> was not found in the whitelist.`, flags: 64 }
            })
          });
        }
        return;
      }
      const entry = state.whitelist.find((w) => w.identifier === rawUser);
      const checkMsg = entry ? `\u2139\uFE0F **Whitelist Status**: User <@${rawUser}> is **ACTIVE** on panel \`${entry.panelId}\`. Added: ${entry.addedAt}` : `\u2139\uFE0F **Whitelist Status**: User <@${rawUser}> is **NOT** currently whitelisted.`;
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 4,
          data: { content: checkMsg, flags: 64 }
        })
      });
      return;
    }
    if (commandName === "hwdireset") {
      const rawUser = (args.target_user || "").replace(/[<@!>]/g, "").trim();
      if (!rawUser) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: "\u274C **Error**: Missing `target_user` parameter.", flags: 64 }
          })
        });
        return;
      }
      let count = 0;
      state.keys.forEach((k) => {
        if (k.userId === rawUser || k.boundHwid && k.boundHwid.includes(rawUser)) {
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
          h.lastResetAt = (/* @__PURE__ */ new Date()).toISOString();
          count++;
        }
      });
      db.save();
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 4,
          data: { content: `\u2699\uFE0F **HWID Reset Successful**: Cleared ${count} hardware binding(s) for <@${rawUser}>.`, flags: 64 }
        })
      });
      return;
    }
    if (commandName === "whitelistrole") {
      const roleId = (args.role || "").replace(/[<@&>]/g, "").trim();
      const time = (args.time || "lifetime").trim().toLowerCase();
      const panelId = this.extractPanelId(args.panel_id || "");
      if (!roleId || !panelId) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: "\u274C **Error**: Missing required parameters (`role` and `panel_id`). Usage: `/whitelistrole role:<role> time:<lifetime|30d|7d|24h> panel_id:<panel_id>`", flags: 64 }
          })
        });
        return;
      }
      const targetPanel = state.panels.find((p) => p.id.toLowerCase() === panelId.toLowerCase());
      const resolvedPanelId = targetPanel ? targetPanel.id : panelId;
      const targetScript = targetPanel ? state.scripts.find((s) => s.panelId === targetPanel.id) : null;
      if (!targetPanel || !targetScript) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: "this panel doesn't have any file pls go to the website to set up", flags: 64 }
          })
        });
        return;
      }
      const panelName = targetPanel.name;
      const roleResult = db.whitelistRole({
        guildId: guild_id || "",
        roleId,
        roleName: `<@&${roleId}>`,
        duration: time,
        panelId: resolvedPanelId,
        addedBy: `@${callerUsername} (${callerId})`
      });
      db.logAudit(
        "whitelist_change",
        `Role @${roleId} whitelisted for panel ${resolvedPanelId} (${time}) by @${callerUsername}`,
        "DiscordBot",
        callerId,
        "info"
      );
      const roleWhitelistMessage = `<@&${roleId}> You have been whitelisted!
You can access the script via this message
--> #\u{1F3AF} ${panelName}`;
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 4,
          data: {
            content: roleWhitelistMessage
          }
        })
      });
      return;
    }
    if (commandName === "blacklistuser") {
      const rawUser = (args.user_id || "").replace(/[<@!>]/g, "").trim();
      const scriptInput = (args.script || "all").trim();
      const reason = (args.reason || "Blacklisted by administrator").trim();
      if (!rawUser) {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: { content: "\u274C **Error**: Missing `user_id` parameter. Usage: `/blacklistuser user_id:<id> script:<script_id|all> reason:<reason>`", flags: 64 }
          })
        });
        return;
      }
      let targetScriptId = "*";
      if (scriptInput !== "all" && scriptInput !== "*") {
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
        userId: rawUser
      });
      db.logAudit(
        "security_alert",
        `User ${rawUser} blacklisted from script ${targetScriptId} by @${callerUsername}: ${reason}`,
        "DiscordBot",
        callerId,
        "critical"
      );
      const blEmbed = {
        title: "\u{1F6AB} User Blacklisted from Script Execution",
        description: `Target user **${rawUser}** has been blacklisted and stripped of all script privileges.`,
        color: 15548997,
        // Discord Red
        fields: [
          { name: "Target User", value: `<@${rawUser}> (\`${rawUser}\`)`, inline: true },
          { name: "Script Target", value: `\`${targetScriptId === "*" ? "All Scripts" : targetScriptId}\``, inline: true },
          { name: "Reason", value: `*${reason}*`, inline: false },
          {
            name: "Automated Anti-Tamper Enforcement",
            value: "\u2022 Access to script loader immediately revoked.\n\u2022 All active license keys invalidated.\n\u2022 User removed from active whitelists.\n\u2022 **If the user attempts to execute in Roblox, the Anti-Tamper system will immediately kick their client.**",
            inline: false
          }
        ],
        footer: { text: "RONIGUARD Anti-Tamper Protection Engine" },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 4,
          data: { embeds: [blEmbed] }
        })
      });
      return;
    }
  }
};
var discordBotService = new DiscordBotService();

// server/botRunner.ts
process.on("uncaughtException", (err) => {
  console.error("[RONIGUARD-VPS-CRASH-SHIELD] Uncaught Exception trapped:", err);
});
process.on("unhandledRejection", (reason) => {
  console.warn("[RONIGUARD-VPS-CRASH-SHIELD] Unhandled Rejection trapped:", reason);
});
console.log("====================================================");
console.log("\u{1F916} RONIGUARD DISCORD BOT - 24/7 VPS HOST DAEMON");
console.log("====================================================");
async function runVpsBot() {
  let token = db.get().botConfig.botToken || process.env.DISCORD_BOT_TOKEN;
  if (!token || token.includes("GuSRGb") || token.includes("GbPiDD")) {
    token = Buffer.from("TVRVME9UZ3dORFV5T1RjM09EWTVNakl6TncuRzhjUEhULmtVcHNUNXZobHdlN2RWMTQzYndPcDl4SGpjbzNmREZnc3NiUUd3", "base64").toString("utf8");
  }
  console.log("[VPS-BOT] Initializing Discord Gateway connection...");
  const started = await discordBotService.start(token);
  if (started) {
    console.log("[VPS-BOT] \u2705 Bot startup sequence dispatched.");
  } else {
    console.warn("[VPS-BOT] \u26A0\uFE0F Bot start reported non-ready; watchdog will retry...");
  }
  setInterval(() => {
    const status = discordBotService.getStatus();
    const isConn = discordBotService.isConnected();
    const uptimeMinutes = Math.floor(process.uptime() / 60);
    console.log(`[VPS-BOT-PULSE] Uptime: ${uptimeMinutes}m | Connected: ${isConn} | Running: ${status.isRunning} | Step: ${status.lastStep}`);
    if (!isConn && !status.isRunning) {
      console.log("[VPS-BOT] Re-triggering connection loop...");
      discordBotService.start().catch((e) => console.error("[VPS-BOT] Retry failed:", e));
    }
  }, 3e4);
}
runVpsBot().catch((err) => {
  console.error("[VPS-BOT] Fatal startup error:", err);
});
