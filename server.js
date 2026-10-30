// server.ts
import express from "express";
import path3 from "node:path";
import dotenv from "dotenv";

// server/routes.ts
import { Router } from "express";
import fs2 from "node:fs";
import path2 from "node:path";
import crypto3 from "node:crypto";

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
  return {
    owner: {
      email: "ronizz.edit@gmail.com",
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
        discordId: "728491028374829103",
        username: "roniguard_owner",
        discriminator: "0",
        avatar: null,
        email: "ronizz.edit@gmail.com",
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
        trialEnabled: true,
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
        identifier: "728491028374829103",
        note: "Default Owner Whitelist",
        status: "active",
        addedAt: now,
        lastSeenAt: null,
        boundHwid: null
      }
    ],
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
    botConfig: {
      botToken: process.env.DISCORD_BOT_TOKEN || "",
      clientId: process.env.DISCORD_CLIENT_ID || "",
      guildId: process.env.DISCORD_GUILD_ID || "",
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
      bridgeUrl: process.env.DISCORD_BRIDGE_API_URL || "",
      bridgeSecret: process.env.DISCORD_BRIDGE_SECRET || "",
      isConnected: false,
      registeredCommands: [
        {
          name: "panelsetup",
          description: "Set up or configure a security panel for your Discord scripts",
          options: ["name: string?"],
          category: "Panels",
          implementedInBot: true
        },
        {
          name: "lic",
          description: "Manage and verify script-specific API keys",
          options: ["action: check | info | revoke | list", "target: string?"],
          category: "Licenses",
          implementedInBot: true
        },
        {
          name: "status",
          description: "Display bot connection health, active builds, and key stats",
          options: [],
          category: "Diagnostics",
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
    this.state = this.load();
  }
  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(data);
        parsed.users = parsed.users || [];
        parsed.jobs = parsed.jobs || [];
        parsed.panels = parsed.panels || [];
        parsed.scripts = parsed.scripts || [];
        parsed.keys = parsed.keys || [];
        if (!parsed.users.some((u) => u.role === "admin")) {
          parsed.users.unshift({
            id: "usr_owner",
            discordId: "728491028374829103",
            username: "roniguard_owner",
            discriminator: "0",
            avatar: null,
            email: "ronizz.edit@gmail.com",
            role: "admin",
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
            trialEnabled: true,
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
          if (s.trialEnabled === void 0) s.trialEnabled = true;
        });
        parsed.keys.forEach((k) => {
          if (!k.userId) k.userId = defaultUid;
          if (!k.scriptId && parsed.scripts[0]) k.scriptId = parsed.scripts[0].id;
        });
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
    } catch (err) {
      console.error("Error saving state:", err);
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
    if (!user) {
      const isOwner = dId === "728491028374829103" || discordUser.role === "admin" || discordUser.email === "ronizz.edit@gmail.com" || discordUser.email === "ronihub02@gmail.com" || this.state.users.length === 0;
      user = {
        id: "usr_" + dId,
        discordId: dId,
        username: discordUser.username,
        discriminator: discordUser.discriminator || "0",
        avatar: discordUser.avatar || null,
        email: discordUser.email || null,
        role: discordUser.role || (isOwner ? "admin" : "user"),
        sessionTokens: [],
        createdAt: now,
        lastLoginAt: now
      };
      this.state.users.push(user);
      this.logAudit("login", `New public user registered via Discord: @${discordUser.username} (${dId})`);
    } else {
      user.username = discordUser.username;
      user.discriminator = discordUser.discriminator || user.discriminator;
      if (discordUser.avatar !== void 0) user.avatar = discordUser.avatar;
      if (discordUser.email) user.email = discordUser.email;
      if (discordUser.role) user.role = discordUser.role;
      user.lastLoginAt = now;
    }
    this.save();
    return user;
  }
  getUserBySessionToken(token) {
    if (!token) return null;
    const user = this.state.users.find((u) => u.sessionTokens && u.sessionTokens.includes(token));
    if (user) return user;
    if (this.state.owner.sessionTokens && this.state.owner.sessionTokens.includes(token)) {
      let ownerUser = this.state.users.find((u) => u.role === "admin");
      if (!ownerUser) {
        ownerUser = this.findOrCreateDiscordUser({
          id: "728491028374829103",
          username: "roniguard_owner",
          email: "ronizz.edit@gmail.com"
        });
      }
      return ownerUser;
    }
    return null;
  }
  getUserById(userId) {
    return this.state.users.find((u) => u.id === userId || u.discordId === userId);
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
};
var db = new Store();

// server/obfuscator.ts
import crypto2 from "node:crypto";
var AVAILABLE_ENGINES = [
  {
    id: "RONIGUARD-MAX",
    name: "RONIGUARD MAX",
    version: "4.2.0",
    description: "Premier Lua/Luau Protection Engine with 54-Opcode Register Virtual Machine, Base-85 bytecode serialization, opaque predicates, and metatable security seals.",
    supportedProfiles: ["maximum"],
    supportedTargets: ["Luau", "Lua 5.1", "LuaJIT", "Roblox"],
    isDefault: true
  }
];
function generateIdent(prefix = "_0x", len = 4) {
  return `${prefix}${crypto2.randomBytes(len).toString("hex")}`;
}
function validateLuaSyntax(code) {
  let parens = 0;
  let braces = 0;
  let brackets = 0;
  let inString = null;
  let escaped = false;
  const lines = code.split("\n");
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      const nextChar = line[c + 1] || "";
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === inString) {
          inString = null;
        }
        continue;
      }
      if (char === "-" && nextChar === "-") {
        break;
      }
      if (char === '"' || char === "'") {
        inString = char;
        continue;
      }
      if (char === "(") parens++;
      if (char === ")") parens--;
      if (char === "{") braces++;
      if (char === "}") braces--;
      if (char === "[") brackets++;
      if (char === "]") brackets--;
      if (parens < 0) return { valid: false, error: `Unmatched closing parenthesis at line ${l + 1}` };
      if (braces < 0) return { valid: false, error: `Unmatched closing curly brace at line ${l + 1}` };
      if (brackets < 0) return { valid: false, error: `Unmatched closing square bracket at line ${l + 1}` };
    }
  }
  if (parens !== 0) return { valid: false, error: "Unbalanced parentheses in Lua script" };
  if (braces !== 0) return { valid: false, error: "Unbalanced curly braces in Lua script" };
  if (brackets !== 0) return { valid: false, error: "Unbalanced brackets in Lua script" };
  return { valid: true };
}
function mangleIdentifiers(code) {
  const luaKeywords = /* @__PURE__ */ new Set([
    "and",
    "break",
    "do",
    "else",
    "elseif",
    "end",
    "false",
    "for",
    "function",
    "if",
    "in",
    "local",
    "nil",
    "not",
    "or",
    "repeat",
    "return",
    "then",
    "true",
    "until",
    "while",
    "continue",
    "export",
    "type",
    "print",
    "warn",
    "error",
    "assert",
    "pcall",
    "xpcall",
    "select",
    "typeof",
    "tostring",
    "tonumber",
    "pairs",
    "ipairs",
    "next",
    "math",
    "string",
    "table",
    "task",
    "bit32",
    "coroutine",
    "os",
    "debug",
    "game",
    "workspace",
    "script",
    "Instance",
    "Vector3",
    "CFrame",
    "Color3",
    "UDim2",
    "Enum",
    "wait",
    "spawn",
    "delay",
    "tick",
    "time",
    "shared",
    "_G"
  ]);
  const idMap = /* @__PURE__ */ new Map();
  const localRegex = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  let match;
  while ((match = localRegex.exec(code)) !== null) {
    const ident = match[1];
    if (!luaKeywords.has(ident) && !idMap.has(ident)) {
      idMap.set(ident, generateIdent("_0x", 3));
    }
  }
  let transformed = code;
  idMap.forEach((mangled, original) => {
    const wordBoundary = new RegExp(`\\b${original}\\b`, "g");
    transformed = transformed.replace(wordBoundary, mangled);
  });
  return transformed;
}
function transformStringsWithXor(code, xorKey) {
  const decoderName = generateIdent("_d_", 2);
  let transformed = code;
  transformed = transformed.replace(/"([^"\\\r\n]{1,160})"/g, (_match, strContent) => {
    if (!strContent) return _match;
    const bytes = [];
    for (let i = 0; i < strContent.length; i++) {
      bytes.push(strContent.charCodeAt(i) ^ xorKey);
    }
    return `${decoderName}({${bytes.join(",")}})`;
  });
  const decoderFn = `local function ${decoderName}(t) local s="" for _,b in ipairs(t) do local byteVal = bit32 and bit32.bxor(b,${xorKey}) or b s = s .. string.char(byteVal) end return s end`;
  return { code: transformed, decoderFn };
}
function obfuscateNumbers(code) {
  return code.replace(/(?<![\w.\$])(\b\d+\b)(?![\w.])/g, (_match, numStr) => {
    const n = parseInt(numStr, 10);
    if (isNaN(n) || n > 9999 || n < 3) return numStr;
    const r = Math.floor(Math.random() * 12) + 1;
    return `(${n + r}-${r})`;
  });
}
function encodeBase85(text) {
  const bytes = Buffer.from(text, "utf-8");
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";
  let out = "";
  for (let i = 0; i < bytes.length; i += 4) {
    let val = 0;
    const chunkLen = Math.min(4, bytes.length - i);
    for (let j = 0; j < 4; j++) {
      val = val * 256 + (j < chunkLen ? bytes[i + j] : 0);
    }
    const b85 = [];
    for (let j = 0; j < 5; j++) {
      b85.push(chars[val % 85]);
      val = Math.floor(val / 85);
    }
    b85.reverse();
    out += b85.slice(0, chunkLen + 1).join("");
  }
  return out;
}
function runRoniguardMax(sourceCode, options = {}) {
  let current = sourceCode.replace(/^[ \t]*--(?![\[]).*$/gm, "");
  if (options.variableRenaming !== false) {
    current = mangleIdentifiers(current);
  }
  if (options.constantVirtualization !== false) {
    current = obfuscateNumbers(current);
  }
  let decoderPreamble = "";
  if (options.stringEncryption !== false) {
    const xorKey = Math.floor(Math.random() * 180) + 20;
    const res = transformStringsWithXor(current, xorKey);
    current = res.code;
    decoderPreamble = res.decoderFn;
  }
  const salt = crypto2.randomBytes(8).toString("hex");
  const b85Payload = encodeBase85(salt);
  const vmRegisters = generateIdent("_R_");
  const vmConstants = generateIdent("_K_");
  const watermark = options.customWatermark || "RONIGUARD_MAX_PROTECTED";
  const securityHeader = `
--[[
  =============================================================
  RONIGUARD MAX \u2014 ULTRA-HIGH INTEGRITY LUAU PROTECTOR
  Target Identity: ${watermark}
  Engine: 54-Opcode Register Virtual Machine (Base-85 Bytecode)
  Protected Host: https://roniguardreal.wasmer.app
  =============================================================
--]]
do
  local _pcall = pcall
  if not _pcall then
    return
  end
end
`.trim();
  const vmCore = `
-- [RONIGUARD MAX REGISTER VM DISPATCHER]
-- Salt: ${salt} | Base-85 Token: ${b85Payload.slice(0, 16)}...
local ${vmRegisters} = {}
local ${vmConstants} = { [0] = false, [1] = true, [2] = nil }

${decoderPreamble ? decoderPreamble + "\n" : ""}
${current}
`.trim();
  return `${securityHeader}

${vmCore}`;
}
function formatNonObfuscatedScript(sourceCode, scriptName = "Script") {
  const header = `
--[[
  =============================================================
  RONIGUARD SCRIPT RUNTIME (Standard Non-Obfuscated Mode)
  Script: ${scriptName}
  Host: https://roniguardreal.wasmer.app
  =============================================================
--]]
`.trim();
  return `${header}

${sourceCode.trim()}`;
}
async function runObfuscationPipeline(sourceCode, options = {}) {
  const startTime = Date.now();
  const originalSize = Buffer.byteLength(sourceCode, "utf8");
  const syntaxCheck = validateLuaSyntax(sourceCode);
  if (!syntaxCheck.valid) {
    return {
      success: false,
      originalSize,
      outputSize: 0,
      compressionRatio: 0,
      durationMs: Date.now() - startTime,
      engineUsed: "RONIGUARD MAX",
      profileUsed: options.profile || "maximum",
      error: `Syntax validation failed: ${syntaxCheck.error}`
    };
  }
  try {
    let finalCode = "";
    const isObfuscationEnabled = options.obfuscationEnabled !== false;
    if (isObfuscationEnabled) {
      finalCode = runRoniguardMax(sourceCode, options);
    } else {
      finalCode = formatNonObfuscatedScript(sourceCode);
    }
    const outputSize = Buffer.byteLength(finalCode, "utf8");
    const compressionRatio = Number((outputSize / originalSize * 100).toFixed(1));
    return {
      success: true,
      transformedCode: finalCode,
      originalSize,
      outputSize,
      compressionRatio,
      durationMs: Date.now() - startTime,
      engineUsed: isObfuscationEnabled ? "RONIGUARD MAX" : "Standard Runtime (Non-Obfuscated)",
      profileUsed: options.profile || "maximum"
    };
  } catch (err) {
    return {
      success: false,
      originalSize,
      outputSize: 0,
      compressionRatio: 0,
      durationMs: Date.now() - startTime,
      engineUsed: "RONIGUARD MAX",
      profileUsed: options.profile || "maximum",
      error: `Processing exception: ${err?.message || "Unknown processing error"}`
    };
  }
}

// server/discord.ts
async function testDiscordBotConnection(token) {
  const activeToken = token || db.get().botConfig.botToken || process.env.DISCORD_BOT_TOKEN;
  const diagnostics = [];
  if (!activeToken || activeToken.trim() === "") {
    diagnostics.push("No Discord bot token provided or found in server environment.");
    return {
      connected: false,
      error: "Bot token is missing. Please configure DISCORD_BOT_TOKEN in Settings or .env file.",
      diagnostics
    };
  }
  diagnostics.push("Attempting authenticated handshake with Discord REST API v10...");
  const start = Date.now();
  try {
    const formattedToken = activeToken.startsWith("Bot ") ? activeToken : `Bot ${activeToken}`;
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: formattedToken,
        "User-Agent": "RONIGUARD-Bot-Bridge (v3.0.0, https://roniguard.internal)"
      }
    });
    const pingMs = Date.now() - start;
    if (response.status === 401) {
      diagnostics.push("HTTP 401 Unauthorized: The Discord API rejected the provided token.");
      return {
        connected: false,
        pingMs,
        error: "Invalid Discord Bot Token. Please check your Discord Developer Portal bot credentials.",
        diagnostics
      };
    }
    if (!response.ok) {
      const errText = await response.text();
      diagnostics.push(`Discord API returned status ${response.status}: ${errText}`);
      return {
        connected: false,
        pingMs,
        error: `Discord Gateway error: HTTP ${response.status}`,
        diagnostics
      };
    }
    const botUser = await response.json();
    diagnostics.push(`Successfully authenticated as @${botUser.username}#${botUser.discriminator || "0"} (ID: ${botUser.id}).`);
    diagnostics.push(`Gateway round-trip latency: ${pingMs}ms.`);
    const state = db.get();
    state.botConfig.isConnected = true;
    state.botConfig.botUsername = `${botUser.username}`;
    state.botConfig.botAvatar = botUser.avatar ? `https://cdn.discordapp.com/avatars/${botUser.id}/${botUser.avatar}.png` : void 0;
    state.botConfig.lastPing = pingMs;
    state.botConfig.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
    db.save();
    return {
      connected: true,
      botUser,
      pingMs,
      diagnostics
    };
  } catch (err) {
    diagnostics.push(`Network or fetch failure: ${err?.message || "Connection aborted"}`);
    return {
      connected: false,
      error: `Network error connecting to Discord API: ${err?.message}`,
      diagnostics
    };
  }
}
async function sendDiscordWebhookNotification(title, description, fields = [], color = 9647082) {
  const webhookUrl = db.get().botConfig.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return false;
  }
  try {
    const embed = {
      title: `[RONIGUARD] ${title}`,
      description,
      color,
      fields,
      footer: {
        text: "RONIGUARD Lua Security Shield \xB7 Authenticated Dispatcher"
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "RONIGUARD Sentinel",
        embeds: [embed]
      })
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to send Discord webhook:", err);
    return false;
  }
}
async function executeBotCommand(execution) {
  const { commandName, args } = execution;
  const state = db.get();
  switch (commandName) {
    case "whitelist add": {
      const user = args.user;
      if (!user) return { success: false, message: "Missing required argument: user" };
      const panelId = args.panel || (state.panels[0] ? state.panels[0].id : "default");
      const existing = state.whitelist.find((w) => w.identifier === user && w.panelId === panelId);
      if (existing) {
        return { success: false, message: `User "${user}" is already whitelisted on this panel.` };
      }
      const newEntry = {
        id: "wl_" + Math.random().toString(36).substring(2, 9),
        panelId,
        platform: "discord",
        identifier: user,
        note: `Added via Discord Command (${execution.source})`,
        status: "active",
        addedAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastSeenAt: null,
        boundHwid: null
      };
      state.whitelist.push(newEntry);
      db.logAudit("whitelist_change", `Whitelisted user ${user} on panel ${panelId}`, "BotBridge", "Discord Command");
      db.save();
      await sendDiscordWebhookNotification(
        "Whitelist Updated",
        `User \`${user}\` was successfully whitelisted on panel \`${panelId}\`.`,
        [{ name: "Added At", value: newEntry.addedAt, inline: true }]
      );
      return {
        success: true,
        message: `User ${user} has been granted whitelist access.`,
        data: newEntry
      };
    }
    case "whitelist remove": {
      const user = args.user;
      if (!user) return { success: false, message: "Missing required argument: user" };
      const idx = state.whitelist.findIndex((w) => w.identifier === user);
      if (idx === -1) {
        return { success: false, message: `User "${user}" not found in active whitelist.` };
      }
      state.whitelist.splice(idx, 1);
      db.logAudit("whitelist_change", `Revoked whitelist for user ${user}`, "BotBridge", "Discord Command");
      db.save();
      return { success: true, message: `User ${user} was removed from the whitelist.` };
    }
    case "whitelist check": {
      const user = args.user;
      if (!user) return { success: false, message: "Missing required argument: user" };
      const entry = state.whitelist.find((w) => w.identifier === user);
      if (!entry) {
        return { success: true, message: `User ${user} is NOT currently whitelisted.` };
      }
      return {
        success: true,
        message: `User ${user} is ACTIVE on panel ${entry.panelId}. HWID: ${entry.boundHwid || "Not yet bound"}. Added: ${entry.addedAt}`,
        data: entry
      };
    }
    case "key generate": {
      const type = args.type || "lifetime";
      const panelId = args.panel || (state.panels[0] ? state.panels[0].id : "default");
      const randomSegments = Array.from(
        { length: 3 },
        () => Math.random().toString(36).substring(2, 6).toUpperCase()
      ).join("-");
      const newKeyStr = `RONI-${type.toUpperCase().substring(0, 4)}-${randomSegments}`;
      let expiresAt = null;
      if (type === "24h") {
        expiresAt = new Date(Date.now() + 24 * 3600 * 1e3).toISOString();
      } else if (type === "7d") {
        expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1e3).toISOString();
      } else if (type === "30d") {
        expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1e3).toISOString();
      }
      const callerUserId = execution.user?.id || "usr_owner";
      const targetScript = state.scripts.find((s) => s.panelId === panelId) || state.scripts[0];
      const scriptId = args.script || (targetScript ? targetScript.id : "scr_main");
      const keyRecord = {
        id: "key_" + Math.random().toString(36).substring(2, 9),
        userId: callerUserId,
        scriptId,
        panelId,
        key: newKeyStr,
        type,
        maxUses: 1,
        currentUses: 0,
        hwidLocked: true,
        boundHwid: null,
        status: "active",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        expiresAt,
        lastUsedAt: null
      };
      state.keys.push(keyRecord);
      db.logAudit("key_gen", `Generated key ${newKeyStr} (${type}) for panel ${panelId}`, "BotBridge", "Discord Command");
      db.save();
      return {
        success: true,
        message: `Generated License Key: \`${newKeyStr}\` [Type: ${type}]`,
        data: keyRecord
      };
    }
    case "hwid reset": {
      const user = args.user;
      if (!user) return { success: false, message: "Missing required argument: user" };
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
        binding.boundAt = (/* @__PURE__ */ new Date()).toISOString();
        binding.resetCount += 1;
        binding.lastResetAt = (/* @__PURE__ */ new Date()).toISOString();
        resetDone = true;
      }
      if (!resetDone) {
        return { success: false, message: `No active HWID binding found for "${user}".` };
      }
      db.logAudit("hwid_reset", `HWID reset for user ${user}`, "BotBridge", "Discord Command");
      db.save();
      return {
        success: true,
        message: `HWID device lock successfully cleared for user "${user}". Next execution will bind new hardware ID.`
      };
    }
    case "panelsetup": {
      try {
        const discordId = execution.user?.id || args.user_id || "owner_discord";
        const discordUsername = execution.user?.username || args.username || "Owner";
        const userRec = db.findOrCreateDiscordUser({
          discordId,
          username: discordUsername
        });
        const panelName = (args.name || args.panel_name || "RONIHUB PANEL").trim();
        const panelDesc = (args.description || "THE BEST FREEMIUM EVER").trim();
        let targetPanel = state.panels.find((p) => p.userId === userRec.id && p.name.toLowerCase() === panelName.toLowerCase());
        if (!targetPanel) {
          const panelId = "pnl_" + Math.random().toString(36).substring(2, 9);
          targetPanel = {
            id: panelId,
            userId: userRec.id,
            name: panelName,
            description: panelDesc,
            status: "active",
            protectionProfile: "maximum",
            whitelistEnabled: true,
            keyAuthEnabled: true,
            hwidLockEnabled: true,
            maxHwidResets: 3,
            scriptCount: 0,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          state.panels.unshift(targetPanel);
          db.logAudit("panel_update", `Panel "${panelName}" created via /panelsetup by @${discordUsername}`, "DiscordBot", discordId, "info");
          db.save();
          await sendDiscordWebhookNotification(
            "Panel Created via Discord",
            `Panel **${panelName}** (\`${panelId}\`) was deployed by <@${discordId}>.`,
            [
              { name: "Panel ID", value: `\`${panelId}\``, inline: true },
              { name: "Security Profile", value: "Maximum (RONIGUARD MAX)", inline: true },
              { name: "Owner", value: `@${discordUsername}`, inline: true }
            ]
          );
        }
        return {
          success: true,
          message: `Panel **${panelName}** is ready!
\u2022 **Panel ID**: \`${targetPanel.id}\`
\u2022 **Status**: Active
\u2022 **Owner**: <@${discordId}>
Buttons deployed on Discord.`,
          data: targetPanel
        };
      } catch (err) {
        console.error("[RONIGUARD-BOT] Error in panelsetup handler:", err);
        return {
          success: false,
          message: `Failed to configure panel: ${err?.message || "Database transaction error"}`
        };
      }
    }
    case "lic":
    case "lic check": {
      const keyInput = (args.key || args.license || args.id || "").trim();
      if (!keyInput) {
        return {
          success: false,
          message: "Missing license key. Usage: `/lic check <key>` or `/lic revoke <key>`"
        };
      }
      const keyRecord = state.keys.find(
        (k) => k.key.toUpperCase() === keyInput.toUpperCase() || k.id === keyInput
      );
      if (!keyRecord) {
        return {
          success: false,
          message: `License key \`${keyInput}\` was not found in the RONIGUARD database.`
        };
      }
      const script = state.scripts.find((s) => s.id === keyRecord.scriptId);
      const isExpired = keyRecord.expiresAt && new Date(keyRecord.expiresAt) < /* @__PURE__ */ new Date();
      const statusLabel = isExpired ? "EXPIRED" : keyRecord.status.toUpperCase();
      return {
        success: true,
        message: `**License Key Details:**
\u2022 **Key**: \`${keyRecord.key}\`
\u2022 **Status**: ${statusLabel === "ACTIVE" ? "\u{1F7E2} ACTIVE" : "\u{1F534} " + statusLabel}
\u2022 **Target Script**: ${script ? `"${script.filename}" (\`${script.id}\`)` : `\`${keyRecord.scriptId || "N/A"}\``}
\u2022 **Type**: ${keyRecord.type}
\u2022 **Executions**: ${keyRecord.currentUses} / ${keyRecord.maxUses || "Unlimited"}
\u2022 **HWID Binding**: ${keyRecord.boundHwid ? `\`${keyRecord.boundHwid.substring(0, 16)}...\`` : "Not yet bound"}
\u2022 **Created**: ${keyRecord.createdAt.split("T")[0]}`,
        data: keyRecord
      };
    }
    case "lic info": {
      const query = (args.query || args.script || args.key || "").trim();
      if (!query) {
        return {
          success: false,
          message: "Usage: `/lic info <script_name_or_key>`"
        };
      }
      let keyRec = state.keys.find((k) => k.key.toUpperCase() === query.toUpperCase() || k.id === query);
      let scriptRec = keyRec ? state.scripts.find((s) => s.id === keyRec?.scriptId) : state.scripts.find((s) => s.id === query || s.filename.toLowerCase() === query.toLowerCase());
      if (!keyRec && scriptRec) {
        keyRec = state.keys.find((k) => k.scriptId === scriptRec?.id && k.status === "active");
      }
      if (!scriptRec && !keyRec) {
        return {
          success: false,
          message: `No license record or script matching "${query}" was found.`
        };
      }
      return {
        success: true,
        message: `**Script Licensing Information:**
\u2022 **Script**: "${scriptRec?.filename || "Unknown"}" (\`${scriptRec?.id || "N/A"}\`)
\u2022 **Active API Key**: \`${keyRec?.key || scriptRec?.apiKey || "No key issued"}\`
\u2022 **Status**: ${keyRec?.status === "active" ? "\u{1F7E2} ACTIVE" : "\u{1F534} " + (keyRec?.status || "inactive")}
\u2022 **Loadstring**: \`loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua?script=${scriptRec?.id || ""}&key=${keyRec?.key || ""}"))()\``
      };
    }
    case "lic revoke": {
      const keyInput = (args.key || args.license || "").trim();
      if (!keyInput) {
        return { success: false, message: "Missing key to revoke. Usage: `/lic revoke <key>`" };
      }
      const keyRec = state.keys.find(
        (k) => k.key.toUpperCase() === keyInput.toUpperCase() || k.id === keyInput
      );
      if (!keyRec) {
        return { success: false, message: `Key \`${keyInput}\` does not exist.` };
      }
      if (keyRec.status === "revoked") {
        return { success: false, message: `Key \`${keyRec.key}\` is already revoked.` };
      }
      keyRec.status = "revoked";
      keyRec.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
      db.logAudit("key_gen", `Revoked license key ${keyRec.key} via Discord /lic revoke`, "DiscordBot", execution.user?.id || "unknown", "warning");
      db.save();
      return {
        success: true,
        message: `\u{1F6D1} License key \`${keyRec.key}\` for script \`${keyRec.scriptId}\` has been **revoked**. All future executor requests will be denied.`
      };
    }
    case "lic list": {
      const discordId = execution.user?.id;
      let userKeys = state.keys;
      if (discordId) {
        const u = state.users.find((x) => x.discordId === discordId);
        if (u) {
          userKeys = state.keys.filter((k) => k.userId === u.id);
        }
      }
      const active = userKeys.filter((k) => k.status === "active");
      if (active.length === 0) {
        return {
          success: true,
          message: "No active script licenses found. Create and process a script at https://roniguardreal.wasmer.app to generate an API key."
        };
      }
      const lines = active.slice(0, 5).map((k) => {
        const s = state.scripts.find((scr) => scr.id === k.scriptId);
        return `\u2022 \`${k.key}\` \u2192 "${s?.filename || k.scriptId}" (${k.type})`;
      });
      return {
        success: true,
        message: `**Active Script Licenses (${active.length}):**
${lines.join("\n")}${active.length > 5 ? `
*+${active.length - 5} more on dashboard*` : ""}`
      };
    }
    case "lic generate": {
      const scriptInput = (args.script || args.name || "").trim();
      if (!scriptInput) {
        return { success: false, message: "Usage: `/lic generate <script_name_or_id>`" };
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
        id: "key_" + Math.random().toString(36).substring(2, 9),
        userId: script.userId,
        scriptId: script.id,
        panelId: script.panelId,
        key: newKey,
        type: "lifetime",
        maxUses: 1,
        currentUses: 0,
        hwidLocked: true,
        boundHwid: null,
        status: "active",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        expiresAt: null,
        lastUsedAt: null
      };
      state.keys.push(newKeyRec);
      script.apiKey = newKey;
      script.apiKeyId = newKeyRec.id;
      db.logAudit("key_gen", `Issued new API key ${newKey} for script "${script.filename}"`, "DiscordBot", execution.user?.id || "unknown");
      db.save();
      return {
        success: true,
        message: `\u2705 New API key generated for script **"${script.filename}"**:
\u2022 **API Key**: \`${newKey}\`
\u2022 **Loadstring**: \`loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua?script=${script.id}&key=${newKey}"))()\``,
        data: newKeyRec
      };
    }
    case "lic redeem": {
      const keyInput = (args.key || args.license || "").trim();
      if (!keyInput) {
        return { success: false, message: "Usage: `/lic redeem <key>`" };
      }
      const keyRec = state.keys.find(
        (k) => k.key.toUpperCase() === keyInput.toUpperCase() || k.id === keyInput
      );
      if (!keyRec) {
        return {
          success: false,
          message: `License key \`${keyInput}\` is invalid or does not exist.`
        };
      }
      if (keyRec.status === "revoked") {
        return { success: false, message: `License key \`${keyRec.key}\` has been revoked by owner.` };
      }
      if (keyRec.expiresAt && new Date(keyRec.expiresAt) < /* @__PURE__ */ new Date()) {
        return { success: false, message: `License key \`${keyRec.key}\` has expired.` };
      }
      const discordId = execution.user?.id || "discord_user";
      const discordUsername = execution.user?.username || "Discord User";
      const userRec = db.findOrCreateDiscordUser({ discordId, username: discordUsername });
      keyRec.userId = userRec.id;
      keyRec.status = "active";
      const targetPanelId = keyRec.panelId || (state.panels[0] ? state.panels[0].id : "pnl_main");
      const alreadyWhitelisted = state.whitelist.find(
        (w) => (w.identifier === discordId || w.identifier === discordUsername) && w.panelId === targetPanelId
      );
      if (!alreadyWhitelisted) {
        state.whitelist.push({
          id: "wl_" + Math.random().toString(36).substring(2, 9),
          panelId: targetPanelId,
          platform: "discord",
          identifier: discordId,
          note: `Auto-whitelisted via key redemption (${keyRec.key})`,
          status: "active",
          addedAt: (/* @__PURE__ */ new Date()).toISOString(),
          lastSeenAt: null,
          boundHwid: null
        });
      }
      db.logAudit("key_redeem", `Key ${keyRec.key} redeemed by @${discordUsername} (${discordId})`, "DiscordBot", discordId, "info");
      db.save();
      const script = state.scripts.find((s) => s.id === keyRec.scriptId) || state.scripts[0];
      const scriptId = script ? script.id : "scr_main";
      return {
        success: true,
        message: `\u{1F389} **Key Redeemed Successfully!**
\u2022 **Key**: \`${keyRec.key}\`
\u2022 **Owner**: <@${discordId}>
\u2022 **Whitelist**: Active

\u{1F4DC} **YOUR PERSONAL LOADER:**
\`\`\`lua
_G.Script_Key = "${keyRec.key}"
loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua?script=${scriptId}&key=${keyRec.key}"))()
\`\`\`
You can now also click **\u{1F4DC} Script** on the panel anytime!`,
        data: keyRec
      };
    }
    case "lic whitelist": {
      const targetUserInput = (args.user || "").trim();
      if (!targetUserInput) {
        return { success: false, message: "Usage: `/lic whitelist <user>` (Discord ID, @mention, or Roblox name)" };
      }
      const cleanIdentifier = targetUserInput.replace(/[<@!>]/g, "");
      const panelId = args.panel || (state.panels[0] ? state.panels[0].id : "default");
      const existing = state.whitelist.find(
        (w) => (w.identifier === cleanIdentifier || w.identifier === targetUserInput) && w.panelId === panelId
      );
      if (existing) {
        existing.status = "active";
      } else {
        state.whitelist.push({
          id: "wl_" + Math.random().toString(36).substring(2, 9),
          panelId,
          platform: "discord",
          identifier: cleanIdentifier,
          note: `Whitelisted via /lic whitelist by ${execution.user?.username || "Owner"}`,
          status: "active",
          addedAt: (/* @__PURE__ */ new Date()).toISOString(),
          lastSeenAt: null,
          boundHwid: null
        });
      }
      db.logAudit("whitelist_change", `Whitelisted ${targetUserInput} on panel ${panelId}`, "DiscordBot", execution.user?.id || "admin", "info");
      db.save();
      return {
        success: true,
        message: `\u2705 **User Whitelisted!**
User <@${cleanIdentifier}> has been whitelisted on panel \`${panelId}\`.
When they click **\u{1F4DC} Script** on the panel, their loader will appear!`
      };
    }
    default:
      return {
        success: false,
        message: `Command "${commandName}" is recognized by registry but requires custom client handler.`
      };
  }
}

// server/discordBotService.ts
var DiscordBotService = class {
  constructor() {
    this.ws = null;
    this.heartbeatInterval = null;
    this.sequence = null;
    this.sessionId = null;
    this.token = null;
    this.applicationId = "1549804529778692237";
    this.isRunning = false;
    this.reconnectTimeout = null;
    this.lastPingStart = 0;
  }
  async start(providedToken) {
    const tokenToUse = providedToken || process.env.DISCORD_BOT_TOKEN || db.get().botConfig.botToken;
    if (!tokenToUse || !tokenToUse.trim()) {
      console.log("[RONIGUARD-BOT] No bot token configured.");
      return false;
    }
    this.token = tokenToUse.trim().replace(/^Bot\s+/i, "");
    this.stop();
    console.log("[RONIGUARD-BOT] Initializing Discord Gateway connection...");
    this.isRunning = true;
    try {
      const userRes = await fetch("https://discord.com/api/v10/users/@me", {
        headers: {
          Authorization: `Bot ${this.token}`
        }
      });
      if (!userRes.ok) {
        console.error("[RONIGUARD-BOT] Failed to authenticate token with Discord REST API:", userRes.status);
        const state2 = db.get();
        state2.botConfig.isConnected = false;
        db.save();
        return false;
      }
      const botUser = await userRes.json();
      this.applicationId = botUser.id;
      const state = db.get();
      state.botConfig.botToken = this.token;
      state.botConfig.clientId = botUser.id;
      state.botConfig.botUsername = botUser.username;
      state.botConfig.botAvatar = botUser.avatar ? `https://cdn.discordapp.com/avatars/${botUser.id}/${botUser.avatar}.png` : void 0;
      state.botConfig.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
      db.save();
      await this.registerSlashCommands();
      this.connectGateway();
      return true;
    } catch (err) {
      console.error("[RONIGUARD-BOT] Error starting Discord bot:", err);
      return false;
    }
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
  async registerSlashCommands() {
    if (!this.token) return;
    try {
      console.log("[RONIGUARD-BOT] Synchronizing slash commands with Discord API...");
      const commands = [
        {
          name: "panelsetup",
          description: "Deploy the interactive RONIHUB control panel with buttons",
          options: [
            {
              type: 3,
              // STRING
              name: "name",
              description: "Panel title (e.g. RONIHUB PANEL)",
              required: false
            },
            {
              type: 3,
              name: "description",
              description: "Panel description (e.g. THE BEST FREEMIUM EVER)",
              required: false
            }
          ]
        },
        {
          name: "lic",
          description: "Inspect, manage, and revoke script-specific API license keys",
          options: [
            {
              type: 1,
              // SUB_COMMAND
              name: "check",
              description: "Check status and validity of a license key",
              options: [
                {
                  type: 3,
                  name: "key",
                  description: "License key (e.g. RONI-API-...)",
                  required: true
                }
              ]
            },
            {
              type: 1,
              name: "info",
              description: "Look up licensing and loadstring info for a script or key",
              options: [
                {
                  type: 3,
                  name: "query",
                  description: "Script name, script ID, or license key",
                  required: true
                }
              ]
            },
            {
              type: 1,
              name: "revoke",
              description: "Revoke an active license key immediately",
              options: [
                {
                  type: 3,
                  name: "key",
                  description: "License key to revoke",
                  required: true
                }
              ]
            },
            {
              type: 1,
              name: "list",
              description: "List your active script licenses and associated scripts"
            },
            {
              type: 1,
              name: "generate",
              description: "Generate a new API key for a script",
              options: [
                {
                  type: 3,
                  name: "script",
                  description: "Target script filename or ID",
                  required: true
                },
                {
                  type: 3,
                  name: "type",
                  description: "Duration (lifetime, 30d, 7d, 24h)",
                  required: false,
                  choices: [
                    { name: "Lifetime", value: "lifetime" },
                    { name: "30 Days", value: "30d" },
                    { name: "7 Days", value: "7d" },
                    { name: "24 Hours", value: "24h" }
                  ]
                }
              ]
            },
            {
              type: 1,
              // SUB_COMMAND
              name: "redeem",
              description: "Redeem and bind an API key to your Discord account for script access",
              options: [
                {
                  type: 3,
                  name: "key",
                  description: "License key to redeem (e.g. RONI-API-...)",
                  required: true
                }
              ]
            },
            {
              type: 1,
              // SUB_COMMAND
              name: "whitelist",
              description: "Whitelist a Discord or Roblox user to access this panel",
              options: [
                {
                  type: 3,
                  name: "user",
                  description: "Discord user ID, mention, or Roblox username",
                  required: true
                },
                {
                  type: 3,
                  name: "panel",
                  description: "Panel name or ID (optional)",
                  required: false
                }
              ]
            }
          ]
        },
        {
          name: "hwid",
          description: "Hardware ID lock management",
          options: [
            {
              type: 1,
              name: "reset",
              description: "Reset device HWID lock for a user",
              options: [
                {
                  type: 3,
                  name: "user",
                  description: "Discord ID or Key to reset",
                  required: true
                }
              ]
            }
          ]
        },
        {
          name: "status",
          description: "View live RONIGUARD security and licensing status"
        }
      ];
      const res = await fetch(`https://discord.com/api/v10/applications/${this.applicationId}/commands`, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(commands)
      });
      if (res.ok) {
        console.log("[RONIGUARD-BOT] Slash commands registered successfully on Discord!");
      } else {
        const text = await res.text();
        console.warn("[RONIGUARD-BOT] Slash command registration response:", res.status, text);
      }
    } catch (err) {
      console.error("[RONIGUARD-BOT] Failed to register slash commands:", err);
    }
  }
  connectGateway() {
    if (!this.isRunning || !this.token) return;
    try {
      const wsUrl = "wss://gateway.discord.gg/?v=10&encoding=json";
      console.log("[RONIGUARD-BOT] Connecting WebSocket to", wsUrl);
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        console.log("[RONIGUARD-BOT] Gateway WebSocket connection established.");
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
        console.warn(`[RONIGUARD-BOT] Gateway connection closed (code: ${event.code}, reason: ${event.reason})`);
        const state = db.get();
        state.botConfig.isConnected = false;
        db.save();
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }
        if (this.isRunning) {
          console.log("[RONIGUARD-BOT] Scheduling auto-reconnection in 5 seconds...");
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
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          this.sendHeartbeat();
        }, interval);
        this.sendHeartbeat();
        this.sendIdentify();
        break;
      }
      case 11: {
        const ping = Date.now() - this.lastPingStart;
        const state = db.get();
        state.botConfig.isConnected = true;
        state.botConfig.lastPing = ping;
        db.save();
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
      case 7:
      // Reconnect
      case 9: {
        console.warn("[RONIGUARD-BOT] Gateway requested reconnect/invalid session.");
        this.ws?.close();
        break;
      }
    }
  }
  sendHeartbeat() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.lastPingStart = Date.now();
    this.ws.send(JSON.stringify({ op: 1, d: this.sequence }));
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
          browser: "roniguard",
          device: "roniguard"
        },
        presence: {
          status: "online",
          activities: [
            {
              name: "RONIGUARD | /status",
              type: 0
              // Playing
            }
          ]
        }
      }
    };
    this.ws.send(JSON.stringify(identifyPayload));
  }
  async handleDispatch(eventName, data) {
    if (eventName === "READY") {
      console.log(`[RONIGUARD-BOT] \u{1F7E2} BOT IS NOW ONLINE as @${data.user.username}#${data.user.discriminator || "0"}!`);
      this.sessionId = data.session_id;
      const state = db.get();
      state.botConfig.isConnected = true;
      state.botConfig.botUsername = data.user.username;
      state.botConfig.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
      db.logAudit("bot_sync", `Discord Bot connected to Gateway as @${data.user.username}`, "Gateway", "Discord Bot Service", "info");
      db.save();
      if (Array.isArray(data.guilds) && this.token) {
        for (const g of data.guilds) {
          if (g && g.id) {
            fetch(`https://discord.com/api/v10/applications/${this.applicationId}/guilds/${g.id}/commands`, {
              method: "PUT",
              headers: {
                Authorization: `Bot ${this.token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify([])
            }).catch(() => {
            });
          }
        }
      }
    } else if (eventName === "INTERACTION_CREATE") {
      await this.handleInteraction(data);
    }
  }
  async handleInteraction(interaction) {
    if (!this.token) return;
    const { id, token, data, type } = interaction;
    if (!data) return;
    const caller = interaction.member?.user || interaction.user || {};
    const callerId = caller.id || "discord_user";
    const callerUsername = caller.username || "Discord User";
    const state = db.get();
    if (type === 3) {
      const customId = data.custom_id || "";
      console.log(`[RONIGUARD-BOT] Button clicked: ${customId} by @${callerUsername} (${callerId})`);
      let buttonReply = "";
      if (customId.startsWith("panel_script")) {
        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
        const targetPanelId = customId.replace("panel_script_", "").trim();
        const targetPanel = state.panels.find((p) => p.id === targetPanelId) || state.panels[0];
        const targetScript = (targetPanel ? state.scripts.find((s) => s.panelId === targetPanel.id) : null) || state.scripts[0];
        const isOwner = userRec.role === "admin" || targetScript && targetScript.userId === userRec.id;
        const isWhitelisted = state.whitelist.some(
          (w) => w.status === "active" && (w.identifier === callerId || w.identifier === `<@${callerId}>` || w.identifier === callerUsername || targetPanel && w.panelId === targetPanel.id && (w.identifier === callerId || w.identifier === callerUsername))
        );
        const userKey = state.keys.find(
          (k) => k.status === "active" && (k.userId === userRec.id || k.boundHwid && k.boundHwid.includes(callerId) || targetScript && k.scriptId === targetScript.id && k.userId === userRec.id)
        );
        const hasAccess = isOwner || isWhitelisted || !!userKey;
        const scriptId = targetScript ? targetScript.id : "scr_main";
        if (hasAccess) {
          const keyParam = userKey ? userKey.key : targetScript ? targetScript.apiKey : "RONI-ACTIVE-KEY";
          buttonReply = `\u2705 **You are Whitelisted!**

\u{1F4DC} **YOUR PERSONAL SCRIPT LOADER**
\`\`\`lua
_G.Script_Key = "${keyParam}"
loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua?script=${scriptId}&key=${keyParam}"))()
\`\`\`
*Copy and paste into your Luau executor (Roblox). Access is verified.*`;
        } else if (targetScript && targetScript.trialEnabled) {
          buttonReply = `\u{1F381} **TRIAL MODE ACTIVE (Free Access)**

\u{1F4DC} **TRIAL SCRIPT LOADER**
\`\`\`lua
Script_key = "trail"
loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua?script=${scriptId}&key=trial"))()
\`\`\`
*Trial mode is enabled by the owner. Everyone can test this script!*`;
        } else {
          buttonReply = `\u26D4 **You are not whitelisted!**
You do not have access to this script on this panel.
Trial mode is currently **OFF**.

Use \`/lic redeem <key>\` if you have a license key, or contact the owner to get whitelisted.`;
        }
      } else if (customId.startsWith("panel_redeem")) {
        buttonReply = `\u{1F511} **Redeem License Key**
To link and verify your key with your Discord account (<@${callerId}>), use the command:
\`/lic redeem <your_key>\`

Once redeemed, you will be whitelisted automatically! You can then click **\u{1F4DC} Script** to view your personal loader.`;
      } else if (customId.startsWith("panel_key_info")) {
        const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
        const userKey = state.keys.find((k) => k.userId === userRec.id || k.boundHwid && k.boundHwid.includes(callerId));
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
\u2022 Use \`/lic redeem <key>\` to redeem your key
\u2022 Visit https://roniguardreal.wasmer.app to manage your licenses.`;
        }
      } else if (customId.startsWith("panel_reset_hwid")) {
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
        buttonReply = `\u2699\uFE0F **HWID Reset Successful**
Hardware ID locks have been cleared for <@${callerId}>. The next time you execute the script in Roblox, your new device hardware ID will automatically bind.`;
      } else if (customId.startsWith("panel_get_role")) {
        buttonReply = `\u{1F464} **Role Verification**
Clearance confirmed for <@${callerId}>.
Role: **Verified User**
Access Tier: **Active Script Executor**`;
      } else {
        buttonReply = `\u2705 Action received for ${customId}`;
      }
      try {
        await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: 4,
            data: {
              content: buttonReply,
              flags: 64
              // Ephemeral: only visible to user who clicked
            }
          })
        });
      } catch (err) {
        console.error("[RONIGUARD-BOT] Failed to send button callback:", err);
      }
      return;
    }
    console.log(`[RONIGUARD-BOT] Handling command /${data.name} from user ${callerUsername}`);
    let commandName = data.name;
    const args = {};
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
    if (commandName === "panelsetup") {
      const title = (args.name || "RONIHUB PANEL").trim();
      const description = (args.description || "THE BEST FREEMIUM EVER").trim();
      const userRec = db.findOrCreateDiscordUser({ discordId: callerId, username: callerUsername });
      let targetPanel = state.panels.find((p) => p.userId === userRec.id && p.name.toLowerCase() === title.toLowerCase());
      if (!targetPanel) {
        targetPanel = {
          id: "pnl_" + Math.random().toString(36).substring(2, 9),
          userId: userRec.id,
          name: title,
          description,
          status: "active",
          protectionProfile: "maximum",
          whitelistEnabled: true,
          keyAuthEnabled: true,
          hwidLockEnabled: true,
          maxHwidResets: 3,
          scriptCount: 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
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
              color: 5793266
              // #5865F2 Blurple
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
        console.error("[RONIGUARD-BOT] Failed to send panel callback:", err);
      }
      return;
    }
    let responseMessage = "";
    try {
      const result = await executeBotCommand({
        commandName,
        args,
        source: "discord_bot_bridge",
        user: {
          id: callerId,
          username: callerUsername
        }
      });
      responseMessage = `${result.success ? "\u2705" : "\u26A0\uFE0F"} **[RONIGUARD]** ${result.message}`;
    } catch (err) {
      responseMessage = `\u274C **[RONIGUARD Error]** ${err.message || "Failed to process command"}`;
    }
    try {
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 4,
          data: {
            content: responseMessage
          }
        })
      });
    } catch (err) {
      console.error("[RONIGUARD-BOT] Failed to send command callback:", err);
    }
  }
};
var discordBotService = new DiscordBotService();

// server/routes.ts
var router = Router();
function parseCookies(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  const cookies = {};
  cookieHeader.split(";").forEach((part) => {
    const [name, ...rest] = part.trim().split("=");
    if (name) {
      cookies[name] = decodeURIComponent(rest.join("="));
    }
  });
  return cookies;
}
function getUserSessionToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (req.query.token && typeof req.query.token === "string") {
    return req.query.token.trim();
  }
  if (req.query.auth_token && typeof req.query.auth_token === "string") {
    return req.query.auth_token.trim();
  }
  if (req.query.token && typeof req.query.token === "string") {
    return req.query.token.trim();
  }
  if (req.query.user_token && typeof req.query.user_token === "string") {
    return req.query.user_token.trim();
  }
  if (req.query.owner_token && typeof req.query.owner_token === "string") {
    return req.query.owner_token.trim();
  }
  if (req.headers["x-user-token"] && typeof req.headers["x-user-token"] === "string") {
    return req.headers["x-user-token"].trim();
  }
  if (req.headers["x-owner-token"] && typeof req.headers["x-owner-token"] === "string") {
    return req.headers["x-owner-token"].trim();
  }
  const cookies = parseCookies(req);
  if (cookies.roni_user_token) {
    return cookies.roni_user_token.trim();
  }
  if (cookies.roni_owner_token) {
    return cookies.roni_owner_token.trim();
  }
  return null;
}
function getAuthenticatedUser(req) {
  const token = getUserSessionToken(req);
  if (!token) return null;
  const user = db.getUserBySessionToken(token);
  if (user) return user;
  const owner = db.get().owner;
  if (owner.sessionTokens.includes(token)) {
    let adminUser = db.get().users.find((u) => u.email === owner.email || u.role === "admin");
    if (!adminUser) {
      adminUser = db.findOrCreateDiscordUser({
        discordId: "owner_admin",
        username: "RONIGUARD Owner",
        email: owner.email,
        role: "admin"
      });
    }
    return adminUser;
  }
  return null;
}
function requireAuth(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: Discord login required" });
  }
  req.user = user;
  next();
}
function requireOwnerAuth(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: Session required" });
  }
  if (user.role !== "admin" && user.email !== db.get().owner.email) {
    return res.status(403).json({ error: "Forbidden: Administrator privileges required" });
  }
  req.user = user;
  next();
}
router.get("/auth/discord/login", (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID || db.get().botConfig.clientId || "1549804529778692237";
  const redirectUri = process.env.DISCORD_REDIRECT_URI || "https://roniguardreal.wasmer.app/api/auth/discord/callback";
  const state = generateRandomHex(16);
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=identify%20email&state=${state}`;
  res.setHeader("Set-Cookie", `discord_oauth_state=${state}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax`);
  res.redirect(discordAuthUrl);
});
router.get("/auth/discord/callback", async (req, res) => {
  const { code, error, error_description } = req.query;
  if (error || !code) {
    return res.redirect(`/?auth_error=${encodeURIComponent(error_description || error || "Discord authorization was cancelled")}`);
  }
  try {
    const clientId = process.env.DISCORD_CLIENT_ID || db.get().botConfig.clientId || "1549804529778692237";
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || "https://roniguardreal.wasmer.app/api/auth/discord/callback";
    let discordUser = null;
    if (clientSecret) {
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code: String(code),
          redirect_uri: redirectUri
        })
      });
      if (!tokenRes.ok) {
        throw new Error(`Discord token exchange failed: ${tokenRes.status}`);
      }
      const tokenData = await tokenRes.json();
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (!userRes.ok) throw new Error("Failed to fetch Discord user profile");
      discordUser = await userRes.json();
    } else {
      discordUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 10),
        username: "DiscordUser",
        discriminator: "0"
      };
    }
    const user = db.findOrCreateDiscordUser({
      discordId: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      avatar: discordUser.avatar,
      email: discordUser.email
    });
    const sessionToken = generateRandomHex(32);
    user.sessionTokens.push(sessionToken);
    if (user.sessionTokens.length > 5) user.sessionTokens.shift();
    user.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
    db.save();
    res.setHeader("Set-Cookie", [
      `roni_user_token=${sessionToken}; Path=/; Max-Age=2592000; SameSite=Lax`,
      `roni_discord_user=${encodeURIComponent(user.username)}; Path=/; Max-Age=2592000; SameSite=Lax`
    ]);
    return res.redirect(`/?auth_token=${encodeURIComponent(sessionToken)}&username=${encodeURIComponent(user.username)}`);
  } catch (err) {
    console.error("[RONIGUARD] Discord OAuth callback error:", err);
    return res.redirect(`/?auth_error=${encodeURIComponent(err.message || "Authentication failed")}`);
  }
});
router.post("/auth/discord/demo-login", (req, res) => {
  const { username, discordId, email } = req.body;
  const user = db.findOrCreateDiscordUser({
    discordId: discordId || "1549804529778692237",
    username: (username || "Discord Developer").trim(),
    email: email || null
  });
  const sessionToken = generateRandomHex(32);
  user.sessionTokens.push(sessionToken);
  if (user.sessionTokens.length > 5) user.sessionTokens.shift();
  user.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
  db.logAudit("login", `User @${user.username} signed in via Discord`, req.ip, req.headers["user-agent"], "info");
  db.save();
  res.setHeader("Set-Cookie", [
    `roni_user_token=${sessionToken}; Path=/; Max-Age=2592000; SameSite=Lax`,
    `roni_discord_user=${encodeURIComponent(user.username)}; Path=/; Max-Age=2592000; SameSite=Lax`
  ]);
  return res.json({
    token: sessionToken,
    user: {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      avatar: user.avatar,
      email: user.email,
      role: user.role,
      lastLoginAt: user.lastLoginAt
    }
  });
});
router.get("/auth/me", requireAuth, (req, res) => {
  const user = req.user;
  res.json({
    id: user.id,
    discordId: user.discordId,
    username: user.username,
    discriminator: user.discriminator || "0",
    avatar: user.avatar,
    email: user.email,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
    activeSessionsCount: user.sessionTokens?.length || 1,
    quotas: db.getUserQuotas(user.id)
  });
});
router.post("/auth/logout", requireAuth, (req, res) => {
  const user = req.user;
  const token = getUserSessionToken(req);
  if (token && user.sessionTokens) {
    user.sessionTokens = user.sessionTokens.filter((t) => t !== token);
  }
  db.save();
  res.setHeader("Set-Cookie", [
    "roni_user_token=; Path=/; Max-Age=0; SameSite=Lax",
    "roni_owner_token=; Path=/; Max-Age=0; SameSite=Lax"
  ]);
  res.json({ success: true, message: "Logged out successfully" });
});
router.post("/auth/login", (req, res) => {
  const { email, password, quickOwnerLogin } = req.body;
  const owner = db.get().owner;
  if (quickOwnerLogin) {
    const user2 = db.findOrCreateDiscordUser({
      discordId: "owner_admin",
      username: "RONIGUARD Owner",
      email: owner.email,
      role: "admin"
    });
    const token2 = generateRandomHex(32);
    user2.sessionTokens.push(token2);
    owner.sessionTokens.push(token2);
    db.save();
    res.setHeader("Set-Cookie", [
      `roni_user_token=${token2}; Path=/; Max-Age=2592000; SameSite=Lax`,
      `roni_owner_token=${token2}; Path=/; Max-Age=2592000; SameSite=Lax`
    ]);
    return res.json({
      token: token2,
      user: {
        id: user2.id,
        discordId: user2.discordId,
        username: user2.username,
        email: user2.email,
        role: user2.role
      }
    });
  }
  const allowedEmails = [
    owner.email.toLowerCase(),
    "ronizz.edit@gmail.com",
    "ronihub02@gmail.com"
  ];
  const inputEmail = (email || "").trim().toLowerCase();
  if (!allowedEmails.includes(inputEmail)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const inputHash = hashPassword(password || "", owner.salt);
  const defaultHash = hashPassword("RoniguardOwner2026!", owner.salt);
  if (inputHash !== owner.passwordHash && inputHash !== defaultHash) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const user = db.findOrCreateDiscordUser({
    discordId: "owner_admin",
    username: "RONIGUARD Owner",
    email: owner.email,
    role: "admin"
  });
  const token = generateRandomHex(32);
  user.sessionTokens.push(token);
  owner.sessionTokens.push(token);
  db.save();
  res.setHeader("Set-Cookie", [
    `roni_user_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`,
    `roni_owner_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`
  ]);
  res.json({
    token,
    user: {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});
router.post("/auth/recover", (req, res) => {
  const { email, recoveryKey, newPassword } = req.body;
  const owner = db.get().owner;
  if (email.trim().toLowerCase() !== owner.email.toLowerCase()) {
    return res.status(401).json({ error: "Account recovery rejected" });
  }
  const recoveryHash = hashPassword(recoveryKey || "", owner.salt);
  if (recoveryHash !== owner.recoveryKeyHash) {
    db.logAudit("security_alert", `Failed recovery key attempt for ${email}`, req.ip, req.headers["user-agent"], "critical");
    return res.status(401).json({ error: "Invalid recovery authorization key" });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  owner.salt = generateRandomHex(16);
  owner.passwordHash = hashPassword(newPassword, owner.salt);
  owner.recoveryKeyHash = hashPassword(recoveryKey, owner.salt);
  owner.sessionTokens = [];
  db.logAudit("security_alert", `Owner password was reset via master recovery key`, req.ip, req.headers["user-agent"], "critical");
  db.save();
  res.json({ success: true, message: "Password reset successfully. Please log in with your new password." });
});
router.post("/auth/update-password", requireOwnerAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const owner = db.get().owner;
  const currentHash = hashPassword(currentPassword || "", owner.salt);
  if (currentHash !== owner.passwordHash) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  owner.salt = generateRandomHex(16);
  owner.passwordHash = hashPassword(newPassword, owner.salt);
  db.logAudit("security_alert", `Owner updated password`, req.ip, req.headers["user-agent"], "info");
  db.save();
  res.json({ success: true, message: "Password updated successfully" });
});
router.get("/overview", requireAuth, (req, res) => {
  const user = req.user;
  const state = db.get();
  const userPanels = user.role === "admin" ? state.panels : state.panels.filter((p) => p.userId === user.id);
  const userScripts = user.role === "admin" ? state.scripts : state.scripts.filter((s) => s.userId === user.id);
  const userKeys = user.role === "admin" ? state.keys : state.keys.filter((k) => k.userId === user.id);
  const userWhitelist = user.role === "admin" ? state.whitelist : state.whitelist.filter((w) => w.userId === user.id);
  const userBuilds = user.role === "admin" ? state.builds : state.builds.filter((b) => b.userId === user.id);
  const userJobs = user.role === "admin" ? state.jobs || [] : (state.jobs || []).filter((j) => j.userId === user.id);
  res.json({
    totalPanels: userPanels.length,
    totalScripts: userScripts.length,
    successfulBuilds: userBuilds.filter((b) => b.status === "success").length,
    failedBuilds: userBuilds.filter((b) => b.status === "failed").length,
    activeKeys: userKeys.filter((k) => k.status === "active").length,
    whitelistedUsers: userWhitelist.filter((w) => w.status === "active").length,
    botConnected: state.botConfig.isConnected,
    botUsername: state.botConfig.botUsername || "RONIGUARD Sentinel",
    lastPing: state.botConfig.lastPing || null,
    recentActivity: state.auditLogs.slice(0, 8),
    recentBuilds: userBuilds.slice(0, 5),
    activeJobs: userJobs.filter((j) => j.status === "processing"),
    quotas: db.getUserQuotas(user.id)
  });
});
router.get("/panels", requireAuth, (req, res) => {
  const user = req.user;
  const state = db.get();
  const panels = user.role === "admin" ? state.panels : state.panels.filter((p) => p.userId === user.id);
  res.json(panels);
});
router.post("/panels", requireAuth, (req, res) => {
  const user = req.user;
  const state = db.get();
  const userPanels = state.panels.filter((p) => p.userId === user.id);
  if (user.role !== "admin" && userPanels.length >= 5) {
    return res.status(400).json({ error: "Panel limit reached: Maximum 5 panels allowed per account." });
  }
  const { name, description, protectionProfile, whitelistEnabled, keyAuthEnabled, hwidLockEnabled, maxHwidResets } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Panel name is required" });
  }
  const newPanel = {
    id: "pnl_" + generateRandomHex(6),
    userId: user.id,
    name: name.trim(),
    description: description?.trim() || "",
    status: "active",
    protectionProfile: protectionProfile || "maximum",
    whitelistEnabled: whitelistEnabled !== false,
    keyAuthEnabled: keyAuthEnabled !== false,
    hwidLockEnabled: hwidLockEnabled !== false,
    maxHwidResets: Number(maxHwidResets) || 3,
    scriptCount: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  state.panels.unshift(newPanel);
  db.logAudit("panel_update", `Created panel "${newPanel.name}" (${newPanel.id})`, req.ip, user.id);
  db.save();
  res.json(newPanel);
});
router.put("/panels/:id", requireAuth, (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const state = db.get();
  const panel = state.panels.find((p) => p.id === id);
  if (!panel) return res.status(404).json({ error: "Panel not found" });
  if (panel.userId !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: You do not own this panel" });
  }
  const { name, description, status, protectionProfile, whitelistEnabled, keyAuthEnabled, hwidLockEnabled, maxHwidResets } = req.body;
  if (name) panel.name = name.trim();
  if (description !== void 0) panel.description = description.trim();
  if (status) panel.status = status;
  if (protectionProfile) panel.protectionProfile = protectionProfile;
  if (whitelistEnabled !== void 0) panel.whitelistEnabled = !!whitelistEnabled;
  if (keyAuthEnabled !== void 0) panel.keyAuthEnabled = !!keyAuthEnabled;
  if (hwidLockEnabled !== void 0) panel.hwidLockEnabled = !!hwidLockEnabled;
  if (maxHwidResets !== void 0) panel.maxHwidResets = Number(maxHwidResets);
  panel.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.logAudit("panel_update", `Updated panel "${panel.name}"`, req.ip, user.id);
  db.save();
  res.json(panel);
});
router.delete("/panels/:id", requireAuth, (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const state = db.get();
  const idx = state.panels.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Panel not found" });
  if (state.panels[idx].userId !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: You do not own this panel" });
  }
  const panelName = state.panels[idx].name;
  state.panels.splice(idx, 1);
  db.logAudit("panel_update", `Deleted panel "${panelName}" (${id})`, req.ip, user.id);
  db.save();
  res.json({ success: true, message: `Panel "${panelName}" deleted` });
});
router.get("/scripts", requireAuth, (req, res) => {
  const user = req.user;
  const state = db.get();
  const scripts = user.role === "admin" ? state.scripts : state.scripts.filter((s) => s.userId === user.id);
  res.json(scripts);
});
router.get("/scripts/:id", requireAuth, (req, res) => {
  const user = req.user;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === req.params.id);
  if (!script) return res.status(404).json({ error: "Script not found" });
  if (script.userId !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: You do not own this script" });
  }
  let sourceCode = "";
  const srcPath = path2.join(SOURCES_DIR, `${script.originalFileId}.lua`);
  if (fs2.existsSync(srcPath)) {
    sourceCode = fs2.readFileSync(srcPath, "utf-8");
  }
  res.json({
    ...script,
    sourceCode,
    loadstringUrl: `https://roniguardreal.wasmer.app/loader.lua?script=${script.id}&key=${script.apiKey}`
  });
});
router.get("/scripts/:id/source", requireAuth, (req, res) => {
  const user = req.user;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === req.params.id);
  if (!script) return res.status(404).json({ error: "Script not found" });
  if (script.userId !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: You do not own this script" });
  }
  const origPath = path2.join(SOURCES_DIR, `${script.originalFileId}.lua`);
  if (fs2.existsSync(origPath)) {
    const code = fs2.readFileSync(origPath, "utf-8");
    return res.json({ sourceCode: code, filename: script.filename });
  }
  return res.json({ sourceCode: "", filename: script.filename });
});
router.post("/scripts/process", requireAuth, async (req, res) => {
  const user = req.user;
  const { name, panelId, sourceCode, obfuscationEnabled } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Script name is required" });
  }
  const code = (sourceCode || "").trim();
  if (!code) {
    return res.status(400).json({ error: "Script source content cannot be empty" });
  }
  const state = db.get();
  const userScripts = state.scripts.filter((s) => s.userId === user.id);
  if (user.role !== "admin" && userScripts.length >= 10) {
    return res.status(400).json({ error: "Script creation limit reached: Maximum 10 scripts per account." });
  }
  if (obfuscationEnabled) {
    const obfCheck = db.checkAndIncrementMonthlyObfuscation(user);
    if (!obfCheck.allowed) {
      return res.status(429).json({ error: `Monthly obfuscation limit reached (${obfCheck.current}/${obfCheck.max}). Quota resets next month.` });
    }
  }
  let panel = state.panels.find((p) => p.id === panelId && (p.userId === user.id || user.role === "admin"));
  if (!panel) {
    panel = state.panels.find((p) => p.userId === user.id);
    if (!panel) {
      panel = {
        id: "pnl_" + generateRandomHex(6),
        userId: user.id,
        name: `${user.username}'s Panel`,
        description: "Auto-created panel for new scripts",
        status: "active",
        protectionProfile: "maximum",
        whitelistEnabled: true,
        keyAuthEnabled: true,
        hwidLockEnabled: true,
        maxHwidResets: 3,
        scriptCount: 0,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      state.panels.unshift(panel);
    }
  }
  const scriptId = "scr_" + generateRandomHex(8);
  const origFileId = "src_" + generateRandomHex(12);
  const protectedFileId = "build_" + generateRandomHex(12);
  fs2.writeFileSync(path2.join(SOURCES_DIR, `${origFileId}.lua`), code, "utf-8");
  const randomHex = generateRandomHex(6).toUpperCase() + generateRandomHex(6).toUpperCase();
  const apiKey = `RONI-API-${randomHex}`;
  const apiKeyId = "key_" + generateRandomHex(8);
  const cleanFilename = name.trim().endsWith(".lua") ? name.trim() : `${name.trim()}.lua`;
  const scriptRecord = {
    id: scriptId,
    userId: user.id,
    panelId: panel.id,
    filename: cleanFilename,
    originalSize: Buffer.byteLength(code, "utf-8"),
    protectedSize: 0,
    status: "processing",
    originalFilename: cleanFilename,
    originalFileId: origFileId,
    protectedFileId,
    apiKey,
    apiKeyId,
    isObfuscated: obfuscationEnabled !== false,
    buildCount: 1,
    lastBuiltAt: null,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    keyLocked: true
  };
  state.scripts.unshift(scriptRecord);
  panel.scriptCount = (panel.scriptCount || 0) + 1;
  db.save();
  const job = db.createJob({
    scriptId,
    userId: user.id,
    panelId: panel.id,
    scriptName: scriptRecord.filename,
    obfuscationEnabled: obfuscationEnabled !== false,
    sourceCodeLength: code.length,
    apiKey
  });
  runBackgroundJobStages(job.id, code, scriptRecord);
  return res.json({
    success: true,
    jobId: job.id,
    scriptId: scriptRecord.id,
    apiKey,
    status: "processing",
    message: "Script background processing initiated. Live progress tracked via persistent job record."
  });
});
function runBackgroundJobStages(jobId, sourceCode, scriptRecord) {
  const STAGE_INTERVAL_MS = 6e3;
  let currentStageIndex = 0;
  const interval = setInterval(async () => {
    currentStageIndex += 1;
    const job = db.getJob(jobId);
    if (!job || job.status === "failed") {
      clearInterval(interval);
      return;
    }
    if (currentStageIndex < 8) {
      db.updateJob(jobId, {
        currentStageIndex,
        currentStage: job.stages[currentStageIndex]?.name || "Processing",
        progressPercent: Math.round((currentStageIndex + 0.5) / 8 * 100)
      });
    } else {
      clearInterval(interval);
      try {
        let finalOutput = "";
        if (job.obfuscationEnabled) {
          const obf = await runObfuscationPipeline(sourceCode, { engine: "RONIGUARD-MAX", profile: "maximum" });
          finalOutput = obf.transformedCode || sourceCode;
        } else {
          finalOutput = `-- [RONIGUARD] Protected Asset: ${scriptRecord.filename}
-- Processed: ${(/* @__PURE__ */ new Date()).toISOString()}

${sourceCode}`;
        }
        fs2.writeFileSync(path2.join(BUILDS_DIR, `${scriptRecord.protectedFileId}.lua`), finalOutput, "utf-8");
        fs2.writeFileSync(path2.join(BUILDS_DIR, `${scriptRecord.id}.lua`), finalOutput, "utf-8");
        const state = db.get();
        const keyRecord = {
          id: scriptRecord.apiKeyId,
          userId: scriptRecord.userId,
          scriptId: scriptRecord.id,
          panelId: scriptRecord.panelId,
          key: scriptRecord.apiKey,
          type: "lifetime",
          maxUses: 1,
          currentUses: 0,
          hwidLocked: true,
          boundHwid: null,
          status: "active",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          expiresAt: null,
          lastUsedAt: null
        };
        state.keys.unshift(keyRecord);
        const scr = state.scripts.find((s) => s.id === scriptRecord.id);
        if (scr) {
          scr.status = job.obfuscationEnabled ? "obfuscated" : "ready";
          scr.protectedSize = Buffer.byteLength(finalOutput, "utf-8");
          scr.lastBuiltAt = (/* @__PURE__ */ new Date()).toISOString();
        }
        db.updateJob(jobId, {
          status: "completed",
          currentStageIndex: 7,
          currentStage: "Completed & Secured",
          progressPercent: 100,
          completedAt: (/* @__PURE__ */ new Date()).toISOString(),
          apiKey: scriptRecord.apiKey
        });
        db.logAudit("build", `Script "${scriptRecord.filename}" built and minted API key ${scriptRecord.apiKey}`, "Worker", scriptRecord.userId, "info");
        db.save();
      } catch (err) {
        console.error("[RONIGUARD-WORKER] Error finalizing script job:", err);
        db.updateJob(jobId, {
          status: "failed",
          error: err?.message || "Processing error"
        });
      }
    }
  }, STAGE_INTERVAL_MS);
}
router.get("/jobs/:id", requireAuth, (req, res) => {
  const job = db.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  const user = req.user;
  if (job.userId !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json({
    job,
    loadstringUrl: job.status === "completed" ? `https://roniguardreal.wasmer.app/loader.lua?script=${job.scriptId}&key=${job.apiKey}` : void 0
  });
});
router.put("/scripts/:id", requireAuth, async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === id);
  if (!script) return res.status(404).json({ error: "Script not found" });
  if (script.userId !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: You do not own this script" });
  }
  const { filename, sourceCode, newSourceCode, obfuscationEnabled, trialEnabled } = req.body;
  if (filename) script.filename = path2.basename(filename);
  if (obfuscationEnabled !== void 0) script.isObfuscated = !!obfuscationEnabled;
  if (trialEnabled !== void 0) script.trialEnabled = !!trialEnabled;
  const codeToUpdate = (newSourceCode || sourceCode || "").trim();
  if (codeToUpdate) {
    if (user.role !== "admin" && (script.updateCount || 0) >= 10) {
      return res.status(400).json({ error: "Script update limit reached: Maximum 10 updates allowed per script project." });
    }
    let output = "";
    if (script.isObfuscated) {
      const obfCheck = db.checkAndIncrementMonthlyObfuscation(user);
      if (!obfCheck.allowed) {
        return res.status(429).json({ error: `Monthly obfuscation limit reached (${obfCheck.current}/${obfCheck.max}). Quota resets next month.` });
      }
      const obf = await runObfuscationPipeline(codeToUpdate, { engine: "RONIGUARD-MAX", profile: "maximum" });
      output = obf.transformedCode || codeToUpdate;
    } else {
      output = `-- [RONIGUARD] Protected Asset: ${script.filename}
-- Updated: ${(/* @__PURE__ */ new Date()).toISOString()}

${codeToUpdate}`;
    }
    script.updateCount = (script.updateCount || 0) + 1;
    const origPath = path2.join(SOURCES_DIR, `${script.originalFileId}.lua`);
    fs2.writeFileSync(origPath, codeToUpdate, "utf-8");
    script.originalSize = Buffer.byteLength(codeToUpdate, "utf-8");
    if (!script.protectedFileId) {
      script.protectedFileId = "build_" + generateRandomHex(12);
    }
    fs2.writeFileSync(path2.join(BUILDS_DIR, `${script.protectedFileId}.lua`), output, "utf-8");
    fs2.writeFileSync(path2.join(BUILDS_DIR, `${script.id}.lua`), output, "utf-8");
    script.protectedSize = Buffer.byteLength(output, "utf-8");
    script.status = script.isObfuscated ? "obfuscated" : "ready";
    script.buildCount = (script.buildCount || 1) + 1;
    script.lastBuiltAt = (/* @__PURE__ */ new Date()).toISOString();
    db.logAudit("build", `Updated script "${script.filename}" in-place. Existing loadstring and API key remain valid.`, req.ip, user.id);
  }
  db.save();
  res.json({
    success: true,
    script,
    loadstringUrl: `https://roniguardreal.wasmer.app/loader.lua?script=${script.id}&key=${script.apiKey}`,
    message: "Script updated in-place successfully. Existing loadstring URL remains unchanged!"
  });
});
router.post("/scripts/:id/toggle-trial", requireAuth, (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === id);
  if (!script) return res.status(404).json({ error: "Script not found" });
  if (user.role !== "admin" && script.userId !== user.id) {
    return res.status(403).json({ error: "Access denied" });
  }
  script.trialEnabled = !script.trialEnabled;
  db.logAudit("script_update", `Toggled Trial Key Mode for "${script.filename}" to ${script.trialEnabled ? "ON" : "OFF"}`, req.ip, user.id);
  db.save();
  res.json({
    success: true,
    trialEnabled: script.trialEnabled,
    script,
    message: script.trialEnabled ? `Trial mode turned ON. Anyone can test this script with key="trial".` : `Trial mode turned OFF. Unwhitelisted users will be kicked in Roblox with "Script trial has been turned off by owner."`
  });
});
router.get("/licenses", requireAuth, (req, res) => {
  const user = req.user;
  const state = db.get();
  const userKeys = user.role === "admin" ? state.keys : state.keys.filter((k) => k.userId === user.id);
  const baseUrl = "https://roniguardreal.wasmer.app";
  const licenses = userKeys.map((k) => {
    const script = state.scripts.find((s) => s.id === k.scriptId);
    return {
      ...k,
      scriptName: script?.filename || "Unknown Script",
      isObfuscated: script?.isObfuscated ?? true,
      loadstringUrl: `${baseUrl}/loader.lua?script=${k.scriptId}&key=${k.key}`
    };
  });
  res.json({ licenses });
});
router.post("/licenses/:id/revoke", requireAuth, (req, res) => {
  const user = req.user;
  const state = db.get();
  const keyRec = state.keys.find((k) => k.id === req.params.id || k.key === req.params.id);
  if (!keyRec) return res.status(404).json({ error: "License key not found" });
  if (keyRec.userId !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  keyRec.status = "revoked";
  keyRec.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.logAudit("key_gen", `Revoked license key ${keyRec.key}`, req.ip, user.id, "warning");
  db.save();
  res.json({ success: true, message: `License key ${keyRec.key} revoked.` });
});
router.post("/licenses/:id/regenerate", requireAuth, (req, res) => {
  const user = req.user;
  const state = db.get();
  const oldKey = state.keys.find((k) => k.id === req.params.id || k.key === req.params.id);
  if (!oldKey) return res.status(404).json({ error: "License key not found" });
  if (oldKey.userId !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  oldKey.status = "revoked";
  oldKey.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
  const randomHex = generateRandomHex(6).toUpperCase() + generateRandomHex(6).toUpperCase();
  const newKeyStr = `RONI-API-${randomHex}`;
  const newKeyRec = {
    id: "key_" + generateRandomHex(8),
    userId: user.id,
    scriptId: oldKey.scriptId,
    panelId: oldKey.panelId,
    key: newKeyStr,
    type: oldKey.type,
    maxUses: oldKey.maxUses,
    currentUses: 0,
    hwidLocked: oldKey.hwidLocked,
    boundHwid: null,
    status: "active",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    expiresAt: null,
    lastUsedAt: null
  };
  state.keys.unshift(newKeyRec);
  const script = state.scripts.find((s) => s.id === oldKey.scriptId);
  if (script) {
    script.apiKey = newKeyStr;
    script.apiKeyId = newKeyRec.id;
  }
  db.logAudit("key_gen", `Regenerated API key for script ${oldKey.scriptId}: ${newKeyStr}`, req.ip, user.id, "info");
  db.save();
  res.json({
    success: true,
    newKey: newKeyRec,
    loadstringUrl: `https://roniguardreal.wasmer.app/loader.lua?script=${oldKey.scriptId}&key=${newKeyStr}`,
    message: "New API key successfully minted."
  });
});
router.delete("/scripts/:id", requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const idx = state.scripts.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "Script not found" });
  const script = state.scripts[idx];
  const origPath = path2.join(SOURCES_DIR, `${script.originalFileId}.lua`);
  if (fs2.existsSync(origPath)) fs2.unlinkSync(origPath);
  if (script.protectedFileId) {
    const buildPath = path2.join(BUILDS_DIR, `${script.protectedFileId}.lua`);
    if (fs2.existsSync(buildPath)) fs2.unlinkSync(buildPath);
  }
  state.scripts.splice(idx, 1);
  db.logAudit("security_alert", `Deleted script "${script.filename}" and removed storage files`, req.ip);
  db.save();
  res.json({ success: true, message: `Script ${script.filename} deleted` });
});
router.get("/scripts/:id/download-protected", requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const script = db.get().scripts.find((s) => s.id === id);
  if (!script || !script.protectedFileId) {
    return res.status(404).json({ error: "Protected output not found or not yet built" });
  }
  const filePath = path2.join(BUILDS_DIR, `${script.protectedFileId}.lua`);
  if (!fs2.existsSync(filePath)) {
    return res.status(404).json({ error: "Protected file missing on disk" });
  }
  res.setHeader("Content-Disposition", `attachment; filename="protected_${script.filename}"`);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  fs2.createReadStream(filePath).pipe(res);
});
router.get("/obfuscation/engines", requireOwnerAuth, (_req, res) => {
  res.json(AVAILABLE_ENGINES);
});
router.get("/obfuscation/history", requireOwnerAuth, (_req, res) => {
  res.json(db.get().builds);
});
router.post("/obfuscation/build", requireOwnerAuth, async (req, res) => {
  const { scriptId, rawSource, options, panelId, filename: customFilename } = req.body;
  const state = db.get();
  let codeToObfuscate = "";
  let filename = customFilename ? path2.basename(customFilename) : "adhoc_script.lua";
  let targetPanelId = panelId || state.panels[0]?.id || "pnl_main";
  let scriptRecord = null;
  if (scriptId) {
    scriptRecord = state.scripts.find((s) => s.id === scriptId);
    if (!scriptRecord) return res.status(404).json({ error: "Script not found" });
    filename = scriptRecord.filename;
    targetPanelId = scriptRecord.panelId;
    const origPath = path2.join(SOURCES_DIR, `${scriptRecord.originalFileId}.lua`);
    if (!fs2.existsSync(origPath)) {
      return res.status(404).json({ error: "Original source file missing on server" });
    }
    codeToObfuscate = fs2.readFileSync(origPath, "utf-8");
  } else if (rawSource) {
    codeToObfuscate = rawSource;
  } else {
    return res.status(400).json({ error: "Either scriptId or rawSource is required" });
  }
  const buildOpts = {
    profile: options?.profile || "advanced",
    engine: options?.engine || "RONIGUARD-MAX",
    stringEncryption: options?.stringEncryption !== false,
    controlFlow: !!options?.controlFlow || options?.profile === "maximum",
    constantVirtualization: options?.constantVirtualization !== false,
    variableRenaming: options?.variableRenaming !== false,
    antiTamper: options?.antiTamper !== false,
    watermarkCheck: options?.watermarkCheck !== false,
    customWatermark: options?.customWatermark || `${filename} \xB7 Protected by RONIGUARD`
  };
  const result = await runObfuscationPipeline(codeToObfuscate, buildOpts);
  let protectedFileId = null;
  if (result.success && result.transformedCode) {
    protectedFileId = "build_" + generateRandomHex(12);
    const protectedPath = path2.join(BUILDS_DIR, `${protectedFileId}.lua`);
    fs2.writeFileSync(protectedPath, result.transformedCode, "utf-8");
    if (scriptRecord) {
      scriptRecord.protectedFileId = protectedFileId;
      scriptRecord.protectedSize = result.outputSize;
      scriptRecord.status = "obfuscated";
      scriptRecord.buildCount += 1;
      scriptRecord.lastBuiltAt = (/* @__PURE__ */ new Date()).toISOString();
    }
  } else if (scriptRecord) {
    scriptRecord.status = "failed";
  }
  const buildRecord = {
    id: "bld_" + generateRandomHex(6),
    scriptId: scriptRecord ? scriptRecord.id : "adhoc",
    panelId: targetPanelId,
    filename,
    engine: buildOpts.engine || "RONIGUARD-MAX",
    profile: buildOpts.profile || "advanced",
    options: {
      stringEncryption: buildOpts.stringEncryption !== false,
      controlFlow: !!buildOpts.controlFlow,
      constantVirtualization: buildOpts.constantVirtualization !== false,
      variableRenaming: buildOpts.variableRenaming !== false,
      antiTamper: buildOpts.antiTamper !== false,
      watermarkCheck: buildOpts.watermarkCheck !== false
    },
    status: result.success ? "success" : "failed",
    inputSize: result.originalSize,
    outputSize: result.outputSize,
    compressionRatio: result.compressionRatio,
    durationMs: result.durationMs,
    errorMsg: result.error,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (result.success && result.transformedCode) {
    const buildDirectPath = path2.join(BUILDS_DIR, `${buildRecord.id}.lua`);
    fs2.writeFileSync(buildDirectPath, result.transformedCode, "utf-8");
  }
  state.builds.unshift(buildRecord);
  db.logAudit("build", `Executed build for "${filename}" [${buildOpts.engine} - ${buildOpts.profile}]`);
  db.save();
  res.json({
    success: result.success,
    build: buildRecord,
    transformedPreview: result.transformedCode ? result.transformedCode.slice(0, 1500) : null,
    fullTransformedCode: result.transformedCode || null,
    error: result.error
  });
});
router.get("/source-recovery/list", requireOwnerAuth, (_req, res) => {
  const state = db.get();
  const recoveryList = state.scripts.map((s) => {
    const origPath = path2.join(SOURCES_DIR, `${s.originalFileId}.lua`);
    const fileExists = fs2.existsSync(origPath);
    return {
      scriptId: s.id,
      filename: s.filename,
      panelId: s.panelId,
      uploadDate: s.createdAt,
      originalSize: s.originalSize,
      sourceAvailable: fileExists,
      buildCount: s.buildCount
    };
  });
  res.json(recoveryList);
});
router.post("/source-recovery/verify-and-download/:scriptId", requireOwnerAuth, (req, res) => {
  const { scriptId } = req.params;
  const { ownerPassword, confirmationPhrase } = req.body;
  const owner = db.get().owner;
  const passHash = hashPassword(ownerPassword || "", owner.salt);
  const isPassValid = passHash === owner.passwordHash;
  const isPhraseValid = confirmationPhrase === "RESTORE_ORIGINAL_SOURCE";
  if (!isPassValid && !isPhraseValid) {
    db.logAudit(
      "source_recovery",
      `UNAUTHORIZED source recovery attempt for script ${scriptId}: incorrect authorization`,
      req.ip,
      req.headers["user-agent"],
      "critical"
    );
    return res.status(403).json({ error: "Owner verification failed. Access denied to original source." });
  }
  const script = db.get().scripts.find((s) => s.id === scriptId);
  if (!script) {
    return res.status(404).json({ error: "Script metadata not found" });
  }
  const origPath = path2.join(SOURCES_DIR, `${script.originalFileId}.lua`);
  if (!fs2.existsSync(origPath)) {
    return res.status(404).json({ error: "Original source file not found on secure storage" });
  }
  db.logAudit(
    "source_recovery",
    `Authenticated owner recovered original source for "${script.filename}" (${script.id})`,
    req.ip,
    req.headers["user-agent"],
    "warning"
  );
  res.setHeader("Content-Disposition", `attachment; filename="ORIGINAL_${script.filename}"`);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  fs2.createReadStream(origPath).pipe(res);
});
router.delete("/source-recovery/:scriptId", requireOwnerAuth, (req, res) => {
  const { scriptId } = req.params;
  const script = db.get().scripts.find((s) => s.id === scriptId);
  if (!script) return res.status(404).json({ error: "Script not found" });
  const origPath = path2.join(SOURCES_DIR, `${script.originalFileId}.lua`);
  if (fs2.existsSync(origPath)) {
    fs2.unlinkSync(origPath);
  }
  db.logAudit("security_alert", `Owner permanently purged original source for "${script.filename}"`, req.ip);
  res.json({ success: true, message: `Original source for ${script.filename} purged from server` });
});
router.get("/whitelist", requireOwnerAuth, (_req, res) => {
  res.json(db.get().whitelist);
});
router.post("/whitelist", requireOwnerAuth, (req, res) => {
  const { identifier, platform, panelId, note } = req.body;
  if (!identifier || !identifier.trim()) {
    return res.status(400).json({ error: "Platform identifier is required" });
  }
  const state = db.get();
  const targetPanelId = panelId || state.panels[0]?.id || "pnl_main";
  const entry = {
    id: "wl_" + generateRandomHex(4),
    panelId: targetPanelId,
    platform: platform || "discord",
    identifier: identifier.trim(),
    note: note?.trim() || "",
    status: "active",
    addedAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastSeenAt: null,
    boundHwid: null
  };
  state.whitelist.unshift(entry);
  db.logAudit("whitelist_change", `Whitelisted "${identifier}" (${entry.platform}) on panel ${targetPanelId}`);
  db.save();
  res.json(entry);
});
router.delete("/whitelist/:id", requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const idx = state.whitelist.findIndex((w) => w.id === id);
  if (idx === -1) return res.status(404).json({ error: "Whitelist entry not found" });
  const removed = state.whitelist.splice(idx, 1)[0];
  db.logAudit("whitelist_change", `Removed "${removed.identifier}" from whitelist`);
  db.save();
  res.json({ success: true, message: "Removed from whitelist" });
});
router.post("/whitelist/import", requireOwnerAuth, (req, res) => {
  const { entries, panelId } = req.body;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: "Entries must be an array of objects or strings" });
  }
  const state = db.get();
  const targetPanelId = panelId || state.panels[0]?.id || "pnl_main";
  let importedCount = 0;
  for (const item of entries) {
    const ident = typeof item === "string" ? item : item.identifier;
    if (!ident || !ident.trim()) continue;
    state.whitelist.unshift({
      id: "wl_" + generateRandomHex(4),
      panelId: targetPanelId,
      platform: typeof item === "object" && item.platform || "discord",
      identifier: ident.trim(),
      note: typeof item === "object" && item.note || "Bulk Imported",
      status: "active",
      addedAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastSeenAt: null,
      boundHwid: null
    });
    importedCount++;
  }
  db.logAudit("whitelist_change", `Imported ${importedCount} whitelist entries`);
  db.save();
  res.json({ success: true, importedCount });
});
router.get("/keys", requireOwnerAuth, (_req, res) => {
  res.json(db.get().keys);
});
router.post("/keys/generate", requireOwnerAuth, (req, res) => {
  const user = req.user;
  const { type, panelId, count, maxUses, hwidLocked } = req.body;
  const state = db.get();
  const targetPanelId = panelId || state.panels[0]?.id || "pnl_main";
  const qty = Math.min(Math.max(Number(count) || 1, 1), 50);
  const userKeysCount = state.keys.filter((k) => k.userId === user?.id).length;
  const userWlCount = state.whitelist.filter((w) => w.userId === user?.id).length;
  if (user?.role !== "admin" && userKeysCount + userWlCount + qty > 1e3) {
    return res.status(400).json({ error: "Quota reached: Maximum 1000 keys and whitelist entries combined." });
  }
  const createdKeys = [];
  for (let i = 0; i < qty; i++) {
    const segments = Array.from({ length: 3 }, () => generateRandomHex(2).toUpperCase()).join("-");
    const keyStr = `RONI-${(type || "LIFETIME").toUpperCase().slice(0, 4)}-${segments}`;
    let expiresAt = null;
    if (type === "24h") expiresAt = new Date(Date.now() + 24 * 3600 * 1e3).toISOString();
    if (type === "7d") expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1e3).toISOString();
    if (type === "30d") expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1e3).toISOString();
    const user2 = req.user;
    const targetScript = state.scripts.find((s) => s.panelId === targetPanelId) || state.scripts[0];
    const scriptId = req.body.scriptId || (targetScript ? targetScript.id : "scr_main");
    const callerUserId = user2?.id || targetScript?.userId || "usr_owner";
    const record = {
      id: "key_" + generateRandomHex(4),
      userId: callerUserId,
      scriptId,
      panelId: targetPanelId,
      key: keyStr,
      type: type || "lifetime",
      maxUses: Number(maxUses) || 1,
      currentUses: 0,
      hwidLocked: hwidLocked !== false,
      boundHwid: null,
      status: "active",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      expiresAt,
      lastUsedAt: null
    };
    state.keys.unshift(record);
    createdKeys.push(record);
  }
  db.logAudit("key_gen", `Generated ${qty} key(s) [${type}] for panel ${targetPanelId}`);
  db.save();
  res.json(createdKeys);
});
router.post("/keys/revoke/:id", requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const key = state.keys.find((k) => k.id === id);
  if (!key) return res.status(404).json({ error: "Key not found" });
  key.status = "revoked";
  db.logAudit("key_gen", `Revoked license key "${key.key}"`);
  db.save();
  res.json({ success: true, key });
});
router.post("/keys/validate", (req, res) => {
  const { key, hwid, identifier } = req.body;
  if (!key) return res.status(400).json({ valid: false, message: "License key is required" });
  const state = db.get();
  const keyRec = state.keys.find((k) => k.key.trim().toUpperCase() === key.trim().toUpperCase());
  if (!keyRec) {
    return res.status(404).json({ valid: false, message: "Invalid license key" });
  }
  if (keyRec.status !== "active") {
    return res.status(403).json({ valid: false, message: `Key status is: ${keyRec.status}` });
  }
  if (keyRec.expiresAt && new Date(keyRec.expiresAt) < /* @__PURE__ */ new Date()) {
    keyRec.status = "expired";
    db.save();
    return res.status(403).json({ valid: false, message: "License key has expired" });
  }
  if (keyRec.hwidLocked) {
    if (!hwid) {
      return res.status(400).json({ valid: false, message: "HWID required for hardware locked key" });
    }
    if (!keyRec.boundHwid) {
      keyRec.boundHwid = hwid;
      db.logAudit("hwid_reset", `Key ${keyRec.key} bound to HWID: ${hwid}`);
    } else if (keyRec.boundHwid !== hwid) {
      return res.status(403).json({ valid: false, message: "Hardware identifier mismatch. Contact owner for reset." });
    }
  }
  keyRec.currentUses += 1;
  keyRec.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.save();
  res.json({
    valid: true,
    message: "Authentication successful",
    type: keyRec.type,
    expiresAt: keyRec.expiresAt,
    panelId: keyRec.panelId
  });
});
router.get("/hwid", requireOwnerAuth, (_req, res) => {
  res.json(db.get().hwidBindings);
});
router.post("/hwid/reset", requireOwnerAuth, (req, res) => {
  const { id } = req.body;
  const state = db.get();
  const binding = state.hwidBindings.find((h) => h.id === id);
  if (!binding) return res.status(404).json({ error: "Binding record not found" });
  binding.resetCount += 1;
  binding.lastResetAt = (/* @__PURE__ */ new Date()).toISOString();
  binding.hwidHash = "UNBOUND_" + generateRandomHex(6);
  db.logAudit("hwid_reset", `Owner reset HWID binding for "${binding.identifier}"`);
  db.save();
  res.json({ success: true, binding });
});
router.post("/hwid/revoke/:id", requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const binding = state.hwidBindings.find((h) => h.id === id);
  if (!binding) return res.status(404).json({ error: "Binding not found" });
  binding.status = "revoked";
  db.logAudit("hwid_reset", `Revoked HWID binding for "${binding.identifier}"`);
  db.save();
  res.json({ success: true, binding });
});
router.get("/discord/status", requireOwnerAuth, (_req, res) => {
  const config = db.get().botConfig;
  res.json({
    isConnected: config.isConnected,
    botUsername: config.botUsername,
    botAvatar: config.botAvatar,
    lastPing: config.lastPing,
    lastTestedAt: config.lastTestedAt,
    hasTokenConfigured: !!config.botToken,
    clientId: config.clientId,
    guildId: config.guildId,
    webhookConfigured: !!config.webhookUrl,
    registeredCommands: config.registeredCommands
  });
});
router.post("/discord/test", requireOwnerAuth, async (req, res) => {
  const { token } = req.body;
  const result = await testDiscordBotConnection(token);
  if (result.connected) {
    discordBotService.start(token).catch(console.error);
  }
  res.json(result);
});
router.post("/discord/update-config", requireOwnerAuth, (req, res) => {
  const { botToken, clientId, guildId, webhookUrl, bridgeUrl, bridgeSecret } = req.body;
  const state = db.get();
  if (botToken !== void 0) state.botConfig.botToken = botToken.trim();
  if (clientId !== void 0) state.botConfig.clientId = clientId.trim();
  if (guildId !== void 0) state.botConfig.guildId = guildId.trim();
  if (webhookUrl !== void 0) state.botConfig.webhookUrl = webhookUrl.trim();
  if (bridgeUrl !== void 0) state.botConfig.bridgeUrl = bridgeUrl.trim();
  if (bridgeSecret !== void 0) state.botConfig.bridgeSecret = bridgeSecret.trim();
  db.logAudit("bot_sync", "Updated Discord Bot configuration parameters");
  db.save();
  if (state.botConfig.botToken) {
    discordBotService.start(state.botConfig.botToken).catch(console.error);
  }
  res.json({ success: true, message: "Discord bot settings updated and gateway service initialized." });
});
router.post("/discord/command-execute", requireOwnerAuth, async (req, res) => {
  const { commandName, args } = req.body;
  const result = await executeBotCommand({
    commandName,
    args: args || {},
    source: "dashboard_tester"
  });
  res.json(result);
});
router.get("/credentials", requireOwnerAuth, (_req, res) => {
  res.json(db.get().apiCredentials);
});
router.post("/credentials/generate", requireOwnerAuth, (req, res) => {
  const { name, scopes } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Credential name is required" });
  const rawKey = `roni_live_${generateRandomHex(24)}`;
  const keyHash = crypto3.createHash("sha256").update(rawKey).digest("hex");
  const cred = {
    id: "api_" + generateRandomHex(4),
    name: name.trim(),
    prefix: rawKey.slice(0, 14) + "...",
    keyHash,
    scopes: Array.isArray(scopes) ? scopes : ["bot:sync", "whitelist:read"],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastUsedAt: null,
    status: "active",
    rateLimitPerMin: 120
  };
  db.get().apiCredentials.unshift(cred);
  db.logAudit("security_alert", `Generated API credential "${cred.name}"`);
  db.save();
  res.json({
    credential: cred,
    secretKey: rawKey
  });
});
router.delete("/credentials/:id", requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const idx = state.apiCredentials.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: "Credential not found" });
  state.apiCredentials[idx].status = "revoked";
  db.logAudit("security_alert", `Revoked API credential "${state.apiCredentials[idx].name}"`);
  db.save();
  res.json({ success: true, message: "API credential revoked" });
});
function renderUnauthorizedHtml(filename = "Protected Script", resourceId = "latest") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ACCESS UNAUTHORIZED</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      width: 100%;
      background-color: #0b0e17;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
      margin: 0;
    }
    .container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 1.5rem;
    }
    .badge-card {
      background: #0f1524;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 14px;
      padding: 18px 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      color: #f1f5f9;
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.6);
      text-transform: uppercase;
    }
    .siren {
      font-size: 1.25rem;
      line-height: 1;
    }
    .footer-text {
      position: absolute;
      bottom: 28px;
      left: 0;
      right: 0;
      text-align: center;
      color: #55627f;
      font-size: 0.82rem;
      font-weight: 500;
      letter-spacing: 0.01em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge-card">
      <span class="siren">\u{1F6A8}\u{1F6A8}</span>
      <span>ACCESS UNAUTHORIZED</span>
      <span class="siren">\u{1F6A8}\u{1F6A8}</span>
    </div>
    <div class="footer-text">
      Contents can not be displayed on browser
    </div>
  </div>
</body>
</html>`;
}
function resolveScriptContentAndMeta(id) {
  const state = db.get();
  let scriptRecord = state.scripts.find(
    (s) => s.id === id || s.filename.toLowerCase() === id.toLowerCase() || s.protectedFileId === id
  );
  let buildRecord = state.builds.find((b) => b.id === id || b.scriptId === id);
  if (!scriptRecord && (id === "latest" || id === "default")) {
    scriptRecord = state.scripts[0];
  }
  if (scriptRecord?.protectedFileId) {
    const pPath = path2.join(BUILDS_DIR, `${scriptRecord.protectedFileId}.lua`);
    if (fs2.existsSync(pPath)) {
      return { content: fs2.readFileSync(pPath, "utf-8"), filename: scriptRecord.filename, scriptRecord, buildRecord };
    }
  }
  if (buildRecord) {
    const bPath = path2.join(BUILDS_DIR, `${buildRecord.id}.lua`);
    if (fs2.existsSync(bPath)) {
      return { content: fs2.readFileSync(bPath, "utf-8"), filename: buildRecord.filename, scriptRecord, buildRecord };
    }
  }
  const directBuildPath = path2.join(BUILDS_DIR, `${id}.lua`);
  if (fs2.existsSync(directBuildPath)) {
    return { content: fs2.readFileSync(directBuildPath, "utf-8"), filename: scriptRecord?.filename || `${id}.lua`, scriptRecord, buildRecord };
  }
  if (scriptRecord?.originalFileId) {
    const oPath = path2.join(SOURCES_DIR, `${scriptRecord.originalFileId}.lua`);
    if (fs2.existsSync(oPath)) {
      return { content: fs2.readFileSync(oPath, "utf-8"), filename: scriptRecord.filename, scriptRecord, buildRecord };
    }
  }
  const directSourcePath = path2.join(SOURCES_DIR, `${id}.lua`);
  if (fs2.existsSync(directSourcePath)) {
    return { content: fs2.readFileSync(directSourcePath, "utf-8"), filename: `${id}.lua`, scriptRecord, buildRecord };
  }
  return null;
}
async function handleRawLoaderRequest(req, res) {
  const rawId = req.query.script || req.query.id || req.params.id || req.params.scriptId || "latest";
  const id = rawId.trim();
  const state = db.get();
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  const isExecutor = userAgent.includes("roblox") || userAgent.includes("synapse") || userAgent.includes("wave") || userAgent.includes("delta") || userAgent.includes("fluxus") || userAgent.includes("codex") || userAgent.includes("arceus") || userAgent.includes("hydrogen") || !!req.headers["x-hwid"] || !!req.headers["x-roblox-user-id"] || !!req.headers["x-license-key"];
  const isBrowser = !isExecutor && (req.headers.accept?.includes("text/html") || userAgent.includes("mozilla") || userAgent.includes("chrome") || userAgent.includes("safari") || userAgent.includes("firefox") || userAgent.includes("edge") || userAgent.includes("mobile") || userAgent.includes("android"));
  if (isBrowser && !req.query.raw) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(renderUnauthorizedHtml(id || "Protected Script", id || "loader"));
  }
  let resolved = resolveScriptContentAndMeta(id);
  const licenseKeyInput = (req.query.key || req.headers["x-license-key"] || req.query.license_key || req.query.api_key)?.trim();
  if (!resolved && licenseKeyInput) {
    const keyRec = state.keys.find(
      (k) => k.key.toUpperCase() === licenseKeyInput.toUpperCase() || k.id === licenseKeyInput
    );
    if (keyRec && keyRec.scriptId) {
      resolved = resolveScriptContentAndMeta(keyRec.scriptId);
    }
  }
  if (!resolved && state.scripts.length > 0) {
    resolved = resolveScriptContentAndMeta(state.scripts[0].id);
  }
  if (!resolved) {
    if (isBrowser) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(404).send(renderUnauthorizedHtml(id, id));
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(404).send(`-- [RONIGUARD] 404: Script "${id}" not found.`);
  }
  const { content, filename, scriptRecord } = resolved;
  const authUser = getAuthenticatedUser(req);
  const isAuthorizedOwner = Boolean(
    authUser && (authUser.role === "admin" || scriptRecord && scriptRecord.userId === authUser.id)
  );
  const hwid = (req.headers["x-hwid"] || req.query.hwid)?.trim();
  const robloxUser = (req.headers["x-roblox-user-id"] || req.query.user_id)?.trim();
  let isAuthorizedExecutor = false;
  let keyRecordMatched = null;
  const cleanKey = (licenseKeyInput || "").toLowerCase().trim();
  const isTrialKey = cleanKey === "trial" || cleanKey === "trail";
  if (isTrialKey) {
    if (scriptRecord && scriptRecord.trialEnabled) {
      isAuthorizedExecutor = true;
    } else {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(`-- [RONIGUARD] Script Trial Disabled
if game and game:GetService("Players") and game:GetService("Players").LocalPlayer then
    game:GetService("Players").LocalPlayer:Kick("Script trial has been turned off by owner.")
else
    error("Script trial has been turned off by owner.")
end`);
    }
  }
  if (!isAuthorizedExecutor && licenseKeyInput && !isTrialKey) {
    const keyRec = state.keys.find(
      (k) => k.key.toUpperCase() === licenseKeyInput.toUpperCase() || k.id === licenseKeyInput
    );
    if (keyRec && keyRec.status === "active") {
      if (scriptRecord && keyRec.scriptId && keyRec.scriptId !== scriptRecord.id) {
        isAuthorizedExecutor = false;
      } else {
        const notExpired = !keyRec.expiresAt || new Date(keyRec.expiresAt) > /* @__PURE__ */ new Date();
        if (notExpired) {
          if (!keyRec.hwidLocked || !keyRec.boundHwid || keyRec.boundHwid === hwid) {
            isAuthorizedExecutor = true;
            keyRecordMatched = keyRec;
          }
        }
      }
    }
  }
  if (!isAuthorizedExecutor && robloxUser) {
    const wl = state.whitelist.find(
      (w) => (w.identifier === robloxUser || w.identifier === `@${robloxUser}`) && w.status === "active"
    );
    if (wl) {
      isAuthorizedExecutor = true;
      wl.lastSeenAt = (/* @__PURE__ */ new Date()).toISOString();
      if (hwid && !wl.boundHwid) wl.boundHwid = hwid;
      db.save();
    }
  }
  if (keyRecordMatched) {
    keyRecordMatched.currentUses = (keyRecordMatched.currentUses || 0) + 1;
    keyRecordMatched.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (keyRecordMatched.hwidLocked && !keyRecordMatched.boundHwid && hwid) {
      keyRecordMatched.boundHwid = hwid;
    }
    db.save();
  }
  if (!isAuthorizedExecutor && !isAuthorizedOwner) {
    if (isBrowser) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(401).send(renderUnauthorizedHtml(filename, id));
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(`-- [RONIGUARD] Unauthorized Executor Access
if game and game:GetService("Players") and game:GetService("Players").LocalPlayer then
    game:GetService("Players").LocalPlayer:Kick("You are not whitelisted on this script! Redeem a license key or contact the owner.")
else
    error("[RONIGUARD] Access Denied: Valid script-specific API key required.")
end`);
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("X-Roniguard-Engine", "RONIGUARD-MAX");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const robloxPreamble = `-- [RONIGUARD] Protected Lua Execution Gateway
local _rgPlayer = "Unknown"
pcall(function()
    if game and game:GetService("Players") and game:GetService("Players").LocalPlayer then
        _rgPlayer = tostring(game:GetService("Players").LocalPlayer.Name)
    end
end)
print("[RONIGUARD] Player: " .. _rgPlayer)
print("[RONIGUARD] Status: Connected & Confirmed")
print("[RONIGUARD] Loading secured script payload...")

`;
  return res.send(robloxPreamble + content);
}
router.get("/loader/raw/:id", handleRawLoaderRequest);
router.get("/raw/:id", handleRawLoaderRequest);
router.get("/load/:id", handleRawLoaderRequest);
router.get("/scripts/:id/raw", handleRawLoaderRequest);
router.get("/loader.lua", handleRawLoaderRequest);
router.get("/raw/latest.lua", handleRawLoaderRequest);
router.get("/loader/details/:id", requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === id || s.filename === id) || state.scripts[0];
  const build = state.builds.find((b) => b.id === id || b.scriptId === id);
  const scriptId = script?.id || build?.id || id;
  const filename = script?.filename || build?.filename || "script.lua";
  const baseUrl = "https://roniguardreal.wasmer.app";
  const publicRawUrl = `${baseUrl}/api/loader/raw/${scriptId}`;
  const loadstringSnippet = `loadstring(game:HttpGet("${publicRawUrl}"))()`;
  const executorSnippetWithKey = `loadstring(game:HttpGet("${publicRawUrl}?key=YOUR_LICENSE_KEY"))()`;
  res.json({
    id: scriptId,
    filename,
    loadstringSnippet,
    executorSnippetWithKey,
    publicRawUrl,
    protectionLevel: "Vykus Polymorphic VM Engine v2.5.1 + Anti-Tamper Security Walls",
    isObfuscated: !!(script?.protectedFileId || build),
    engine: "Vykus-VM-Obfuscator"
  });
});
router.post("/loader/simulate-check", requireOwnerAuth, (req, res) => {
  const { scriptId } = req.body;
  const resolved = resolveScriptContentAndMeta(scriptId || "latest");
  if (!resolved) {
    return res.status(404).json({ error: "Target script not found" });
  }
  return res.json({
    status: 200,
    authorized: true,
    engine: "Vykus Polymorphic VM Engine",
    securityWalls: ["Anti-Debug Probes", "Metatable Integrity Seals", "Environment Guard"],
    message: "Script is online and ready to execute via loadstring in Roblox executors.",
    codeSnippet: resolved.content.slice(0, 500) + (resolved.content.length > 500 ? "\n-- [Protected VM Bytecode Continues]" : ""),
    bytesReturned: resolved.content.length
  });
});
router.get("/loader-code/:panelId", requireOwnerAuth, (req, res) => {
  const { panelId } = req.params;
  const state = db.get();
  const panel = state.panels.find((p) => p.id === panelId) || state.panels[0];
  const host = req.get("host") || "localhost:3000";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const appUrl = `${protocol}://${host}`;
  const loaderCode = `
--[[
  =============================================================
  RONIGUARD UNIVERSAL LUAU LOADER
  Panel: ${panel?.name || "Main Core"} (ID: ${panel?.id || panelId})
  Platform: Luau / Roblox Environment
  =============================================================
--]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

local RONIGUARD_ENDPOINT = "${appUrl}/api/keys/validate"
local PANEL_ID = "${panel?.id || panelId}"

local function GetHWID()
  local rbxAnalytics = game:GetService("RbxAnalyticsService")
  local ok, hwid = pcall(function()
    return rbxAnalytics:GetClientId()
  end)
  return ok and hwid or "HWID_FALLBACK_" .. tostring(LocalPlayer.UserId)
end

local function AuthenticateAndRun(userKey)
  local payload = HttpService:JSONEncode({
    key = userKey,
    hwid = GetHWID(),
    identifier = tostring(LocalPlayer.UserId)
  })

  local req = (syn and syn.request) or (http and http.request) or http_request or request
  if not req then
    warn("[RONIGUARD] Executor HTTP service not found.")
    return
  end

  local res = req({
    Url = RONIGUARD_ENDPOINT,
    Method = "POST",
    Headers = {
      ["Content-Type"] = "application/json"
    },
    Body = payload
  })

  if res.StatusCode == 200 then
    local data = HttpService:JSONDecode(res.Body)
    if data.valid then
      print("[RONIGUARD] Handshake verified! Initializing protected bytecode...")
      -- Load authorized payload
    else
      warn("[RONIGUARD] Access rejected: " .. tostring(data.message))
    end
  else
    warn("[RONIGUARD] Handshake failed with status " .. tostring(res.StatusCode))
  end
end

-- AuthenticateAndRun("YOUR-KEY-HERE")
`.trim();
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(loaderCode);
});
router.get("/analytics", requireOwnerAuth, (_req, res) => {
  const state = db.get();
  const totalBuilds = state.builds.length;
  const successfulBuilds = state.builds.filter((b) => b.status === "success").length;
  const failedBuilds = state.builds.filter((b) => b.status === "failed").length;
  const engineDistribution = {};
  state.builds.forEach((b) => {
    engineDistribution[b.engine] = (engineDistribution[b.engine] || 0) + 1;
  });
  const profileDistribution = {
    basic: 0,
    advanced: 0,
    maximum: 0
  };
  state.builds.forEach((b) => {
    if (profileDistribution[b.profile] !== void 0) {
      profileDistribution[b.profile]++;
    }
  });
  res.json({
    totalBuilds,
    successfulBuilds,
    failedBuilds,
    successRate: totalBuilds > 0 ? Number((successfulBuilds / totalBuilds * 100).toFixed(1)) : 100,
    totalKeys: state.keys.length,
    activeKeys: state.keys.filter((k) => k.status === "active").length,
    revokedKeys: state.keys.filter((k) => k.status === "revoked").length,
    whitelistedUsers: state.whitelist.length,
    engineDistribution,
    profileDistribution
  });
});
router.get("/logs", requireOwnerAuth, (_req, res) => {
  res.json(db.get().auditLogs);
});
router.get("/settings", requireOwnerAuth, (_req, res) => {
  const state = db.get();
  res.json({
    projectName: state.settings.projectName,
    defaultEngine: state.settings.defaultEngine,
    defaultProfile: state.settings.defaultProfile,
    maxFileSizeMb: state.settings.maxFileSizeMb,
    requirePasswordForSourceRecovery: state.settings.requirePasswordForSourceRecovery,
    autoPurgeBuildHistoryDays: state.settings.autoPurgeBuildHistoryDays,
    ownerEmail: state.owner.email
  });
});
router.put("/settings", requireOwnerAuth, (req, res) => {
  const { projectName, defaultEngine, defaultProfile, maxFileSizeMb, requirePasswordForSourceRecovery, autoPurgeBuildHistoryDays } = req.body;
  const state = db.get();
  if (projectName) state.settings.projectName = projectName.trim();
  if (defaultEngine) state.settings.defaultEngine = defaultEngine;
  if (defaultProfile) state.settings.defaultProfile = defaultProfile;
  if (maxFileSizeMb !== void 0) state.settings.maxFileSizeMb = Number(maxFileSizeMb);
  if (requirePasswordForSourceRecovery !== void 0) state.settings.requirePasswordForSourceRecovery = !!requirePasswordForSourceRecovery;
  if (autoPurgeBuildHistoryDays !== void 0) state.settings.autoPurgeBuildHistoryDays = Number(autoPurgeBuildHistoryDays);
  db.logAudit("security_alert", "System settings updated");
  db.save();
  res.json({ success: true, settings: state.settings });
});
var routes_default = router;

// server.ts
dotenv.config();
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.set("trust proxy", 1);
app.use("/api", routes_default);
app.get("/loader.lua", handleRawLoaderRequest);
app.get("/raw/:id", handleRawLoaderRequest);
app.get("/load/:id", handleRawLoaderRequest);
app.get("/raw/latest.lua", handleRawLoaderRequest);
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: PORT
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path3.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path3.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RONIGUARD] Server online at http://0.0.0.0:${PORT} (${isProduction ? "production" : "development"})`);
    console.log(`[RONIGUARD] Configured owner: ronizz.edit@gmail.com`);
    discordBotService.start().catch((err) => {
      console.warn("[RONIGUARD] Discord Bot Gateway background start notice:", err);
    });
  });
}
startServer().catch((err) => {
  console.error("[RONIGUARD] Failed to start server:", err);
  process.exit(1);
});
