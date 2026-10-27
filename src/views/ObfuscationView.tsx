import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Play,
  Download,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Settings,
  ShieldCheck,
  FileCode2,
  Code2,
  Copy,
  Check,
  Upload,
  FileUp,
  X,
  FileText,
  Save,
} from 'lucide-react';
import { api } from '../api.ts';
import { ScriptItem, Panel, ObfuscationEngineInfo } from '../types.ts';
import { SentinelLoadstringCard } from '../components/SentinelLoadstringCard.tsx';

interface ObfuscationViewProps {
  initialScriptId?: string | null;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

interface UploadedScriptFile {
  name: string;
  size: number;
  content: string;
}

export const ObfuscationView: React.FC<ObfuscationViewProps> = ({
  initialScriptId,
  onShowToast,
}) => {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [engines, setEngines] = useState<ObfuscationEngineInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected mode: 'upload' | 'adhoc' | 'stored'
  const [mode, setMode] = useState<'upload' | 'adhoc' | 'stored'>(
    initialScriptId ? 'stored' : 'upload'
  );

  // Upload File mode state
  const [uploadedFile, setUploadedFile] = useState<UploadedScriptFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saveToVault, setSaveToVault] = useState(true);

  // Stored mode state
  const [selectedScriptId, setSelectedScriptId] = useState<string>(initialScriptId || '');

  // Adhoc mode state
  const [adhocSource, setAdhocSource] = useState<string>(
    `-- RONIGUARD Sample Lua Script\nlocal function greet(name)\n  print("Hello, " .. name)\n  return 42 * 2\nend\ngreet("Authorized User")`
  );
  const [adhocFilename, setAdhocFilename] = useState('custom_script.lua');

  const [selectedPanelId, setSelectedPanelId] = useState<string>('');

  // Engine & Profile options
  const [selectedEngine, setSelectedEngine] = useState('AidenFuscators-Register-VM');
  const [selectedProfile, setSelectedProfile] = useState<'basic' | 'advanced' | 'maximum'>('advanced');
  const [stringEncryption, setStringEncryption] = useState(true);
  const [controlFlow, setControlFlow] = useState(false);
  const [constantVirtualization, setConstantVirtualization] = useState(true);
  const [variableRenaming, setVariableRenaming] = useState(true);
  const [antiTamper, setAntiTamper] = useState(true);
  const [watermarkCheck, setWatermarkCheck] = useState(true);
  const [customWatermark, setCustomWatermark] = useState('PROTECTED_BY_RONIGUARD');
  const [vykusMode, setVykusMode] = useState<'vm' | 'classic'>('vm');
  const [vykusLayers, setVykusLayers] = useState<number>(2);
  const [securityWalls, setSecurityWalls] = useState(true);

  // Build execution state
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [lastBuildResult, setLastBuildResult] = useState<any>(null);
  const [previewSnippet, setPreviewSnippet] = useState<string | null>(null);
  const [fullProtectedCode, setFullProtectedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const adhocFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [scriptsData, panelsData, enginesData] = await Promise.all([
          api.getScripts(),
          api.getPanels(),
          api.getEngines(),
        ]);
        setScripts(scriptsData);
        setPanels(panelsData);
        setEngines(enginesData);
        if (enginesData.length > 0) {
          const defaultEng = enginesData.find((e) => e.isDefault) || enginesData[0];
          setSelectedEngine(defaultEng.id);
        }

        if (initialScriptId && scriptsData.some((s) => s.id === initialScriptId)) {
          setSelectedScriptId(initialScriptId);
          setMode('stored');
        } else if (scriptsData.length > 0) {
          setSelectedScriptId(scriptsData[0].id);
        }

        if (panelsData.length > 0) {
          setSelectedPanelId(panelsData[0].id);
        }
      } catch (err: any) {
        onShowToast('error', 'Failed to load obfuscation environment', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [initialScriptId]);

  // Adjust toggles when profile changes
  const handleProfileChange = (p: 'basic' | 'advanced' | 'maximum') => {
    setSelectedProfile(p);
    if (p === 'basic') {
      setStringEncryption(true);
      setControlFlow(false);
      setConstantVirtualization(false);
      setVariableRenaming(true);
      setAntiTamper(true);
      setVykusMode('classic');
      setVykusLayers(1);
      setSecurityWalls(true);
    } else if (p === 'advanced') {
      setStringEncryption(true);
      setControlFlow(false);
      setConstantVirtualization(true);
      setVariableRenaming(true);
      setAntiTamper(true);
      setVykusMode('vm');
      setVykusLayers(2);
      setSecurityWalls(true);
    } else if (p === 'maximum') {
      setStringEncryption(true);
      setControlFlow(true);
      setConstantVirtualization(true);
      setVariableRenaming(true);
      setAntiTamper(true);
      setVykusMode('vm');
      setVykusLayers(3);
      setSecurityWalls(true);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.name.endsWith('.lua') && !file.name.endsWith('.luau') && !file.name.endsWith('.txt')) {
      onShowToast('error', 'Unsupported File', 'Please upload a .lua, .luau, or .txt script.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      onShowToast('error', 'File Too Large', 'Maximum file size is 15 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setUploadedFile({
        name: file.name,
        size: file.size,
        content,
      });
      setCustomWatermark(`${file.name} · RONIGUARD`);
      onShowToast('success', 'File Loaded', `Ready to obfuscate "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleAdhocFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setAdhocSource(content);
      setAdhocFilename(file.name);
      onShowToast('info', 'Imported into Editor', file.name);
    };
    reader.readAsText(file);
  };

  const handleRunBuild = async () => {
    setIsBuilding(true);
    setBuildProgress(15);
    setLastBuildResult(null);
    setPreviewSnippet(null);
    setFullProtectedCode(null);

    // Simulate pipeline stage progress
    const timer = setInterval(() => {
      setBuildProgress((prev) => (prev < 85 ? prev + 25 : prev));
    }, 120);

    try {
      const options = {
        profile: selectedProfile,
        engine: selectedEngine,
        stringEncryption,
        controlFlow: controlFlow || selectedProfile === 'maximum',
        constantVirtualization,
        variableRenaming,
        antiTamper,
        watermarkCheck,
        customWatermark: customWatermark.trim(),
        vykusMode,
        vykusLayers,
        securityWalls,
      };

      let buildOutput: any = null;

      if (mode === 'upload' && uploadedFile) {
        if (saveToVault) {
          // Upload to private vault and auto-obfuscate
          const uploadRes = await api.uploadScript(
            uploadedFile.name,
            uploadedFile.content,
            selectedPanelId || panels[0]?.id
          );
          buildOutput = uploadRes.build;
          // Refresh stored scripts in background
          api.getScripts().then(setScripts).catch(() => {});
        } else {
          // Direct adhoc build of uploaded file
          const res = await api.triggerBuild({
            rawSource: uploadedFile.content,
            filename: uploadedFile.name,
            options,
            panelId: selectedPanelId,
          });
          buildOutput = res.build;
          if (res.fullTransformedCode) {
            setFullProtectedCode(res.fullTransformedCode);
          }
          if (res.transformedPreview) {
            setPreviewSnippet(res.transformedPreview);
          }
        }
      } else if (mode === 'stored') {
        const res = await api.triggerBuild({
          scriptId: selectedScriptId,
          options,
          panelId: selectedPanelId,
        });
        buildOutput = res.build;
        if (res.fullTransformedCode) setFullProtectedCode(res.fullTransformedCode);
        if (res.transformedPreview) setPreviewSnippet(res.transformedPreview);
      } else {
        // Adhoc sandbox
        const res = await api.triggerBuild({
          rawSource: adhocSource,
          filename: adhocFilename,
          options,
          panelId: selectedPanelId,
        });
        buildOutput = res.build;
        if (res.fullTransformedCode) setFullProtectedCode(res.fullTransformedCode);
        if (res.transformedPreview) setPreviewSnippet(res.transformedPreview);
      }

      clearInterval(timer);
      setBuildProgress(100);

      if (buildOutput && buildOutput.status === 'success') {
        setLastBuildResult(buildOutput);
        if (!previewSnippet) {
          setPreviewSnippet(`-- [RONIGUARD PROTECTED]\n-- Target: ${buildOutput.filename}\n-- Protected by ${buildOutput.engine}\n-- Output is compiled and ready for download`);
        }
        onShowToast('success', 'Obfuscation Complete', `Built with ${selectedEngine} in ${buildOutput.durationMs}ms`);
      } else {
        setLastBuildResult({ status: 'failed', errorMsg: buildOutput?.errorMsg || 'Transformation failed.' });
        onShowToast('error', 'Build Failed', buildOutput?.errorMsg || 'Transformation error occurred.');
      }
    } catch (err: any) {
      clearInterval(timer);
      setBuildProgress(0);
      onShowToast('error', 'Execution Error', err.message);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleCopyPreview = () => {
    const textToCopy = fullProtectedCode || previewSnippet;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast('info', 'Copied to Clipboard', 'Protected Lua code copied.');
  };

  const handleDownloadOutput = () => {
    let filenameToSave = 'protected_script.lua';
    if (uploadedFile?.name) {
      filenameToSave = `protected_${uploadedFile.name}`;
    } else if (lastBuildResult?.filename) {
      filenameToSave = `protected_${lastBuildResult.filename}`;
    }

    if (lastBuildResult?.scriptId && lastBuildResult.scriptId !== 'adhoc') {
      api.downloadProtectedScript(lastBuildResult.scriptId, filenameToSave.replace('protected_', '')).catch(() => {
        // Fallback to client blob
        fallbackBlobDownload(filenameToSave);
      });
      return;
    }

    fallbackBlobDownload(filenameToSave);
  };

  const fallbackBlobDownload = (filename: string) => {
    const content = fullProtectedCode || previewSnippet || '-- Protected by RONIGUARD';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('success', 'Download Started', filename);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-7 h-7 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".lua,.luau,.txt"
        className="hidden"
      />
      <input
        type="file"
        ref={adhocFileInputRef}
        onChange={handleAdhocFileImport}
        accept=".lua,.luau,.txt"
        className="hidden"
      />

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Obfuscation Pipeline Studio</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Select or upload your Lua / Luau file, choose your protection engine, and generate secure output.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Source Selection, File Dropzone & Editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#090514] border border-purple-900/30 rounded-xl">
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'upload'
                  ? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Upload Lua File</span>
            </button>

            <button
              onClick={() => setMode('adhoc')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'adhoc'
                  ? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Paste Code</span>
            </button>

            <button
              onClick={() => setMode('stored')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'stored'
                  ? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>From Vault ({scripts.length})</span>
            </button>
          </div>

          {/* MODE 1: Direct File Upload Zone */}
          {mode === 'upload' && (
            <div className="space-y-3">
              {!uploadedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                    isDragging
                      ? 'border-purple-400 bg-purple-950/40 scale-[1.01]'
                      : 'border-purple-800/40 bg-[#0f0a1c] hover:border-purple-600/60 hover:bg-[#130c24]'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-3 shadow-lg shadow-purple-900/30">
                    <FileUp className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Select or Drop Your Lua / Luau File Here
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-sm mb-4">
                    Supports <span className="text-purple-300 font-mono">.lua</span>, <span className="text-purple-300 font-mono">.luau</span>, and <span className="text-purple-300 font-mono">.txt</span> files up to 15 MB.
                  </p>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose File from Device</span>
                  </button>
                </div>
              ) : (
                /* File Loaded Card */
                <div className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-600/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                        <FileCode2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white font-mono truncate">
                          {uploadedFile.name}
                        </h4>
                        <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                          {(uploadedFile.size / 1024).toFixed(1)} KB · {uploadedFile.content.split('\n').length} lines
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-purple-900/40 hover:bg-purple-950/50 text-neutral-300 text-xs font-medium"
                      >
                        Change File
                      </button>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* File Preview */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-neutral-400 block">
                      Script Source Preview:
                    </span>
                    <pre className="p-3 rounded-xl bg-[#080410] border border-purple-900/30 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-40 leading-relaxed">
                      {uploadedFile.content.slice(0, 1000)}
                      {uploadedFile.content.length > 1000 && '\n-- ... (content truncated for preview)'}
                    </pre>
                  </div>

                  {/* Save to vault toggle */}
                  <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveToVault}
                      onChange={(e) => setSaveToVault(e.target.checked)}
                      className="w-4 h-4 accent-purple-600 rounded"
                    />
                    <span>Also save a backup copy to my private Owner Vault for this panel</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: Paste Code */}
          {mode === 'adhoc' && (
            <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/25 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-neutral-300">
                    Lua/Luau Code Editor
                  </label>
                  <input
                    type="text"
                    value={adhocFilename}
                    onChange={(e) => setAdhocFilename(e.target.value)}
                    placeholder="filename.lua"
                    className="px-2 py-0.5 rounded bg-[#080410] border border-purple-900/40 text-[11px] font-mono text-purple-300"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adhocFileInputRef.current?.click()}
                    className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Import File</span>
                  </button>
                  <span className="text-[11px] font-mono text-neutral-500">
                    {adhocSource.split('\n').length} lines · {new Blob([adhocSource]).size} bytes
                  </span>
                </div>
              </div>
              <textarea
                rows={11}
                value={adhocSource}
                onChange={(e) => setAdhocSource(e.target.value)}
                placeholder="-- Write or paste Lua code to obfuscate..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080410] border border-purple-900/40 text-neutral-200 text-xs font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          {/* MODE 3: Stored Vault Scripts */}
          {mode === 'stored' && (
            <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/25 space-y-3">
              <label className="block text-xs font-semibold text-neutral-300">
                Select Stored Script from Vault
              </label>
              {scripts.length === 0 ? (
                <p className="text-xs text-neutral-400 py-3">
                  No scripts found in vault. Use the "Upload Lua File" tab above to add scripts!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {scripts.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedScriptId(s.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs transition-all ${
                        selectedScriptId === s.id
                          ? 'bg-purple-950/60 border-purple-500/60 text-white font-semibold'
                          : 'bg-[#080410] border-purple-900/20 text-neutral-300 hover:border-purple-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-mono truncate block">{s.filename}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {(s.originalSize / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-400 font-mono capitalize">
                        {s.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Build Progress Bar */}
          {isBuilding && (
            <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-300 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  Applying AST transformations & string tables...
                </span>
                <span className="font-mono text-neutral-400">{buildProgress}%</span>
              </div>
              <div className="w-full bg-[#080410] rounded-full h-2 overflow-hidden border border-purple-900/40">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-200 shadow-sm shadow-purple-500"
                  style={{ width: `${buildProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Build Output Report & Preview */}
          {lastBuildResult && (
            <div className="p-5 rounded-xl bg-[#0f0a1c] border border-purple-900/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {lastBuildResult.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {lastBuildResult.status === 'success' ? 'Build Complete' : 'Build Failed'}
                  </h4>
                </div>

                {lastBuildResult.status === 'success' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyPreview}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-900/40 bg-purple-950/40 hover:bg-purple-900/50 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={handleDownloadOutput}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Protected File</span>
                    </button>
                  </div>
                )}
              </div>

              {lastBuildResult.status === 'success' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 text-xs border-y border-purple-900/20">
                  <div>
                    <span className="text-neutral-500 block text-[10px]">Engine</span>
                    <span className="font-semibold text-white">{lastBuildResult.engine}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">Raw Size</span>
                    <span className="font-mono text-neutral-300">
                      {(lastBuildResult.inputSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">Protected Size</span>
                    <span className="font-mono text-purple-300">
                      {(lastBuildResult.outputSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">Duration</span>
                    <span className="font-mono text-emerald-400">{lastBuildResult.durationMs}ms</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-red-400 bg-red-950/30 p-3 rounded-lg border border-red-900/30 font-mono">
                  {lastBuildResult.errorMsg}
                </p>
              )}

              {previewSnippet && (
                <div>
                  <span className="block text-[11px] font-semibold text-neutral-400 mb-1.5">
                    Transformed Code Preview:
                  </span>
                  <pre className="p-3 rounded-xl bg-[#080410] border border-purple-900/30 text-[11px] font-mono text-purple-200 overflow-x-auto max-h-56">
                    {previewSnippet}
                  </pre>
                </div>
              )}

              {lastBuildResult.status === 'success' && (
                <div className="pt-2">
                  <SentinelLoadstringCard
                    scriptId={lastBuildResult.scriptId && lastBuildResult.scriptId !== 'adhoc' ? lastBuildResult.scriptId : lastBuildResult.id}
                    filename={lastBuildResult.filename || 'script.lua'}
                    onShowToast={onShowToast}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Protection Engine & Options Panel */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Protection Configuration
            </h3>

            {/* Target Panel */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Target Security Panel
              </label>
              <select
                value={selectedPanelId}
                onChange={(e) => setSelectedPanelId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {panels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Engine Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-300">
                  Installed Protection Engine
                </label>
                <span className="text-[10px] text-amber-400 font-medium">
                  ⚡ Single Engine Only
                </span>
              </div>
              <select
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-xs text-white focus:outline-none focus:border-purple-500 font-semibold"
              >
                {engines.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name} (v{eng.version})
                  </option>
                ))}
              </select>
            </div>

            {/* Profile Selection */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Security Profile
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['basic', 'advanced', 'maximum'] as const).map((prof) => (
                  <button
                    key={prof}
                    type="button"
                    onClick={() => handleProfileChange(prof)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                      selectedProfile === prof
                        ? 'bg-purple-900/50 border border-purple-500 text-white shadow-sm'
                        : 'bg-[#080410] border border-purple-900/25 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {prof}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Watermark */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Integrity Watermark ID
              </label>
              <input
                type="text"
                value={customWatermark}
                onChange={(e) => setCustomWatermark(e.target.value)}
                placeholder="e.g. RONIGUARD_SECURE_V3"
                className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Vykus VM Specific Options */}
            {selectedEngine === 'Vykus-VM-Obfuscator' && (
              <div className="space-y-3 pt-3 border-t border-purple-900/30">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    Vykus VM Parameters
                  </span>
                  <span className="text-[10px] bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/40 font-mono">
                    Official API
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    Vykus Protection Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setVykusMode('vm')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                        vykusMode === 'vm'
                          ? 'bg-cyan-900/60 border border-cyan-500 text-white shadow-sm'
                          : 'bg-[#080410] border border-purple-900/25 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Polymorphic VM
                    </button>
                    <button
                      type="button"
                      onClick={() => setVykusMode('classic')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                        vykusMode === 'classic'
                          ? 'bg-cyan-900/60 border border-cyan-500 text-white shadow-sm'
                          : 'bg-[#080410] border border-purple-900/25 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Classic Deck
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-300 mb-1">
                    <span>Polymorphic VM Layers</span>
                    <span className="font-mono text-cyan-400">{vykusLayers}x Layer</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={vykusLayers}
                    onChange={(e) => setVykusLayers(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-[#080410] rounded"
                  />
                </div>

                <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer pt-1">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Anti-Tamper Security Walls
                  </span>
                  <input
                    type="checkbox"
                    checked={securityWalls}
                    onChange={(e) => setSecurityWalls(e.target.checked)}
                    className="w-3.5 h-3.5 accent-cyan-500 rounded"
                  />
                </label>
              </div>
            )}

            {/* Granular AST Options */}
            <div className="space-y-2 pt-2 border-t border-purple-900/20">
              <span className="block text-[11px] font-semibold text-neutral-400 mb-1">
                AST &amp; Lexer Layers
              </span>

              <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
                <span>Encrypted String Decks</span>
                <input
                  type="checkbox"
                  checked={stringEncryption}
                  onChange={(e) => setStringEncryption(e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
                <span>Constant Virtualization</span>
                <input
                  type="checkbox"
                  checked={constantVirtualization}
                  onChange={(e) => setConstantVirtualization(e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
                <span>Variable Identifier Mangling</span>
                <input
                  type="checkbox"
                  checked={variableRenaming}
                  onChange={(e) => setVariableRenaming(e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
                <span>Control Flow State Machine</span>
                <input
                  type="checkbox"
                  checked={controlFlow}
                  onChange={(e) => setControlFlow(e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
                <span>Anti-Tamper &amp; Metatable Lock</span>
                <input
                  type="checkbox"
                  checked={antiTamper}
                  onChange={(e) => setAntiTamper(e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600 rounded"
                />
              </label>
            </div>

            {/* Execute Build Button */}
            <button
              onClick={handleRunBuild}
              disabled={
                isBuilding ||
                (mode === 'upload' && !uploadedFile) ||
                (mode === 'stored' && !selectedScriptId) ||
                (mode === 'adhoc' && !adhocSource.trim())
              }
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>
                {isBuilding
                  ? 'Building Protected Lua...'
                  : mode === 'upload' && uploadedFile
                  ? `Protect "${uploadedFile.name}"`
                  : 'Execute Protection Build'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
