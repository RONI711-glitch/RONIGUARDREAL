import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, Snowflake } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { SnowfallOverlay } from '../components/SnowfallOverlay.tsx';

export const UnauthorizedLandingView: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#06030c] text-slate-100 flex flex-col items-center justify-center p-5 relative overflow-hidden selection:bg-purple-600 selection:text-white">
      {/* Ambient Midnight Violet Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[480px] bg-purple-800/20 rounded-full blur-[150px] animate-celestial-1" />
        <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[420px] bg-rose-900/10 rounded-full blur-[140px] animate-celestial-2" />
      </div>

      <SnowfallOverlay enabled={true} density={42} />

      <div className="relative z-10 w-full max-w-lg animate-fade-slide-up">
        <div className="frost-surface rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/60 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-10 h-px bg-gradient-to-r from-transparent via-slate-200/35 to-transparent" />

          {/* Header Bar */}
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo size="md" className="border-purple-300/25" />
              <div className="min-w-0">
                <div className="text-base font-black text-white tracking-tight font-display">
                  RONI<span className="text-purple-400">GUARD</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Snowflake className="w-3 h-3 text-purple-300 shrink-0" />
                  <span>Protected Vault Endpoint</span>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold tabular-nums shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>HTTP 403</span>
            </div>
          </div>

          {/* Primary Block Message */}
          <div className="space-y-2.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-rose-300 tracking-wide uppercase">
              <Lock className="w-3.5 h-3.5" />
              <span>Browser Access Blocked</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
              ACCESS UNAUTHORIZED
            </h1>
            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed">
              This private Lua/Luau resource cannot be opened directly in a web browser. Authorized
              license verification is required through the runtime client.
            </p>
          </div>

          {/* Footer Meta & Back CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
            <span className="text-[11px] text-slate-400 font-mono">
              Contents cannot be displayed in browser
            </span>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#090414] hover:bg-slate-200 text-xs font-extrabold smooth-transition whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to RONIGUARD</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
