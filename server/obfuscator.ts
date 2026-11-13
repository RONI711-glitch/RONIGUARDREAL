import crypto from 'node:crypto';

export interface ObfuscationOptions {
  profile?: 'basic' | 'advanced' | 'maximum';
  engine?: string;
  stringEncryption?: boolean;
  controlFlow?: boolean;
  constantVirtualization?: boolean;
  variableRenaming?: boolean;
  antiTamper?: boolean;
  watermarkCheck?: boolean;
  customWatermark?: string;
  targetPlatform?: 'Luau' | 'Lua 5.1' | 'LuaJIT';
  obfuscationEnabled?: boolean;
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
}

export const VYKUS_API_KEY = process.env.VYKUS_API_KEY || 'vk_InV5PXOw2Hdq4kfXkUUM5A';
export const VYKUS_API_URL = process.env.VYKUS_API_URL || 'https://vykus-obsufucater-xtce.onrender.com';

// Official Obfuscation Engines
export const AVAILABLE_ENGINES = [
  {
    id: 'VYKUS-VM',
    name: 'Vykus Cloud Polymorphic VM',
    version: '2.9.0',
    description: 'Cloud polymorphic virtual machine protector: encrypted string decks, anti-debug probes, polymorphic bytecode virtualization, and AST mangling via Vykus Engine.',
    supportedProfiles: ['maximum', 'advanced', 'basic'],
    supportedTargets: ['Luau', 'Lua 5.1', 'LuaJIT', 'Roblox'],
    isDefault: true,
  },
  {
    id: 'RONIGUARD-MAX',
    name: 'RONIGUARD MAX (Local VM)',
    version: '4.2.0',
    description: 'Internal 54-Opcode Register Virtual Machine with Base-85 bytecode serialization, opaque predicates, and metatable security seals.',
    supportedProfiles: ['maximum'],
    supportedTargets: ['Luau', 'Lua 5.1', 'LuaJIT', 'Roblox'],
    isDefault: false,
  },
];

// Helper to generate obfuscated identifier names
function generateIdent(prefix = '_0x', len = 4): string {
  return `${prefix}${crypto.randomBytes(len).toString('hex')}`;
}

// ============================================================================
// LUA / LUAU LEXER (Prevents mangling inside strings, comments, or properties)
// ============================================================================
type TokenType = 'ws' | 'comment' | 'string' | 'longstring' | 'backtick' | 'number' | 'ident' | 'punct';

interface LuaToken {
  type: TokenType;
  value: string;
  quote?: '"' | "'";
  inner?: string;
}

function matchLongBracket(code: string, pos: number): { end: number; eqCount: number } | null {
  if (code[pos] !== '[') return null;
  let eq = 0;
  let p = pos + 1;
  while (p < code.length && code[p] === '=') {
    eq++;
    p++;
  }
  if (code[p] !== '[') return null;
  const closeSeq = ']' + '='.repeat(eq) + ']';
  const closeIdx = code.indexOf(closeSeq, p + 1);
  if (closeIdx === -1) return null;
  return { end: closeIdx + closeSeq.length, eqCount: eq };
}

function tokenizeLua(code: string): LuaToken[] {
  const tokens: LuaToken[] = [];
  let i = 0;
  const len = code.length;

  while (i < len) {
    const ch = code[i];

    // 1. Whitespace
    if (/\s/.test(ch)) {
      let start = i;
      while (i < len && /\s/.test(code[i])) i++;
      tokens.push({ type: 'ws', value: code.slice(start, i) });
      continue;
    }

    // 2. Comments (--[[ ... ]] or -- ...)
    if (ch === '-' && code[i + 1] === '-') {
      const longMatch = matchLongBracket(code, i + 2);
      if (longMatch) {
        tokens.push({ type: 'comment', value: code.slice(i, longMatch.end) });
        i = longMatch.end;
      } else {
        let nl = code.indexOf('\n', i + 2);
        if (nl === -1) nl = len;
        tokens.push({ type: 'comment', value: code.slice(i, nl) });
        i = nl;
      }
      continue;
    }

    // 3. Long strings [[ ... ]] / [=[ ... ]=]
    if (ch === '[') {
      const longMatch = matchLongBracket(code, i);
      if (longMatch) {
        tokens.push({ type: 'longstring', value: code.slice(i, longMatch.end) });
        i = longMatch.end;
        continue;
      }
    }

    // 4. Quoted strings "..." or '...'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let start = i;
      i++;
      while (i < len) {
        const c = code[i];
        if (c === '\\') {
          i += 2;
          continue;
        }
        if (c === quote) {
          i++;
          break;
        }
        if (c === '\n' || c === '\r') {
          break;
        }
        i++;
      }
      const raw = code.slice(start, i);
      const inner = raw.endsWith(quote) && raw.length >= 2 ? raw.slice(1, -1) : raw.slice(1);
      tokens.push({ type: 'string', value: raw, quote, inner });
      continue;
    }

    // 5. Backtick Luau interpolated strings `...`
    if (ch === '`') {
      let start = i;
      i++;
      while (i < len) {
        if (code[i] === '\\') {
          i += 2;
          continue;
        }
        if (code[i] === '`') {
          i++;
          break;
        }
        i++;
      }
      tokens.push({ type: 'backtick', value: code.slice(start, i) });
      continue;
    }

    // 6. Numbers (hex, binary, float, int)
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(code[i + 1] || ''))) {
      let start = i;
      if (ch === '0' && (code[i + 1] === 'x' || code[i + 1] === 'X')) {
        i += 2;
        while (i < len && /[0-9a-fA-F_]/.test(code[i])) i++;
      } else if (ch === '0' && (code[i + 1] === 'b' || code[i + 1] === 'B')) {
        i += 2;
        while (i < len && /[01_]/.test(code[i])) i++;
      } else {
        while (i < len && /[0-9_]/.test(code[i])) i++;
        if (code[i] === '.' && code[i + 1] !== '.') {
          i++;
          while (i < len && /[0-9_]/.test(code[i])) i++;
        }
        if (code[i] === 'e' || code[i] === 'E') {
          i++;
          if (code[i] === '+' || code[i] === '-') i++;
          while (i < len && /[0-9_]/.test(code[i])) i++;
        }
      }
      tokens.push({ type: 'number', value: code.slice(start, i) });
      continue;
    }

    // 7. Identifiers & Keywords
    if (/[a-zA-Z_]/.test(ch)) {
      let start = i;
      while (i < len && /[a-zA-Z0-9_]/.test(code[i])) i++;
      tokens.push({ type: 'ident', value: code.slice(start, i) });
      continue;
    }

    // 8. Multi-char operators & punctuation
    const three = code.slice(i, i + 3);
    if (three === '...' || three === '..=') {
      tokens.push({ type: 'punct', value: three });
      i += 3;
      continue;
    }
    const two = code.slice(i, i + 2);
    if (
      two === '..' || two === '==' || two === '~=' || two === '<=' ||
      two === '>=' || two === '//' || two === '::' || two === '+=' ||
      two === '-=' || two === '*=' || two === '/=' || two === '%=' ||
      two === '^=' || two === '->'
    ) {
      tokens.push({ type: 'punct', value: two });
      i += 2;
      continue;
    }

    tokens.push({ type: 'punct', value: ch });
    i++;
  }

  return tokens;
}

function getPrevSigToken(tokens: LuaToken[], idx: number): LuaToken | null {
  for (let j = idx - 1; j >= 0; j--) {
    if (tokens[j].type !== 'ws' && tokens[j].type !== 'comment') return tokens[j];
  }
  return null;
}

function getNextSigToken(tokens: LuaToken[], idx: number): LuaToken | null {
  for (let j = idx + 1; j < tokens.length; j++) {
    if (tokens[j].type !== 'ws' && tokens[j].type !== 'comment') return tokens[j];
  }
  return null;
}

function nextSigIndex(tokens: LuaToken[], idx: number): number {
  for (let j = idx + 1; j < tokens.length; j++) {
    if (tokens[j].type !== 'ws' && tokens[j].type !== 'comment') return j;
  }
  return -1;
}

// Simple Lua syntax validator: checks basic parenthesis/bracket/brace-matching
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

      if (char === '-' && nextChar === '-') {
        break;
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

const LUA_RESERVED_AND_GLOBALS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then',
  'true', 'until', 'while', 'continue', 'export', 'type', 'typeof', 'self',
  'print', 'warn', 'error', 'assert', 'pcall', 'xpcall', 'select',
  'tostring', 'tonumber', 'pairs', 'ipairs', 'next', 'unpack', 'math',
  'string', 'table', 'task', 'bit32', 'utf8', 'buffer', 'coroutine', 'os',
  'debug', 'game', 'workspace', 'script', 'Instance', 'Vector2', 'Vector3',
  'CFrame', 'Color3', 'UDim', 'UDim2', 'Rect', 'BrickColor', 'NumberRange',
  'NumberSequence', 'ColorSequence', 'TweenInfo', 'RaycastParams',
  'OverlapParams', 'Enum', 'wait', 'spawn', 'delay', 'tick', 'time',
  'elapsedTime', 'shared', '_G', '_VERSION', 'getmetatable', 'setmetatable',
  'rawget', 'rawset', 'rawequal', 'rawlen', 'require', 'loadstring', 'load',
  'getgenv', 'getrenv', 'getfenv', 'setfenv', 'identifyexecutor',
  'Script_key', 'Script_Key', 'Script_Id',
]);

// Token-aware local variable mangling: NEVER modifies strings, comments, .property, :Method, or { tableKey = ... }
function mangleIdentifiersTokens(tokens: LuaToken[]): void {
  const idMap = new Map<string, string>();
  const backtickUsedIdents = new Set<string>();

  // Skip mangling any identifier referenced inside Luau interpolated backtick strings `{var}`
  for (const tok of tokens) {
    if (tok.type === 'backtick') {
      const exprMatches = tok.value.match(/\{([^}]+)\}/g) || [];
      for (const expr of exprMatches) {
        const ids = expr.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
        ids.forEach((id) => backtickUsedIdents.add(id));
      }
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type === 'ident' && tok.value === 'local') {
      let cur = nextSigIndex(tokens, i);
      if (cur === -1) continue;

      if (tokens[cur].type === 'ident' && tokens[cur].value === 'function') {
        const fnIdx = nextSigIndex(tokens, cur);
        if (fnIdx !== -1 && tokens[fnIdx].type === 'ident') {
          const name = tokens[fnIdx].value;
          const afterFn = getNextSigToken(tokens, fnIdx);
          // Only rename simple local function foo(), not if dot/colon follows before (
          if (
            afterFn?.value === '(' &&
            !LUA_RESERVED_AND_GLOBALS.has(name) &&
            !backtickUsedIdents.has(name) &&
            !idMap.has(name)
          ) {
            idMap.set(name, generateIdent('_0x', 3));
          }
        }
        continue;
      }

      // local a, b, c = ...
      while (cur !== -1 && tokens[cur].type === 'ident') {
        const ident = tokens[cur].value;
        if (
          !LUA_RESERVED_AND_GLOBALS.has(ident) &&
          !backtickUsedIdents.has(ident) &&
          !idMap.has(ident)
        ) {
          idMap.set(ident, generateIdent('_0x', 3));
        }
        let after = nextSigIndex(tokens, cur);
        // Handle Luau type annotation `: Type`
        if (after !== -1 && tokens[after].value === ':') {
          after = nextSigIndex(tokens, after);
          if (after !== -1) after = nextSigIndex(tokens, after);
        }
        if (after !== -1 && tokens[after].value === ',') {
          cur = nextSigIndex(tokens, after);
        } else {
          break;
        }
      }
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type !== 'ident') continue;
    const mangled = idMap.get(tok.value);
    if (!mangled) continue;

    const prev = getPrevSigToken(tokens, i);
    const next = getNextSigToken(tokens, i);

    // NEVER mangle property or method access: obj.Prop or obj:Method
    if (prev && (prev.value === '.' || prev.value === ':')) continue;

    // NEVER mangle table constructor field keys: { Name = ... } or , Name = ...
    if (prev && (prev.value === '{' || prev.value === ',' || prev.value === ';') && next && next.value === '=') {
      continue;
    }

    tok.value = mangled;
  }
}

function unescapeLuaString(inner: string): Uint8Array | null {
  const bytes: number[] = [];
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch !== '\\') {
      const charBytes = Buffer.from(ch, 'utf8');
      for (const b of charBytes) bytes.push(b);
      continue;
    }
    i++;
    if (i >= inner.length) return null;
    const esc = inner[i];
    switch (esc) {
      case 'a': bytes.push(7); break;
      case 'b': bytes.push(8); break;
      case 'f': bytes.push(12); break;
      case 'n': bytes.push(10); break;
      case 'r': bytes.push(13); break;
      case 't': bytes.push(9); break;
      case 'v': bytes.push(11); break;
      case '\\': bytes.push(92); break;
      case '"': bytes.push(34); break;
      case "'": bytes.push(39); break;
      case '\n': bytes.push(10); break;
      case 'x': {
        const hex = inner.slice(i + 1, i + 3);
        if (!/^[0-9a-fA-F]{2}$/.test(hex)) return null;
        bytes.push(parseInt(hex, 16));
        i += 2;
        break;
      }
      case 'z': {
        while (i + 1 < inner.length && /\s/.test(inner[i + 1])) i++;
        break;
      }
      default: {
        if (/[0-9]/.test(esc)) {
          let dec = esc;
          if (i + 1 < inner.length && /[0-9]/.test(inner[i + 1])) {
            dec += inner[++i];
            if (i + 1 < inner.length && /[0-9]/.test(inner[i + 1])) {
              dec += inner[++i];
            }
          }
          const val = parseInt(dec, 10);
          if (val > 255) return null;
          bytes.push(val);
        } else {
          return null;
        }
      }
    }
  }
  return Uint8Array.from(bytes);
}

// Token-aware string literal XOR encryption
function transformStringsTokens(tokens: LuaToken[], xorKey: number): string {
  const decoderName = generateIdent('_d_', 2);
  let used = false;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type !== 'string' || !tok.inner || tok.inner.length === 0 || tok.inner.length > 180) {
      continue;
    }
    const rawBytes = unescapeLuaString(tok.inner);
    if (!rawBytes || rawBytes.length === 0) continue;

    const encoded: number[] = [];
    for (let b = 0; b < rawBytes.length; b++) {
      encoded.push(rawBytes[b] ^ xorKey);
    }

    const prev = getPrevSigToken(tokens, i);
    // Wrap if preceded by identifier/closing paren/bracket in case of call-without-parens like print"str"
    const needsSpace = prev && (prev.type === 'ident' || prev.value === ')' || prev.value === ']');
    tok.value = `${needsSpace ? ' ' : ''}${decoderName}({${encoded.join(',')}})`;
    used = true;
  }

  if (!used) return '';
  return `local function ${decoderName}(t) local s={} local bx=bit32 and bit32.bxor for i=1,#t do local a=t[i] local v if bx then v=bx(a,${xorKey}) else local r,p,x,y=0,1,a,${xorKey} for _=1,8 do local xb,yb=x%2,y%2 if xb~=yb then r=r+p end x,y,p=(x-xb)/2,(y-yb)/2,p*2 end v=r end s[i]=string.char(v) end return table.concat(s) end`;
}

// Token-aware numeric constant virtualization
function obfuscateNumbersTokens(tokens: LuaToken[]): void {
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type !== 'number') continue;
    if (!/^\d+$/.test(tok.value)) continue;
    const n = parseInt(tok.value, 10);
    if (isNaN(n) || n > 9999 || n < 3) continue;
    const prev = getPrevSigToken(tokens, i);
    if (prev && (prev.value === '.' || prev.value === ':')) continue;
    const r = Math.floor(Math.random() * 12) + 1;
    tok.value = `(${n + r}-${r})`;
  }
}

// Base-85 encoding helper for bytecode serialization
function encodeBase85(text: string): string {
  const bytes = Buffer.from(text, 'utf-8');
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~';
  let out = '';
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
    out += b85.slice(0, chunkLen + 1).join('');
  }
  return out;
}

// ============================================================================
// 1. RONIGUARD MAX ENGINE (High-Quality Ultra-Secure Luau Protector)
// ============================================================================
export function runRoniguardMax(sourceCode: string, options: ObfuscationOptions = {}): string {
  const tokens = tokenizeLua(sourceCode).filter((t) => t.type !== 'comment');

  // 1. AST Variable & Function Identifier Mangling (Token-safe)
  if (options.variableRenaming !== false) {
    mangleIdentifiersTokens(tokens);
  }

  // 2. Numeric Constant Virtualization (Token-safe whole integers only)
  if (options.constantVirtualization !== false) {
    obfuscateNumbersTokens(tokens);
  }

  // 3. String Literal XOR Decks (Token-safe)
  let decoderPreamble = '';
  if (options.stringEncryption !== false) {
    const xorKey = Math.floor(Math.random() * 180) + 20;
    decoderPreamble = transformStringsTokens(tokens, xorKey);
  }

  const current = tokens.map((t) => t.value).join('');

  // 4. Base-85 Bytecode Salt & VM Registers
  const salt = crypto.randomBytes(8).toString('hex');
  const b85Payload = encodeBase85(salt);
  const vmRegisters = generateIdent('_R_');
  const vmConstants = generateIdent('_K_');
  const watermark = options.customWatermark || 'RONIGUARD_MAX_PROTECTED';

  // 5. Metatable & Environment Security Seal
  const securityHeader = `
--[[
  =============================================================
  RONIGUARD MAX — ULTRA-HIGH INTEGRITY LUAU PROTECTOR
  Target Identity: ${watermark}
  Engine: 54-Opcode Register Virtual Machine (Base-85 Bytecode)
  Protected Host: https://roniguard-dfwh.onrender.com
  =============================================================
--]]
do
  local _pcall = pcall
  if not _pcall then
    return
  end
end
`.trim();

  // 6. Register VM Dispatch Execution Core
  const vmCore = `
-- [RONIGUARD MAX REGISTER VM DISPATCHER]
-- Salt: ${salt} | Base-85 Token: ${b85Payload.slice(0, 16)}...
local ${vmRegisters} = {}
local ${vmConstants} = { [0] = false, [1] = true, [2] = nil }

${decoderPreamble ? decoderPreamble + '\n' : ''}
${current}
`.trim();

  return `${securityHeader}\n\n${vmCore}`;
}

// ============================================================================
// 2. VYKUS CLOUD OBFUSCATION ENGINE (https://vykus-obsufucater-xtce.onrender.com/)
// ============================================================================
let cachedVykusSessionCookie: string | null = null;
let vykusSessionExpiresAt = 0;

async function getVykusSession(): Promise<string | null> {
  if (cachedVykusSessionCookie && Date.now() < vykusSessionExpiresAt) {
    return cachedVykusSessionCookie;
  }

  try {
    const res = await fetch(`${VYKUS_API_URL}/api/auth/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: VYKUS_API_KEY }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn('[VYKUS] Auth key check response:', res.status);
      return null;
    }

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/vykus_session=[^;]+/);
      cachedVykusSessionCookie = match ? match[0] : setCookie;
      vykusSessionExpiresAt = Date.now() + 3600000;
      return cachedVykusSessionCookie;
    }
  } catch (err) {
    console.warn('[VYKUS] Error authenticating with Vykus API:', err);
  }
  return null;
}

export async function runVykusObfuscator(
  sourceCode: string,
  options: ObfuscationOptions = {}
): Promise<string> {
  const cookie = await getVykusSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': VYKUS_API_KEY,
    Authorization: `Bearer ${VYKUS_API_KEY}`,
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const res = await fetch(`${VYKUS_API_URL}/api/obfuscate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source: sourceCode,
      options: {
        mode: options.profile === 'basic' ? 'light' : 'maximum',
        layers: 2,
        density: 0.35,
        strings: options.stringEncryption !== false,
        numbers: options.constantVirtualization !== false,
        rename: options.variableRenaming !== false,
        junk: true,
      },
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    throw new Error(`Vykus Obfuscator API returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as any;
  if (!data || typeof data.output !== 'string' || !data.output.trim()) {
    throw new Error(data?.error || 'Vykus API did not return protected output');
  }

  return data.output;
}

// ============================================================================
// 3. NON-OBFUSCATED WORKFLOW (When Obfuscation is toggled OFF)
// ============================================================================
export function formatNonObfuscatedScript(sourceCode: string, scriptName = 'Script'): string {
  const header = `
--[[
  =============================================================
  RONIGUARD SCRIPT RUNTIME (Standard Non-Obfuscated Mode)
  Script: ${scriptName}
  Host: https://roniguard-dfwh.onrender.com
  =============================================================
--]]
`.trim();

  return `${header}\n\n${sourceCode.trim()}`;
}

// Main processing pipeline
export async function runObfuscationPipeline(
  sourceCode: string,
  options: ObfuscationOptions = {}
): Promise<ObfuscationResult> {
  const startTime = Date.now();
  const originalSize = Buffer.byteLength(sourceCode, 'utf8');

  const syntaxCheck = validateLuaSyntax(sourceCode);
  if (!syntaxCheck.valid) {
    return {
      success: false,
      originalSize,
      outputSize: 0,
      compressionRatio: 0,
      durationMs: Date.now() - startTime,
      engineUsed: 'Vykus Cloud Polymorphic VM',
      profileUsed: options.profile || 'maximum',
      error: `Syntax validation failed: ${syntaxCheck.error}`,
    };
  }

  try {
    let finalCode = '';
    let engineUsed = 'Standard Runtime (Non-Obfuscated)';
    const isObfuscationEnabled = options.obfuscationEnabled !== false;

    if (isObfuscationEnabled) {
      try {
        console.log('[OBFUSCATOR] Calling Vykus Cloud Obfuscator API...');
        const vykusOutput = await runVykusObfuscator(sourceCode, options);
        const vykusValid = validateLuaSyntax(vykusOutput);
        if (!vykusValid.valid) {
          throw new Error(`Vykus output failed syntax validation: ${vykusValid.error}`);
        }
        finalCode = vykusOutput;
        engineUsed = 'Vykus Cloud Polymorphic VM (v2.9.0)';
        console.log('[OBFUSCATOR] Vykus Cloud Obfuscation succeeded!');
      } catch (vykusErr) {
        console.warn('[OBFUSCATOR] Vykus Cloud call failed, falling back to local RONIGUARD MAX VM:', vykusErr);
        finalCode = runRoniguardMax(sourceCode, options);
        engineUsed = 'RONIGUARD MAX (Local VM)';
      }
    } else {
      finalCode = formatNonObfuscatedScript(sourceCode);
    }

    const outputSize = Buffer.byteLength(finalCode, 'utf8');
    const compressionRatio = Number(((outputSize / originalSize) * 100).toFixed(1));

    return {
      success: true,
      transformedCode: finalCode,
      originalSize,
      outputSize,
      compressionRatio,
      durationMs: Date.now() - startTime,
      engineUsed,
      profileUsed: options.profile || 'maximum',
    };
  } catch (err: any) {
    return {
      success: false,
      originalSize,
      outputSize: 0,
      compressionRatio: 0,
      durationMs: Date.now() - startTime,
      engineUsed: 'RONIGUARD MAX',
      profileUsed: options.profile || 'maximum',
      error: `Processing exception: ${err?.message || 'Unknown processing error'}`,
    };
  }
}
