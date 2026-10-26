import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Lock,
  PlayCircle,
  Key,
  Flame,
  Layers,
  Cpu,
} from 'lucide-react';
import { api, getStoredToken } from '../api.ts';

interface SentinelLoadstringCardProps {
  scriptId: string;
  filename: string;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const SentinelLoadstringCard: React.FC<SentinelLoadstringCardProps> = ({
  scriptId,
  filename,
  onShowToast,
}) => {
  const [copiedLoadstring, setCopiedLoadstring] = useState(false);
  const [copiedRawUrl, setCopiedRawUrl] = useState(false);
  const [copiedKeyUrl, setCopiedKeyUrl] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    status: number;
    authorized: boolean;
    engine?: string;
    securityWalls?: string[];
    message: string;
    codeSnippet?: string;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const token = getStoredToken() || '';

  const publicRawUrl = `${origin}/api/loader/raw/${scriptId}`;
  const loadstringCode = `loadstring(game:HttpGet("${publicRawUrl}"))()`;
  const executorCodeWithKey = `loadstring(game:HttpGet("${publicRawUrl}?key=YOUR_LICENSE_KEY"))()`;

  const copyToClipboard = (text: string, type: 'loadstring' | 'raw' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'loadstring') {
      setCopiedLoadstring(true);
      setTimeout(() => setCopiedLoadstring(false), 2000);
      onShowToast('success', 'Loadstring Copied', 'Paste into Roblox script executor (Synapse, Wave, Delta, etc.).');
    } else if (type === 'raw') {
      setCopiedRawUrl(true);
      setTimeout(() => setCopiedRawUrl(false), 2000);
      onShowToast('info', 'Public URL Copied', 'Protected by Vykus VM & Security Walls.');
    } else {
      setCopiedKeyUrl(true);
      setTimeout(() => setCopiedKeyUrl(false), 2000);
      onShowToast('info', 'Key-Locked Loadstring Copied', 'Requires active license key.');
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const res = await api.simulateLoaderCheck(scriptId, true);
      setSimulationResult(res);
      onShowToast('success', 'Verification Success', 'Vykus VM bytecode & security walls active.');
    } catch (err: any) {
      onShowToast('error', 'Simulation Failed', err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#120724] to-[#0a0416] border border-purple-800/40 p-5 shadow-xl space-y-4 relative overflow-hidden">
      {/* Top Ambient Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md shadow-purple-950">
            <Lock className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                RONIGUARD × Vykus VM Loadstring
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                VM PROTECTED
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Target Script: <span className="text-white font-mono font-medium">{filename}</span> ({scriptId})
            </p>
          </div>
        </div>

        {/* Vykus Engine Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs self-start sm:self-auto">
          <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="block font-bold text-cyan-300">Vykus VM v2.5.1</span>
            <span className="text-neutral-300">Security Walls &amp; Anti-Tamper Active</span>
          </div>
        </div>
      </div>

      {/* Notice Callout */}
      <div className="p-3.5 rounded-xl bg-[#090414] border border-purple-900/40 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-300 leading-relaxed">
          <span className="font-semibold text-white">Polymorphic VM Protection Active:</span> This script is obfuscated with the <span className="text-cyan-300 font-bold">Vykus VM engine</span> and sealed with RONIGUARD anti-tamper security walls (anti-debug probes, metatable sealing, memory integrity). Run directly in Roblox executors via loadstring.
        </div>
      </div>

      {/* Main Loadstring Code Box */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
            Roblox Executor Loadstring
          </span>
          <button
            onClick={() => copyToClipboard(loadstringCode, 'loadstring')}
            className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
          >
            {copiedLoadstring ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Loadstring</span>
              </>
            )}
          </button>
        </div>

        <div className="relative group">
          <pre className="p-3.5 rounded-xl bg-[#06020e] border border-purple-900/40 text-purple-200 font-mono text-xs overflow-x-auto select-all">
            {loadstringCode}
          </pre>
        </div>
      </div>

      {/* Action Buttons: Test Live Behavior */}
      <div className="pt-2 border-t border-purple-900/25 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Button 1: Test VM Execution */}
        <button
          onClick={handleSimulate}
          disabled={isSimulating}
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-900/40 border border-purple-600/40 hover:bg-purple-900/60 text-purple-200 text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          <PlayCircle className="w-4 h-4 text-emerald-400" />
          <span>{isSimulating ? 'Verifying VM Payload...' : 'Test Loadstring Delivery'}</span>
        </button>

        {/* Button 2: Direct browser click */}
        <a
          href={publicRawUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#080410] border border-purple-900/40 hover:border-purple-600/50 text-neutral-300 hover:text-white text-xs font-semibold transition-all text-center"
          title="Opens public raw link in new tab to test executor delivery"
        >
          <ExternalLink className="w-4 h-4 text-neutral-400" />
          <span>Open Script Portal in New Tab</span>
        </a>
      </div>

      {/* Live Simulation Result */}
      {simulationResult && (
        <div className="p-4 rounded-xl border bg-emerald-950/20 border-emerald-900/40 text-emerald-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-xs">
                HTTP {simulationResult.status} — VYKUS VM DELIVERED
              </span>
            </div>
            <span className="font-mono text-[10px] text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              Vykus VM v2.5.1
            </span>
          </div>

          <p className="text-xs opacity-90">{simulationResult.message}</p>

          {simulationResult.codeSnippet && (
            <div>
              <span className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">
                Protected VM Bytecode Sample:
              </span>
              <pre className="p-2.5 rounded-lg bg-[#05020a] border border-emerald-900/30 text-[11px] font-mono text-emerald-300 max-h-32 overflow-x-auto">
                {simulationResult.codeSnippet}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Advanced Key-Locked Distribution Tab */}
      <div className="pt-2 border-t border-purple-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-400">
        <div className="flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-purple-400" />
          <span>Distribute with License Key:</span>
          <code className="text-purple-300 font-mono bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-900/30">
            ?key=RONI-XXXX
          </code>
        </div>

        <button
          onClick={() => copyToClipboard(executorCodeWithKey, 'key')}
          className="text-neutral-400 hover:text-white font-medium flex items-center gap-1 transition-colors self-start sm:self-auto cursor-pointer"
        >
          {copiedKeyUrl ? (
            <span className="text-emerald-400">Copied Key Template</span>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Key Loadstring</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
