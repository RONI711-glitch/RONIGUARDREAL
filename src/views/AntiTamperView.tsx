import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  RefreshCw,
  KeyRound,
  FileCode,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Terminal,
  Server,
  Zap,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { api } from '../api.ts';
import { AntiTamperOverview, AntiTamperRecord, SecurityEventRecord } from '../types.ts';

interface AntiTamperViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const AntiTamperView: React.FC<AntiTamperViewProps> = ({ onShowToast }) => {
  const [overview, setOverview] = useState<AntiTamperOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scripts' | 'events' | 'simulator'>('scripts');
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<string>('valid_script');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      const data = await api.getAntiTamperOverview();
      setOverview(data);
      if (data.records && data.records.length > 0 && !selectedScriptId) {
        setSelectedScriptId(data.records[0].scriptId);
      }
    } catch (err: any) {
      onShowToast('error', 'Failed to load Anti-Tamper data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleQuarantine = async (scriptId: string) => {
    setActionLoadingId(scriptId);
    try {
      await api.quarantineScript(scriptId, 'Manual administrative isolation via dashboard');
      onShowToast('warning', 'Script Quarantined', `Script ${scriptId} has been locked and placed in quarantine.`);
      await fetchOverview();
    } catch (err: any) {
      onShowToast('error', 'Quarantine Failed', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReverify = async (scriptId: string) => {
    setActionLoadingId(scriptId);
    try {
      const res = await api.reverifyScript(scriptId);
      if (res.success) {
        onShowToast('success', 'Integrity Re-verified', 'Script hash and HMAC signature updated and guaranteed.');
      } else {
        onShowToast('error', 'Re-verification Failed', res.message);
      }
      await fetchOverview();
    } catch (err: any) {
      onShowToast('error', 'Re-verification Failed', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setSimulationResult(null);
    try {
      const res = await api.simulateTamperTest(selectedScriptId || undefined, selectedScenario);
      setSimulationResult(res);
      if (res.result?.verified) {
        onShowToast('success', 'Simulation Passed', 'Valid script and license verified successfully.');
      } else {
        onShowToast('info', 'Tampering Blocked as Expected', `Detected & rejected: ${res.result?.error || res.result?.reason}`);
      }
      if (res.overview) {
        setOverview(res.overview);
      }
    } catch (err: any) {
      onShowToast('error', 'Simulation Error', err.message);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#140b2b] via-[#0d0720] to-[#080414] border border-purple-500/30 p-6 md:p-8 shadow-2xl shadow-purple-950/60">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AUTOMATIC INTEGRITY ENGINE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              RONIGUARD Anti-Tamper System
            </h1>
            <p className="text-xs md:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              Every protected script automatically receives server-side HMAC-SHA256 integrity verification,
              cryptographic anti-tamper signing, and zero-trust license validation. No manual configuration required.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setLoading(true);
                fetchOverview();
              }}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-white via-purple-100 to-purple-200 hover:from-white text-purple-950 text-xs font-extrabold shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Protected Scripts */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-b from-[#180e30]/90 via-[#100722]/95 to-[#0b0417]/98 border border-white/10 hover:border-purple-400/50 shadow-lg backdrop-blur-xl overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
            <span className="text-purple-200 font-bold">Protected Scripts</span>
            <div className="w-7 h-7 rounded-lg bg-purple-900/40 text-purple-300 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{overview?.totalProtected ?? 0}</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% Automatically Secured</span>
          </div>
        </div>

        {/* Guaranteed Integrity */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-b from-[#180e30]/90 via-[#100722]/95 to-[#0b0417]/98 border border-white/10 hover:border-purple-400/50 shadow-lg backdrop-blur-xl overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
            <span className="text-purple-200 font-bold">Guaranteed Status</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 text-emerald-300 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{overview?.guaranteedCount ?? 0}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Cryptographically Sealed</div>
        </div>

        {/* Detected Tamper Attempts */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-b from-[#180e30]/90 via-[#100722]/95 to-[#0b0417]/98 border border-white/10 hover:border-purple-400/50 shadow-lg backdrop-blur-xl overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
            <span className="text-purple-200 font-bold">Tamper Attempts</span>
            <div className="w-7 h-7 rounded-lg bg-rose-950/60 text-rose-300 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400">{overview?.tamperedCount ?? 0}</div>
          <div className="text-[11px] text-rose-300/80 mt-1">Blocked & Logged</div>
        </div>

        {/* Verification Success Rate */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-b from-[#180e30]/90 via-[#100722]/95 to-[#0b0417]/98 border border-white/10 hover:border-purple-400/50 shadow-lg backdrop-blur-xl overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
            <span className="text-purple-200 font-bold">Total Verifications</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-950/60 text-indigo-300 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300">{overview?.totalVerifications ?? 0}</div>
          <div className="text-[11px] text-purple-400/90 mt-1 font-mono">
            {overview?.passedVerifications ?? 0} passed / {overview?.failedVerifications ?? 0} failed
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-purple-900/30 pb-2">
        <button
          onClick={() => setActiveTab('scripts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'scripts'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-neutral-400 hover:text-white hover:bg-purple-950/40'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Script Integrity Registry ({overview?.records?.length ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'events'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-neutral-400 hover:text-white hover:bg-purple-950/40'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Security Event Log ({overview?.recentEvents?.length ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'simulator'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-neutral-400 hover:text-white hover:bg-purple-950/40'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Tamper Attack Simulator</span>
        </button>
      </div>

      {/* Tab 1: Script Integrity Registry */}
      {activeTab === 'scripts' && (
        <div className="bg-[#0e071e]/90 border border-purple-900/30 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Protected Scripts & Signatures
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Each script's code is bound to its assigned API key using SHA-256 and verified server-side.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
              <span>Scanning cryptographic records...</span>
            </div>
          ) : !overview?.records || overview.records.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              No protected scripts registered yet. Build a script to automatically generate signatures!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-purple-900/30 text-neutral-400 text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Script & ID</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Assigned License Key</th>
                    <th className="pb-3 font-semibold">Integrity Hash & Signature</th>
                    <th className="pb-3 font-semibold text-center">Verifications</th>
                    <th className="pb-3 font-semibold">Last Checked</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/50">
                  {overview.records.map((record) => (
                    <tr key={record.id} className="hover:bg-purple-950/20 transition-colors">
                      <td className="py-3.5 pr-3">
                        <div className="font-bold text-white flex items-center gap-2">
                          <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{record.scriptId}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {record.scriptLength} bytes payload
                        </span>
                      </td>

                      <td className="py-3.5 pr-3">
                        {record.status === 'guaranteed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3" /> GUARANTEED
                          </span>
                        ) : record.status === 'tampered' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950/70 text-rose-400 border border-rose-800/40">
                            <XCircle className="w-3 h-3" /> TAMPER DETECTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-400 border border-amber-800/40">
                            <Lock className="w-3 h-3" /> QUARANTINED
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-1.5 font-mono text-purple-300 text-[11px]">
                          <KeyRound className="w-3 h-3 text-purple-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{record.apiKey}</span>
                        </div>
                      </td>

                      <td className="py-3.5 pr-3 font-mono text-[10px] text-neutral-400">
                        <div title={record.integrityHash}>
                          Hash: <span className="text-neutral-200">{record.integrityHash.slice(0, 14)}...</span>
                        </div>
                        <div title={record.signature}>
                          HMAC: <span className="text-purple-300">{record.signature.slice(0, 14)}...</span>
                        </div>
                      </td>

                      <td className="py-3.5 pr-3 text-center">
                        <div className="font-bold text-white text-xs">{record.totalVerifications}</div>
                        <div className="text-[10px] text-emerald-400">
                          {record.passedVerifications} pass / {record.failedVerifications} fail
                        </div>
                      </td>

                      <td className="py-3.5 pr-3 text-[11px] text-neutral-400">
                        {record.lastVerifiedAt ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-400" />
                            <span>{new Date(record.lastVerifiedAt).toLocaleTimeString()}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-600">Pending Execution</span>
                        )}
                      </td>

                      <td className="py-3.5 pl-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleReverify(record.scriptId)}
                            disabled={actionLoadingId === record.scriptId}
                            title="Re-verify file from server storage and seal signature"
                            className="px-2.5 py-1 rounded-lg bg-purple-900/30 hover:bg-purple-800/40 border border-purple-500/30 text-purple-300 text-[11px] font-medium transition-all"
                          >
                            Re-verify
                          </button>

                          {record.status !== 'quarantined' ? (
                            <button
                              onClick={() => handleQuarantine(record.scriptId)}
                              disabled={actionLoadingId === record.scriptId}
                              title="Lock script and reject all verification attempts"
                              className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 text-[11px] font-medium transition-all"
                            >
                              Quarantine
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReverify(record.scriptId)}
                              disabled={actionLoadingId === record.scriptId}
                              title="Restore script from quarantine"
                              className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/40 text-emerald-300 text-[11px] font-medium transition-all"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Security Event Log Feed */}
      {activeTab === 'events' && (
        <div className="bg-[#0e071e]/90 border border-purple-900/30 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                Live Security Event Stream
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Real-time security events recorded during script start and server verification passes.
              </p>
            </div>
          </div>

          {!overview?.recentEvents || overview.recentEvents.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              No security events recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {overview.recentEvents.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 text-xs transition-all ${
                    ev.severity === 'critical'
                      ? 'bg-rose-950/30 border-rose-900/40 text-rose-200'
                      : ev.severity === 'warning'
                      ? 'bg-amber-950/30 border-amber-900/40 text-amber-200'
                      : 'bg-purple-950/30 border-purple-900/30 text-purple-200'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {ev.severity === 'critical' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                      ) : ev.severity === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-black/40">
                          {ev.eventType.replace('_', ' ')}
                        </span>
                        {ev.scriptId && (
                          <span className="text-[11px] font-mono text-purple-300">
                            Script: {ev.scriptId}
                          </span>
                        )}
                        {ev.apiKey && (
                          <span className="text-[11px] font-mono text-neutral-400">
                            Key: {ev.apiKey.slice(0, 16)}...
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-neutral-300 leading-relaxed">{ev.reason}</p>
                    </div>
                  </div>

                  <div className="text-right text-[10px] text-neutral-400 font-mono shrink-0">
                    <div>{new Date(ev.timestamp).toLocaleTimeString()}</div>
                    <div className="text-neutral-500">{ev.ip}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Interactive Attack & Tamper Simulator */}
      {activeTab === 'simulator' && (
        <div className="bg-[#0e071e]/90 border border-purple-900/30 rounded-3xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Anti-Tamper Attack & Integrity Test Sandbox
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Simulate actual attack scenarios, script modifications, and authorization failures
              to observe server-side tamper detection, defense triggers, and audit logging in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scenario Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300">Select Test Scenario:</label>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-purple-950/40 border border-purple-700/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
              >
                <option value="valid_script">🟢 Valid Script & Valid License (Expected: Success)</option>
                <option value="modified_content">🔴 Modified Script Content (Tamper Detected)</option>
                <option value="invalid_signature">🔴 Forged / Invalid HMAC Signature (Tamper Detected)</option>
                <option value="expired_license">🟡 Expired License Key (Expected: Blocked)</option>
                <option value="revoked_license">🔴 Revoked License Key (Expected: Blocked)</option>
                <option value="missing_license">🟡 Missing / Non-Existent License Key (Expected: Blocked)</option>
                <option value="server_outage">🔵 Server Outage Resilience (Fail-safe, No Loops)</option>
              </select>
            </div>

            {/* Target Script Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300">Target Protected Script:</label>
              <select
                value={selectedScriptId}
                onChange={(e) => setSelectedScriptId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-purple-950/40 border border-purple-700/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
              >
                {overview?.records.map((r) => (
                  <option key={r.scriptId} value={r.scriptId}>
                    {r.scriptId} — Key: {r.apiKey}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Trigger Button */}
          <div>
            <button
              onClick={handleRunSimulation}
              disabled={simulating}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Play className={`w-4 h-4 fill-current ${simulating ? 'animate-pulse' : ''}`} />
              <span>{simulating ? 'Simulating Attack Vector...' : 'Execute Tamper Verification Test'}</span>
            </button>
          </div>

          {/* Result Output Window */}
          {simulationResult && (
            <div className="p-5 rounded-2xl bg-black/60 border border-purple-900/50 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-2">
                <span className="text-neutral-400 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  SIMULATION VERIFICATION REPORT
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    simulationResult.result?.verified
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {simulationResult.result?.verified ? 'VERIFIED / PASSED' : 'REJECTED / DEFENSE TRIGGERED'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-neutral-300 text-[11px]">
                <div>
                  <span className="text-neutral-500">Scenario Tested: </span>
                  <span className="text-purple-300 font-semibold">{simulationResult.scenario}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Target Script: </span>
                  <span className="text-white">{simulationResult.targetScriptId}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Security Decision: </span>
                  <span
                    className={
                      simulationResult.result?.verified ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                    }
                  >
                    {simulationResult.result?.verified ? 'ALLOW EXECUTION' : 'TERMINATE & BLOCK'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Detection Reason: </span>
                  <span className="text-neutral-300">{simulationResult.result?.reason || 'None (Integrity valid)'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/30 text-[11px] text-neutral-400">
                <div className="text-purple-300 font-semibold mb-1">Raw Response Payload:</div>
                <pre className="overflow-x-auto text-[10px] text-neutral-300">
                  {JSON.stringify(simulationResult.result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
