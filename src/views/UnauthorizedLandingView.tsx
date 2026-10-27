import React from 'react';
import { ShieldAlert, ExternalLink, Terminal, AlertOctagon } from 'lucide-react';
import { WASMER_APP_URL } from '../api.ts';

export const UnauthorizedLandingView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070308] text-neutral-200 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-red-500/30 selection:text-white">
      {/* Red/Amber ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Security Card */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0f050a]/95 border-2 border-red-500/80 p-8 sm:p-10 text-center shadow-[0_0_70px_rgba(239,68,68,0.3)] backdrop-blur-xl space-y-6">
        {/* Top security badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-bold tracking-wider uppercase">
          <AlertOctagon className="w-4 h-4 text-red-400 animate-pulse" />
          <span>🛑 SECURITY SENTINEL 🛑</span>
        </div>

        {/* Big Warning Header */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-red-500 tracking-tight drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            🛑 UNAUTHORIZED ACCESS 🛑
          </h1>
          <p className="text-lg font-bold text-white tracking-normal">
            Content is not visible here.
          </p>
        </div>

        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
          Direct browser access to raw executor loadstrings is strictly prohibited to protect proprietary Lua code. This endpoint is reserved exclusively for authenticated Roblox executors.
        </p>

        {/* Highlighted Real URL Box */}
        <div className="rounded-2xl bg-black/80 border border-dashed border-red-500/40 p-4 text-left space-y-1.5">
          <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">
            Official Real Page:
          </span>
          <a
            href={WASMER_APP_URL}
            className="text-sm sm:text-base font-mono font-bold text-cyan-400 hover:text-cyan-300 break-all underline flex items-center gap-1.5 transition-colors"
          >
            <span>{WASMER_APP_URL}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>

        {/* Big Action Button */}
        <a
          href={WASMER_APP_URL}
          className="flex items-center justify-center gap-2.5 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm sm:text-base shadow-[0_4px_25px_rgba(239,68,68,0.45)] hover:shadow-[0_6px_30px_rgba(239,68,68,0.6)] hover:-translate-y-0.5 transition-all duration-200"
        >
          <span>👉 Visit Real Page: {WASMER_APP_URL}</span>
        </a>

        {/* Executor Command Footer */}
        <div className="pt-4 border-t border-red-950/50 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-400">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Roblox Execution Instructions</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/90 border border-neutral-800 text-[11px] font-mono text-yellow-300 break-all select-all text-left">
            loadstring(game:HttpGet("{WASMER_APP_URL}/loader.lua"))()
          </div>
        </div>
      </div>
    </div>
  );
};
