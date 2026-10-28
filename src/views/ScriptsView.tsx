import React, { useState, useEffect, useRef } from 'react';
import {
  FileCode2,
  Plus,
  Upload,
  Copy,
  Check,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  X,
  Play,
  Terminal,
  RefreshCw,
  Lock,
  Unlock,
  KeyRound,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api.ts';
import { ScriptItem, Panel, ScriptJobRecord } from '../types.ts';
import { ConfirmModal } from '../components/ConfirmModal.tsx';

interface ScriptsViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
  onNavigateToObfuscation?: (scriptId: string) => void;
}

const STAGES = [
  'Syntax & AST Validation',
  'Security Policy & Sandbox Analysis',
  'Register VM Intermediate Bytecode Generation',
  'Control-Flow Flattening & Anti-Tamper Sealing',
  'String Encryption & XOR Dynamic Table Virtualization',
  'Environment & Metatable Integrity Wall Injection',
  'Output Bytecode Verification & Checksum',
  'Script-Specific API Key Minting & Loadstring Finalization',
];

export const ScriptsView: React.FC<ScriptsViewProps> = ({ onShowToast }) => {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPanelFilter, setSelectedPanelFilter] = useState<string>('all');

  // Script Creation Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [scriptName, setScriptName] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [newPanelName, setNewPanelName] = useState('');
  const [isCreatingNewPanel, setIsCreatingNewPanel] = useState(false);
  const [sourceCode, setSourceCode] = useState('');
  const [obfuscationEnabled, setObfuscationEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Background Job Processing Modal
  const [activeJob, setActiveJob] = useState<ScriptJobRecord | null>(null);
  const [completedJobResult, setCompletedJobResult] = useState<{
    scriptId: string;
    scriptName: string;
    apiKey: string;
    loadstringUrl: string;
  } | null>(null);

  // In-Place Edit Modal
  const [scriptToEdit, setScriptToEdit] = useState<ScriptItem | null>(null);
  const [editSourceCode, setEditSourceCode] = useState('');
  const [editObfuscation, setEditObfuscation] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete modal
  const [scriptToDelete, setScriptToDelete] = useState<ScriptItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scriptsData, panelsData] = await Promise.all([api.getScripts(), api.getPanels()]);
      setScripts(scriptsData);
      setPanels(panelsData);
      if (panelsData.length > 0 && !selectedPanelId) {
        setSelectedPanelId(panelsData[0].id);
      }
    } catch (err: any) {
      onShowToast('error', 'Failed to load scripts', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Poll active background job
  const startJobPolling = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.getJobStatus(jobId);
        if (res.job) {
          setActiveJob(res.job);
          if (res.job.status === 'completed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            const loadUrl = `https://roniguardreal.wasmer.app/loader.lua?script=${res.job.scriptId}&key=${res.job.apiKey}`;
            setCompletedJobResult({
              scriptId: res.job.scriptId,
              scriptName: res.job.scriptName,
              apiKey: res.job.apiKey || '',
              loadstringUrl: loadUrl,
            });
            onShowToast('success', 'Script Processed & Secured', `API Key generated: ${res.job.apiKey}`);
            loadData();
          } else if (res.job.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            onShowToast('error', 'Processing Failed', res.job.error || 'Unknown error');
          }
        }
      } catch {
        // Continue polling
      }
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.lua') && !file.name.endsWith('.luau') && !file.name.endsWith('.txt')) {
      onShowToast('error', 'Invalid File', 'Only .lua, .luau, and .txt files are supported.');
      return;
    }

    if (!scriptName) {
      setScriptName(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSourceCode(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleCreateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptName.trim()) {
      onShowToast('warning', 'Missing Field', 'Please provide a script name.');
      return;
    }
    if (!sourceCode.trim()) {
      onShowToast('warning', 'Empty Script', 'Please paste or upload Lua source code.');
      return;
    }

    setIsSubmitting(true);
    try {
      let panelId = selectedPanelId;
      if (isCreatingNewPanel && newPanelName.trim()) {
        const p = await api.createPanel({ name: newPanelName.trim() });
        panelId = p.id;
        setPanels((prev) => [p, ...prev]);
      }

      const res = await api.processScriptJob({
        name: scriptName.trim(),
        panelId: panelId || panels[0]?.id || 'pnl_main',
        sourceCode: sourceCode.trim(),
        obfuscationEnabled,
      });

      setIsCreateOpen(false);
      setScriptName('');
      setSourceCode('');
      setIsCreatingNewPanel(false);
      setNewPanelName('');

      // Initialize active job tracker modal
      setActiveJob({
        id: res.jobId,
        scriptId: res.scriptId,
        userId: '',
        panelId,
        scriptName,
        status: 'processing',
        currentStageIndex: 0,
        currentStage: STAGES[0],
        progressPercent: 5,
        stages: STAGES.map((name, i) => ({ id: i + 1, name, status: i === 0 ? 'in_progress' : 'pending' })),
        obfuscationEnabled,
        apiKey: res.apiKey,
        sourceCodeLength: sourceCode.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      startJobPolling(res.jobId);
    } catch (err: any) {
      onShowToast('error', 'Creation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal & load source
  const handleOpenEdit = async (script: ScriptItem) => {
    setScriptToEdit(script);
    setEditObfuscation(script.isObfuscated ?? true);
    setEditSourceCode('Loading script source...');
    try {
      const src = await api.getScriptSource(script.id);
      setEditSourceCode(src || `-- Source code for ${script.filename}`);
    } catch {
      setEditSourceCode('-- Unable to load original source file');
    }
  };

  const handleSaveInPlaceEdit = async () => {
    if (!scriptToEdit) return;
    setIsSavingEdit(true);
    try {
      await api.updateScriptInPlace(scriptToEdit.id, {
        sourceCode: editSourceCode,
        obfuscationEnabled: editObfuscation,
      });
      onShowToast('success', 'Script Updated In-Place', 'Loadstring URL and API key remain unchanged!');
      setScriptToEdit(null);
      loadData();
    } catch (err: any) {
      onShowToast('error', 'Update Failed', err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteScript = async () => {
    if (!scriptToDelete) return;
    try {
      await api.deleteScript(scriptToDelete.id);
      setScripts((prev) => prev.filter((s) => s.id !== scriptToDelete.id));
      onShowToast('info', 'Script Deleted', `"${scriptToDelete.filename}" removed.`);
    } catch (err: any) {
      onShowToast('error', 'Delete Failed', err.message);
    } finally {
      setScriptToDelete(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast('success', 'Copied to Clipboard', text.substring(0, 50) + '...');
    setTimeout(() => setCopiedId(null), 2500);
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-purple-400" />
            Scripts & Deployments
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Build, protect with RONIGUARD MAX, and issue script-specific loadstring API keys.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Script
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scripts by filename or ID..."
            className="w-full pl-10 pr-4 py-2 bg-[#0d071a] border border-purple-900/30 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/60"
          />
        </div>

        <select
          value={selectedPanelFilter}
          onChange={(e) => setSelectedPanelFilter(e.target.value)}
          className="px-3 py-2 bg-[#0d071a] border border-purple-900/30 rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-purple-500/60"
        >
          <option value="all">All Panels</option>
          {panels.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Scripts Grid / List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
          Loading scripts and protection state...
        </div>
      ) : filteredScripts.length === 0 ? (
        <div className="p-12 border border-purple-900/20 rounded-2xl bg-[#0d071a]/40 text-center">
          <FileCode2 className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-neutral-300">No Scripts Found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-4">
            Create your first script with RONIGUARD MAX obfuscation to generate an executor loadstring.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Script Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScripts.map((script) => {
            const panel = panels.find((p) => p.id === script.panelId);
            const loadstringSnippet = `loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua?script=${script.id}&key=${script.apiKey || 'YOUR_KEY'}"))()`;

            return (
              <div
                key={script.id}
                className="bg-[#0e081c] border border-purple-900/30 hover:border-purple-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800/40 flex items-center justify-center shrink-0">
                        <FileCode2 className="w-4 h-4 text-purple-300" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{script.filename}</h4>
                        <span className="text-[10px] font-mono text-purple-400">{script.id}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        script.isObfuscated
                          ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {script.isObfuscated ? (
                        <>
                          <Lock className="w-3 h-3 text-purple-400" />
                          MAX
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3" />
                          Plain
                        </>
                      )}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-400 mb-4 bg-purple-950/20 p-3 rounded-xl border border-purple-900/20">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Panel:</span>
                      <span className="text-neutral-300 font-medium truncate max-w-[150px]">
                        {panel?.name || script.panelId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">API Key:</span>
                      <span className="font-mono text-[11px] text-emerald-400 font-bold truncate max-w-[140px]">
                        {script.apiKey || 'Generated upon deployment'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Original Size:</span>
                      <span className="font-mono text-neutral-300">
                        {(script.originalSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-purple-900/20">
                  <button
                    onClick={() => copyToClipboard(loadstringSnippet, `ls_${script.id}`)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/40 text-purple-200 text-xs font-semibold transition-all"
                  >
                    {copiedId === `ls_${script.id}` ? (
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(script)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[11px] border border-neutral-800 transition-all"
                    >
                      <Edit2 className="w-3 h-3 text-neutral-400" />
                      Edit Script
                    </button>
                    <button
                      onClick={() => setScriptToDelete(script)}
                      className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-800/40 transition-all"
                      title="Delete script"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE SCRIPT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f0920] border border-purple-700/40 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-purple-900/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Create & Protect Script</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateScript} className="p-6 overflow-y-auto space-y-5 flex-1">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">Script Name</label>
                <input
                  type="text"
                  required
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  placeholder="e.g. CombatHub, AutoFarm, UniversalLoader"
                  className="w-full px-3.5 py-2.5 bg-[#0a0515] border border-purple-900/40 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Panel Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-300">Target Panel</label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewPanel(!isCreatingNewPanel)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    {isCreatingNewPanel ? 'Use Existing Panel' : '+ Create New Panel'}
                  </button>
                </div>

                {isCreatingNewPanel ? (
                  <input
                    type="text"
                    value={newPanelName}
                    onChange={(e) => setNewPanelName(e.target.value)}
                    placeholder="Enter new panel name..."
                    className="w-full px-3.5 py-2.5 bg-[#0a0515] border border-purple-900/40 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                ) : (
                  <select
                    value={selectedPanelId}
                    onChange={(e) => setSelectedPanelId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0a0515] border border-purple-900/40 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
                  >
                    {panels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Obfuscation Engine (Single Engine: RONIGUARD MAX with ON/OFF Toggle) */}
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-900/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">RONIGUARD MAX Obfuscation</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-800/60 text-purple-200">
                      REGISTER VM
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Transforms code with Register VM virtualization, dynamic XOR strings & metatable security walls.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={obfuscationEnabled}
                    onChange={(e) => setObfuscationEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Lua Source Code Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-300">Lua / Luau Source Code</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload File (.lua)
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".lua,.luau,.txt"
                    className="hidden"
                  />
                </div>
                <textarea
                  required
                  rows={8}
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  placeholder="-- Paste your raw Lua script here&#10;print('Hello from RONIGUARD!')&#10;local Player = game.Players.LocalPlayer"
                  className="w-full p-3 font-mono text-xs bg-[#090412] border border-purple-900/40 rounded-xl text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 border-t border-purple-900/30 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Initiating Pipeline...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Save & Deploy Script
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE 8-STAGE BACKGROUND PROCESSING TRACKER MODAL */}
      {activeJob && !completedJobResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f0920] border border-purple-600/60 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-900/50 border border-purple-500/40 flex items-center justify-center animate-pulse">
                <RefreshCw className="w-5 h-5 text-purple-300 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Processing Script Payload</h3>
                <p className="text-xs text-neutral-400">{activeJob.scriptName}</p>
              </div>
            </div>

            {/* Overall progress bar */}
            <div>
              <div className="flex justify-between text-xs font-bold text-purple-300 mb-1.5">
                <span>Stage {activeJob.currentStageIndex + 1} of 8</span>
                <span>{activeJob.progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-purple-950">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-700 ease-out"
                  style={{ width: `${activeJob.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Stage Items */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {STAGES.map((stageName, idx) => {
                const isPassed = idx < activeJob.currentStageIndex;
                const isCurrent = idx === activeJob.currentStageIndex;

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
                      isCurrent
                        ? 'bg-purple-900/40 border border-purple-500/50 text-white font-bold'
                        : isPassed
                        ? 'text-neutral-400 bg-neutral-900/40'
                        : 'text-neutral-600'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-neutral-700 shrink-0" />
                    )}
                    <span className="truncate">{stageName}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-neutral-500 text-center">
              Processing occurs in a secure server-side worker sandbox. Survives page reload.
            </p>
          </div>
        </div>
      )}

      {/* COMPLETED RESULT MODAL WITH GENERATED API KEY & LOADSTRING */}
      {completedJobResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f0920] border border-emerald-500/50 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Script Deployed & Protected</h3>
                <p className="text-xs text-neutral-400">"{completedJobResult.scriptName}" is ready for executors</p>
              </div>
            </div>

            {/* Generated API Key Card */}
            <div className="p-4 rounded-xl bg-[#090412] border border-purple-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                  Script-Specific API Key:
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  ACTIVE
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/60 font-mono text-xs text-white border border-neutral-800">
                <span className="truncate select-all">{completedJobResult.apiKey}</span>
                <button
                  onClick={() => copyToClipboard(completedJobResult.apiKey, 'modal_api_key')}
                  className="p-1 hover:text-purple-300"
                >
                  {copiedId === 'modal_api_key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Loadstring Snippet Card */}
            <div className="p-4 rounded-xl bg-[#090412] border border-purple-900/40 space-y-2">
              <span className="text-xs font-semibold text-neutral-300">Roblox Executor Loadstring:</span>
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-black/60 font-mono text-[11px] text-purple-200 border border-neutral-800 overflow-x-auto">
                <code className="break-all">{`loadstring(game:HttpGet("${completedJobResult.loadstringUrl}"))()`}</code>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `loadstring(game:HttpGet("${completedJobResult.loadstringUrl}"))()`,
                      'modal_loadstring'
                    )
                  }
                  className="p-1 hover:text-purple-300 shrink-0"
                >
                  {copiedId === 'modal_loadstring' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setCompletedJobResult(null);
                  setActiveJob(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-PLACE SCRIPT UPDATE MODAL */}
      {scriptToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f0920] border border-purple-700/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-purple-900/30 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Update Script In-Place</h3>
                <p className="text-xs text-neutral-400">
                  Loadstring URL and API key will stay the same for existing users.
                </p>
              </div>
              <button
                onClick={() => setScriptToEdit(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300">Updated Source Code</span>
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Replace from File
                </button>
                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setEditSourceCode(ev.target?.result as string);
                    reader.readAsText(file);
                  }}
                  accept=".lua,.luau,.txt"
                  className="hidden"
                />
              </div>

              <textarea
                rows={10}
                value={editSourceCode}
                onChange={(e) => setEditSourceCode(e.target.value)}
                className="w-full p-3 font-mono text-xs bg-[#090412] border border-purple-900/40 rounded-xl text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-purple-500"
              />

              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-900/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">
                  RONIGUARD MAX Protection
                </span>
                <input
                  type="checkbox"
                  checked={editObfuscation}
                  onChange={(e) => setEditObfuscation(e.target.checked)}
                  className="w-4 h-4 accent-purple-600"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-purple-900/30 flex items-center justify-end gap-3">
              <button
                onClick={() => setScriptToEdit(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInPlaceEdit}
                disabled={isSavingEdit}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Updating In-Place...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!scriptToDelete}
        title="Delete Script"
        message={`Are you sure you want to delete "${scriptToDelete?.filename}"? This will permanently revoke its API key and disable its loadstring URL.`}
        confirmText="Delete Script"
        confirmVariant="danger"
        onConfirm={handleDeleteScript}
        onCancel={() => setScriptToDelete(null)}
      />
    </div>
  );
};
