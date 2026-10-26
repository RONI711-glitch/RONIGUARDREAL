import React from 'react';
import {
  LayoutDashboard,
  Layers,
  FileCode2,
  Lock,
  UserCheck,
  KeyRound,
  Cpu,
  History,
  Archive,
  Bot,
  Terminal,
  BarChart3,
  Settings,
  X,
  ShieldAlert,
} from 'lucide-react';

export type SectionId =
  | 'overview'
  | 'panels'
  | 'scripts'
  | 'obfuscation'
  | 'whitelist'
  | 'keys'
  | 'hwid'
  | 'history'
  | 'source-recovery'
  | 'discord'
  | 'api'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  counts?: {
    panels: number;
    scripts: number;
    activeKeys: number;
    whitelist: number;
  };
}

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isSpecial?: boolean;
  countKey?: 'panels' | 'scripts' | 'activeKeys' | 'whitelist';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'panels', label: 'Panels', icon: Layers, countKey: 'panels' },
  { id: 'scripts', label: 'Scripts', icon: FileCode2, countKey: 'scripts' },
  { id: 'obfuscation', label: 'Obfuscation', icon: Lock },
  { id: 'whitelist', label: 'Whitelist', icon: UserCheck, countKey: 'whitelist' },
  { id: 'keys', label: 'Keys', icon: KeyRound, countKey: 'activeKeys' },
  { id: 'hwid', label: 'HWID Management', icon: Cpu },
  { id: 'history', label: 'Build History', icon: History },
  { id: 'source-recovery', label: 'Source Recovery', icon: Archive, isSpecial: true },
  { id: 'discord', label: 'Discord Bot', icon: Bot },
  { id: 'api', label: 'API Management', icon: Terminal },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile,
  counts,
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
              Lua Security Core
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
        <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
          Management
        </div>

        {NAV_ITEMS.map((item) => {
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
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-purple-900/40 text-white border border-purple-500/40 shadow-sm shadow-purple-900/30 font-semibold'
                  : 'text-neutral-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-purple-300'
                      : item.isSpecial
                      ? 'text-amber-400 group-hover:text-amber-300'
                      : 'text-neutral-400 group-hover:text-purple-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.isSpecial ? (
                <span className="text-[10px] font-mono font-bold tracking-wider text-amber-400/90 ml-2 shrink-0">
                  VAULT
                </span>
              ) : count !== null && count !== undefined ? (
                <span className="text-[11px] font-mono text-neutral-400 ml-2 shrink-0">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* User Footer Notice */}
      <div className="p-4 border-t border-purple-900/20 bg-[#07030e]/60">
        <div className="text-[11px] text-neutral-400 leading-tight">
          <p className="font-semibold text-neutral-300 truncate">ronizz.edit@gmail.com</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Private Single-Owner Mode</p>
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
