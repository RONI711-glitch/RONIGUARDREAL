import React, { useState, useEffect, useRef } from 'react';
import {
  FileCode2,
  Upload,
  Download,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileText,
  X,
  Play,
  Terminal,
} from 'lucide-react';
import { api } from '../api.ts';
import { ScriptItem, Panel } from '../types.ts';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import { SentinelLoadstringCard } from '../components/SentinelLoadstringCard.tsx';
import { SectionId } from '../components/Sidebar.tsx';

interface ScriptsViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
  onNavigateToObfuscation: (scriptId: string) => void;
}

export const ScriptsView: React.FC<ScriptsViewProps> = ({
  onShowToast,
  onNavigateToObfuscation,
}) => {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPanelFilter, setSelectedPanelFilter] = useState<string>('all');

  // Upload modal states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadSource, setUploadSource] = useState('');
  const [uploadPanelId, setUploadPanelId] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Edit / Delete states
  const [scriptToEdit, setScriptToEdit] = useState<ScriptItem | null>(null);
  const [editFilename, setEditFilename] = useState('');
  const [editPanelId, setEditPanelId] = useState('');
  const [scriptToDelete, setScriptToDelete] = useState<ScriptItem | null>(null);
  const [selectedScriptForLoader, setSelectedScriptForLoader] = useState<ScriptItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scriptsData, panelsData] = await Promise.all([api.getScripts(), api.getPanels()]);
      setScripts(scriptsData);
      setPanels(panelsData);
      if (panelsData.length > 0 && !uploadPanelId) {
        setUploadPanelId(panelsData[0].id);
      }
    } catch (err: any) {
      onShowToast('error', 'Failed to load scripts', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.lua') && !file.name.endsWith('.luau') && !file.name.endsWith('.txt')) {
      onShowToast('error', 'Invalid file type', 'Only .lua, .luau, and .txt files are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onShowToast('error', 'File too large', 'Max file size is 10 MB.');
      return;
    }

    setUploadFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadSource(event.target?.result as string);
      setIsUploadOpen(true);
    };
    reader.readAsText(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFilename.trim() || !uploadSource.trim()) return;

    setUploading(true);
    try {
      const res = await api.uploadScript(
        uploadFilename.trim(),
        uploadSource,
        uploadPanelId || panels[0]?.id,
        uploadNotes
      );
      setScripts([res.script, ...scripts]);
      setIsUploadOpen(false);
      setUploadFilename('');
      setUploadSource('');
      onShowToast('success', 'Script uploaded & secured', `"${res.script.filename}" was processed.`);
    } catch (err: any) {
      onShowToast('error', 'Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptToEdit || !editFilename.trim()) return;

    try {
      const updated = await api.updateScript(scriptToEdit.id, {
        filename: editFilename.trim(),
        panelId: editPanelId,
      });
      setScripts(scripts.map((s) => (s.id === updated.id ? updated : s)));
      setScriptToEdit(null);
      onShowToast('success', 'Script updated', `Saved changes to "${updated.filename}".`);
    } catch (err: any) {
      onShowToast('error', 'Update failed', err.message);
    }
  };

  const handleDelete = async () => {
    if (!scriptToDelete) return;
    try {
      await api.deleteScript(scriptToDelete.id);
      setScripts(scripts.filter((s) => s.id !== scriptToDelete.id));
      onShowToast('success', 'Script removed', `Deleted "${scriptToDelete.filename}".`);
    } catch (err: any) {
      onShowToast('error', 'Delete failed', err.message);
    } finally {
      setScriptToDelete(null);
    }
  };

  const handleDownloadProtected = async (script: ScriptItem) => {
    try {
      await api.downloadProtectedScript(script.id, script.filename);
      onShowToast('success', 'Download initiated', `Saving protected copy of "${script.filename}".`);
    } catch (err: any) {
      onShowToast('error', 'Download failed', err.message);
    }
  };

  const filteredScripts = scripts.filter((s) => {
    const matchesSearch =
      s.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPanel = selectedPanelFilter === 'all' || s.panelId === selectedPanelFilter;
    return matchesSearch && matchesPanel;
  });

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Script Management</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Manage your Lua / Luau codebase. Original files are safely held in the private backend vault.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".lua,.luau,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-purple-900/40 bg-purple-950/30 hover:bg-purple-900/40 text-neutral-200 text-xs font-medium transition-colors"
          >
            <Upload className="w-4 h-4 text-purple-400" />
            <span>Select File</span>
          </button>
          <button
            onClick={() => {
              setUploadFilename('');
              setUploadSource('');
              setIsUploadOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 transition-all"
          >
            <FileCode2 className="w-4 h-4" />
            <span>Paste / Create</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scripts by filename or ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
          />
        </div>

        <select
          value={selectedPanelFilter}
          onChange={(e) => setSelectedPanelFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 text-xs text-neutral-300 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Security Panels</option>
          {panels.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Scripts Table / Cards */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-7 h-7 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filteredScripts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 text-center">
          <FileCode2 className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Scripts Stored</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No scripts match the search criteria.'
              : 'Upload a Lua or Luau script to initiate genuine protection.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0f0a1c] border border-purple-900/25 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-900/25 bg-[#090514]/60 text-neutral-400 font-semibold">
                  <th className="py-3 px-4">Script Filename</th>
                  <th className="py-3 px-4">Panel</th>
                  <th className="py-3 px-4">Raw Size</th>
                  <th className="py-3 px-4">Protected Size</th>
                  <th className="py-3 px-4">Build Status</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/15">
                {filteredScripts.map((script) => {
                  const panel = panels.find((p) => p.id === script.panelId);

                  return (
                    <tr
                      key={script.id}
                      className="hover:bg-purple-950/20 transition-colors text-neutral-300"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <FileCode2 className="w-4 h-4 text-purple-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-white font-mono truncate block">
                              {script.filename}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {script.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-neutral-300">
                        {panel?.name || 'Unassigned'}
                      </td>

                      <td className="py-3.5 px-4 font-mono tabular-nums text-neutral-400">
                        {(script.originalSize / 1024).toFixed(1)} KB
                      </td>

                      <td className="py-3.5 px-4 font-mono tabular-nums text-purple-300">
                        {script.protectedSize ? `${(script.protectedSize / 1024).toFixed(1)} KB` : '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold capitalize ${
                            script.status === 'obfuscated'
                              ? 'text-emerald-400'
                              : script.status === 'ready'
                              ? 'text-blue-400'
                              : 'text-red-400'
                          }`}
                        >
                          {script.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-400 font-mono text-[11px] tabular-nums">
                        {new Date(script.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedScriptForLoader(script)}
                            className="p-1.5 text-neutral-400 hover:text-purple-300 rounded-lg hover:bg-purple-950/40 transition-colors"
                            title="Get Sentinel Loadstring (Air-Gap Protected)"
                          >
                            <Terminal className="w-3.5 h-3.5 text-purple-400" />
                          </button>

                          <button
                            onClick={() => onNavigateToObfuscation(script.id)}
                            className="p-1.5 text-neutral-400 hover:text-purple-300 rounded-lg hover:bg-purple-950/40 transition-colors"
                            title="Re-obfuscate or configure build"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>

                          {script.protectedFileId && (
                            <button
                              onClick={() => handleDownloadProtected(script)}
                              className="p-1.5 text-neutral-400 hover:text-emerald-400 rounded-lg hover:bg-emerald-950/30 transition-colors"
                              title="Download protected output"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setScriptToEdit(script);
                              setEditFilename(script.filename);
                              setEditPanelId(script.panelId);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-purple-950/40 transition-colors"
                            title="Rename or reassign"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setScriptToDelete(script)}
                            className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
                            title="Delete script and build"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload / Create Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0f0a1c] border border-purple-900/40 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Upload Lua/Luau Script</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Original code will be saved in private storage and processed with the panel's protection profile.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Filename (e.g. main.lua, loader.luau)
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadFilename}
                    onChange={(e) => setUploadFilename(e.target.value)}
                    placeholder="script_core.lua"
                    className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Target Panel
                  </label>
                  <select
                    value={uploadPanelId}
                    onChange={(e) => setUploadPanelId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    {panels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.protectionProfile})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Lua / Luau Source Code
                </label>
                <textarea
                  rows={10}
                  required
                  value={uploadSource}
                  onChange={(e) => setUploadSource(e.target.value)}
                  placeholder="-- Paste your Lua script here..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[#080410] border border-purple-900/40 text-neutral-200 text-xs font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 text-xs font-medium hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploading ? 'Processing Obfuscation...' : 'Store & Secure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {scriptToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f0a1c] border border-purple-900/40 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-3">Edit Script Metadata</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Filename
                </label>
                <input
                  type="text"
                  required
                  value={editFilename}
                  onChange={(e) => setEditFilename(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Assigned Panel
                </label>
                <select
                  value={editPanelId}
                  onChange={(e) => setEditPanelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs"
                >
                  {panels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setScriptToEdit(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sentinel Loadstring Modal */}
      {selectedScriptForLoader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0f0a1c] border border-purple-900/50 rounded-2xl p-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedScriptForLoader(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <SentinelLoadstringCard
              scriptId={selectedScriptForLoader.id}
              filename={selectedScriptForLoader.filename}
              onShowToast={onShowToast}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!scriptToDelete}
        title="Delete Script"
        message={`Are you sure you want to permanently delete "${scriptToDelete?.filename}"? Both original source and protected builds will be deleted.`}
        confirmLabel="Delete Script"
        onConfirm={handleDelete}
        onCancel={() => setScriptToDelete(null)}
      />
    </div>
  );
};
