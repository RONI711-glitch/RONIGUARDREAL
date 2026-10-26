import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Activity,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { api } from '../api.ts';
import { AuditLog } from '../types.ts';

interface AnalyticsViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onShowToast }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsData, logsData] = await Promise.all([api.getAnalytics(), api.getLogs()]);
      setAnalytics(analyticsData);
      setLogs(logsData);
    } catch (err: any) {
      onShowToast('error', 'Failed to load telemetry', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.userAgent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEvent = eventFilter === 'all' || l.eventType === eventFilter;
    const matchesSeverity = severityFilter === 'all' || l.severity === severityFilter;
    return matchesSearch && matchesEvent && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Security Analytics & Audit Ledger</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Real metrics on build throughput, engine usage, key life cycles, and immutable audit logs.
        </p>
      </div>

      {/* Analytics KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/25 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400">Build Success Rate</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {analytics?.successRate ?? 100}%
          </div>
          <p className="text-[10px] text-neutral-500">
            {analytics?.successfulBuilds ?? 0} successful / {analytics?.totalBuilds ?? 0} total
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/25 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400">Total License Keys</span>
          <div className="text-2xl font-bold font-mono text-purple-300 tabular-nums">
            {analytics?.totalKeys ?? 0}
          </div>
          <p className="text-[10px] text-neutral-500">
            {analytics?.activeKeys ?? 0} active / {analytics?.revokedKeys ?? 0} revoked
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/25 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400">Whitelisted Accounts</span>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {analytics?.whitelistedUsers ?? 0}
          </div>
          <p className="text-[10px] text-neutral-500">Active platform identities</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/25 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400">Total Audit Logs</span>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {logs.length}
          </div>
          <p className="text-[10px] text-neutral-500">Recorded security events</p>
        </div>
      </div>

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Engine Breakdown */}
        <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/25 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Engine Utilization
          </h3>
          <div className="space-y-2">
            {analytics?.engineDistribution &&
              Object.entries(analytics.engineDistribution).map(([eng, count]: [string, any]) => (
                <div key={eng} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-medium">{eng}</span>
                    <span className="font-mono text-purple-300 tabular-nums">{count} build(s)</span>
                  </div>
                  <div className="w-full bg-[#080410] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          analytics.totalBuilds > 0 ? (count / analytics.totalBuilds) * 100 : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Profile Breakdown */}
        <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/25 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Protection Profile Distribution
          </h3>
          <div className="space-y-2">
            {analytics?.profileDistribution &&
              Object.entries(analytics.profileDistribution).map(([prof, count]: [string, any]) => (
                <div key={prof} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize text-neutral-300 font-medium">{prof}</span>
                    <span className="font-mono text-purple-300 tabular-nums">{count} build(s)</span>
                  </div>
                  <div className="w-full bg-[#080410] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          analytics.totalBuilds > 0 ? (count / analytics.totalBuilds) * 100 : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Audit Log Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs by keyword, IP address, or details..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
          />
        </div>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-xs text-neutral-300 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Event Types</option>
          <option value="login">Login</option>
          <option value="source_recovery">Source Recovery</option>
          <option value="build">Build Obfuscation</option>
          <option value="key_gen">Key Generation</option>
          <option value="whitelist_change">Whitelist Change</option>
          <option value="hwid_reset">HWID Reset</option>
          <option value="security_alert">Security Alert</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-xs text-neutral-300 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-7 h-7 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 text-center">
          <Activity className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Logs Found</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            No audit ledger entries match your filter settings.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0f0a1c] border border-purple-900/25 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-900/25 bg-[#090514]/60 text-neutral-400 font-semibold">
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">IP Origin</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/15">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-purple-950/20 transition-colors text-neutral-300"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-white font-mono capitalize">
                        {log.eventType.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-neutral-300 max-w-md">
                      <p className="break-words leading-relaxed">{log.details}</p>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-400">
                      {log.ip}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`capitalize font-semibold text-[11px] ${
                          log.severity === 'critical'
                            ? 'text-red-400 font-bold'
                            : log.severity === 'warning'
                            ? 'text-amber-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-neutral-500 text-right">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
