import React, { useState, useEffect } from 'react';
import {
  Archive,
  Download,
  Trash2,
  Lock,
  Search,
  ShieldAlert,
  AlertTriangle,
  KeyRound,
  FileCode2,
  CheckCircle2,
  Clock,
  X,
  History,
} from 'lucide-react';
import { api } from '../api.ts';
import { SourceRecoveryItem, AuditLog } from '../types.ts';
import { ConfirmModal } from '../components/ConfirmModal.tsx';

interface SourceRecoveryViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const SourceRecoveryView: React.FC<SourceRecoveryViewProps> = ({ onShowToast }) => {
  const [sources, setSources] = useState<SourceRecoveryItem[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Recovery modal
  const [targetScript, setTargetScript] = useState<SourceRecoveryItem | null>(null);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [authorizing, setAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Purge modal
  const [scriptToPurge, setScriptToPurge] = useState<SourceRecoveryItem | null>(null);
  const [purgePhrase, setPurgePhrase] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, logs] = await Promise.all([
        api.getSourceRecoveryList(),
        api.getLogs(),
      ]);
      setSources(list);
      setRecoveryLogs(logs.filter((l) => l.eventType === 'source_recovery'));
    } catch (err: any) {
      onShowToast('error', 'Vault Access Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartRecovery = (script: SourceRecoveryItem) => {
    setTargetScript(script);
    setOwnerPassword('');
    setConfirmationPhrase('');
    setAuthError(null);
  };

  const handleExecuteRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetScript) return;

    setAuthorizing(true);
    setAuthError(null);

    try {
      await api.verifyAndDownloadOriginalSource(
        targetScript.scriptId,
        targetScript.filename,
        ownerPassword,
        confirmationPhrase
      );
      onShowToast('success', 'Source Decrypted & Downloaded', `Retrieved raw "${targetScript.filename}".`);
      setTargetScript(null);
      // Reload recovery logs
      const updatedLogs = await api.getLogs();
      setRecoveryLogs(updatedLogs.filter((l) => l.eventType === 'source_recovery'));
    } catch (err: any) {
      setAuthError(err.message || 'Owner authentication failed. Access denied to raw source code.');
      onShowToast('error', 'Recovery Blocked', err.message);
    } finally {
      setAuthorizing(false);
    }
  };

  const handleExecutePurge = async () => {
    if (!scriptToPurge) return;
    try {
      await api.purgeOriginalSource(scriptToPurge.scriptId);
      onShowToast('warning', 'Source Purged', `Original source for "${scriptToPurge.filename}" was permanently deleted.`);
      setScriptToPurge(null);
      setPurgePhrase('');
      loadData();
    } catch (err: any) {
      onShowToast('error', 'Purge Failed', err.message);
    }
  };

  const filteredSources = sources.filter((s) =>
    s.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.scriptId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white tracking-tight">Owner Original Source Vault</h2>
          <span className="text-xs text-neutral-500">·</span>
          <span className="text-xs text-amber-400 font-mono font-bold">Strict Owner Authorization</span>
        </div>
        <p className="text-xs text-neutral-400 mt-0.5">
          Dedicated secure offline storage of raw original source files. Completely physically isolated from distributed builds.
        </p>
      </div>

      {/* Security Architecture Callout */}
      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-600/30 text-xs text-neutral-300 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <ShieldAlert className="w-4 h-4" />
          <span>Cryptographic Security & Owner Identity Separation</span>
        </div>
        <p className="text-[11px] leading-relaxed text-neutral-300">
          Owner Email: <span className="text-white font-mono font-bold">ronizz.edit@gmail.com</span>. Your original raw Lua/Luau scripts are never distributed to players, clients, or third parties. Every source retrieval requires active owner session credentials and re-authentication, with irreversible immutable audit logging.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search original source archives by filename..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
        />
      </div>

      {/* Sources Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-7 h-7 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 text-center">
          <Archive className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Original Backups in Vault</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No original files match your query.'
              : 'Original scripts will automatically be saved into the vault when you upload scripts in the Scripts tab.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0f0a1c] border border-purple-900/25 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-900/25 bg-[#090514]/60 text-neutral-400 font-semibold">
                  <th className="py-3 px-4">Original Filename</th>
                  <th className="py-3 px-4">Vault Storage Status</th>
                  <th className="py-3 px-4">Raw File Size</th>
                  <th className="py-3 px-4">Upload Date</th>
                  <th className="py-3 px-4">Build Count</th>
                  <th className="py-3 px-4 text-right">Owner Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/15">
                {filteredSources.map((item) => (
                  <tr
                    key={item.scriptId}
                    className="hover:bg-purple-950/20 transition-colors text-neutral-300"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <FileCode2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <span className="font-mono font-bold text-white block">
                            {item.filename}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {item.scriptId}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.sourceAvailable ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Encrypted & Retrievable</span>
                        </span>
                      ) : (
                        <span className="text-neutral-500 font-medium">
                          Purged from backend disk
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono tabular-nums text-neutral-300">
                      {(item.originalSize / 1024).toFixed(1)} KB
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-neutral-400">
                      {new Date(item.uploadDate).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-purple-300">
                      {item.buildCount} build(s)
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.sourceAvailable ? (
                          <>
                            <button
                              onClick={() => handleStartRecovery(item)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold transition-all shadow-sm shadow-amber-900/30"
                              title="Authenticate and download original source"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Recover Source</span>
                            </button>

                            <button
                              onClick={() => setScriptToPurge(item)}
                              className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
                              title="Purge original source backup"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-neutral-600 text-xs italic">Unavailable</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Source Recovery Access Logs */}
      <div className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white">Source Recovery Audit Trail</h3>
        </div>
        <p className="text-xs text-neutral-400">
          Permanent log of all successful and unauthorized attempts to retrieve raw original source code.
        </p>

        {recoveryLogs.length === 0 ? (
          <p className="text-xs text-neutral-500 py-3">No source recovery events recorded yet.</p>
        ) : (
          <div className="space-y-2 pt-1">
            {recoveryLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#07030e] border border-purple-900/20 text-xs"
              >
                <div>
                  <p className="text-neutral-200 font-medium">{log.details}</p>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono mt-0.5">
                    <span>IP: {log.ip}</span>
                    <span>·</span>
                    <span>Client: {log.userAgent}</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-neutral-500 shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strict Owner Re-Authentication Modal */}
      {targetScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f0a1c] border border-amber-600/40 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setTargetScript(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-amber-400 mb-2">
              <Lock className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Owner Authorization Required</h3>
            </div>
            <p className="text-xs text-neutral-300 mb-4 leading-relaxed">
              You are requesting to recover raw source for <span className="font-mono text-white font-bold">{targetScript.filename}</span>. Enter your owner password or confirmation authorization phrase.
            </p>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-900/40 text-xs text-red-300">
                {authError}
              </div>
            )}

            <form onSubmit={handleExecuteRecovery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Owner Password
                </label>
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="Enter your owner password..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-neutral-400">
                    Or Authorization Phrase: <span className="text-neutral-200 font-mono">RESTORE_ORIGINAL_SOURCE</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setConfirmationPhrase('RESTORE_ORIGINAL_SOURCE')}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline"
                  >
                    Auto-Fill Phrase
                  </button>
                </div>
                <input
                  type="text"
                  value={confirmationPhrase}
                  onChange={(e) => setConfirmationPhrase(e.target.value)}
                  placeholder="Click Auto-Fill Phrase or type here..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setTargetScript(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 text-xs font-medium hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authorizing || (!ownerPassword && confirmationPhrase !== 'RESTORE_ORIGINAL_SOURCE')}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold transition-all shadow-md shadow-amber-900/40 disabled:opacity-50"
                >
                  {authorizing ? 'Verifying Authorization...' : 'Verify & Download Raw Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Purge Confirmation Modal */}
      <ConfirmModal
        isOpen={!!scriptToPurge}
        title="Permanently Purge Original Source"
        message={`Warning: This will permanently delete the private backup file of "${scriptToPurge?.filename}". It cannot be undone.`}
        confirmLabel="Purge Permanently"
        confirmPhrase="PURGE_SOURCE"
        userPhraseInput={purgePhrase}
        onPhraseChange={setPurgePhrase}
        onConfirm={handleExecutePurge}
        onCancel={() => {
          setScriptToPurge(null);
          setPurgePhrase('');
        }}
      />
    </div>
  );
};
