import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Menu,
  LogOut,
  Radio,
  PlusCircle,
  ExternalLink,
  ChevronDown,
  User,
  Server,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  currentSectionTitle: string;
  botConnected: boolean;
  botUsername?: string;
  userLabel?: string;
  userRole?: 'user' | 'admin';
  discordId?: string;
  avatarUrl?: string | null;
  onToggleMobileNav: () => void;
  onLogout: () => void;
  onNavigateToAntiTamper?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSectionTitle,
  botConnected,
  botUsername,
  userLabel = 'Discord User',
  userRole = 'user',
  discordId = '1549804529778692237',
  avatarUrl,
  onToggleMobileNav,
  onLogout,
  onNavigateToAntiTamper,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const botInviteUrl =
    'https://discord.com/oauth2/authorize?client_id=1549804529778692237&permissions=8&scope=bot%20applications.commands';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 md:gap-6 px-4 md:px-7 py-3 bg-[#080412]/95 backdrop-blur-xl border-b border-purple-900/30 shadow-lg shadow-purple-950/20">
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
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-900 border border-purple-400/30 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
            <ShieldCheck className="w-4 h-4 text-purple-200" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-white leading-none">
              RONI<span className="text-purple-400">GUARD</span>
            </span>
            <span className="text-[9px] text-purple-400/80 font-mono tracking-wider font-semibold">ANTI-TAMPER v3.2</span>
          </div>
        </div>
      </div>

      {/* Zone 2: Navigation crumb & 24/7 Bot Live Status */}
      <div className="hidden lg:flex items-center gap-3 text-xs text-neutral-400 min-w-0">
        <span className="text-neutral-500 font-medium">Dashboard</span>
        <span aria-hidden="true" className="text-neutral-700">/</span>
        <span className="font-semibold text-purple-200 truncate">{currentSectionTitle}</span>
        <span aria-hidden="true" className="text-neutral-700">·</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/40 border border-purple-500/20 text-neutral-300">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-[11px] font-medium text-emerald-300">
            {botConnected ? (botUsername ? `@${botUsername}` : '@RONIGUARD#9989') : '@RONIGUARD#9989 24/7'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
      </div>

      {/* Zone 3: Actions + Top Account & Server Profile Widget */}
      <div className="flex items-center gap-2.5 md:gap-3.5 shrink-0">
        {/* ADD BOT TO SERVER BUTTON (Direct 1-Click Discord OAuth2) */}
        <a
          href={botInviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Add @RONIGUARD bot to your Discord server"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 border border-purple-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle className="w-3.5 h-3.5 text-purple-200" />
          <span className="font-bold">Add Bot to Server</span>
          <ExternalLink className="w-3 h-3 text-purple-300 opacity-80" />
        </a>

        {/* Quick Anti-Tamper Shield Shortcut Button */}
        {onNavigateToAntiTamper && (
          <button
            onClick={onNavigateToAntiTamper}
            title="Inspect Anti-Tamper Security & Integrity Status"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/30 text-purple-200 text-xs font-medium transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Anti-Tamper</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">ACTIVE</span>
          </button>
        )}

        {/* TOP PROFILE & SERVER WIDGET (No email displayed, quick access without switching views) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/25 transition-all text-left focus:outline-none focus:ring-1 focus:ring-purple-400"
            aria-expanded={profileDropdownOpen}
          >
            {/* Avatar Circle */}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xs shadow-inner overflow-hidden border border-purple-400/40">
              {(() => {
                let src = avatarUrl;
                if (src && !src.startsWith('http')) {
                  src = `https://cdn.discordapp.com/avatars/${discordId}/${src}.png?size=128`;
                }
                if (!src) {
                  const idx = /^\d+$/.test(discordId) ? Number((BigInt(discordId) >> 22n) % 6n) : 0;
                  src = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
                }
                return <img src={src} alt={userLabel} className="w-full h-full object-cover" onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://cdn.discordapp.com/embed/avatars/0.png`;
                }} />;
              })()}
            </div>

            {/* Profile Info & Server */}
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-tight truncate max-w-[110px]">
                  @{userLabel}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-600/30 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                  {userRole === 'admin' ? 'Admin' : 'Dev'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-purple-300/80">
                <Server className="w-2.5 h-2.5 text-purple-400" />
                <span className="truncate max-w-[100px]">Active Server</span>
              </div>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${profileDropdownOpen ? 'rotate-180 text-purple-300' : ''}`}
            />
          </button>

          {/* Quick Dropdown Card */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0c081e] border border-purple-800/40 shadow-2xl shadow-purple-950/70 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* Profile Card Header */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/20 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center text-white font-black text-sm shadow-md overflow-hidden">
                  {(() => {
                    let src = avatarUrl;
                    if (src && !src.startsWith('http')) {
                      src = `https://cdn.discordapp.com/avatars/${discordId}/${src}.png?size=256`;
                    }
                    if (!src) {
                      const idx = /^\d+$/.test(discordId) ? Number((BigInt(discordId) >> 22n) % 6n) : 0;
                      src = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
                    }
                    return <img src={src} alt={userLabel} className="w-full h-full object-cover rounded-xl" onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://cdn.discordapp.com/embed/avatars/0.png`;
                    }} />;
                  })()}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white truncate">@{userLabel}</span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-300 truncate">
                    ID: {discordId}
                  </span>
                  <div className="inline-block mt-0.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                      {userRole === 'admin' ? 'Administrator' : 'Developer'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Server Clearance Status */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-purple-950/60 mb-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Server className="w-3 h-3 text-purple-400" /> Server Clearance
                  </span>
                  <span className="text-emerald-400 font-semibold text-[11px]">Authorized</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" /> Bot Status
                  </span>
                  <span className="text-emerald-300 font-mono text-[11px]">24/7 ONLINE</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-400" /> Anti-Tamper
                  </span>
                  <span className="text-purple-300 font-mono text-[11px]">Automatic (HMAC)</span>
                </div>
              </div>

              {/* Actions in Dropdown */}
              <div className="space-y-1 pt-1 border-t border-purple-950/80">
                <a
                  href={botInviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-purple-200 hover:text-white hover:bg-purple-900/30 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <PlusCircle className="w-3.5 h-3.5 text-purple-400" /> Add to another server
                  </span>
                  <ExternalLink className="w-3 h-3 text-neutral-500" />
                </a>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-950/40 border border-rose-900/20 transition-all text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
