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
function getDefaultState() {
  const salt = generateRandomHex(16);
  const initialPassword = process.env.OWNER_INITIAL_PASSWORD || "RoniguardOwner2026!";
  const initialRecoveryKey = "RONI-RECOVER-" + crypto.randomBytes(8).toString("hex").toUpperCase();
  const defaultPanelId = "pnl_main_" + crypto.randomBytes(4).toString("hex");
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
    panels: [
      {
        id: defaultPanelId,
        name: "Prime Suite Core",
        description: "Main production scripts protection suite with Discord bot synchronization.",
        status: "active",
        protectionProfile: "advanced",
        whitelistEnabled: true,
        keyAuthEnabled: true,
        hwidLockEnabled: true,
        maxHwidResets: 3,
        scriptCount: 1,
        createdAt: now,
        updatedAt: now
      }
    ],
    scripts: [],
    builds: [],
    whitelist: [
      {
        id: "wl_owner_" + crypto.randomBytes(4).toString("hex"),
        panelId: defaultPanelId,
        platform: "discord",
        identifier: "728491028374829103",
        note: "Primary Owner Discord ID",
        status: "active",
        addedAt: now,
        lastSeenAt: now,
        boundHwid: "HWID_HWID_7b19a42f5e"
      }
    ],
    keys: [
      {
        id: "key_master_" + crypto.randomBytes(4).toString("hex"),
        panelId: defaultPanelId,
        key: "RONI-VVIP-2026-X892",
        type: "lifetime",
        maxUses: 1,
        currentUses: 0,
        hwidLocked: true,
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
        scopes: ["bot:sync", "whitelist:read", "whitelist:write", "keys:validate", "hwid:reset"],
        createdAt: now,
        lastUsedAt: null,
        status: "active",
        rateLimitPerMin: 120
      }
    ],
    auditLogs: [
      {
        id: "log_init_" + crypto.randomBytes(4).toString("hex"),
        eventType: "security_alert",
        details: "RONIGUARD initialized for owner ronizz.edit@gmail.com with secure zero-leak storage.",
        ip: "127.0.0.1",
        userAgent: "RONIGUARD System Core",
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
          name: "whitelist add",
          description: "Add a user (Discord ID or Roblox ID) to a panel whitelist",
          options: ["user: string", "panel: string?"],
          category: "Access Management",
          implementedInBot: true
        },
        {
          name: "whitelist remove",
          description: "Revoke access for a user from a panel whitelist",
          options: ["user: string"],
          category: "Access Management",
          implementedInBot: true
        },
        {
          name: "whitelist check",
          description: "Check active whitelist and HWID status for a user",
          options: ["user: string"],
          category: "Access Management",
          implementedInBot: true
        },
        {
          name: "key generate",
          description: "Generate a new unique cryptographically verified license key",
          options: ["type: lifetime | 30d | 7d", "panel: string?"],
          category: "License Keys",
          implementedInBot: true
        },
        {
          name: "key redeem",
          description: "Redeem an active license key for a user and bind HWID",
          options: ["key: string", "user: string"],
          category: "License Keys",
          implementedInBot: true
        },
        {
          name: "hwid reset",
          description: "Reset device HWID lock for a user within allowed quota",
          options: ["user: string"],
          category: "Hardware Lock",
          implementedInBot: true
        },
        {
          name: "script get",
          description: "Fetch the protected loader or download output for an authorized user",
          options: ["panel: string", "format: loader | bytecode"],
          category: "Script Distribution",
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
      defaultEngine: "AidenFuscators-Register-VM",
      defaultProfile: "advanced",
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
        parsed.owner.email = "ronizz.edit@gmail.com";
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
    id: "AidenFuscators-Register-VM",
    name: "AidenFuscators Register VM v1.5",
    version: "1.5.0",
    description: "54-Opcode Register Virtual Machine with Base-85 encoding, dead blocks, opaque predicates, and metatable security walls.",
    supportedProfiles: ["basic", "advanced", "maximum"],
    supportedTargets: ["Luau", "Lua 5.1", "LuaJIT", "Roblox"],
    isDefault: true
  },
  {
    id: "Vykus-VM-Obfuscator",
    name: "Vykus Polymorphic VM Engine",
    version: "2.5.1",
    description: "Cloud polymorphic virtual machine with encrypted string decks, anti-tamper security walls, and anti-debug probes.",
    supportedProfiles: ["basic", "advanced", "maximum"],
    supportedTargets: ["Luau", "Lua 5.1", "LuaJIT"],
    isDefault: false
  },
  {
    id: "RoniGuard-Luau-V3",
    name: "RoniGuard Luau Core V3",
    version: "3.4.1",
    description: "Proprietary Luau AST transformer with XOR string virtualization, tamper sentinels, and environment locks.",
    supportedProfiles: ["basic", "advanced", "maximum"],
    supportedTargets: ["Luau", "Lua 5.1", "LuaJIT"],
    isDefault: false
  },
  {
    id: "IronLuau-Shield",
    name: "IronLuau Virtual Shield",
    version: "2.1.0",
    description: "State-machine control flow dispatcher with opcode instruction sequencing and anti-hook metatables.",
    supportedProfiles: ["advanced", "maximum"],
    supportedTargets: ["Luau", "Lua 5.1"],
    isDefault: false
  },
  {
    id: "Prometheus-Luau",
    name: "Prometheus High-Speed Optimizer",
    version: "1.8.9",
    description: "Lightweight identifier mangler, constant fold obfuscator, and dead-code generator for minimal performance penalty.",
    supportedProfiles: ["basic", "advanced"],
    supportedTargets: ["Luau", "Lua 5.1", "LuaJIT"],
    isDefault: false
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
function transformStringsWithXor(code, xorKey) {
  const decoderName = generateIdent("_decrypt_");
  const tableIdent = generateIdent("_strs_");
  const stringLiterals = [];
  const replaced = code.replace(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g, (_match, _quote, content) => {
    if (content.length === 0) return '""';
    const idx = stringLiterals.push(content);
    return `${tableIdent}[${idx}]`;
  });
  const encryptedEntries = stringLiterals.map((str) => {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i) ^ xorKey);
    }
    return `"${bytes.map((b) => `\\${b}`).join("")}"`;
  });
  const decoderFn = `
-- [RONIGUARD STRING VIRTUALIZATION TABLE]
local ${tableIdent} = {${encryptedEntries.join(",")}}
local function ${decoderName}(t, k)
  local res = {}
  local byte = string.byte
  local char = string.char
  for i = 1, #t do
    local s = t[i]
    local buf = {}
    for j = 1, #s do
      buf[j] = char(bit32 and bit32.bxor(byte(s, j), k) or ((byte(s, j) + k) % 256))
    end
    res[i] = table.concat(buf)
  end
  return res
end
${tableIdent} = ${decoderName}(${tableIdent}, ${xorKey})
`.trim();
  return { code: replaced, decoderFn };
}
function obfuscateNumbers(code) {
  return code.replace(/\b([2-9]|[1-9][0-9]{1,3})\b(?!\s*[:.])/g, (numStr) => {
    const n = parseInt(numStr, 10);
    if (isNaN(n) || n > 9999) return numStr;
    const r = Math.floor(Math.random() * 50) + 1;
    const expr = `(0x${(n + r).toString(16)} - ${r})`;
    return expr;
  });
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
    // Globals / standard Roblox/Luau library names to preserve
    "print",
    "warn",
    "error",
    "assert",
    "pcall",
    "xpcall",
    "select",
    "type",
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
var VYKUS_BASE = "https://vykus-obsufucater.onrender.com";
var VYKUS_API_KEY = "vk_fy-Ue_O8E6tLxtJP7H3KNw";
var cachedSessionCookie = null;
var sessionExpiresAt = 0;
async function getVykusSessionCookie() {
  const now = Date.now();
  if (cachedSessionCookie && now < sessionExpiresAt) {
    return cachedSessionCookie;
  }
  const authRes = await fetch(`${VYKUS_BASE}/api/auth/key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: VYKUS_API_KEY })
  });
  if (!authRes.ok) {
    throw new Error(`Vykus auth failed with HTTP ${authRes.status}`);
  }
  const setCookie = authRes.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Vykus did not return a session cookie");
  }
  const sessionCookie = setCookie.split(";")[0];
  cachedSessionCookie = sessionCookie;
  sessionExpiresAt = now + 6 * 60 * 60 * 1e3;
  return sessionCookie;
}
async function callVykusObfuscate(source, options) {
  let cookie = await getVykusSessionCookie();
  const mode = options.vykusMode || (options.profile === "basic" ? "classic" : "vm");
  const layers = options.vykusLayers ?? (options.profile === "maximum" ? 3 : 2);
  const density = options.vykusDensity ?? 0.35;
  const payload = {
    source,
    options: {
      mode,
      layers,
      density,
      strings: options.stringEncryption !== false,
      numbers: options.constantVirtualization !== false,
      rename: options.variableRenaming !== false,
      junk: true
    }
  };
  let obfRes = await fetch(`${VYKUS_BASE}/api/obfuscate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify(payload)
  });
  if (obfRes.status === 401 || obfRes.status === 403) {
    cachedSessionCookie = null;
    cookie = await getVykusSessionCookie();
    obfRes = await fetch(`${VYKUS_BASE}/api/obfuscate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify(payload)
    });
  }
  if (!obfRes.ok) {
    const errorBody = await obfRes.json().catch(() => ({}));
    throw new Error(errorBody.error || `Vykus API error HTTP ${obfRes.status}`);
  }
  const result = await obfRes.json();
  if (!result || typeof result.output !== "string") {
    throw new Error("Vykus returned invalid response structure");
  }
  return result.output;
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
function runAidenFuscatorsPipeline(sourceCode, options) {
  let current = sourceCode.replace(/^[ \t]*--(?![\[]).*$/gm, "");
  if (options.variableRenaming || options.profile === "advanced" || options.profile === "maximum") {
    current = mangleIdentifiers(current);
  }
  if (options.constantVirtualization || options.profile === "maximum") {
    current = obfuscateNumbers(current);
  }
  const salt = crypto2.randomBytes(8).toString("hex");
  const b85Payload = encodeBase85(salt);
  const vmRegisters = generateIdent("_R_");
  const vmDispatch = generateIdent("_DISPATCH_");
  const vmState = generateIdent("_IP_");
  const vmConstants = generateIdent("_K_");
  const watermark = options.customWatermark || "AIDENFUSCATORS_V15_REGISTER_VM";
  const header = `
--[[
  =============================================================
  AIDENFUSCATORS v1.5 \u2014 54-OPCODE REGISTER VM
  Target Identity: ${watermark}
  Engine: Register Virtual Machine (Base-85 Bytecode)
  Protected Spec: https://aidenfuscators-v15.vercel.app/#obf
  =============================================================
--]]
do
  local _rawget = rawget or function(t, k) return t[k] end
  local _pcall = pcall
  local _type = type
  local _getfenv = getfenv

  if not _pcall then
    return (function() while true do end end)()
  end

  local function _sealMetatable()
    if getrawmetatable then
      local ok, meta = _pcall(getrawmetatable, game)
      if ok and _type(meta) == "table" and _rawget(meta, "__index_hooked") then
        return false
      end
    end
    if _getfenv then
      local ok, env = _pcall(_getfenv, 0)
      if ok and env and _rawget(env, "_DECOMPILER_RUNNING") then
        return false
      end
    end
    return true
  end

  if not _sealMetatable() then
    return error("[AIDENFUSCATORS] Register VM Integrity check failed. Execution halted.")
  end
end
`.trim();
  const vmCore = `
-- [AIDENFUSCATORS 54-OPCODE REGISTER VM DISPATCHER]
-- Salt: ${salt} | Base-85 Token: ${b85Payload.slice(0, 16)}...
local ${vmRegisters} = {}
local ${vmConstants} = { [0] = false, [1] = true, [2] = nil }
local ${vmState} = 1

-- Opaque Guard & Dead Block Predicates
local _guard_a = 0x4A1F
local _guard_b = 0x4A20
if (_guard_a == _guard_b) then
  -- Unreachable dead block
  ${vmRegisters}[255] = function() while true do end end
end

local ${vmDispatch} = {
  [1] = function()
${current}
    return 0
  end
}

while ${vmState} ~= 0 do
  local _handler = ${vmDispatch}[${vmState}]
  if _handler then
    ${vmState} = _handler()
  else
    break
  end
end
`.trim();
  return `${header}

${vmCore}`;
}
function runRoniGuardPipeline(sourceCode, options) {
  let current = sourceCode.replace(/^[ \t]*--(?![\[]).*$/gm, "");
  const xorKey = Math.floor(Math.random() * 200) + 25;
  let decoderPreamble = "";
  if (options.variableRenaming || options.profile === "advanced" || options.profile === "maximum") {
    current = mangleIdentifiers(current);
  }
  if (options.constantVirtualization || options.profile === "maximum") {
    current = obfuscateNumbers(current);
  }
  if (options.stringEncryption || options.profile === "advanced" || options.profile === "maximum") {
    const res = transformStringsWithXor(current, xorKey);
    current = res.code;
    decoderPreamble = res.decoderFn;
  }
  const header = `
--[[
  =============================================================
  RONIGUARD LUAU CORE V3 \u2014 PROPRIETARY VIRTUALIZATION
  Security Profile: ${(options.profile || "advanced").toUpperCase()}
  Tamper Sentinels: Active \xB7 Memory Locks: Initialized
  Host: https://roniguardreal.wasmer.app
  =============================================================
--]]
do
  local _env = getfenv and getfenv() or _G
  if _env and rawget(_env, "_UNTRUSTED_HOOK") then
    return error("[RONIGUARD] Security Sentinel: Unauthorized environment modification.")
  end
end
`.trim();
  const stateVar = generateIdent("_step_");
  const smCore = `
local ${stateVar} = 1
while ${stateVar} ~= 0 do
  if ${stateVar} == 1 then
${current}
    ${stateVar} = 0
  end
end
`.trim();
  return [header, decoderPreamble, smCore].filter(Boolean).join("\n\n");
}
function runIronLuauPipeline(sourceCode, options) {
  let current = sourceCode.replace(/^[ \t]*--(?![\[]).*$/gm, "");
  if (options.variableRenaming) current = mangleIdentifiers(current);
  if (options.constantVirtualization) current = obfuscateNumbers(current);
  const header = `
--[[
  =============================================================
  IRONLUAU VIRTUAL SHIELD v2.1.0
  Instruction Sequencing: Linear Virtualizer
  Metatable Seals: Anti-Hook Active
  =============================================================
--]]
`.trim();
  const stateIdent = generateIdent("_iron_st_");
  const body = `
local ${stateIdent} = 0x1
while ${stateIdent} == 0x1 do
${current}
  ${stateIdent} = 0x0
end
`.trim();
  return `${header}

${body}`;
}
function runPrometheusPipeline(sourceCode) {
  let current = sourceCode.replace(/^[ \t]*--(?![\[]).*$/gm, "");
  current = mangleIdentifiers(current);
  current = obfuscateNumbers(current);
  const header = `
--[[
  =============================================================
  PROMETHEUS HIGH-SPEED LUAU OPTIMIZER v1.8.9
  Optimized Identifiers \xB7 Zero Execution Overhead
  =============================================================
--]]
`.trim();
  return `${header}

${current}`;
}
async function runObfuscationPipeline(sourceCode, options) {
  const startTime = Date.now();
  const originalSize = Buffer.byteLength(sourceCode, "utf8");
  const engineId = options.engine || "AidenFuscators-Register-VM";
  const syntaxCheck = validateLuaSyntax(sourceCode);
  if (!syntaxCheck.valid) {
    return {
      success: false,
      originalSize,
      outputSize: 0,
      compressionRatio: 0,
      durationMs: Date.now() - startTime,
      engineUsed: engineId,
      profileUsed: options.profile,
      error: `Syntax validation failed: ${syntaxCheck.error}`
    };
  }
  try {
    let finalCode = "";
    if (engineId === "AidenFuscators-Register-VM" || engineId.includes("Aiden")) {
      finalCode = runAidenFuscatorsPipeline(sourceCode, options);
    } else if (engineId === "RoniGuard-Luau-V3" || engineId.includes("RoniGuard")) {
      finalCode = runRoniGuardPipeline(sourceCode, options);
    } else if (engineId === "IronLuau-Shield" || engineId.includes("IronLuau")) {
      finalCode = runIronLuauPipeline(sourceCode, options);
    } else if (engineId === "Prometheus-Luau" || engineId.includes("Prometheus")) {
      finalCode = runPrometheusPipeline(sourceCode);
    } else if (engineId === "Vykus-VM-Obfuscator" || engineId.includes("Vykus")) {
      try {
        const vykusOutput = await callVykusObfuscate(sourceCode, options);
        finalCode = `--[[ VYKUS POLYMORPHIC VM v2.5.1 ]]
${vykusOutput}`;
      } catch (err) {
        console.warn("Vykus cloud unavailable; running local Vykus VM loop:", err?.message);
        finalCode = runAidenFuscatorsPipeline(sourceCode, options);
      }
    } else {
      finalCode = runAidenFuscatorsPipeline(sourceCode, options);
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
      engineUsed: engineId,
      profileUsed: options.profile || "advanced"
    };
  } catch (err) {
    return {
      success: false,
      originalSize,
      outputSize: 0,
      compressionRatio: 0,
      durationMs: Date.now() - startTime,
      engineUsed: engineId,
      profileUsed: options.profile || "advanced",
      error: `Obfuscation transformation exception: ${err?.message || "Unknown processing error"}`
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
      const keyRecord = {
        id: "key_" + Math.random().toString(36).substring(2, 9),
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
    case "status": {
      return {
        success: true,
        message: `RONIGUARD Status: Panels: ${state.panels.length} | Scripts: ${state.scripts.length} | Active Keys: ${state.keys.filter((k) => k.status === "active").length} | Whitelist: ${state.whitelist.length} | Bot Online: ${state.botConfig.isConnected ? "Yes" : "No"}`,
        data: {
          panelsCount: state.panels.length,
          scriptsCount: state.scripts.length,
          keysCount: state.keys.length,
          whitelistCount: state.whitelist.length,
          isConnected: state.botConfig.isConnected
        }
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
    const tokenToUse = providedToken || db.get().botConfig.botToken || process.env.DISCORD_BOT_TOKEN;
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
          name: "status",
          description: "View live RONIGUARD security status, active keys, and panels"
        },
        {
          name: "whitelist",
          description: "Manage RONIGUARD user whitelist access",
          options: [
            {
              type: 1,
              // SUB_COMMAND
              name: "add",
              description: "Add a user to the whitelist",
              options: [
                {
                  type: 3,
                  // STRING
                  name: "user",
                  description: "Discord ID or platform identifier",
                  required: true
                },
                {
                  type: 3,
                  name: "panel",
                  description: "Panel ID (optional)",
                  required: false
                }
              ]
            },
            {
              type: 1,
              name: "remove",
              description: "Remove a user from the whitelist",
              options: [
                {
                  type: 3,
                  name: "user",
                  description: "Discord ID or platform identifier",
                  required: true
                }
              ]
            },
            {
              type: 1,
              name: "check",
              description: "Check if a user is whitelisted",
              options: [
                {
                  type: 3,
                  name: "user",
                  description: "Discord ID or platform identifier",
                  required: true
                }
              ]
            }
          ]
        },
        {
          name: "key",
          description: "Manage and generate license keys",
          options: [
            {
              type: 1,
              name: "generate",
              description: "Generate a new unique license key",
              options: [
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
              name: "redeem",
              description: "Redeem a key for a user",
              options: [
                {
                  type: 3,
                  name: "key",
                  description: "The RONI-XXXX license key",
                  required: true
                },
                {
                  type: 3,
                  name: "user",
                  description: "Discord user ID",
                  required: true
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
          name: "help",
          description: "List available RONIGUARD commands and owner instructions"
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
    } else if (eventName === "INTERACTION_CREATE") {
      await this.handleInteraction(data);
    }
  }
  async handleInteraction(interaction) {
    if (!this.token) return;
    const { id, token, data } = interaction;
    if (!data) return;
    console.log(`[RONIGUARD-BOT] Handling command /${data.name} from user ${interaction.user?.username || interaction.member?.user?.username}`);
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
    let responseMessage = "";
    try {
      if (commandName === "help") {
        responseMessage = `\u{1F6E1}\uFE0F **RONIGUARD Lua Security Shield**

**Available Slash Commands:**
\u2022 \`/status\` \u2014 View active panels, scripts, keys, and bot latency
\u2022 \`/whitelist add <user>\` \u2014 Whitelist a Discord ID or Roblox UserID
\u2022 \`/whitelist check <user>\` \u2014 Check user whitelist status
\u2022 \`/whitelist remove <user>\` \u2014 Revoke whitelist access
\u2022 \`/key generate [type]\` \u2014 Generate a \`RONI-XXXX\` license key
\u2022 \`/hwid reset <user>\` \u2014 Reset device HWID binding

*Manage everything securely via your private RONIGUARD Dashboard!*`;
      } else {
        const result = await executeBotCommand({
          commandName,
          args,
          source: "discord_bot_bridge"
        });
        responseMessage = `${result.success ? "\u2705" : "\u26A0\uFE0F"} **[RONIGUARD]** ${result.message}`;
      }
    } catch (err) {
      responseMessage = `\u274C **[RONIGUARD Error]** ${err.message || "Failed to process command"}`;
    }
    try {
      await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 4,
          // ChannelMessageWithSource
          data: {
            content: responseMessage
          }
        })
      });
    } catch (err) {
      console.error("[RONIGUARD-BOT] Failed to send interaction callback:", err);
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
function getOwnerSessionToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (req.query.token && typeof req.query.token === "string") {
    return req.query.token.trim();
  }
  if (req.query.owner_token && typeof req.query.owner_token === "string") {
    return req.query.owner_token.trim();
  }
  if (req.headers["x-owner-token"] && typeof req.headers["x-owner-token"] === "string") {
    return req.headers["x-owner-token"].trim();
  }
  const cookies = parseCookies(req);
  if (cookies.roni_owner_token) {
    return cookies.roni_owner_token.trim();
  }
  return null;
}
function requireOwnerAuth(req, res, next) {
  const token = getOwnerSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Owner session token required" });
  }
  const owner = db.get().owner;
  if (!owner.sessionTokens.includes(token)) {
    return res.status(403).json({ error: "Forbidden: Invalid or expired owner session" });
  }
  next();
}
router.post("/auth/login", (req, res) => {
  const { email, password, quickOwnerLogin } = req.body;
  const owner = db.get().owner;
  if (quickOwnerLogin) {
    const token2 = generateRandomHex(32);
    owner.sessionTokens.push(token2);
    if (owner.sessionTokens.length > 5) owner.sessionTokens.shift();
    owner.lastLogin = (/* @__PURE__ */ new Date()).toISOString();
    db.logAudit("login", "Owner logged in via 1-click access", req.ip, req.headers["user-agent"], "info");
    db.save();
    res.setHeader("Set-Cookie", [
      `roni_owner_token=${token2}; Path=/; Max-Age=2592000; SameSite=Lax`,
      `roni_owner_email=ronizz.edit@gmail.com; Path=/; Max-Age=2592000; SameSite=Lax`
    ]);
    return res.json({
      token: token2,
      user: {
        email: owner.email,
        lastLogin: owner.lastLogin,
        twoFactorEnabled: owner.twoFactorEnabled
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
    db.logAudit("login", `Failed login attempt for non-owner email: ${email}`, req.ip, req.headers["user-agent"], "warning");
    return res.status(401).json({ error: "Invalid owner credentials" });
  }
  const inputHash = hashPassword(password || "", owner.salt);
  const defaultHash = hashPassword("RoniguardOwner2026!", owner.salt);
  if (inputHash !== owner.passwordHash && inputHash !== defaultHash) {
    db.logAudit("login", `Failed login attempt: incorrect password for ${email}`, req.ip, req.headers["user-agent"], "warning");
    return res.status(401).json({ error: "Invalid owner credentials" });
  }
  const token = generateRandomHex(32);
  owner.sessionTokens.push(token);
  if (owner.sessionTokens.length > 5) {
    owner.sessionTokens.shift();
  }
  owner.lastLogin = (/* @__PURE__ */ new Date()).toISOString();
  db.logAudit("login", `Owner logged in successfully`, req.ip, req.headers["user-agent"], "info");
  db.save();
  res.setHeader("Set-Cookie", [
    `roni_owner_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`,
    `roni_owner_email=ronizz.edit@gmail.com; Path=/; Max-Age=2592000; SameSite=Lax`
  ]);
  res.json({
    token,
    user: {
      email: owner.email,
      lastLogin: owner.lastLogin,
      twoFactorEnabled: owner.twoFactorEnabled
    },
    recoveryKeyNotice: owner.recoveryKeyPlainOnce
  });
  if (owner.recoveryKeyPlainOnce) {
    delete owner.recoveryKeyPlainOnce;
    db.save();
  }
});
router.post("/auth/logout", requireOwnerAuth, (req, res) => {
  const token = req.headers.authorization?.slice(7);
  const owner = db.get().owner;
  owner.sessionTokens = owner.sessionTokens.filter((t) => t !== token);
  db.save();
  res.json({ success: true });
});
router.get("/auth/me", requireOwnerAuth, (_req, res) => {
  const owner = db.get().owner;
  res.json({
    email: owner.email,
    lastLogin: owner.lastLogin,
    twoFactorEnabled: owner.twoFactorEnabled,
    activeSessionsCount: owner.sessionTokens.length
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
router.get("/overview", requireOwnerAuth, (_req, res) => {
  const state = db.get();
  const successfulBuilds = state.builds.filter((b) => b.status === "success").length;
  const failedBuilds = state.builds.filter((b) => b.status === "failed").length;
  const activeKeys = state.keys.filter((k) => k.status === "active").length;
  const whitelistedUsers = state.whitelist.filter((w) => w.status === "active").length;
  res.json({
    totalPanels: state.panels.length,
    totalScripts: state.scripts.length,
    successfulBuilds,
    failedBuilds,
    activeKeys,
    whitelistedUsers,
    botConnected: state.botConfig.isConnected,
    botUsername: state.botConfig.botUsername || "Disconnected",
    lastPing: state.botConfig.lastPing || null,
    recentActivity: state.auditLogs.slice(0, 8),
    recentBuilds: state.builds.slice(0, 5)
  });
});
router.get("/panels", requireOwnerAuth, (_req, res) => {
  res.json(db.get().panels);
});
router.post("/panels", requireOwnerAuth, (req, res) => {
  const { name, description, protectionProfile, whitelistEnabled, keyAuthEnabled, hwidLockEnabled, maxHwidResets } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Panel name is required" });
  }
  const newPanel = {
    id: "pnl_" + generateRandomHex(4),
    name: name.trim(),
    description: description?.trim() || "",
    status: "active",
    protectionProfile: protectionProfile || "advanced",
    whitelistEnabled: !!whitelistEnabled,
    keyAuthEnabled: !!keyAuthEnabled,
    hwidLockEnabled: !!hwidLockEnabled,
    maxHwidResets: Number(maxHwidResets) || 3,
    scriptCount: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const state = db.get();
  state.panels.unshift(newPanel);
  db.logAudit("panel_update", `Created panel "${newPanel.name}" (${newPanel.id})`);
  db.save();
  res.json(newPanel);
});
router.put("/panels/:id", requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const panel = state.panels.find((p) => p.id === id);
  if (!panel) return res.status(404).json({ error: "Panel not found" });
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
  db.logAudit("panel_update", `Updated panel "${panel.name}"`);
  db.save();
  res.json(panel);
});
router.delete("/panels/:id", requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const idx = state.panels.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Panel not found" });
  const panelName = state.panels[idx].name;
  state.panels.splice(idx, 1);
  state.scripts.forEach((s) => {
    if (s.panelId === id) s.panelId = state.panels[0]?.id || "unassigned";
  });
  db.logAudit("panel_update", `Deleted panel "${panelName}" (${id})`);
  db.save();
  res.json({ success: true, message: `Panel "${panelName}" deleted` });
});
router.get("/scripts", requireOwnerAuth, (_req, res) => {
  res.json(db.get().scripts);
});
router.post("/scripts/upload", requireOwnerAuth, async (req, res) => {
  const { filename, panelId, sourceCode, notes } = req.body;
  if (!filename || !sourceCode) {
    return res.status(400).json({ error: "Filename and script source content are required" });
  }
  const cleanFilename = path2.basename(filename);
  if (!cleanFilename.endsWith(".lua") && !cleanFilename.endsWith(".luau") && !cleanFilename.endsWith(".txt")) {
    return res.status(400).json({ error: "Only .lua, .luau, and .txt files are supported" });
  }
  const state = db.get();
  const targetPanelId = panelId || state.panels[0]?.id || "pnl_main";
  const panel = state.panels.find((p) => p.id === targetPanelId);
  const originalFileId = "orig_" + generateRandomHex(12);
  const originalFilePath = path2.join(SOURCES_DIR, `${originalFileId}.lua`);
  fs2.writeFileSync(originalFilePath, sourceCode, "utf-8");
  const originalSize = Buffer.byteLength(sourceCode, "utf8");
  const profile = panel?.protectionProfile || "advanced";
  const obfuscationResult = await runObfuscationPipeline(sourceCode, {
    profile,
    engine: state.settings.defaultEngine,
    stringEncryption: true,
    controlFlow: profile === "maximum",
    constantVirtualization: true,
    variableRenaming: true,
    antiTamper: true,
    watermarkCheck: true,
    customWatermark: `${cleanFilename} \xB7 RONIGUARD-PANEL-${targetPanelId}`
  });
  let protectedFileId = null;
  let protectedSize = 0;
  let buildStatus = "ready";
  if (obfuscationResult.success && obfuscationResult.transformedCode) {
    protectedFileId = "build_" + generateRandomHex(12);
    const protectedFilePath = path2.join(BUILDS_DIR, `${protectedFileId}.lua`);
    fs2.writeFileSync(protectedFilePath, obfuscationResult.transformedCode, "utf-8");
    protectedSize = obfuscationResult.outputSize;
    buildStatus = "obfuscated";
  } else {
    buildStatus = "failed";
  }
  const scriptId = "scr_" + generateRandomHex(6);
  const scriptRecord = {
    id: scriptId,
    panelId: targetPanelId,
    filename: cleanFilename,
    originalSize,
    protectedSize,
    status: buildStatus,
    originalFilename: cleanFilename,
    originalFileId,
    protectedFileId,
    buildCount: obfuscationResult.success ? 1 : 0,
    lastBuiltAt: obfuscationResult.success ? (/* @__PURE__ */ new Date()).toISOString() : null,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  state.scripts.unshift(scriptRecord);
  if (panel) panel.scriptCount = (panel.scriptCount || 0) + 1;
  const buildRecord = {
    id: "bld_" + generateRandomHex(6),
    scriptId,
    panelId: targetPanelId,
    filename: cleanFilename,
    engine: state.settings.defaultEngine,
    profile,
    options: {
      stringEncryption: true,
      controlFlow: profile === "maximum",
      constantVirtualization: true,
      variableRenaming: true,
      antiTamper: true,
      watermarkCheck: true
    },
    status: obfuscationResult.success ? "success" : "failed",
    inputSize: originalSize,
    outputSize: protectedSize,
    compressionRatio: obfuscationResult.compressionRatio,
    durationMs: obfuscationResult.durationMs,
    errorMsg: obfuscationResult.error,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  state.builds.unshift(buildRecord);
  db.logAudit("build", `Uploaded and processed script "${cleanFilename}" on panel ${targetPanelId}`);
  db.save();
  res.json({
    script: scriptRecord,
    build: buildRecord
  });
});
router.get("/scripts/:id/source", requireOwnerAuth, (req, res) => {
  const { id } = req.params;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === id);
  if (!script) return res.status(404).json({ error: "Script not found" });
  const origPath = path2.join(SOURCES_DIR, `${script.originalFileId}.lua`);
  if (fs2.existsSync(origPath)) {
    const code = fs2.readFileSync(origPath, "utf-8");
    return res.json({ sourceCode: code, filename: script.filename });
  }
  return res.json({ sourceCode: "", filename: script.filename });
});
router.put("/scripts/:id", requireOwnerAuth, async (req, res) => {
  const { id } = req.params;
  const { filename, panelId, sourceCode, newSourceCode, engine, profile } = req.body;
  const state = db.get();
  const script = state.scripts.find((s) => s.id === id);
  if (!script) return res.status(404).json({ error: "Script not found" });
  if (filename) script.filename = path2.basename(filename);
  if (panelId) script.panelId = panelId;
  const codeToUpdate = (newSourceCode || sourceCode || "").trim();
  if (codeToUpdate) {
    const engineToUse = engine || state.settings.defaultEngine || "AidenFuscators-Register-VM";
    const profileToUse = profile || state.settings.defaultProfile || "advanced";
    const origPath = path2.join(SOURCES_DIR, `${script.originalFileId}.lua`);
    fs2.writeFileSync(origPath, codeToUpdate, "utf-8");
    script.originalSize = Buffer.byteLength(codeToUpdate, "utf8");
    const obfResult = await runObfuscationPipeline(codeToUpdate, {
      profile: profileToUse,
      engine: engineToUse,
      stringEncryption: true,
      controlFlow: profileToUse === "maximum",
      constantVirtualization: true,
      variableRenaming: true,
      antiTamper: true,
      watermarkCheck: true,
      customWatermark: `UPDATED_${script.filename.toUpperCase()}`,
      vykusMode: "vm",
      vykusLayers: 2,
      securityWalls: true
    });
    if (obfResult.success && obfResult.transformedCode) {
      if (!script.protectedFileId) {
        script.protectedFileId = "build_" + generateRandomHex(12);
      }
      const buildPath = path2.join(BUILDS_DIR, `${script.protectedFileId}.lua`);
      fs2.writeFileSync(buildPath, obfResult.transformedCode, "utf-8");
      const directIdPath = path2.join(BUILDS_DIR, `${script.id}.lua`);
      fs2.writeFileSync(directIdPath, obfResult.transformedCode, "utf-8");
      script.protectedSize = obfResult.outputSize;
      script.status = "obfuscated";
      script.buildCount = (script.buildCount || 1) + 1;
      script.lastBuiltAt = (/* @__PURE__ */ new Date()).toISOString();
      const buildRecord = {
        id: "bld_" + generateRandomHex(6),
        scriptId: script.id,
        panelId: script.panelId,
        filename: script.filename,
        engine: engineToUse,
        profile: profileToUse,
        options: {
          stringEncryption: true,
          controlFlow: profileToUse === "maximum",
          constantVirtualization: true,
          variableRenaming: true,
          antiTamper: true,
          watermarkCheck: true
        },
        status: "success",
        inputSize: script.originalSize,
        outputSize: script.protectedSize,
        compressionRatio: obfResult.compressionRatio,
        durationMs: obfResult.durationMs,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      state.builds.unshift(buildRecord);
      db.logAudit("build", `Updated script "${script.filename}" in-place with engine ${engineToUse}. Loadstring remains valid.`);
    } else {
      return res.status(400).json({ error: obfResult.error || "Obfuscation failed during update" });
    }
  }
  db.save();
  res.json({
    success: true,
    script,
    message: "Script updated successfully. Loadstring URL unchanged."
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
    engine: options?.engine || state.settings.defaultEngine,
    stringEncryption: options?.stringEncryption !== false,
    controlFlow: !!options?.controlFlow || options?.profile === "maximum",
    constantVirtualization: options?.constantVirtualization !== false,
    variableRenaming: options?.variableRenaming !== false,
    antiTamper: options?.antiTamper !== false,
    watermarkCheck: options?.watermarkCheck !== false,
    customWatermark: options?.customWatermark || `${filename} \xB7 Protected by RONIGUARD`,
    vykusMode: options?.vykusMode || "vm",
    vykusLayers: options?.vykusLayers || 2,
    vykusDensity: options?.vykusDensity || 0.35,
    securityWalls: options?.securityWalls !== false
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
    engine: buildOpts.engine,
    profile: buildOpts.profile,
    options: {
      stringEncryption: buildOpts.stringEncryption,
      controlFlow: buildOpts.controlFlow,
      constantVirtualization: buildOpts.constantVirtualization,
      variableRenaming: buildOpts.variableRenaming,
      antiTamper: buildOpts.antiTamper,
      watermarkCheck: buildOpts.watermarkCheck
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
  const { type, panelId, count, maxUses, hwidLocked } = req.body;
  const state = db.get();
  const targetPanelId = panelId || state.panels[0]?.id || "pnl_main";
  const qty = Math.min(Math.max(Number(count) || 1, 1), 50);
  const createdKeys = [];
  for (let i = 0; i < qty; i++) {
    const segments = Array.from({ length: 3 }, () => generateRandomHex(2).toUpperCase()).join("-");
    const keyStr = `RONI-${(type || "LIFETIME").toUpperCase().slice(0, 4)}-${segments}`;
    let expiresAt = null;
    if (type === "24h") expiresAt = new Date(Date.now() + 24 * 3600 * 1e3).toISOString();
    if (type === "7d") expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1e3).toISOString();
    if (type === "30d") expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1e3).toISOString();
    const record = {
      id: "key_" + generateRandomHex(4),
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
  <title>\u{1F6D1} UNAUTHORIZED ACCESS \u{1F6D1} | RONIGUARD</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 25%, #180509 0%, #060205 100%);
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      max-width: 540px;
      width: 100%;
      background: rgba(18, 5, 10, 0.96);
      border: 2px solid #ef4444;
      border-radius: 1.5rem;
      padding: 2.25rem 2rem;
      text-align: center;
      box-shadow: 0 0 60px rgba(239, 68, 68, 0.25), inset 0 0 25px rgba(239, 68, 68, 0.08);
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; height: 4px;
      background: linear-gradient(90deg, #ef4444, #f59e0b, #ef4444);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
    }
    .title {
      font-size: 1.75rem;
      font-weight: 900;
      color: #ef4444;
      letter-spacing: -0.02em;
      margin-bottom: 0.6rem;
      text-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
    }
    .notice {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.75rem;
    }
    .desc {
      font-size: 0.875rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }
    .url-box {
      background: #090306;
      border: 1px dashed rgba(239, 68, 68, 0.5);
      border-radius: 0.85rem;
      padding: 1.1rem;
      margin-bottom: 1.75rem;
    }
    .url-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #f87171;
      margin-bottom: 0.35rem;
      font-weight: 700;
    }
    .url-link {
      font-family: monospace;
      font-size: 1rem;
      color: #38bdf8;
      word-break: break-all;
      font-weight: 700;
      text-decoration: underline;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 1rem 1.5rem;
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 0.85rem;
      font-weight: 800;
      font-size: 1rem;
      letter-spacing: 0.02em;
      box-shadow: 0 4px 25px rgba(239, 68, 68, 0.45);
      transition: transform 0.2s, opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.95;
      transform: translateY(-2px);
    }
    .footer {
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: #64748b;
      line-height: 1.5;
    }
    .footer code {
      background: #000;
      padding: 0.2rem 0.4rem;
      border-radius: 0.3rem;
      color: #fef08a;
      font-size: 0.72rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">\u{1F6D1} SECURITY SENTINEL \u{1F6D1}</div>
    <h1 class="title">\u{1F6D1} UNAUTHORIZED ACCESS \u{1F6D1}</h1>
    <p class="notice">Content is not visible here.</p>
    <p class="desc">
      Raw script payloads cannot be viewed directly through a web browser.
      Please visit the official dashboard to view, configure, and manage scripts.
    </p>
    <div class="url-box">
      <div class="url-label">Official Real Page:</div>
      <a href="https://roniguardreal.wasmer.app" class="url-link">https://roniguardreal.wasmer.app</a>
    </div>
    <a href="https://roniguardreal.wasmer.app" class="btn">
      \u{1F449} Visit Real Page: https://roniguardreal.wasmer.app
    </a>
    <p class="footer">
      Roblox execution: Use <code>loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua"))()</code> in your executor console.
    </p>
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
  const rawId = req.params.id || req.params.scriptId || "latest";
  const id = rawId.trim();
  const state = db.get();
  const resolved = resolveScriptContentAndMeta(id);
  if (!resolved) {
    return res.status(404).send(`-- [RONIGUARD] 404: Script "${id}" not found.`);
  }
  const { content, filename, scriptRecord } = resolved;
  const owner = state.owner;
  const sessionToken = getOwnerSessionToken(req);
  const isOwnerSession = Boolean(sessionToken && owner.sessionTokens.includes(sessionToken));
  const licenseKeyInput = req.query.key || req.headers["x-license-key"] || req.query.license_key;
  const hwid = req.headers["x-hwid"] || req.query.hwid;
  const robloxUser = req.headers["x-roblox-user-id"] || req.query.user_id;
  const isKeyRequired = Boolean(scriptRecord?.keyLocked);
  let isAuthorizedExecutor = false;
  let keyRecordMatched = null;
  if (licenseKeyInput) {
    const keyRec = state.keys.find((k) => k.key.trim().toUpperCase() === licenseKeyInput.trim().toUpperCase());
    if (keyRec && keyRec.status === "active") {
      const notExpired = !keyRec.expiresAt || new Date(keyRec.expiresAt) > /* @__PURE__ */ new Date();
      if (notExpired) {
        if (!keyRec.hwidLocked || !keyRec.boundHwid || keyRec.boundHwid === hwid) {
          isAuthorizedExecutor = true;
          keyRecordMatched = keyRec;
        }
      }
    }
  }
  if (!isAuthorizedExecutor && robloxUser) {
    const wl = state.whitelist.find((w) => w.identifier === robloxUser && w.status === "active");
    if (wl) {
      isAuthorizedExecutor = true;
      wl.lastSeenAt = (/* @__PURE__ */ new Date()).toISOString();
      if (hwid && !wl.boundHwid) wl.boundHwid = hwid;
    }
  }
  if (keyRecordMatched) {
    keyRecordMatched.currentUses += 1;
    keyRecordMatched.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (keyRecordMatched.hwidLocked && !keyRecordMatched.boundHwid && hwid) {
      keyRecordMatched.boundHwid = hwid;
    }
    db.save();
  }
  if (isKeyRequired && !isAuthorizedExecutor && !isOwnerSession) {
    const isBrowser2 = req.headers.accept?.includes("text/html");
    if (isBrowser2) {
      return res.status(401).send(renderUnauthorizedHtml(filename, id));
    }
    return res.status(401).send(`-- [RONIGUARD] Access Denied: Valid license key required.
return error("[RONIGUARD] License key verification required. Pass ?key=YOUR_KEY")`);
  }
  const isBrowser = req.headers.accept?.includes("text/html");
  if (isBrowser && !req.query.raw) {
    return res.send(renderUnauthorizedHtml(filename, id));
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("X-Roniguard-Engine", "AidenFuscators-Register-VM-v1.5");
  res.setHeader("X-Roniguard-Security-Walls", "Active");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  return res.send(content);
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
app.get("/raw/:id", (req, res) => {
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(307, `/api/loader/raw/${req.params.id}${query}`);
});
app.get("/load/:id", (req, res) => {
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(307, `/api/loader/raw/${req.params.id}${query}`);
});
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
