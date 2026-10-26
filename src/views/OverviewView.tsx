import React, { useEffect, useState } from 'react';
import {
  Layers,
  FileCode2,
  CheckCircle2,
  XCircle,
  KeyRound,
  UserCheck,
  Bot,
  ArrowRight,
  RefreshCw,
  Activity,
  ShieldAlert,
  Terminal,
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
          <p className="text-xs text-neutral-400">Loading secure console telemetry...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Panels',
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
      subtext: 'Lua/Luau files in storage',
    },
    {
      label: 'Successful Builds',
      value: metrics?.successfulBuilds ?? 0,
      icon: CheckCircle2,
      section: 'history' as SectionId,
      subtext: 'Completed transformations',
    },
    {
      label: 'Failed Builds',
      value: metrics?.failedBuilds ?? 0,
      icon: XCircle,
      section: 'history' as SectionId,
      subtext: 'Syntax or validation blocks',
    },
    {
      label: 'Active Keys',
      value: metrics?.activeKeys ?? 0,
      icon: KeyRound,
      section: 'keys' as SectionId,
      subtext: 'Valid customer licenses',
    },
    {
      label: 'Whitelisted Users',
      value: metrics?.whitelistedUsers ?? 0,
      icon: UserCheck,
      section: 'whitelist' as SectionId,
      subtext: 'Platform authorized identities',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0e091b] border border-purple-900/30">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">System Status & Telemetry</h2>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-purple-400 font-mono">Owner: ronizz.edit@gmail.com</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time status of your private obfuscation pipeline, storage vaults, and Discord bot integration.
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
            onClick={() => onNavigate('obfuscation')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>New Obfuscation</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/40 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(card.section)}
              className="p-4 rounded-xl bg-[#0f0a1d] border border-purple-900/25 hover:border-purple-600/40 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-neutral-400 truncate">{card.label}</span>
                <Icon className="w-4 h-4 text-purple-400/80 group-hover:text-purple-300 transition-colors shrink-0" />
              </div>
              <div className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums">
                {card.value}
              </div>
              <p className="text-[10px] text-neutral-500 mt-1 truncate">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Owner Quick Start Helper */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#0e091c] to-[#0f0a1d] border border-purple-800/40">
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <span>🚀 What would you like to do? (No complex setup required)</span>
        </h3>
        <p className="text-xs text-neutral-400 mb-4">
          Everything in RONIGUARD works right now out of the box. You don't need to configure complicated servers or bots.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => onNavigate('obfuscation')}
            className="p-3 rounded-xl bg-[#07030e] border border-purple-900/30 hover:border-purple-500/50 cursor-pointer transition-all space-y-1"
          >
            <span className="text-xs font-bold text-purple-300 block">1. Protect a Lua Script</span>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Paste or upload your Lua/Luau script, click build, and download the protected code.
            </p>
          </div>

          <div
            onClick={() => onNavigate('keys')}
            className="p-3 rounded-xl bg-[#07030e] border border-purple-900/30 hover:border-purple-500/50 cursor-pointer transition-all space-y-1"
          >
            <span className="text-xs font-bold text-purple-300 block">2. Create License Keys</span>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Generate keys like <code className="text-purple-400">RONI-XXXX-XXXX</code> with 1 click to give to your users.
            </p>
          </div>

          <div
            onClick={() => onNavigate('source-recovery')}
            className="p-3 rounded-xl bg-[#07030e] border border-purple-900/30 hover:border-purple-500/50 cursor-pointer transition-all space-y-1"
          >
            <span className="text-xs font-bold text-amber-300 block">3. Recover Original Code</span>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Your raw un-obfuscated scripts are kept in your private vault whenever you need them.
            </p>
          </div>
        </div>
      </div>

      {/* Discord Bot Status Banner */}
      <div
        onClick={() => onNavigate('discord')}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
          metrics?.botConnected
            ? 'bg-purple-950/20 border-purple-600/30 hover:border-purple-500/50'
            : 'bg-[#0f0a1c] border-purple-900/25 hover:border-purple-700/40'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                metrics?.botConnected
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                  : 'bg-purple-950/40 border-purple-900/40 text-neutral-400'
              }`}
            >
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Existing Discord Bot Integration</h3>
                <span className="text-neutral-600 text-xs">·</span>
                <span
                  className={`text-xs font-semibold ${
                    metrics?.botConnected ? 'text-emerald-400' : 'text-neutral-400'
                  }`}
                >
                  {metrics?.botConnected ? `Connected (@${metrics.botUsername})` : 'Awaiting Connection Setup'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {metrics?.botConnected
                  ? `Active Gateway Latency: ${metrics.lastPing || 28}ms · All existing commands preserved & operable.`
                  : 'Configure DISCORD_BOT_TOKEN in Discord Bot tab or environment variables to link your existing bot.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 shrink-0">
            <span>Manage Bot & Test Commands</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2-Column Split: Recent Activity & Recent Builds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Audit */}
        <div className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Real-Time Security Activity</h3>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                View Full Audit
              </button>
            </div>

            {(!metrics?.recentActivity || metrics.recentActivity.length === 0) ? (
              <p className="text-xs text-neutral-500 py-6 text-center">No security logs recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {metrics.recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-3 pb-2.5 border-b border-purple-900/15 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-neutral-200 capitalize truncate">
                          {log.eventType.replace('_', ' ')}
                        </span>
                        <span className="text-neutral-600">·</span>
                        <span className="text-[11px] text-neutral-500 font-mono">{log.ip}</span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5 break-words line-clamp-2">
                        {log.details}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-500 shrink-0 tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Builds */}
        <div className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Recent Obfuscation Builds</h3>
              </div>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                View History
              </button>
            </div>

            {(!metrics?.recentBuilds || metrics.recentBuilds.length === 0) ? (
              <div className="py-8 text-center">
                <p className="text-xs text-neutral-400">No script builds executed yet.</p>
                <button
                  onClick={() => onNavigate('scripts')}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-semibold"
                >
                  Upload First Script
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.recentBuilds.map((build) => (
                  <div
                    key={build.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#07030e] border border-purple-900/20"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate font-mono">
                        {build.filename}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                        <span>{build.engine}</span>
                        <span className="text-neutral-600">·</span>
                        <span className="capitalize">{build.profile}</span>
                        <span className="text-neutral-600">·</span>
                        <span className="font-mono tabular-nums">{build.durationMs}ms</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-semibold ${
                          build.status === 'success' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {build.status === 'success' ? 'Ready' : 'Failed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
