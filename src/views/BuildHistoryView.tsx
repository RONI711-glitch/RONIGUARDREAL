import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Cpu,
  Layers,
  FileCode2,
} from 'lucide-react';
import { api } from '../api.ts';
import { BuildHistoryItem } from '../types.ts';

interface BuildHistoryViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const BuildHistoryView: React.FC<BuildHistoryViewProps> = ({ onShowToast }) => {
  const [history, setHistory] = useState<BuildHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getBuildHistory();
      setHistory(data);
    } catch (err: any) {
      onShowToast('error', 'Failed to load build history', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredHistory = history.filter((b) => {
    const matchesSearch =
      b.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.engine.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Obfuscation Build History</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Audited log of every obfuscation pipeline execution, engine parameters, duration, and output telemetry.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search builds by filename, engine, or build ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-xs text-neutral-300 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Build Outcomes</option>
          <option value="success">Success Only</option>
          <option value="failed">Failed Only</option>
        </select>
      </div>

      {/* History Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-7 h-7 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 text-center">
          <History className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Builds Recorded</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No history matches your search filter.'
              : 'Trigger a build in the Obfuscation Studio to generate build history logs.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0f0a1c] border border-purple-900/25 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-900/25 bg-[#090514]/60 text-neutral-400 font-semibold">
                  <th className="py-3 px-4">Script</th>
                  <th className="py-3 px-4">Engine</th>
                  <th className="py-3 px-4">Profile</th>
                  <th className="py-3 px-4">Input Size</th>
                  <th className="py-3 px-4">Output Size</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/15">
                {filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-purple-950/20 transition-colors text-neutral-300"
                  >
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono font-bold text-white block truncate max-w-[180px]">
                          {item.filename}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {item.id}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-purple-300">
                      {item.engine}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="capitalize font-mono text-neutral-300">
                        {item.profile}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-neutral-400">
                      {(item.inputSize / 1024).toFixed(1)} KB
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-purple-200">
                      {item.outputSize ? `${(item.outputSize / 1024).toFixed(1)} KB` : '—'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-emerald-400">
                      {item.durationMs}ms
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-neutral-500">
                      {new Date(item.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {item.status === 'success' ? (
                        <span className="text-emerald-400 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span
                          className="text-red-400 font-semibold flex items-center justify-end gap-1 cursor-help"
                          title={item.errorMsg || 'Compilation failed'}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
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
