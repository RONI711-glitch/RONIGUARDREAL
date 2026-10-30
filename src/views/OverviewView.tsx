import React, { useEffect, useState } from 'react';
import {
  Layers,
  FileCode2,
  KeyRound,
  RefreshCw,
  Activity,
  Plus,
  ArrowRight,
  Bot,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Lock,
  Zap,
  Terminal,
} from 'lucide-react';
import { api } from '../api.ts';
import { OverviewMetrics, UserQuotas } from '../types.ts';
import { SectionId } from '../components/Sidebar.tsx';

interface OverviewViewProps {
  onNavigate: (section: SectionId) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [quotas, setQuotas] = useState<UserQuotas | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(true);

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getOverview();
      setMetrics(data);
      if (data.quotas) {
        setQuotas(data.quotas);
      } else {
        // Fallback default quotas calculation
        setQuotas({
          monthlyObfuscations: { current: 0, max: 15 },
          panels: { current: data.totalPanels || 0, max: 5 },
          scripts: { current: data.totalScripts || 0, max: 10 },
          keysAndWhitelist: { current: (data.activeKeys || 0) + (data.whitelistedUsers || 0), max: 1000 },
          maxScriptUpdates: 10,
        });
      }
    } catch {
      // Background retry
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-xs text-neutral-400 font-mono">Loading secure cosmic dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Security Panels',
      value: metrics?.totalPanels ?? 0,
      icon: Layers,
      section: 'panels' as SectionId,
      subtext: `${quotas?.panels.current || 0} / ${quotas?.panels.max || 5} panels created`,
    },
    {
      label: 'Protected Scripts',
      value: metrics?.totalScripts ?? 0,
      icon: FileCode2,
      section: 'scripts' as SectionId,
      subtext: `${quotas?.scripts.current || 0} / ${quotas?.scripts.max || 10} scripts active`,
    },
    {
      label: 'Active Script Licenses',
      value: metrics?.activeKeys ?? 0,
      icon: KeyRound,
      section: 'licenses' as SectionId,
      subtext: `${quotas?.keysAndWhitelist.current || 0} / ${quotas?.keysAndWhitelist.max || 1000} keys & whitelist`,
    },
    {
      label: 'Discord Bot Sentinel',
      value: metrics?.botConnected ? 'Online 24/7' : 'Connected',
      icon: Bot,
      section: 'overview' as SectionId,
      subtext: metrics?.botUsername || 'RONIGUARD Sentinel',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#0e071e]/90 border border-purple-500/30 backdrop-blur-xl shadow-xl shadow-purple-950/40">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black text-white tracking-tight">RONIGUARD Dashboard</h2>
            <span className="text-xs text-purple-400 font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-800/40">
              Cosmic Engine
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed max-w-xl">
            Next-generation Lua/Luau register VM obfuscation, script-specific licensing, and 24/7 Discord Bot execution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/50 border border-purple-800/40 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => onNavigate('scripts')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Script</span>
          </button>
        </div>
      </div>

      {/* Getting Started Guide */}
      {showGettingStarted && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#120928]/95 via-[#0e071e]/95 to-[#080312]/95 border border-purple-500/40 shadow-2xl shadow-purple-950/60 relative backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  Getting Started with RONIGUARD
                </h3>
                <p className="text-[11px] text-purple-300/80">
                  What RONIGUARD is and how it protects your proprietary code
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGettingStarted(false)}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-black/40 border border-purple-900/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <div className="w-5 h-5 rounded-lg bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                <span>Create a Panel</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Organize your security policies, toggle HWID device binding, whitelist access, and trial keys.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-purple-900/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <div className="w-5 h-5 rounded-lg bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                <span>Upload Lua Script</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Upload your raw Lua code. RONIGUARD MAX wraps it into a Register VM with XOR polymorphic keys.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-purple-900/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <div className="w-5 h-5 rounded-lg bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">3</div>
                <span>Discord Bot & Keys</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Use <code className="text-purple-300 font-mono text-[10px]">/panelsetup</code> in Discord to deploy the button panel and mint API keys.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-purple-900/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <div className="w-5 h-5 rounded-lg bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">4</div>
                <span>Execute on Roblox</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Run loadstrings in executors. Validated keys execute instantly; direct browser visits trigger the unauthorized sentinel.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Plan Quotas Widget */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0c061a]/95 border border-purple-500/25 shadow-xl shadow-purple-950/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Account Plan Quotas & Enforced Limits</h3>
          </div>
          <span className="text-[11px] text-purple-400 font-mono font-medium">Free Developer Tier</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 15 Monthly Obfuscations */}
          <div className="p-4 rounded-2xl bg-black/40 border border-purple-900/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Monthly Obfuscations</span>
              <span className="text-purple-300 font-bold font-mono">
                {quotas?.monthlyObfuscations.current || 0} / {quotas?.monthlyObfuscations.max || 15}
              </span>
            </div>
            <div className="h-2 w-full bg-purple-950/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (((quotas?.monthlyObfuscations.current || 0) / 15) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-neutral-500">Resets automatically each month</p>
          </div>

          {/* 5 Panels Maximum */}
          <div className="p-4 rounded-2xl bg-black/40 border border-purple-900/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Panels Created</span>
              <span className="text-purple-300 font-bold font-mono">
                {quotas?.panels.current || 0} / {quotas?.panels.max || 5}
              </span>
            </div>
            <div className="h-2 w-full bg-purple-950/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (((quotas?.panels.current || 0) / 5) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-neutral-500">Maximum 5 active panels</p>
          </div>

          {/* 10 Scripts Maximum */}
          <div className="p-4 rounded-2xl bg-black/40 border border-purple-900/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Scripts Created</span>
              <span className="text-purple-300 font-bold font-mono">
                {quotas?.scripts.current || 0} / {quotas?.scripts.max || 10}
              </span>
            </div>
            <div className="h-2 w-full bg-purple-950/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (((quotas?.scripts.current || 0) / 10) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-neutral-500">10 updates per script project</p>
          </div>

          {/* 1000 Keys & Whitelists */}
          <div className="p-4 rounded-2xl bg-black/40 border border-purple-900/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Keys & Whitelists</span>
              <span className="text-purple-300 font-bold font-mono">
                {quotas?.keysAndWhitelist.current || 0} / {quotas?.keysAndWhitelist.max || 1000}
              </span>
            </div>
            <div className="h-2 w-full bg-purple-950/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (((quotas?.keysAndWhitelist.current || 0) / 1000) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-neutral-500">Combined key and whitelist quota</p>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={() => onNavigate(card.section)}
              className="p-5 rounded-3xl bg-[#0e081c]/90 border border-purple-900/30 hover:border-purple-500/50 text-left transition-all group flex flex-col justify-between hover:scale-[1.01] cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-xs font-semibold text-neutral-400">{card.label}</span>
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-800/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4 text-purple-300" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-black text-white tracking-tight">{card.value}</span>
                <p className="text-[11px] text-neutral-500 mt-1">{card.subtext}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('panels')}
          className="p-5 rounded-3xl bg-[#0a0515] border border-purple-900/30 hover:border-purple-500/40 cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-400" />
              Panels Management
            </span>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 text-purple-400 transition-all" />
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Create and organize protection panels with customizable whitelist, key authentication, and HWID device policies.
          </p>
        </div>

        <div
          onClick={() => onNavigate('scripts')}
          className="p-5 rounded-3xl bg-[#0a0515] border border-purple-900/30 hover:border-purple-500/40 cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <FileCode2 className="w-4 h-4 text-purple-400" />
              Scripts Studio
            </span>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 text-purple-400 transition-all" />
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Deploy new Lua scripts with RONIGUARD MAX single-engine Register VM protection, and perform in-place updates.
          </p>
        </div>

        <div
          onClick={() => onNavigate('licenses')}
          className="p-5 rounded-3xl bg-[#0a0515] border border-purple-900/30 hover:border-purple-500/40 cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-purple-400" />
              Script Licenses
            </span>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 text-purple-400 transition-all" />
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Inspect script-specific API keys, copy ready-to-run loadstrings for Roblox executors, revoke, or regenerate.
          </p>
        </div>
      </div>

      {/* Recent Activity Ledger */}
      <div className="p-5 rounded-3xl bg-[#0e081c]/90 border border-purple-900/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Recent Security Activity</h3>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">Real-time audit log</span>
        </div>

        {metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
          <div className="space-y-2">
            {metrics.recentActivity.slice(0, 6).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-xl bg-purple-950/20 border border-purple-900/20 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-neutral-200 truncate">{log.details}</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 shrink-0 ml-2">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-500 text-center py-4">
            No activity recorded yet. Deploy scripts or panels to populate the ledger.
          </p>
        )}
      </div>
    </div>
  );
};
