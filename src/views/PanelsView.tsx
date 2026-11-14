import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Key,
  Cpu,
  UserCheck,
  CheckCircle2,
  FileCode2,
  X,
  Copy,
  Check,
  Code2,
} from 'lucide-react';
import { api, APP_BASE_URL } from '../api.ts';
import { Panel, ScriptItem } from '../types.ts';
import { ConfirmModal } from '../components/ConfirmModal.tsx';

interface PanelsViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const PanelsView: React.FC<PanelsViewProps> = ({ onShowToast }) => {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [masterApiKey, setMasterApiKey] = useState<string>('');
  const [copiedPanelId, setCopiedPanelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [panelToDelete, setPanelToDelete] = useState<Panel | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [protectionProfile, setProtectionProfile] = useState<'basic' | 'advanced' | 'maximum'>('advanced');
  const [whitelistEnabled, setWhitelistEnabled] = useState(true);
  const [keyAuthEnabled, setKeyAuthEnabled] = useState(true);
  const [hwidLockEnabled, setHwidLockEnabled] = useState(true);
  const [maxHwidResets, setMaxHwidResets] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [panelsData, scriptsData, keyData] = await Promise.all([
        api.getPanels(),
        api.getScripts(),
        api.getMasterApiKey().catch(() => ({ masterApiKey: '' })),
      ]);
      setPanels(panelsData);
      setScripts(scriptsData);
      if (keyData?.masterApiKey) {
        setMasterApiKey(keyData.masterApiKey);
      }
    } catch (err: any) {
      onShowToast('error', 'Failed to load panels', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setName('');
    setDescription('');
    setProtectionProfile('advanced');
    setWhitelistEnabled(true);
    setKeyAuthEnabled(true);
    setHwidLockEnabled(true);
    setMaxHwidResets(3);
    setIsCreateOpen(true);
  };

  const openEditModal = (p: Panel) => {
    setEditingPanel(p);
    setName(p.name);
    setDescription(p.description);
    setProtectionProfile(p.protectionProfile);
    setWhitelistEnabled(p.whitelistEnabled);
    setKeyAuthEnabled(p.keyAuthEnabled);
    setHwidLockEnabled(p.hwidLockEnabled);
    setMaxHwidResets(p.maxHwidResets);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const created = await api.createPanel({
        name: name.trim(),
        description: description.trim(),
        protectionProfile,
        whitelistEnabled,
        keyAuthEnabled,
        hwidLockEnabled,
        maxHwidResets,
      });
      setPanels([created, ...panels]);
      setIsCreateOpen(false);
      onShowToast('success', 'Panel created', `Panel "${created.name}" is now ready.`);
    } catch (err: any) {
      onShowToast('error', 'Creation failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPanel || !name.trim()) return;
    setSubmitting(true);
    try {
      const updated = await api.updatePanel(editingPanel.id, {
        name: name.trim(),
        description: description.trim(),
        protectionProfile,
        whitelistEnabled,
        keyAuthEnabled,
        hwidLockEnabled,
        maxHwidResets,
      });
      setPanels(panels.map((p) => (p.id === updated.id ? updated : p)));
      setEditingPanel(null);
      onShowToast('success', 'Panel updated', `Changes saved to "${updated.name}".`);
    } catch (err: any) {
      onShowToast('error', 'Update failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!panelToDelete) return;
    try {
      await api.deletePanel(panelToDelete.id);
      setPanels(panels.filter((p) => p.id !== panelToDelete.id));
      onShowToast('success', 'Panel deleted', `"${panelToDelete.name}" was removed.`);
    } catch (err: any) {
      onShowToast('error', 'Delete failed', err.message);
    } finally {
      setPanelToDelete(null);
    }
  };

  const filteredPanels = panels.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Security Panels</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure isolated protection policies, license auth rules, and script associations.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-white via-purple-100 to-purple-200 hover:from-white hover:to-white text-purple-950 text-xs font-extrabold shadow-[0_0_20px_rgba(255,255,255,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Panel</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-300/70" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search panels by name, ID, or description..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#110722]/90 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-400 transition-colors shadow-inner"
        />
      </div>

      {/* Panels Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-400 rounded-full animate-spin" />
        </div>
      ) : filteredPanels.length === 0 ? (
        <div className="p-10 rounded-2xl bg-gradient-to-b from-[#140a28]/80 to-[#0a0416] border border-white/10 text-center backdrop-blur-xl">
          <Layers className="w-10 h-10 text-purple-400/50 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Panels Found</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'No panels match your filter criteria.' : 'Create your first panel to organize and secure scripts.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPanels.map((panel) => {
            const associatedScripts = scripts.filter((s) => s.panelId === panel.id);

            return (
              <div
                key={panel.id}
                className="relative p-5 rounded-2xl bg-gradient-to-b from-[#170d2f]/90 via-[#100722]/95 to-[#0b0417]/98 border border-white/10 hover:border-purple-400/50 shadow-lg hover:shadow-[0_8px_30px_rgba(168,85,247,0.22)] transition-all flex flex-col justify-between backdrop-blur-xl group overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-white tracking-tight">{panel.name}</h3>
                      <span className="text-[11px] font-mono text-purple-300 font-bold">{panel.id}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(panel)}
                        className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-purple-950/40 transition-colors"
                        title="Edit panel configuration"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPanelToDelete(panel)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
                        title="Delete panel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {panel.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2 mb-4 leading-relaxed">
                      {panel.description}
                    </p>
                  )}

                  {/* Configuration Checklist */}
                  <div className="space-y-1.5 pt-2 border-t border-purple-900/20 text-xs">
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                        <span>Protection Profile:</span>
                      </span>
                      <span className="font-semibold text-white capitalize">{panel.protectionProfile}</span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span>Whitelist Lock:</span>
                      </span>
                      <span className={panel.whitelistEnabled ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
                        {panel.whitelistEnabled ? 'Enforced' : 'Off'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-purple-400" />
                        <span>License Auth:</span>
                      </span>
                      <span className={panel.keyAuthEnabled ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
                        {panel.keyAuthEnabled ? 'Required' : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-purple-400" />
                        <span>HWID Lock:</span>
                      </span>
                      <span className={panel.hwidLockEnabled ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
                        {panel.hwidLockEnabled ? `Active (Max ${panel.maxHwidResets} resets)` : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Discord Panel Helper */}
                  <div className="mt-3.5 p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Discord Setup</div>
                      <div className="text-[11px] font-mono text-neutral-300 truncate">
                        Run <span className="text-white font-bold">/panelsetup</span> & click this panel
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(panel.id);
                        onShowToast('success', 'Copied Panel ID', `${panel.id} copied (or just pick it in /panelsetup)`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-[10px] font-bold text-white shadow transition-all shrink-0 cursor-pointer"
                    >
                      Copy ID
                    </button>
                  </div>

                  {/* Dynamic Roblox Loadstring Helper */}
                  <div className="mt-2.5 p-2.5 rounded-xl bg-[#090414] border border-white/10 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <Code2 className="w-3 h-3" />
                        Roblox Loadstring
                      </div>
                      <div className="text-[11px] font-mono text-purple-200 truncate">
                        Target: <span className="text-white font-bold">{associatedScripts[0]?.id || panel.id}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = associatedScripts[0]?.id || panel.id;
                        const loadstring = `Script_key = "YOUR_LICENSE_KEY"\nloadstring(game:HttpGet("${APP_BASE_URL}/loader.lua?script=${targetId}"))()`;
                        navigator.clipboard.writeText(loadstring);
                        setCopiedPanelId(panel.id);
                        setTimeout(() => setCopiedPanelId(null), 2000);
                        onShowToast('success', 'Copied Roblox Loadstring', `Using script ID: ${targetId}`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white shadow transition-all shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {copiedPanelId === panel.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPanelId === panel.id ? 'Copied!' : 'Copy Loadstring'}</span>
                    </button>
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="mt-5 pt-3 border-t border-purple-900/20 flex items-center justify-between text-[11px] text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{associatedScripts.length} Script(s)</span>
                  </div>
                  <span className="font-mono text-neutral-500">
                    Created {new Date(panel.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(isCreateOpen || editingPanel) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0f0a1c] border border-purple-900/40 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsCreateOpen(false);
                setEditingPanel(null);
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {editingPanel ? `Edit Panel: ${editingPanel.name}` : 'Create Security Panel'}
            </h3>
            <p className="text-xs text-neutral-400 mb-5">
              Panels represent isolated script sets with dedicated access and protection configurations.
            </p>

            <form onSubmit={editingPanel ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Panel Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. VIP Hub Suite"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of script contents or purpose..."
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-200 mb-1.5 flex items-center justify-between">
                  <span>Protection Profile / Security Level *</span>
                  <span className="text-[10px] text-purple-400 font-normal">VM Virtualization & Obfuscation Intensity</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'basic' as const,
                      title: 'Basic',
                      desc: 'Lightweight anti-hook, fast load times & basic string protection',
                      badge: 'FAST',
                      color: 'text-neutral-300',
                    },
                    {
                      id: 'advanced' as const,
                      title: 'Advanced',
                      desc: 'Virtualized control flow, dynamic XOR cipher & anti-dump walls',
                      badge: 'BALANCED',
                      color: 'text-indigo-300',
                    },
                    {
                      id: 'maximum' as const,
                      title: 'Maximum',
                      desc: 'Full Register VM polymorphism + automated Anti-Tamper signatures',
                      badge: 'RECOMMENDED',
                      color: 'text-purple-300',
                    },
                  ].map((prof) => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => setProtectionProfile(prof.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        protectionProfile === prof.id
                          ? 'bg-purple-950/70 border-purple-500 shadow-lg shadow-purple-900/30 ring-1 ring-purple-500/50'
                          : 'bg-[#080410] border-purple-900/30 hover:border-purple-800/60 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-xs font-bold ${prof.color}`}>{prof.title}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              prof.badge === 'RECOMMENDED'
                                ? 'bg-purple-800/70 text-purple-200 border border-purple-600'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {prof.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 leading-snug">{prof.desc}</p>
                      </div>
                      <div className="mt-2 text-[10px] font-semibold flex items-center gap-1">
                        {protectionProfile === prof.id ? (
                          <span className="text-emerald-400 font-bold">✓ Selected</span>
                        ) : (
                          <span className="text-neutral-500">Select</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-[#080410] border border-purple-900/30 cursor-pointer">
                  <div className="pr-4">
                    <p className="text-xs font-semibold text-white">Require Whitelist Check</p>
                    <p className="text-[11px] text-neutral-400">Users must be explicitly whitelisted</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={whitelistEnabled}
                    onChange={(e) => setWhitelistEnabled(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[#080410] border border-purple-900/30 cursor-pointer">
                  <div className="pr-4">
                    <p className="text-xs font-semibold text-white">Require License Key Auth</p>
                    <p className="text-[11px] text-neutral-400">Validate against RONI key tokens</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={keyAuthEnabled}
                    onChange={(e) => setKeyAuthEnabled(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[#080410] border border-purple-900/30 cursor-pointer">
                  <div className="pr-4">
                    <p className="text-xs font-semibold text-white">Hardware ID (HWID) Device Lock</p>
                    <p className="text-[11px] text-neutral-400">Bind key execution to initial machine hardware</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hwidLockEnabled}
                    onChange={(e) => setHwidLockEnabled(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded"
                  />
                </label>
              </div>

              {hwidLockEnabled && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Maximum Allowed HWID Resets
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={maxHwidResets}
                    onChange={(e) => setMaxHwidResets(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingPanel(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 text-xs font-medium hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingPanel ? 'Save Changes' : 'Create Panel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!panelToDelete}
        title="Delete Security Panel"
        message={`Are you sure you want to delete panel "${panelToDelete?.name}"? Associated scripts will be unassigned.`}
        confirmLabel="Delete Panel"
        onConfirm={handleDelete}
        onCancel={() => setPanelToDelete(null)}
      />
    </div>
  );
};
