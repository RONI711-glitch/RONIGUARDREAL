import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Menu,
  LogOut,
  PlusCircle,
  ExternalLink,
  ChevronDown,
  Server,
  ShieldAlert,
  Snowflake,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';

interface HeaderProps {
  currentSectionTitle: string;
  botConnected: boolean;
  botUsername?: string;
  userLabel?: string;
  userRole?: 'user' | 'admin';
  discordId?: string;
  avatarUrl?: string | null;
  snowEnabled?: boolean;
  onToggleSnow?: () => void;
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
  snowEnabled = true,
  onToggleSnow,
  onToggleMobileNav,
  onLogout,
  onNavigateToAntiTamper,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const getAvatarSrc = (size: number) => {
    let src = avatarUrl;
    if (src && !src.startsWith('http')) {
      src = `https://cdn.discordapp.com/avatars/${discordId}/${src}.png?size=${size}`;
    }
    if (!src) {
      const idx = /^\d+$/.test(discordId) ? Number((BigInt(discordId) >> 22n) % 6n) : 0;
      src = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    }
    return src;
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 md:gap-6 px-4 md:px-7 py-3 bg-[#06030c]/90 backdrop-blur-xl border-b border-white/10">
      {/* Zone 1: Brand wordmark & Mobile trigger */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 -ml-1 text-slate-300 hover:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 smooth-transition cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5 text-purple-300" />
        </button>

        <div className="flex items-center gap-2.5">
          <BrandLogo size="xs" />
          <span className="text-base font-extrabold tracking-tight text-white leading-none whitespace-nowrap font-display">
            RONI<span className="text-purple-400">GUARD</span>
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation crumb & unboxed Bot Status */}
      <div className="hidden lg:flex items-center gap-2.5 text-xs text-slate-400 min-w-0">
        <span className="text-slate-500 font-medium whitespace-nowrap">Dashboard</span>
        <span aria-hidden="true" className="text-slate-700">/</span>
        <span className="font-semibold text-white truncate">{currentSectionTitle}</span>
        <span aria-hidden="true" className="text-slate-700">·</span>
        <span className="text-slate-300 font-medium whitespace-nowrap truncate">
          {botConnected
            ? botUsername
              ? `@${botUsername} · 24/7`
              : '@RONIGUARD · 24/7'
            : 'Bot Standby'}
        </span>
      </div>

      {/* Zone 3: Actions & Profile Widget */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {onToggleSnow && (
          <button
            type="button"
            onClick={onToggleSnow}
            title={snowEnabled ? 'Disable snowfall effect' : 'Enable snowfall effect'}
            aria-label="Toggle snowfall"
            className={`p-2 rounded-lg border smooth-transition cursor-pointer ${
              snowEnabled
                ? 'bg-purple-950/50 border-purple-400/30 text-slate-100 hover:bg-purple-900/50'
                : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Snowflake className="w-4 h-4" />
          </button>
        )}

        <a
          href={botInviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Add @RONIGUARD bot to your Discord server"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-950/50 border border-white/15 smooth-transition whitespace-nowrap shrink-0"
        >
          <PlusCircle className="w-3.5 h-3.5 text-purple-100" />
          <span>Add Bot</span>
          <ExternalLink className="w-3 h-3 opacity-75 hidden sm:inline" />
        </a>

        {onNavigateToAntiTamper && (
          <button
            onClick={onNavigateToAntiTamper}
            title="Inspect Anti-Tamper Security & Integrity Status"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-medium smooth-transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-purple-300" />
            <span>Anti-Tamper</span>
          </button>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 smooth-transition text-left focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer whitespace-nowrap shrink-0"
            aria-expanded={profileDropdownOpen}
          >
            <div className="w-7 h-7 rounded-lg bg-[#0d0818] flex items-center justify-center overflow-hidden border border-white/15 shrink-0">
              <img
                src={getAvatarSrc(128)}
                alt={userLabel}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                }}
              />
            </div>

            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-white tracking-tight truncate max-w-[110px]">
                @{userLabel}
              </span>
              <span className="text-[10px] text-slate-400 capitalize">
                {userRole === 'admin' ? 'Administrator' : 'Developer'}
              </span>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 smooth-transition ${
                profileDropdownOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0c0818] border border-white/15 shadow-2xl shadow-black/70 p-3 z-50 animate-view-enter">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0d0818] overflow-hidden shrink-0 border border-white/15">
                  <img
                    src={getAvatarSrc(256)}
                    alt={userLabel}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://cdn.discordapp.com/embed/avatars/0.png';
                    }}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate">@{userLabel}</span>
                  <span className="text-[10px] font-mono text-purple-300 truncate tabular-nums">
                    ID: {discordId}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {userRole === 'admin' ? 'Administrator' : 'Developer Vault'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 mb-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Server className="w-3 h-3 text-purple-300" /> Access
                  </span>
                  <span className="text-emerald-400 font-semibold text-[11px]">Authorized</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-purple-300" /> Integrity
                  </span>
                  <span className="text-slate-200 font-mono text-[11px]">HMAC Protected</span>
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t border-white/10">
                <a
                  href={botInviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-white/[0.06] smooth-transition"
                >
                  <span className="flex items-center gap-2">
                    <PlusCircle className="w-3.5 h-3.5 text-purple-300" /> Add to Discord Server
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-950/40 border border-rose-900/20 smooth-transition text-left cursor-pointer"
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
