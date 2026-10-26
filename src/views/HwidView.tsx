import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RotateCcw,
  Slash,
  Search,
  CheckCircle2,
  AlertTriangle,
  Laptop,
} from 'lucide-react';
import { api } from '../api.ts';
import { HwidBinding } from '../types.ts';
import { ConfirmModal } from '../components/ConfirmModal.tsx';

interface HwidViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const HwidView: React.FC<HwidViewProps> = ({ onShowToast }) => {
  const [bindings, setBindings] = useState<HwidBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [bindingToReset, setBindingToReset] = useState<HwidBinding | null>(null);
  const [bindingToRevoke, setBindingToRevoke] = useState<HwidBinding | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getHwidBindings();
      setBindings(data);
    } catch (err: any) {
      onShowToast('error', 'Failed to load HWID bindings', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = async () => {
    if (!bindingToReset) return;
    try {
      const res = await api.resetHwid(bindingToReset.id);
      setBindings(bindings.map((b) => (b.id === bindingToReset.id ? res.binding : b)));
      onShowToast('success', 'HWID Reset Completed', `Cleared device lock for "${bindingToReset.identifier}".`);
    } catch (err: any) {
      onShowToast('error', 'Reset failed', err.message);
    } finally {
      setBindingToReset(null);
    }
  };

  const handleRevoke = async () => {
    if (!bindingToRevoke) return;
    try {
      const res = await api.revokeHwid(bindingToRevoke.id);
      setBindings(bindings.map((b) => (b.id === bindingToRevoke.id ? res.binding : b)));
      onShowToast('warning', 'HWID Revoked', `Revoked device authorization for "${bindingToRevoke.identifier}".`);
    } catch (err: any) {
      onShowToast('error', 'Revocation failed', err.message);
    } finally {
      setBindingToRevoke(null);
    }
  };

  const filteredBindings = bindings.filter(
    (b) =>
      b.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.hwidHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.deviceLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Hardware ID (HWID) Devices</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Manage hardware locks and device fingerprints registered to customer licenses or whitelist identities.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by device label, identifier, or HWID hash..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-7 h-7 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filteredBindings.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 text-center">
          <Cpu className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No HWID Bindings Registered</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            Devices are registered automatically during script execution when HWID lock is enabled.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0f0a1c] border border-purple-900/25 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-900/25 bg-[#090514]/60 text-neutral-400 font-semibold">
                  <th className="py-3 px-4">User / Identity</th>
                  <th className="py-3 px-4">Device Fingerprint</th>
                  <th className="py-3 px-4">HWID Hash</th>
                  <th className="py-3 px-4">Reset Quota</th>
                  <th className="py-3 px-4">Last Reset</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/15">
                {filteredBindings.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-purple-950/20 transition-colors text-neutral-300"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-white">{item.identifier}</span>
                    </td>

                    <td className="py-3.5 px-4 flex items-center gap-2">
                      <Laptop className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-neutral-300">{item.deviceLabel}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-purple-300 text-[11px]">
                      {item.hwidHash}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-neutral-400">
                      {item.resetCount} / {item.maxResets}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-neutral-500">
                      {item.lastResetAt ? new Date(item.lastResetAt).toLocaleDateString() : 'Never'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold capitalize ${
                          item.status === 'bound' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setBindingToReset(item)}
                          disabled={item.resetCount >= item.maxResets}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-purple-900/40 bg-purple-950/40 hover:bg-purple-900/40 text-neutral-300 hover:text-white transition-colors disabled:opacity-40"
                          title="Reset device lock"
                        >
                          <RotateCcw className="w-3 h-3 text-purple-400" />
                          <span>Reset</span>
                        </button>

                        <button
                          onClick={() => setBindingToRevoke(item)}
                          className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
                          title="Revoke device binding"
                        >
                          <Slash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset Confirmation */}
      <ConfirmModal
        isOpen={!!bindingToReset}
        title="Reset Device Hardware Binding"
        message={`Are you sure you want to reset the HWID lock for "${bindingToReset?.identifier}"? The user will be permitted to bind a new hardware machine upon next script start.`}
        confirmLabel="Reset HWID"
        isDestructive={false}
        onConfirm={handleReset}
        onCancel={() => setBindingToReset(null)}
      />

      {/* Revoke Confirmation */}
      <ConfirmModal
        isOpen={!!bindingToRevoke}
        title="Revoke Device Hardware Binding"
        message={`Are you sure you want to revoke the HWID lock for "${bindingToRevoke?.identifier}"?`}
        confirmLabel="Revoke Binding"
        onConfirm={handleRevoke}
        onCancel={() => setBindingToRevoke(null)}
      />
    </div>
  );
};
