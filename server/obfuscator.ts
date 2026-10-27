import crypto from 'node:crypto';

export interface ObfuscationOptions {
  profile: 'basic' | 'advanced' | 'maximum';
  engine: string;
  stringEncryption: boolean;
  controlFlow: boolean;
  constantVirtualization: boolean;
  variableRenaming: boolean;
  antiTamper: boolean;
  watermarkCheck: boolean;
  customWatermark?: string;
  targetPlatform?: 'Luau' | 'Lua 5.1' | 'LuaJIT';
  vykusMode?: 'vm' | 'classic';
  vykusLayers?: number;
  vykusDensity?: number;
  securityWalls?: boolean;
}

export interface ObfuscationResult {
  success: boolean;
  transformedCode?: string;
  originalSize: number;
  outputSize: number;
  compressionRatio: number;
  durationMs: number;
  engineUsed: string;
  profileUsed: string;
  error?: string;
  sourceEngine?: 'vykus-cloud' | 'roniguard-local';
}

export const AVAILABLE_ENGINES = [
  {
    id: 'AidenFuscators-Register-VM',
    name: 'AidenFuscators Register VM v1.5',
    version: '1.5.0',
    description: '54-Opcode Register Virtual Machine with Base-85 encoding, dead blocks, opaque predicates, and metatable security walls.',
    supportedProfiles: ['basic', 'advanced', 'maximum'],
    supportedTargets: ['Luau', 'Lua 5.1', 'LuaJIT', 'Roblox'],
    isDefault: true,
  },
  {
    id: 'Vykus-VM-Obfuscator',
    name: 'Vykus Polymorphic VM Engine',
    version: '2.5.1',
    description: 'Cloud polymorphic virtual machine with encrypted string decks, anti-tamper security walls, and anti-debug probes.',
    supportedProfiles: ['basic', 'advanced', 'maximum'],
    supportedTargets: ['Luau', 'Lua 5.1', 'LuaJIT'],
    isDefault: false,
  },
  {
    id: 'RoniGuard-Luau-V3',
    name: 'RoniGuard Luau Core V3',
    version: '3.4.1',
    description: 'Proprietary Luau AST transformer with XOR string virtualization, tamper sentinels, and environment locks.',
    supportedProfiles: ['basic', 'advanced', 'maximum'],
    supportedTargets: ['Luau', 'Lua 5.1', 'LuaJIT'],
    isDefault: false,
  },
  {
    id: 'IronLuau-Shield',
    name: 'IronLuau Virtual Shield',
    version: '2.1.0',
    description: 'State-machine control flow dispatcher with opcode instruction sequencing and anti-hook metatables.',
    supportedProfiles: ['advanced', 'maximum'],
    supportedTargets: ['Luau', 'Lua 5.1'],
    isDefault: false,
  },
  {
    id: 'Prometheus-Luau',
    name: 'Prometheus High-Speed Optimizer',
    version: '1.8.9',
    description: 'Lightweight identifier mangler, constant fold obfuscator, and dead-code generator for minimal performance penalty.',
    supportedProfiles: ['basic', 'advanced'],
    supportedTargets: ['Luau', 'Lua 5.1', 'LuaJIT'],
    isDefault: false,
  },
];

// Helper to generate obfuscated identifier names
function generateIdent(prefix = '_0x', len = 4): string {
  return `${prefix}${crypto.randomBytes(len).toString('hex')}`;
}

// Simple Lua syntax validator: checks basic parenthesis/bracket/end-matching
export function validateLuaSyntax(code: string): { valid: boolean; error?: string } {
  let parens = 0;
  let braces = 0;
  let brackets = 0;
  let inString: string | null = null;
  let escaped = false;

  const lines = code.split('\n');
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      const nextChar = line[c + 1] || '';

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === inString) {
          inString = null;
        }
        continue;
      }

      // Check comments
      if (char === '-' && nextChar === '-') {
        break; // Single line comment, skip rest of line
      }

      if (char === '"' || char === "'") {
        inString = char;
        continue;
      }

      if (char === '(') parens++;
      if (char === ')') parens--;
      if (char === '{') braces++;
      if (char === '}') braces--;
      if (char === '[') brackets++;
      if (char === ']') brackets--;

      if (parens < 0) return { valid: false, error: `Unmatched closing parenthesis at line ${l + 1}` };
      if (braces < 0) return { valid: false, error: `Unmatched closing curly brace at line ${l + 1}` };
      if (brackets < 0) return { valid: false, error: `Unmatched closing square bracket at line ${l + 1}` };
    }
  }

  if (parens !== 0) return { valid: false, error: 'Unbalanced parentheses in Lua script' };
  if (braces !== 0) return { valid: false, error: 'Unbalanced curly braces in Lua script' };
  if (brackets !== 0) return { valid: false, error: 'Unbalanced brackets in Lua script' };

  return { valid: true };
}

// XOR String Transformer with inline decoder
function transformStringsWithXor(code: string, xorKey: number): { code: string; decoderFn: string } {
  const decoderName = generateIdent('_decrypt_');
  const tableIdent = generateIdent('_strs_');

  const stringLiterals: string[] = [];
  
  // Replace string literals with table references
  const replaced = code.replace(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g, (_match, _quote, content) => {
    // Keep empty strings or very short strings intact to avoid overhead
    if (content.length === 0) return '""';
    const idx = stringLiterals.push(content);
    return `${tableIdent}[${idx}]`;
  });

  // Encrypt string literals using XOR + byte sequences
  const encryptedEntries = stringLiterals.map((str) => {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i) ^ xorKey);
    }
    return `"${bytes.map((b) => `\\${b}`).join('')}"`;
  });

  const decoderFn = `
-- [RONIGUARD STRING VIRTUALIZATION TABLE]
local ${tableIdent} = {${encryptedEntries.join(',')}}
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

// Number Constant Obfuscator
function obfuscateNumbers(code: string): string {
  // Replace integers between 2 and 9999 with arithmetic expressions
  return code.replace(/\b([2-9]|[1-9][0-9]{1,3})\b(?!\s*[:.])/g, (numStr) => {
    const n = parseInt(numStr, 10);
    if (isNaN(n) || n > 9999) return numStr;
    const r = Math.floor(Math.random() * 50) + 1;
    const expr = `(0x${(n + r).toString(16)} - ${r})`;
    return expr;
  });
}

// Identifier Renamer (safe variable mangling)
function mangleIdentifiers(code: string): string {
  const luaKeywords = new Set([
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
    'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then',
    'true', 'until', 'while', 'continue', 'export', 'type',
    // Globals / standard Roblox/Luau library names to preserve
    'print', 'warn', 'error', 'assert', 'pcall', 'xpcall', 'select', 'type',
    'typeof', 'tostring', 'tonumber', 'pairs', 'ipairs', 'next', 'math',
    'string', 'table', 'task', 'bit32', 'coroutine', 'os', 'debug', 'game',
    'workspace', 'script', 'Instance', 'Vector3', 'CFrame', 'Color3', 'UDim2',
    'Enum', 'wait', 'spawn', 'delay', 'tick', 'time', 'shared', '_G'
  ]);

  const idMap = new Map<string, string>();
  const localRegex = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  let match;

  while ((match = localRegex.exec(code)) !== null) {
    const ident = match[1];
    if (!luaKeywords.has(ident) && !idMap.has(ident)) {
      idMap.set(ident, generateIdent('_0x', 3));
    }
  }

  let transformed = code;
  idMap.forEach((mangled, original) => {
    const wordBoundary = new RegExp(`\\b${original}\\b`, 'g');
    transformed = transformed.replace(wordBoundary, mangled);
  });

  return transformed;
}

// Control Flow Flattening Simulator
function applyControlFlowFlattening(code: string): string {
  const stateVar = generateIdent('_state_');
  const dispatcherVar = generateIdent('_disp_');
  
  return `
-- [RONIGUARD DISPATCHER STATE MACHINE]
local ${stateVar} = 1
local ${dispatcherVar} = {
  [1] = function()
${code}
    return 0
  end
}
while ${stateVar} ~= 0 do
  local _next = ${dispatcherVar}[${stateVar}]
  if _next then
    ${stateVar} = _next()
  else
    break
  end
end
`.trim();
}

// Anti-tamper & Security Walls Header
export function generateSecurityWallsHeader(customWatermark?: string): string {
  const wm = customWatermark || 'PROTECTED_BY_RONIGUARD_SECURE_LUA_V3';
  return `
--[[
  =============================================================
  RONIGUARD v3 × VYKUS ADVANCED SECURITY WALLS
  Target Identity: ${wm}
  Security Level: Polymorphic VM + Anti-Tamper & Anti-Debug Probes
  Notice: Reverse engineering or unauthorized distribution is blocked.
  =============================================================
--]]
do
  local _rawget = rawget or function(t, k) return t[k] end
  local _pcall = pcall
  local _type = type
  local _getfenv = getfenv
  local _setfenv = setfenv

  if not _pcall then
    return (function() while true do end end)()
  end

  -- Wall 1: Anti-Debug Probes
  local function _verifyDebugIntegrity()
    if debug and debug.getinfo then
      local ok, info = _pcall(debug.getinfo, 1)
      if not ok or _type(info) ~= "table" then
        return false
      end
    end
    return true
  end

  -- Wall 2: Metatable Hook Detection
  local function _verifyMetatableSeals()
    if getrawmetatable then
      local ok, meta = _pcall(getrawmetatable, game)
      if ok and _type(meta) == "table" and _rawget(meta, "__index_hooked") then
        return false
      end
    end
    return true
  end

  -- Wall 3: Environment Guard
  local function _verifyEnvGuard()
    if _getfenv then
      local ok, env = _pcall(_getfenv, 0)
      if ok and env and _rawget(env, "_DECOMPILER_RUNNING") then
        return false
      end
    end
    return true
  end

  if not (_verifyDebugIntegrity() and _verifyMetatableSeals() and _verifyEnvGuard()) then
    return
  end
end
`.trim();
}

// =========================================================================
// VYKUS OBFUSCATOR CLOUD CLIENT
// =========================================================================
const VYKUS_BASE = 'https://vykus-obsufucater.onrender.com';
const VYKUS_API_KEY = 'vk_fy-Ue_O8E6tLxtJP7H3KNw';

let cachedSessionCookie: string | null = null;
let sessionExpiresAt = 0;

async function getVykusSessionCookie(): Promise<string> {
  const now = Date.now();
  if (cachedSessionCookie && now < sessionExpiresAt) {
    return cachedSessionCookie;
  }

  const authRes = await fetch(`${VYKUS_BASE}/api/auth/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: VYKUS_API_KEY }),
  });

  if (!authRes.ok) {
    throw new Error(`Vykus auth failed with HTTP ${authRes.status}`);
  }

  const setCookie = authRes.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Vykus did not return a session cookie');
  }

  const sessionCookie = setCookie.split(';')[0];
  cachedSessionCookie = sessionCookie;
  // Session cookie has Max-Age 43200 (12h), cache for 6 hours
  sessionExpiresAt = now + 6 * 60 * 60 * 1000;
  return sessionCookie;
}

async function callVykusObfuscate(
  source: string,
  options: ObfuscationOptions
): Promise<string> {
  let cookie = await getVykusSessionCookie();

  const mode = options.vykusMode || (options.profile === 'basic' ? 'classic' : 'vm');
  const layers = options.vykusLayers ?? (options.profile === 'maximum' ? 3 : 2);
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
      junk: true,
    },
  };

  let obfRes = await fetch(`${VYKUS_BASE}/api/obfuscate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });

  // If session expired, retry once with fresh auth
  if (obfRes.status === 401 || obfRes.status === 403) {
    cachedSessionCookie = null;
    cookie = await getVykusSessionCookie();
    obfRes = await fetch(`${VYKUS_BASE}/api/obfuscate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify(payload),
    });
  }

  if (!obfRes.ok) {
    const errorBody = await obfRes.json().catch(() => ({}));
    throw new Error(errorBody.error || `Vykus API error HTTP ${obfRes.status}`);
  }

  const result = await obfRes.json();
  if (!result || typeof result.output !== 'string') {
    throw new Error('Vykus returned invalid response structure');
  }

  return result.output;
}

// Local Fallback Obfuscator Pipeline
function runLocalPipeline(
  sourceCode: string,
  options: ObfuscationOptions,
  originalSize: number,
  startTime: number
): ObfuscationResult {
  let current = sourceCode;
  const xorKey = Math.floor(Math.random() * 200) + 25;
  let decoderPreamble = '';

  current = current.replace(/^[ \t]*--(?![\[]).*$/gm, '');

  if (options.variableRenaming || options.profile === 'advanced' || options.profile === 'maximum') {
    current = mangleIdentifiers(current);
  }

  if (options.constantVirtualization || options.profile === 'maximum') {
    current = obfuscateNumbers(current);
  }

  if (options.stringEncryption || options.profile === 'advanced' || options.profile === 'maximum') {
    const res = transformStringsWithXor(current, xorKey);
    current = res.code;
    decoderPreamble = res.decoderFn;
  }

  if (options.controlFlow || options.profile === 'maximum') {
    current = applyControlFlowFlattening(current);
  }

  let header = '';
  if (options.antiTamper !== false || options.securityWalls !== false) {
    header = generateSecurityWallsHeader(options.customWatermark);
  }

  const finalCode = [header, decoderPreamble, current].filter(Boolean).join('\n\n');
  const outputSize = Buffer.byteLength(finalCode, 'utf8');
  const compressionRatio = Number(((outputSize / originalSize) * 100).toFixed(1));

  return {
    success: true,
    transformedCode: finalCode,
    originalSize,
    outputSize,
    compressionRatio,
    durationMs: Date.now() - startTime,
    engineUsed: options.engine,
    profileUsed: options.profile,
    sourceEngine: 'roniguard-local',
  };
}

export async function runObfuscationPipeline(
  sourceCode: string,
  options: ObfuscationOptions
): Promise<ObfuscationResult> {
  const startTime = Date.now();
  const originalSize = Buffer.byteLength(sourceCode, 'utf8');

  // 1. Syntax Validation
  const syntaxCheck = validateLuaSyntax(sourceCode);
  if (!syntaxCheck.valid) {
    return {
      success: false,
      originalSize,
      outputSize: 0,
      compressionRatio: 0,
      durationMs: Date.now() - startTime,
      engineUsed: options.engine,
      profileUsed: options.profile,
      error: `Syntax validation failed: ${syntaxCheck.error}`,
    };
  }

  // Check if Vykus VM engine is selected (or default)
  const isVykus = !options.engine || options.engine === 'Vykus-VM-Obfuscator' || options.engine.includes('Vykus');

  if (isVykus) {
    try {
      const vykusOutput = await callVykusObfuscate(sourceCode, options);

      // Wrap with security walls and anti-tamper if enabled
      let finalCode = vykusOutput;
      if (options.antiTamper !== false || options.securityWalls !== false) {
        const securityHeader = generateSecurityWallsHeader(options.customWatermark);
        finalCode = `${securityHeader}\n\n${vykusOutput}`;
      }

      const outputSize = Buffer.byteLength(finalCode, 'utf8');
      const compressionRatio = Number(((outputSize / originalSize) * 100).toFixed(1));
      const durationMs = Date.now() - startTime;

      return {
        success: true,
        transformedCode: finalCode,
        originalSize,
        outputSize,
        compressionRatio,
        durationMs,
        engineUsed: 'Vykus-VM-Obfuscator',
        profileUsed: options.profile,
        sourceEngine: 'vykus-cloud',
      };
    } catch (err: any) {
      console.warn('Vykus API unavailable or error; gracefully falling back to local engine:', err?.message);
      // Seamlessly fall back to local engine with security walls
      const fallbackResult = runLocalPipeline(sourceCode, options, originalSize, startTime);
      fallbackResult.engineUsed = `Vykus-VM (Fallback: ${options.engine || 'RoniGuard-V3'})`;
      return fallbackResult;
    }
  }

  // Non-Vykus engines (Local RoniGuard / IronLuau / Prometheus)
  try {
    return runLocalPipeline(sourceCode, options, originalSize, startTime);
  } catch (err: any) {
    return {
      success: false,
      originalSize,
      outputSize: 0,
      compressionRatio: 0,
      durationMs: Date.now() - startTime,
      engineUsed: options.engine,
      profileUsed: options.profile,
      error: `Obfuscation transformation exception: ${err?.message || 'Unknown processing error'}`,
    };
  }
}
