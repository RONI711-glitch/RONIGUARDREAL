import React from 'react';
import {
  LayoutDashboard,
  Layers,
  FileCode2,
  KeyRound,
  User,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';

export type SectionId =
  | 'overview'
  | 'panels'
  | 'scripts'
  | 'licenses'
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
    <div className="flex flex-col h-full bg-[#0a0614] border-r border-purple-900/25">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-purple-900/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-950 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <ShieldAlert className="w-4 h-4 text-purple-200" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight leading-none">
              RONI<span className="text-purple-400">GUARD</span>
            </h1>
            <p className="text-[10px] text-neutral-400 font-medium tracking-wide uppercase mt-0.5">
              Lua Security & Licensing
            </p>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-neutral-400 hover:text-white rounded-md"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
          Navigation
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
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-purple-900/40 text-white border border-purple-500/40 shadow-sm shadow-purple-900/30 font-semibold'
                  : 'text-neutral-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-purple-300' : 'text-neutral-400 group-hover:text-purple-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {count !== null && count !== undefined ? (
                <span
                  className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ml-2 shrink-0 ${
                    isActive ? 'bg-purple-800/40 text-purple-200' : 'bg-neutral-900 text-neutral-400'
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}

      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-purple-900/20 bg-[#07030e]/60">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-bold text-white truncate">@{username}</p>
            <p className="text-[10px] text-neutral-400 capitalize mt-0.5">
              {userRole === 'admin' ? 'Platform Administrator' : 'Verified Developer'}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 shrink-0" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-slide-right">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
