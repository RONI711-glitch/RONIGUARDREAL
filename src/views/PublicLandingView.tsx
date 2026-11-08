import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Cpu,
  Bot,
  Zap,
  Code2,
  ExternalLink,
  ChevronRight,
  Radio,
  Copy,
  Check,
  ShieldAlert,
  Server,
  Layers,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { WASMER_APP_URL } from '../api.ts';

interface PublicLandingViewProps {
  onSignInClick: () => void;
  botConnected?: boolean;
}

export const PublicLandingView: React.FC<PublicLandingViewProps> = ({
  onSignInClick,
  botConnected = true,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'status'>('overview');

  const demoSnippet = `-- [RONIGUARD UNIVERSAL LOADER]
Script_key = "RONI-MASTER-KEY-DEMO"
loadstring(game:HttpGet("${WASMER_APP_URL}/loader.lua?script=scr_demo"))()`;

  const copyDemoCode = () => {
    navigator.clipboard.writeText(demoSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const botInviteUrl =
    'https://discord.com/oauth2/authorize?client_id=1549804529778692237&permissions=8&scope=bot%20applications.commands';

  return (
    <div className="min-h-screen bg-[#07040d] text-white flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Top Ambient Glow Effect */}
      <div className="fixed top-0 inset-x-0 h-96 bg-gradient-to-b from-purple-900/25 via-indigo-950/15 to-transparent pointer-events-none blur-3xl z-0" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#07040d]/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-700 to-purple-900 p-[1px] shadow-lg shadow-purple-950/50 flex items-center justify-center">
            <div className="w-full h-full bg-[#0a0518] rounded-[11px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-wider text-white">
              RONI<span className="text-purple-400">GUARD</span>
            </span>
            <span className="text-[9px] font-mono text-purple-300/80 tracking-widest font-semibold uppercase">
              ANTI-TAMPER & LICENSING
            </span>
          </div>
        </div>

        {/* Status pill & Sign In Button */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-[11px] text-emerald-300 font-medium shadow-sm">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Bot 24/7 Online</span>
          </div>

          <button
            onClick={onSignInClick}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-950/60 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Sign In with Discord</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 relative z-10 max-w-6xl mx-auto px-5 py-12 sm:py-20 w-full space-y-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-xs text-purple-200 font-semibold shadow-md shadow-purple-950">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Next-Gen Luau Bytecode Protection & HWID Licensing</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] drop-shadow-sm">
            Monetize & Defend Your <br />
            <span className="bg-gradient-to-r from-purple-300 via-purple-400 to-indigo-300 bg-clip-text text-transparent">
              Lua & Roblox Scripts
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-2xl mx-auto">
            RoniGuard provides military-grade polymorphic VM obfuscation, hardware-locked (HWID) licensing, automated 24/7 Discord bot integration, and an anti-leak browser shield for Roblox developers.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onSignInClick}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-950 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <span>Get Started with Dashboard</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <a
              href={botInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Invite Discord Bot (@RONIGUARD)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>

        {/* Live Status Overview Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#140b29]/80 via-[#0e071e]/90 to-[#120926]/80 border border-white/10 backdrop-blur-xl shadow-xl">
          <div className="p-3 text-center sm:text-left">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Discord Gateway</span>
            <div className="text-sm font-extrabold text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>24/7 Connected</span>
            </div>
          </div>
          <div className="p-3 text-center sm:text-left">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Anti-Leak Shield</span>
            <div className="text-sm font-extrabold text-purple-300 flex items-center justify-center sm:justify-start gap-1.5 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Active (403 Block)</span>
            </div>
          </div>
          <div className="p-3 text-center sm:text-left">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">VM Obfuscation</span>
            <div className="text-sm font-extrabold text-white flex items-center justify-center sm:justify-start gap-1.5 mt-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Vykus Polymorphic</span>
            </div>
          </div>
          <div className="p-3 text-center sm:text-left">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Master Licensing</span>
            <div className="text-sm font-extrabold text-emerald-300 flex items-center justify-center sm:justify-start gap-1.5 mt-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Account-Level Unified</span>
            </div>
          </div>
        </div>

        {/* Interactive Loadstring Code Block */}
        <div className="rounded-2xl p-6 bg-gradient-to-b from-[#130a27] to-[#0a0515] border border-purple-500/25 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Universal Roblox Execution Format</h3>
                <p className="text-[11px] text-neutral-400">Execute verified scripts dynamically via loadstring and your master account key</p>
              </div>
            </div>

            <button
              onClick={copyDemoCode}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-900/40 cursor-pointer self-start sm:self-auto"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Loadstring'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-[#06030c] border border-white/5 font-mono text-xs text-purple-200 overflow-x-auto whitespace-pre leading-relaxed select-all">
{demoSnippet}
          </pre>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#140b28]/70 to-[#0a0417]/80 border border-white/10 hover:border-purple-500/40 transition-all shadow-lg space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Polymorphic VM Obfuscation</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Virtualizes raw Luau AST into dynamic register-based instructions with control-flow flattening and XOR string encryption to thwart decompilers.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#140b28]/70 to-[#0a0417]/80 border border-white/10 hover:border-purple-500/40 transition-all shadow-lg space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Hardware-Locked HWID Security</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Enforce cryptographic device fingerprinting to prevent script leaking and unauthorized sharing across unauthorized players.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#140b28]/70 to-[#0a0417]/80 border border-white/10 hover:border-purple-500/40 transition-all shadow-lg space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Anti-Leak Browser Shield</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Direct web browser visits to script loaders are automatically intercepted with HTTP 403 "ACCESS UNAUTHORIZED", protecting your intellectual property.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#140b28]/70 to-[#0a0417]/80 border border-white/10 hover:border-purple-500/40 transition-all shadow-lg space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">24/7 Discord Bot Integration</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Built-in Discord bot (@RONIGUARD#9989) with real-time slash commands (`/getkey`, `/whitelist`, `/redeem`, `/reset`, `/status`) for seamless server management.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#140b28]/70 to-[#0a0417]/80 border border-white/10 hover:border-purple-500/40 transition-all shadow-lg space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Centralized Account Master Keys</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              One master API key for your entire account authorizes all your scripts without messy per-script key clutter, resettable directly from your profile.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#140b28]/70 to-[#0a0417]/80 border border-white/10 hover:border-purple-500/40 transition-all shadow-lg space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-rose-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Multi-Tenant Vault Isolation</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every developer account has its own isolated tenant vault. Your panels, scripts, and logs are completely private and never accessible to others.
            </p>
          </div>
        </div>

        {/* Ready to start CTA Banner */}
        <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-r from-purple-950/90 via-indigo-950 to-purple-950/90 border border-purple-500/40 text-center space-y-4">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-purple-300 to-transparent" />
          <h2 className="text-2xl font-black text-white">Ready to Protect Your Scripts?</h2>
          <p className="text-xs text-purple-200/80 max-w-lg mx-auto">
            Log in instantly with your Discord account to create panels, obfuscate code, and generate Roblox loaders.
          </p>
          <div className="pt-2">
            <button
              onClick={onSignInClick}
              className="px-8 py-3 rounded-xl bg-white text-purple-950 hover:bg-neutral-100 font-extrabold text-xs shadow-xl transition-all cursor-pointer"
            >
              Sign In with Discord
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-6 text-center text-xs text-neutral-500">
        <p>© 2026 RONIGUARD Platform. All rights reserved. Built for Lua & Luau developers.</p>
      </footer>
    </div>
  );
};
