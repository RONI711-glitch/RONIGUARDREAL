import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Trash2,
  Search,
  Upload,
  Download,
  X,
  Layers,
  Cpu,
} from 'lucide-react';
import { api } from '../api.ts';
import { WhitelistEntry, Panel } from '../types.ts';
import { ConfirmModal } from '../components/ConfirmModal.tsx';

interface WhitelistViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const WhitelistView: React.FC<WhitelistViewProps> = ({ onShowToast }) => {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [panelFilter, setPanelFilter] = useState('all');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<WhitelistEntry | null>(null);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [platform, setPlatform] = useState<'discord' | 'roblox' | 'steam' | 'custom'>('discord');
  const [panelId, setPanelId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Import text
  const [importText, setImportText] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [wlData, pData] = await Promise.all([api.getWhitelist(), api.getPanels()]);
      setEntries(wlData);
      setPanels(pData);
      if (pData.length > 0 && !panelId) {
        setPanelId(pData[0].id);
      }
    } catch (err: any) {
      onShowToast('error', 'Failed to load whitelist', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setSubmitting(true);
    try {
      const created = await api.addWhitelist({
        identifier: identifier.trim(),
        platform,
        panelId: panelId || panels[0]?.id,
        note: note.trim(),
      });
      setEntries([created, ...entries]);
      setIsAddOpen(false);
      setIdentifier('');
      setNote('');
      onShowToast('success', 'User whitelisted', `Identifier "${created.identifier}" added.`);
    } catch (err: any) {
      onShowToast('error', 'Failed to add', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    try {
      await api.removeWhitelist(entryToDelete.id);
      setEntries(entries.filter((e) => e.id !== entryToDelete.id));
      onShowToast('success', 'Removed from whitelist', `Revoked access for "${entryToDelete.identifier}".`);
    } catch (err: any) {
      onShowToast('error', 'Failed to remove', err.message);
    } finally {
      setEntryToDelete(null);
    }
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `roniguard_whitelist_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('info', 'Export ready', 'Whitelist exported to JSON.');
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    try {
      let parsed = [];
      if (importText.trim().startsWith('[')) {
        parsed = JSON.parse(importText);
      } else {
        // Line-by-line identifiers
        parsed = importText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((id) => ({ identifier: id, platform, note: 'Imported' }));
      }

      const res = await api.importWhitelist(parsed, panelId || panels[0]?.id);
      setIsImportOpen(false);
      setImportText('');
      loadData();
      onShowToast('success', 'Import completed', `Added ${res.importedCount} whitelist entries.`);
    } catch (err: any) {
      onShowToast('error', 'Import failed', err.message || 'Invalid format');
    }
  };

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      e.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.note && e.note.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPanel = panelFilter === 'all' || e.panelId === panelFilter;
    return matchesSearch && matchesPanel;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Whitelist Access Control</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Manage authenticated platforms (Discord ID, Roblox UserId) authorized to execute protected scripts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-900/40 bg-purple-950/30 hover:bg-purple-900/40 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Import</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-900/40 bg-purple-950/30 hover:bg-purple-900/40 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Identity</span>
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
            placeholder="Search by Discord ID, Roblox UserId, or note..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
          />
        </div>

        <select
          value={panelFilter}
          onChange={(e) => setPanelFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-xs text-neutral-300 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Panels</option>
          {panels.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-7 h-7 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 text-center">
          <UserCheck className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Whitelist Records Found</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            Add platform IDs or link your existing Discord bot to manage whitelists automatically.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0f0a1c] border border-purple-900/25 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-900/25 bg-[#090514]/60 text-neutral-400 font-semibold">
                  <th className="py-3 px-4">Platform Identity</th>
                  <th className="py-3 px-4">Panel</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Hardware Binding</th>
                  <th className="py-3 px-4">Added Date</th>
                  <th className="py-3 px-4">Note</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/15">
                {filteredEntries.map((item) => {
                  const panel = panels.find((p) => p.id === item.panelId);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-950/20 transition-colors text-neutral-300"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-white">
                          {item.identifier}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-neutral-300">
                        {panel?.name || item.panelId}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="capitalize font-semibold text-purple-300">
                          {item.platform}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-400">
                        {item.boundHwid ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{item.boundHwid}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-600">Unbound</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-neutral-500">
                        {new Date(item.addedAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-neutral-400 truncate max-w-[140px]">
                        {item.note || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setEntryToDelete(item)}
                          className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
                          title="Revoke whitelist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f0a1c] border border-purple-900/40 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Add Whitelist Identity</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Authorize a user by Discord ID, Roblox UserID, or account handle.
            </p>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Platform
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['discord', 'roblox', 'steam', 'custom'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-semibold capitalize transition-all ${
                        platform === p
                          ? 'bg-purple-900/50 border border-purple-500 text-white shadow-sm'
                          : 'bg-[#080410] border border-purple-900/30 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Identifier (e.g. 728491028374829103 or Roblox UserID)
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 1827461928"
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Security Panel
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

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Note / User Tag (Optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Staff Member / Alpha Tester"
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 text-xs font-medium hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Adding...' : 'Add Whitelist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f0a1c] border border-purple-900/40 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsImportOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Import Whitelist Data</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Paste JSON array or line-by-line user identifiers.
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <textarea
                rows={6}
                required
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'728491028374829103\n891238472918237192\n...'}
                className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  Import Entries
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!entryToDelete}
        title="Revoke Whitelist Access"
        message={`Are you sure you want to revoke whitelist access for "${entryToDelete?.identifier}"?`}
        confirmLabel="Revoke Access"
        onConfirm={handleDelete}
        onCancel={() => setEntryToDelete(null)}
      />
    </div>
  );
};
