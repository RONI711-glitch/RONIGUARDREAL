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
  RefreshCw,
  FileUp,
  Code2,
  Lock,
} from 'lucide-react';
import { api, WASMER_APP_URL } from '../api.ts';
import { ScriptItem, Panel } from '../types.ts';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import { SentinelLoadstringCard } from '../components/SentinelLoadstringCard.tsx';
import { SectionId } from '../components/Sidebar.tsx';
import { CLIENT_ENGINES } from '../utils/clientObfuscator.ts';

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

  // Edit & Update Script states
  const [scriptToEdit, setScriptToEdit] = useState<ScriptItem | null>(null);
  const [editFilename, setEditFilename] = useState('');
  const [editPanelId, setEditPanelId] = useState('');
  const [editSourceCode, setEditSourceCode] = useState('');
  const [editEngine, setEditEngine] = useState('AidenFuscators-Register-VM');
  const [editProfile, setEditProfile] = useState<'basic' | 'advanced' | 'maximum'>('advanced');
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);
  const [scriptToDelete, setScriptToDelete] = useState<ScriptItem | null>(null);
  const [selectedScriptForLoader, setSelectedScriptForLoader] = useState<ScriptItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleOpenUpdateModal = async (script: ScriptItem) => {
    setScriptToEdit(script);
    setEditFilename(script.filename);
    setEditPanelId(script.panelId);
    setEditEngine('AidenFuscators-Register-VM');
    setEditProfile('advanced');
    setEditSourceCode('');

    try {
      const src = await api.getScriptSource(script.id);
      if (src) setEditSourceCode(src);
    } catch {
      // Ignore source pre-fill errors
    }
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.lua') && !file.name.endsWith('.luau') && !file.name.endsWith('.txt')) {
      onShowToast('error', 'Invalid file type', 'Only .lua, .luau, and .txt files are allowed.');
      return;
    }

    setEditFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setEditSourceCode(event.target?.result as string);
      onShowToast('info', 'New file loaded', `Loaded "${file.name}" into editor. Click Save to re-obfuscate.`);
    };
    reader.readAsText(file);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptToEdit || !editFilename.trim()) return;

    setIsUpdatingScript(true);
    try {
      const updated = await api.updateScript(scriptToEdit.id, {
        filename: editFilename.trim(),
        panelId: editPanelId,
        newSourceCode: editSourceCode.trim() || undefined,
        engine: editEngine,
        profile: editProfile,
      });

      setScripts(scripts.map((s) => (s.id === updated.id ? updated : s)));
      setScriptToEdit(null);
      setEditSourceCode('');
      onShowToast(
        'success',
        'Script Updated & Re-Obfuscated!',
        `Saved changes to "${updated.filename}". Existing loadstrings now deliver the updated script without changing URLs.`
      );
    } catch (err: any) {
      onShowToast('error', 'Update failed', err.message);
    } finally {
      setIsUpdatingScript(false);
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
                            onClick={() => handleOpenUpdateModal(script)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-300 hover:text-white rounded-lg bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 transition-colors"
                            title="Update Script & Replace Code (Loadstring unchanged)"
                          >
                            <RefreshCw className="w-3 h-3 text-purple-400" />
                            <span>Update</span>
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

      {/* Update Script & Code Modal (Loadstring Remains Valid) */}
      {scriptToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0e081c] border border-purple-800/50 rounded-2xl p-6 shadow-2xl relative my-8 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-purple-900/30 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Update Script &amp; Code
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                    Loadstring Unchanged
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Replace or modify this script's code without breaking existing loadstrings. All executors and users using your loadstring will immediately receive this updated code on their next execution.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScriptToEdit(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Loadstring URL Unchanged Notification */}
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Existing Permanent Loadstring:</span>
                </span>
                <span className="text-emerald-400 text-[10px] font-mono">Zero 404 Guaranteed</span>
              </div>
              <div className="p-2 rounded-lg bg-black/70 border border-purple-900/40 text-[11px] font-mono text-cyan-300 break-all select-all">
                loadstring(game:HttpGet("{WASMER_APP_URL}/loader.lua"))()
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* File Info Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Script Filename
                  </label>
                  <input
                    type="text"
                    required
                    value={editFilename}
                    onChange={(e) => setEditFilename(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Assigned Panel
                  </label>
                  <select
                    value={editPanelId}
                    onChange={(e) => setEditPanelId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:border-purple-500 focus:outline-none"
                  >
                    {panels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Single Obfuscation Engine Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Obfuscation Engine
                  </label>
                  <span className="text-[10px] font-medium text-amber-400">
                    ⚡ Strict Single-Engine Execution (No Stacking)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {CLIENT_ENGINES.map((eng) => {
                    const isSelected = editEngine === eng.id;
                    return (
                      <button
                        key={eng.id}
                        type="button"
                        onClick={() => setEditEngine(eng.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-purple-900/40 border-purple-500 shadow-md shadow-purple-950 text-white'
                            : 'bg-[#080410] border-purple-900/20 text-neutral-400 hover:text-neutral-200 hover:border-purple-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold truncate">{eng.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                        </div>
                        <span className="text-[10px] text-neutral-400 line-clamp-1 block">
                          v{eng.version}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Security Profile */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Protection Profile
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['basic', 'advanced', 'maximum'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditProfile(p)}
                      className={`py-1.5 px-3 rounded-xl border text-xs font-bold uppercase transition-all ${
                        editProfile === p
                          ? 'bg-purple-600 border-purple-400 text-white'
                          : 'bg-[#080410] border-purple-900/30 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Editor & File Replacement Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Script Source Code (Edit or Upload New File)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={editFileInputRef}
                      onChange={handleEditFileSelect}
                      accept=".lua,.luau,.txt"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-purple-700/50 bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 text-[11px] font-semibold transition-colors"
                    >
                      <FileUp className="w-3 h-3 text-purple-400" />
                      <span>Upload New File</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={8}
                    value={editSourceCode}
                    onChange={(e) => setEditSourceCode(e.target.value)}
                    placeholder="-- Paste or edit your updated Lua / Luau source code here...&#10;print('Hello World - Updated Script')"
                    className="w-full p-3 rounded-xl bg-[#06030c] border border-purple-900/40 text-neutral-200 font-mono text-xs focus:border-purple-500 focus:outline-none leading-relaxed resize-y"
                  />
                  <div className="text-[10px] text-neutral-500 text-right mt-0.5 font-mono">
                    {editSourceCode.length} characters · {editSourceCode.split('\n').length} lines
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-purple-900/30">
                <button
                  type="button"
                  disabled={isUpdatingScript}
                  onClick={() => setScriptToEdit(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 text-xs hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingScript || !editFilename.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-900/40 transition-all"
                >
                  {isUpdatingScript ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Updating &amp; Re-Obfuscating...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Save Changes &amp; Update Script</span>
                    </>
                  )}
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
