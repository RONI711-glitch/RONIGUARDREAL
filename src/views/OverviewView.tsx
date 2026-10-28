import React, { useEffect, useState } from 'react';
import {
  Layers,
  FileCode2,
  KeyRound,
  RefreshCw,
  Activity,
  ShieldCheck,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import { api } from '../api.ts';
import { OverviewMetrics } from '../types.ts';
import { SectionId } from '../components/Sidebar.tsx';

interface OverviewViewProps {
  onNavigate: (section: SectionId) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.getOverview();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch overview metrics');
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
          <p className="text-xs text-neutral-400">Loading secure dashboard telemetry...</p>
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
      subtext: 'Configured security domains',
    },
    {
      label: 'Protected Scripts',
      value: metrics?.totalScripts ?? 0,
      icon: FileCode2,
      section: 'scripts' as SectionId,
      subtext: 'Built with RONIGUARD MAX',
    },
    {
      label: 'Active Script Licenses',
      value: metrics?.activeKeys ?? 0,
      icon: KeyRound,
      section: 'licenses' as SectionId,
      subtext: 'Script-specific API keys',
    },
    {
      label: 'Discord Bot Sentinel',
      value: metrics?.botConnected ? 'Online' : 'Connected',
      icon: Bot,
      section: 'overview' as SectionId,
      subtext: metrics?.botUsername || 'RONIGUARD Sentinel',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0e091b] border border-purple-900/30">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">RONIGUARD Dashboard</h2>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-purple-400 font-mono">Public Release Platform</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Build Lua scripts, deploy panels, and issue script-specific API keys for Roblox executors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-900/40 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Stats</span>
          </button>
          <button
            onClick={() => onNavigate('scripts')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Script</span>
          </button>
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
              className="p-5 rounded-2xl bg-[#0e081c] border border-purple-900/30 hover:border-purple-600/40 text-left transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-xs font-semibold text-neutral-400">{card.label}</span>
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-800/40 flex items-center justify-center group-hover:scale-105 transition-transform">
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
          className="p-5 rounded-2xl bg-[#0a0515] border border-purple-900/30 hover:border-purple-500/40 cursor-pointer transition-all space-y-2 group"
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
          className="p-5 rounded-2xl bg-[#0a0515] border border-purple-900/30 hover:border-purple-500/40 cursor-pointer transition-all space-y-2 group"
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
          className="p-5 rounded-2xl bg-[#0a0515] border border-purple-900/30 hover:border-purple-500/40 cursor-pointer transition-all space-y-2 group"
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
      <div className="p-5 rounded-2xl bg-[#0e081c] border border-purple-900/30 space-y-4">
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
