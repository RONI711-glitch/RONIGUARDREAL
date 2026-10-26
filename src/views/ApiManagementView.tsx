import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Plus,
  Trash2,
  Copy,
  Check,
  Shield,
  Key,
  X,
  Code2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api.ts';
import { ApiCredential, Panel } from '../types.ts';
import { ConfirmModal } from '../components/ConfirmModal.tsx';

interface ApiManagementViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const ApiManagementView: React.FC<ApiManagementViewProps> = ({ onShowToast }) => {
  const [credentials, setCredentials] = useState<ApiCredential[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [loaderCode, setLoaderCode] = useState('');
  const [loading, setLoading] = useState(true);

  // Generate modal
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [credName, setCredName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'bot:sync',
    'whitelist:read',
    'whitelist:write',
    'keys:validate',
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Newly generated key reveal modal (one-time)
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  // Revoke modal
  const [credToRevoke, setCredToRevoke] = useState<ApiCredential | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLoader, setCopiedLoader] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [creds, pData] = await Promise.all([api.getCredentials(), api.getPanels()]);
      setCredentials(creds);
      setPanels(pData);
      if (pData.length > 0) {
        setSelectedPanelId(pData[0].id);
        const code = await api.getLoaderCode(pData[0].id);
        setLoaderCode(code);
      }
    } catch (err: any) {
      onShowToast('error', 'Failed to load credentials', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePanelChange = async (pId: string) => {
    setSelectedPanelId(pId);
    try {
      const code = await api.getLoaderCode(pId);
      setLoaderCode(code);
    } catch (err: any) {
      onShowToast('error', 'Failed to generate loader', err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credName.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.generateCredential(credName.trim(), selectedScopes);
      setCredentials([res.credential, ...credentials]);
      setIsGenerateOpen(false);
      setCredName('');
      setRevealedSecret(res.secretKey);
      onShowToast('success', 'API Key Created', 'Store the secret key safely; it will not be shown again.');
    } catch (err: any) {
      onShowToast('error', 'Creation failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!credToRevoke) return;
    try {
      await api.revokeCredential(credToRevoke.id);
      setCredentials(
        credentials.map((c) => (c.id === credToRevoke.id ? { ...c, status: 'revoked' as const } : c))
      );
      onShowToast('warning', 'Credential Revoked', `Deactivated "${credToRevoke.name}".`);
    } catch (err: any) {
      onShowToast('error', 'Revocation failed', err.message);
    } finally {
      setCredToRevoke(null);
    }
  };

  const handleCopySecret = () => {
    if (!revealedSecret) return;
    navigator.clipboard.writeText(revealedSecret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    onShowToast('info', 'Secret copied', 'API token copied to clipboard.');
  };

  const handleCopyLoader = () => {
    if (!loaderCode) return;
    navigator.clipboard.writeText(loaderCode);
    setCopiedLoader(true);
    setTimeout(() => setCopiedLoader(false), 2000);
    onShowToast('info', 'Loader copied', 'Universal Luau Loader copied.');
  };

  const AVAILABLE_SCOPES = [
    { id: 'bot:sync', label: 'Bot Sync', desc: 'Sync bot whitelists and key redemptions' },
    { id: 'whitelist:read', label: 'Whitelist Read', desc: 'Query platform whitelist status' },
    { id: 'whitelist:write', label: 'Whitelist Write', desc: 'Add or revoke platform whitelists' },
    { id: 'keys:validate', label: 'Keys Validate', desc: 'Verify customer license keys at runtime' },
    { id: 'hwid:reset', label: 'HWID Reset', desc: 'Reset customer device binding locks' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">API & Loader Management</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Manage authenticated REST API keys for your Discord bot bridge and export pre-configured Luau loaders.
          </p>
        </div>

        <button
          onClick={() => setIsGenerateOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New API Credential</span>
        </button>
      </div>

      {/* Credentials Table */}
      <div className="rounded-2xl bg-[#0f0a1c] border border-purple-900/25 overflow-hidden">
        <div className="p-4 border-b border-purple-900/20 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Active Backend Credentials
          </h3>
          <span className="text-[11px] font-mono text-neutral-400">
            {credentials.filter((c) => c.status === 'active').length} Active Key(s)
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[160px]">
            <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : credentials.length === 0 ? (
          <p className="text-xs text-neutral-500 p-6 text-center">No API credentials generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-900/20 bg-[#090514]/60 text-neutral-400">
                  <th className="py-3 px-4">Credential Name</th>
                  <th className="py-3 px-4">Token Prefix</th>
                  <th className="py-3 px-4">Scopes</th>
                  <th className="py-3 px-4">Rate Limit</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/15">
                {credentials.map((c) => (
                  <tr key={c.id} className="hover:bg-purple-950/20 text-neutral-300">
                    <td className="py-3 px-4 font-semibold text-white">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-purple-300">{c.prefix}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] text-neutral-400">
                        {c.scopes.join(', ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] tabular-nums text-neutral-400">
                      {c.rateLimitPerMin} req/min
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] tabular-nums text-neutral-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold capitalize ${
                          c.status === 'active' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.status === 'active' && (
                        <button
                          onClick={() => setCredToRevoke(c)}
                          className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
                          title="Revoke API Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Universal Luau Loader Code Generator */}
      <div className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Universal Luau Runtime Loader</h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Copy and deploy this loader into your game executor or distribution client.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPanelId}
              onChange={(e) => handlePanelChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#080410] border border-purple-900/40 text-xs text-neutral-300 focus:outline-none focus:border-purple-500"
            >
              {panels.map((p) => (
                <option key={p.id} value={p.id}>
                  Target Panel: {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleCopyLoader}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              {copiedLoader ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLoader ? 'Copied' : 'Copy Loader Code'}</span>
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-xl bg-[#080410] border border-purple-900/30 text-[11px] font-mono text-purple-200 overflow-x-auto max-h-72 leading-relaxed">
          {loaderCode || '-- Loading template...'}
        </pre>
      </div>

      {/* Generate API Key Modal */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f0a1c] border border-purple-900/40 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsGenerateOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Create API Credential</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Generate an authenticated token for your existing bot or CI pipeline.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Credential Name
                </label>
                <input
                  type="text"
                  required
                  value={credName}
                  onChange={(e) => setCredName(e.target.value)}
                  placeholder="e.g. Discord Bot Remote Agent"
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Select Permission Scopes
                </label>
                <div className="space-y-2">
                  {AVAILABLE_SCOPES.map((scope) => {
                    const isChecked = selectedScopes.includes(scope.id);
                    return (
                      <label
                        key={scope.id}
                        className="flex items-start gap-2.5 p-2 rounded-lg bg-[#080410] border border-purple-900/25 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScopes([...selectedScopes, scope.id]);
                            } else {
                              setSelectedScopes(selectedScopes.filter((s) => s !== scope.id));
                            }
                          }}
                          className="w-4 h-4 accent-purple-600 rounded mt-0.5"
                        />
                        <div>
                          <span className="font-semibold text-white block">{scope.label}</span>
                          <span className="text-[11px] text-neutral-400">{scope.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Creating...' : 'Generate Secret'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-Time Secret Key Reveal Modal */}
      {revealedSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f0a1c] border border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">API Key Generated Successfully</h3>
            </div>
            <p className="text-xs text-neutral-300 mb-4 leading-relaxed">
              Please copy your secret key immediately. For strict security, it is hashed on the server and will <span className="font-bold text-white">never be displayed again</span>.
            </p>

            <div className="p-3 rounded-xl bg-[#080410] border border-purple-900/40 flex items-center justify-between gap-2 mb-5">
              <span className="font-mono text-xs text-purple-300 break-all select-all">
                {revealedSecret}
              </span>
              <button
                onClick={handleCopySecret}
                className="p-2 text-neutral-300 hover:text-white rounded-lg bg-purple-950/50 hover:bg-purple-900/50 shrink-0"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setRevealedSecret(null)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
            >
              I Have Safely Saved My Secret Key
            </button>
          </div>
        </div>
      )}

      {/* Revoke Confirmation */}
      <ConfirmModal
        isOpen={!!credToRevoke}
        title="Revoke API Key"
        message={`Are you sure you want to revoke "${credToRevoke?.name}"? Any service relying on this token will immediately fail authentication.`}
        confirmLabel="Revoke Key"
        onConfirm={handleRevoke}
        onCancel={() => setCredToRevoke(null)}
      />
    </div>
  );
};
