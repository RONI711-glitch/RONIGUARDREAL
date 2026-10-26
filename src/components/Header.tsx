import React from 'react';
import { ShieldCheck, Menu, LogOut, Radio } from 'lucide-react';

interface HeaderProps {
  currentSectionTitle: string;
  botConnected: boolean;
  botUsername?: string;
  ownerEmail: string;
  onToggleMobileNav: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSectionTitle,
  botConnected,
  botUsername,
  ownerEmail,
  onToggleMobileNav,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 md:gap-8 px-4 md:px-8 py-3.5 bg-[#090514]/90 backdrop-blur-md border-b border-purple-900/25">
      {/* Zone 1: Brand wordmark & Mobile trigger */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 -ml-1 text-neutral-300 hover:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5 text-purple-400" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-sm shadow-purple-500/20">
            <ShieldCheck className="w-4 h-4 text-purple-300" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-white whitespace-nowrap">
            RONI<span className="text-purple-400">GUARD</span>
          </span>
        </div>
      </div>

      {/* Zone 2: Contextual section breadcrumb & metadata */}
      <div className="hidden sm:flex items-center gap-3 text-xs text-neutral-400 min-w-0">
        <span className="text-neutral-500 font-medium">Console</span>
        <span aria-hidden="true" className="text-neutral-600">/</span>
        <span className="font-semibold text-neutral-200 truncate">{currentSectionTitle}</span>
        <span aria-hidden="true" className="text-neutral-600">·</span>
        <div className="flex items-center gap-1.5 text-neutral-300">
          <Radio className={`w-3.5 h-3.5 ${botConnected ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
          <span className="truncate">
            {botConnected ? (botUsername ? `@${botUsername}` : 'Bot Linked') : 'Bot Offline'}
          </span>
        </div>
      </div>

      {/* Zone 3: Primary action / Owner identity & Logout */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex flex-col items-end text-right">
          <span className="text-xs font-semibold text-white tracking-tight">{ownerEmail}</span>
          <span className="text-[11px] text-purple-400 font-medium">Sole Authenticated Owner</span>
        </div>

        <button
          onClick={onLogout}
          title="Sign out of owner vault"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-900/40 bg-purple-950/30 hover:bg-purple-900/40 text-neutral-300 hover:text-white text-xs font-medium transition-all"
        >
          <LogOut className="w-3.5 h-3.5 text-neutral-400" />
          <span className="hidden sm:inline">Lock Session</span>
        </button>
      </div>
    </header>
  );
};
