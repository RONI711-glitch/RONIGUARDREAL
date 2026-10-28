import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  RotateCcw,
  Ban,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Lock,
  Unlock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api.ts';
import { LicenseItem } from '../types.ts';
import { ConfirmModal } from '../components/ConfirmModal.tsx';

interface LicensesViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const LicensesView: React.FC<LicensesViewProps> = ({ onShowToast }) => {
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Revoke & Regenerate modals
  const [keyToRevoke, setKeyToRevoke] = useState<LicenseItem | null>(null);
  const [keyToRegenerate, setKeyToRegenerate] = useState<LicenseItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadLicenses = async () => {
    setLoading(true);
    try {
      const data = await api.getLicenses();
      setLicenses(data);
    } catch (err: any) {
      onShowToast('error', 'Failed to load licenses', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast('success', 'Copied to Clipboard', text);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRevoke = async () => {
    if (!keyToRevoke) return;
    setIsProcessing(true);
    try {
      await api.revokeLicense(keyToRevoke.id);
      onShowToast('warning', 'Key Revoked', `License key ${keyToRevoke.key} has been deactivated.`);
      setKeyToRevoke(null);
      loadLicenses();
    } catch (err: any) {
      onShowToast('error', 'Revocation Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!keyToRegenerate) return;
    setIsProcessing(true);
    try {
      const res = await api.regenerateLicense(keyToRegenerate.id);
      onShowToast('success', 'New API Key Minted', `Generated key: ${res.newKey.key}`);
      setKeyToRegenerate(null);
      loadLicenses();
    } catch (err: any) {
      onShowToast('error', 'Regeneration Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = licenses.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.key.toLowerCase().includes(q) ||
      (l.scriptName && l.scriptName.toLowerCase().includes(q)) ||
      l.scriptId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-purple-400" />
            Script-Specific Licenses
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Every script has its own dedicated API key. Key A authorizes Script A only; Key B authorizes Script B only.
          </p>
        </div>

        <button
          onClick={loadLicenses}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 text-purple-200 text-xs font-semibold flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Keys
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by script name, script ID, or API key..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#0d071a] border border-purple-900/30 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/60"
        />
      </div>

      {/* Licenses Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
          Loading active script licenses...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 border border-purple-900/20 rounded-2xl bg-[#0d071a]/40 text-center">
          <KeyRound className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-neutral-300">No Licenses Found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
            Deploy a script in the Scripts tab to automatically generate its unique API key.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isActive = item.status === 'active';
            const loadstring = item.loadstringUrl
              ? `loadstring(game:HttpGet("${item.loadstringUrl}"))()`
              : `loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua?script=${item.scriptId}&key=${item.key}"))()`;

            return (
              <div
                key={item.id}
                className="bg-[#0e081c] border border-purple-900/30 hover:border-purple-600/40 rounded-2xl p-4 sm:p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Script & Key Info */}
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <FileCode2 className="w-4 h-4 text-purple-400" />
                      {item.scriptName || 'Protected Script'}
                    </span>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/40">
                      ID: {item.scriptId}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
                          : 'bg-red-950/70 text-red-300 border border-red-800/50'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-neutral-400">API Key:</span>
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-black/50 px-2 py-1 rounded border border-neutral-800 select-all">
                      {item.key}
                    </span>
                    <button
                      onClick={() => copyToClipboard(item.key, `key_${item.id}`)}
                      className="p-1 hover:text-purple-300 text-neutral-400"
                      title="Copy API Key"
                    >
                      {copiedId === `key_${item.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-neutral-500 font-mono">
                    <span>Type: {item.type || 'lifetime'}</span>
                    <span>Executions: {item.currentUses}</span>
                    <span>
                      HWID: {item.boundHwid ? `${item.boundHwid.slice(0, 10)}...` : 'Unbound'}
                    </span>
                  </div>
                </div>

                {/* Loadstring & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:shrink-0">
                  <button
                    onClick={() => copyToClipboard(loadstring, `ls_${item.id}`)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/40 text-purple-200 text-xs font-semibold transition-all"
                  >
                    {copiedId === `ls_${item.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied Loadstring</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Loadstring</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setKeyToRegenerate(item)}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium transition-all"
                    title="Regenerate API key"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Regen</span>
                  </button>

                  {isActive && (
                    <button
                      onClick={() => setKeyToRevoke(item)}
                      className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 text-red-300 text-xs font-medium transition-all"
                      title="Revoke API key immediately"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REVOKE MODAL */}
      <ConfirmModal
        isOpen={!!keyToRevoke}
        title="Revoke License Key"
        message={`Are you sure you want to revoke key "${keyToRevoke?.key}"? Any Roblox executor loading script "${keyToRevoke?.scriptName}" with this key will immediately be blocked.`}
        confirmText="Revoke Key"
        confirmVariant="danger"
        onConfirm={handleRevoke}
        onCancel={() => setKeyToRevoke(null)}
      />

      {/* REGENERATE MODAL */}
      <ConfirmModal
        isOpen={!!keyToRegenerate}
        title="Regenerate API Key"
        message={`Regenerating this key will invalidate the previous key ("${keyToRegenerate?.key}") and issue a brand-new API key for "${keyToRegenerate?.scriptName}".`}
        confirmText="Regenerate Key"
        confirmVariant="primary"
        onConfirm={handleRegenerate}
        onCancel={() => setKeyToRegenerate(null)}
      />
    </div>
  );
};
