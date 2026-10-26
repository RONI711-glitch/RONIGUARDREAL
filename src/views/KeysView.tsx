import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Search,
  Slash,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Layers,
  X,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { api } from '../api.ts';
import { LicenseKey, Panel } from '../types.ts';
import { ConfirmModal } from '../components/ConfirmModal.tsx';

interface KeysViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const KeysView: React.FC<KeysViewProps> = ({ onShowToast }) => {
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<LicenseKey | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Form states
  const [type, setType] = useState('lifetime');
  const [panelId, setPanelId] = useState('');
  const [count, setCount] = useState(1);
  const [maxUses, setMaxUses] = useState(1);
  const [hwidLocked, setHwidLocked] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tester modal
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [testKeyString, setTestKeyString] = useState('');
  const [testHwid, setTestHwid] = useState('HWID_CLIENT_TEST_7719');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [keysData, panelsData] = await Promise.all([api.getKeys(), api.getPanels()]);
      setKeys(keysData);
      setPanels(panelsData);
      if (panelsData.length > 0 && !panelId) {
        setPanelId(panelsData[0].id);
      }
    } catch (err: any) {
      onShowToast('error', 'Failed to load keys', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.generateKeys({
        type,
        panelId: panelId || panels[0]?.id,
        count,
        maxUses,
        hwidLocked,
      });
      setKeys([...created, ...keys]);
      setIsGenerateOpen(false);
      onShowToast('success', 'Keys generated', `Created ${created.length} unique license key(s).`);
    } catch (err: any) {
      onShowToast('error', 'Key generation failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!keyToRevoke) return;
    try {
      const res = await api.revokeKey(keyToRevoke.id);
      setKeys(keys.map((k) => (k.id === keyToRevoke.id ? res.key : k)));
      onShowToast('warning', 'Key revoked', `License key "${keyToRevoke.key}" is now deactivated.`);
    } catch (err: any) {
      onShowToast('error', 'Revocation failed', err.message);
    } finally {
      setKeyToRevoke(null);
    }
  };

  const handleCopy = (k: LicenseKey) => {
    navigator.clipboard.writeText(k.key);
    setCopiedKeyId(k.id);
    setTimeout(() => setCopiedKeyId(null), 2000);
    onShowToast('info', 'Copied to clipboard', k.key);
  };

  const handleRunValidationTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testKeyString.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.testKeyValidation(testKeyString.trim(), testHwid.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ valid: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const filteredKeys = keys.filter((k) => {
    const matchesSearch =
      k.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (k.boundHwid && k.boundHwid.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || k.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">License Keys Manager</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Issue cryptographically generated keys for customer script access, duration locks, and HWID bindings.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setTestKeyString('');
              setTestResult(null);
              setIsTesterOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-900/40 bg-purple-950/30 hover:bg-purple-900/40 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
            <span>Test Key Validation</span>
          </button>
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Keys</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by license token or bound HWID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-xs text-neutral-300 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Key Statuses</option>
          <option value="active">Active Keys</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-7 h-7 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filteredKeys.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 text-center">
          <KeyRound className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No License Keys Found</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No license keys match your search criteria.'
              : 'Generate license keys for customers or test keys via the Discord bot.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0f0a1c] border border-purple-900/25 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-900/25 bg-[#090514]/60 text-neutral-400 font-semibold">
                  <th className="py-3 px-4">License Token</th>
                  <th className="py-3 px-4">Panel</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Uses</th>
                  <th className="py-3 px-4">Bound HWID</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/15">
                {filteredKeys.map((k) => {
                  const panel = panels.find((p) => p.id === k.panelId);

                  return (
                    <tr
                      key={k.id}
                      className="hover:bg-purple-950/20 transition-colors text-neutral-300"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-purple-300">
                            {k.key}
                          </span>
                          <button
                            onClick={() => handleCopy(k)}
                            className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                            title="Copy license key"
                          >
                            {copiedKeyId === k.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-neutral-300">
                        {panel?.name || k.panelId}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="capitalize font-mono text-[11px] text-neutral-300">
                          {k.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-neutral-400">
                        {k.currentUses} / {k.maxUses}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-400">
                        {k.boundHwid ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{k.boundHwid}</span>
                          </span>
                        ) : k.hwidLocked ? (
                          <span className="text-neutral-500">Unbound (Lock Active)</span>
                        ) : (
                          <span className="text-neutral-600">No HWID Lock</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-400">
                        {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold capitalize ${
                            k.status === 'active'
                              ? 'text-emerald-400'
                              : k.status === 'revoked'
                              ? 'text-red-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {k.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {k.status === 'active' && (
                          <button
                            onClick={() => setKeyToRevoke(k)}
                            className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
                            title="Revoke license"
                          >
                            <Slash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Keys Modal */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f0a1c] border border-purple-900/40 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsGenerateOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Generate License Keys</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Create unique cryptographically secure keys with expiration and HWID lock options.
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  License Duration
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['lifetime', '30d', '7d', '24h'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-semibold uppercase transition-all ${
                        type === t
                          ? 'bg-purple-900/50 border border-purple-500 text-white shadow-sm'
                          : 'bg-[#080410] border border-purple-900/30 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Associated Security Panel
                </label>
                <select
                  value={panelId}
                  onChange={(e) => setPanelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  {panels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Number of Keys
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Max Redemptions
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxUses}
                    onChange={(e) => setMaxUses(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#080410] border border-purple-900/30 cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-white">Enable HWID Device Binding</p>
                  <p className="text-[11px] text-neutral-400">Lock key to first executing machine</p>
                </div>
                <input
                  type="checkbox"
                  checked={hwidLocked}
                  onChange={(e) => setHwidLocked(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 text-xs font-medium hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Generating...' : `Generate ${count} Key(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Key Validation Tester Dialog */}
      {isTesterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f0a1c] border border-purple-900/40 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsTesterOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Key Validation Simulator</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Simulate the runtime request sent by a Luau loader executing in Roblox or an external environment.
            </p>

            <form onSubmit={handleRunValidationTest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  License Key to Test
                </label>
                <input
                  type="text"
                  required
                  value={testKeyString}
                  onChange={(e) => setTestKeyString(e.target.value)}
                  placeholder="e.g. RONI-VVIP-2026-X892"
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Simulated Hardware ID (HWID)
                </label>
                <input
                  type="text"
                  value={testHwid}
                  onChange={(e) => setTestHwid(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono ${
                    testResult.valid
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/40 border-red-500/40 text-red-300'
                  }`}
                >
                  <p className="font-bold mb-1">
                    {testResult.valid ? 'VALIDATION PASS (200 OK)' : 'VALIDATION REJECTED (403)'}
                  </p>
                  <p>{testResult.message}</p>
                  {testResult.expiresAt && <p className="mt-1">Expires: {testResult.expiresAt}</p>}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTesterOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  {testing ? 'Testing...' : 'Send Handshake Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Confirmation */}
      <ConfirmModal
        isOpen={!!keyToRevoke}
        title="Revoke License Key"
        message={`Are you sure you want to revoke key "${keyToRevoke?.key}"? Any user bound to this key will immediately lose access.`}
        confirmLabel="Deactivate Key"
        onConfirm={handleRevoke}
        onCancel={() => setKeyToRevoke(null)}
      />
    </div>
  );
};
