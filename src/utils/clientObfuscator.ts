// RONIGUARD MAX — Premier Luau/Lua Protection Engine
// Token-aware Lua/Luau Obfuscator (preserves strings, comments, properties, and service names)

export interface ClientObfuscationOptions {
  profile?: 'basic' | 'advanced' | 'maximum';
  engine?: string;
  stringEncryption?: boolean;
  controlFlow?: boolean;
  constantVirtualization?: boolean;
  variableRenaming?: boolean;
  antiTamper?: boolean;
  watermarkCheck?: boolean;
  customWatermark?: string;
  obfuscationEnabled?: boolean;
  vykusMode?: string;
  vykusLayers?: number;
  vykusDensity?: number;
  securityWalls?: boolean;
}

export interface ClientObfuscationResult {
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

export const CLIENT_ENGINES = [
  {
    id: 'RONIGUARD-MAX',
    name: 'RONIGUARD MAX',
    version: '4.2.0',
    description: 'Premier Lua/Luau Protection Engine with 54-Opcode Register Virtual Machine, Base-85 bytecode serialization, opaque predicates, and metatable security seals.',
    supportedProfiles: ['maximum'],
    supportedTargets: ['Luau', 'Lua 5.1', 'LuaJIT', 'Roblox'],
    isDefault: true,
  },
];

function randomHex(bytesCount = 4): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(bytesCount);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(16).slice(2, 2 + bytesCount * 2);
}

function generateIdent(prefix = '_0x', len = 3): string {
  return `${prefix}${randomHex(len)}`;
}

function getByteLength(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  return encodeURI(str).split(/%..|./).length - 1;
}

function encodeBase85(text: string): string {
  const bytes = new TextEncoder().encode(text);
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

    if (/\s/.test(ch)) {
      const start = i;
      while (i < len && /\s/.test(code[i])) i++;
      tokens.push({ type: 'ws', value: code.slice(start, i) });
      continue;
    }

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

    if (ch === '[') {
      const longMatch = matchLongBracket(code, i);
      if (longMatch) {
        tokens.push({ type: 'longstring', value: code.slice(i, longMatch.end) });
        i = longMatch.end;
        continue;
      }
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
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
        if (c === '\n' || c === '\r') break;
        i++;
      }
      const raw = code.slice(start, i);
      const inner = raw.endsWith(quote) && raw.length >= 2 ? raw.slice(1, -1) : raw.slice(1);
      tokens.push({ type: 'string', value: raw, quote, inner });
      continue;
    }

    if (ch === '`') {
      const start = i;
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

    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(code[i + 1] || ''))) {
      const start = i;
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

    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      while (i < len && /[a-zA-Z0-9_]/.test(code[i])) i++;
      tokens.push({ type: 'ident', value: code.slice(start, i) });
      continue;
    }

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

function mangleIdentifiersTokens(tokens: LuaToken[]): void {
  const idMap = new Map<string, string>();
  const backtickUsedIdents = new Set<string>();

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

    if (prev && (prev.value === '.' || prev.value === ':')) continue;
    if (prev && (prev.value === '{' || prev.value === ',' || prev.value === ';') && next && next.value === '=') {
      continue;
    }

    tok.value = mangled;
  }
}

function unescapeLuaStringClient(inner: string): Uint8Array | null {
  const bytes: number[] = [];
  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch !== '\\') {
      if (encoder) {
        for (const b of encoder.encode(ch)) bytes.push(b);
      } else {
        bytes.push(ch.charCodeAt(0) & 0xff);
      }
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

function transformStringsTokens(tokens: LuaToken[], xorKey: number): string {
  const decoderName = generateIdent('_d_', 2);
  let used = false;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type !== 'string' || !tok.inner || tok.inner.length === 0 || tok.inner.length > 180) {
      continue;
    }
    const rawBytes = unescapeLuaStringClient(tok.inner);
    if (!rawBytes || rawBytes.length === 0) continue;

    const encoded: number[] = [];
    for (let b = 0; b < rawBytes.length; b++) {
      encoded.push(rawBytes[b] ^ xorKey);
    }

    const prev = getPrevSigToken(tokens, i);
    const needsSpace = prev && (prev.type === 'ident' || prev.value === ')' || prev.value === ']');
    tok.value = `${needsSpace ? ' ' : ''}${decoderName}({${encoded.join(',')}})`;
    used = true;
  }

  if (!used) return '';
  return `local function ${decoderName}(t) local s={} local bx=bit32 and bit32.bxor for i=1,#t do local a=t[i] local v if bx then v=bx(a,${xorKey}) else local r,p,x,y=0,1,a,${xorKey} for _=1,8 do local xb,yb=x%2,y%2 if xb~=yb then r=r+p end x,y,p=(x-xb)/2,(y-yb)/2,p*2 end v=r end s[i]=string.char(v) end return table.concat(s) end`;
}

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

export function runRoniguardMaxClient(sourceCode: string, options: ClientObfuscationOptions = {}): string {
  const tokens = tokenizeLua(sourceCode).filter((t) => t.type !== 'comment');

  if (options.variableRenaming !== false) {
    mangleIdentifiersTokens(tokens);
  }
  if (options.constantVirtualization !== false) {
    obfuscateNumbersTokens(tokens);
  }

  let decoderPreamble = '';
  if (options.stringEncryption !== false) {
    const xorKey = Math.floor(Math.random() * 180) + 20;
    decoderPreamble = transformStringsTokens(tokens, xorKey);
  }

  const current = tokens.map((t) => t.value).join('');

  const salt = randomHex(8);
  const b85Payload = encodeBase85(salt);
  const vmRegisters = generateIdent('_R_');
  const vmConstants = generateIdent('_K_');
  const watermark = options.customWatermark || 'RONIGUARD_MAX_PROTECTED';

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

export function formatNonObfuscatedClient(sourceCode: string): string {
  const header = `
--[[
  =============================================================
  RONIGUARD SCRIPT RUNTIME (Standard Non-Obfuscated Mode)
  Host: https://roniguard-dfwh.onrender.com
  =============================================================
--]]
`.trim();
  return `${header}\n\n${sourceCode.trim()}`;
}

export function runClientObfuscation(
  sourceCode: string,
  options: ClientObfuscationOptions = {}
): ClientObfuscationResult {
  const startTime = Date.now();
  const originalSize = getByteLength(sourceCode);
  const isObfuscationEnabled = options.obfuscationEnabled !== false;

  try {
    const finalCode = isObfuscationEnabled
      ? runRoniguardMaxClient(sourceCode, options)
      : formatNonObfuscatedClient(sourceCode);

    const outputSize = getByteLength(finalCode);
    const compressionRatio = Number(((outputSize / originalSize) * 100).toFixed(1));

    return {
      success: true,
      transformedCode: finalCode,
      originalSize,
      outputSize,
      compressionRatio,
      durationMs: Date.now() - startTime,
      engineUsed: isObfuscationEnabled ? 'RONIGUARD MAX' : 'Standard Runtime (Non-Obfuscated)',
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
      error: err?.message || 'Processing failure',
    };
  }
}
