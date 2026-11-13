import React from 'react';
import {
  LayoutDashboard,
  Layers,
  FileCode2,
  KeyRound,
  User,
  ShieldCheck,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';

export type SectionId =
  | 'overview'
  | 'panels'
  | 'scripts'
  | 'licenses'
  | 'anti-tamper'
  | 'account';

interface SidebarProps {
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  counts?: {
    panels: number;
    scripts: number;
    activeKeys: number;
  };
  username?: string;
  userRole?: 'user' | 'admin';
}

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  countKey?: 'panels' | 'scripts' | 'activeKeys';
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'panels', label: 'Panels', icon: Layers, countKey: 'panels' },
  { id: 'scripts', label: 'Scripts', icon: FileCode2, countKey: 'scripts' },
  { id: 'licenses', label: 'Licenses', icon: KeyRound, countKey: 'activeKeys' },
  { id: 'anti-tamper', label: 'Anti-Tamper', icon: ShieldCheck },
  { id: 'account', label: 'Account', icon: User },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile,
  counts,
  username = 'Discord User',
  userRole = 'user',
}) => {
  const content = (
    <div className="flex flex-col h-full bg-[#07030f]/95 border-r border-white/10 backdrop-blur-2xl">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="sm" />
          <h1 className="text-base font-black text-white tracking-tight leading-none whitespace-nowrap font-display">
            RONI<span className="text-purple-400">GUARD</span>
          </h1>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          Workspace
        </div>

        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const count = item.countKey && counts ? counts[item.countKey] : null;

          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold smooth-transition group cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600/25 to-indigo-900/30 text-white border border-purple-400/30 shadow-md shadow-purple-950/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 smooth-transition ${
                    isActive ? 'text-purple-300' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {count !== null && count !== undefined ? (
                <span
                  className={`text-[11px] font-mono tabular-nums ml-2 shrink-0 ${
                    isActive ? 'text-purple-200 font-bold' : 'text-slate-500'
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/10 bg-black/25">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">@{username}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {userRole === 'admin' ? 'Platform Administrator' : 'Developer Vault'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0">
        {content}
      </aside>

      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-view-enter">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
