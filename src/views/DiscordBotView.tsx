import React, { useState, useEffect } from 'react';
import {
  Bot,
  Radio,
  Play,
  Save,
  Key,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Send,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { api } from '../api.ts';
import { DiscordBotStatus } from '../types.ts';

interface DiscordBotViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const DiscordBotView: React.FC<DiscordBotViewProps> = ({ onShowToast }) => {
  const [status, setStatus] = useState<DiscordBotStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Configuration form state
  const [botToken, setBotToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [guildId, setGuildId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [bridgeSecret, setBridgeSecret] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  // Connection testing state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Command runner state
  const [selectedCommand, setSelectedCommand] = useState('whitelist add');
  const [commandUserArg, setCommandUserArg] = useState('728491028374829103');
  const [commandPanelArg, setCommandPanelArg] = useState('pnl_main');
  const [commandTypeArg, setCommandTypeArg] = useState('lifetime');
  const [runningCommand, setRunningCommand] = useState(false);
  const [commandOutput, setCommandOutput] = useState<any>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getDiscordStatus();
      setStatus(data);
      setClientId(data.clientId || '');
      setGuildId(data.guildId || '');
    } catch (err: any) {
      onShowToast('error', 'Failed to load Discord bot status', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateDiscordConfig({
        botToken: botToken.trim() || undefined,
        clientId: clientId.trim(),
        guildId: guildId.trim(),
        webhookUrl: webhookUrl.trim(),
        bridgeUrl: bridgeUrl.trim(),
        bridgeSecret: bridgeSecret.trim(),
      });
      onShowToast('success', 'Discord Settings Saved', 'Configured credentials stored in server vault.');
      loadStatus();
    } catch (err: any) {
      onShowToast('error', 'Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testDiscordConnection(botToken.trim() || undefined);
      setTestResult(res);
      if (res.connected) {
        onShowToast('success', 'Discord Handshake Verified', `Connected to @${res.botUser?.username} (${res.pingMs}ms)`);
        loadStatus();
      } else {
        onShowToast('error', 'Connection Test Failed', res.error || 'Discord API rejected request.');
      }
    } catch (err: any) {
      setTestResult({ connected: false, error: err.message, diagnostics: [err.message] });
      onShowToast('error', 'Test Failed', err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleExecuteCommandTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunningCommand(true);
    setCommandOutput(null);

    const args: Record<string, string> = {
      user: commandUserArg.trim(),
      panel: commandPanelArg.trim(),
      type: commandTypeArg,
    };

    try {
      const res = await api.executeDiscordCommand(selectedCommand, args);
      setCommandOutput(res);
      if (res.success) {
        onShowToast('success', `Command Executed: /${selectedCommand}`, res.message);
      } else {
        onShowToast('warning', `Command Execution Notice`, res.message);
      }
    } catch (err: any) {
      setCommandOutput({ success: false, message: err.message });
      onShowToast('error', 'Execution Failed', err.message);
    } finally {
      setRunningCommand(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0e091b] border border-purple-900/30">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Existing Discord Bot Integration</h2>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Preserves All Existing Commands</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            RONIGUARD connects directly to your existing bot instance without creating duplicate bots or modifying your existing slash command architecture.
          </p>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
          <span>{testing ? 'Testing Handshake...' : 'Run Connection Test'}</span>
        </button>
      </div>

      {/* Bot Live Telemetry Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/25 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400">Gateway Status</span>
          <div className="flex items-center gap-2 text-sm font-bold">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                status?.isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-neutral-600'
              }`}
            />
            <span className={status?.isConnected ? 'text-white' : 'text-neutral-400'}>
              {status?.isConnected ? 'Online & Linked' : 'Offline / Awaiting Token'}
            </span>
          </div>
          <p className="text-[10px] text-neutral-500">
            {status?.lastPing ? `Discord Gateway Round-Trip: ${status.lastPing}ms` : 'No ping data recorded'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/25 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400">Bot Identity</span>
          <div className="flex items-center gap-2 text-sm font-bold text-white font-mono">
            {status?.botAvatar && (
              <img
                src={status.botAvatar}
                alt="Bot avatar"
                className="w-5 h-5 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <span>{status?.botUsername ? `@${status.botUsername}` : 'Existing Bot'}</span>
          </div>
          <p className="text-[10px] text-neutral-500">
            Registered commands: {status?.registeredCommands.length || 8}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f0a1c] border border-purple-900/25 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400">Backend Bridge</span>
          <div className="text-sm font-bold text-purple-300 font-mono">
            /api/bot/*
          </div>
          <p className="text-[10px] text-neutral-500">
            REST & Webhook Dispatcher Active
          </p>
        </div>
      </div>

      {/* Diagnostics Output (if test run) */}
      {testResult && (
        <div className="p-4 rounded-xl bg-[#080410] border border-purple-900/30 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-300">Connection Test Diagnostics</span>
            <span className={testResult.connected ? 'text-emerald-400' : 'text-red-400'}>
              {testResult.connected ? 'HANDSHAKE VERIFIED' : 'HANDSHAKE REJECTED'}
            </span>
          </div>
          {testResult.error && <p className="text-red-400">{testResult.error}</p>}
          <div className="space-y-1 text-neutral-400 text-[11px]">
            {testResult.diagnostics?.map((diag: string, i: number) => (
              <p key={i}>&gt; {diag}</p>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Configuration Form & Existing Commands Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration Form */}
        <div className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Discord Bot Credentials & Bridge Config
          </h3>

          {/* Friendly Guide Banner */}
          <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs text-neutral-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="text-base">💡</span>
              <span>Don't know what to put? You only need 1 thing (or can skip this)!</span>
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-300">
              You do <span className="text-white font-bold">NOT</span> need to fill out all these boxes. Everything except your <span className="text-purple-300 font-bold">Bot Token</span> is optional!
            </p>
            <div className="p-2.5 rounded-lg bg-[#07030e] text-[11px] text-neutral-400 space-y-1 font-mono">
              <p className="font-bold text-purple-300 font-sans">Where to find your Bot Token:</p>
              <p>1. Open <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-purple-400 underline">discord.com/developers/applications</a></p>
              <p>2. Click your bot → click <strong className="text-white">Bot</strong> on the left</p>
              <p>3. Click <strong className="text-white">Reset Token</strong> (or Copy) and paste it below!</p>
            </div>
            <p className="text-[11px] text-neutral-400 italic">
              Notice: You can use RONIGUARD to protect Lua scripts and make license keys right now even if you leave this completely blank!
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-white">
                  Discord Bot Token <span className="text-purple-400 text-[11px] font-normal">(The only required field)</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder={status?.hasTokenConfigured ? '••••••••••••••••••••••••••••••••' : 'Paste your Bot Token here...'}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Leave blank if you don't want to connect Discord yet.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Discord Webhook URL <span className="text-neutral-500 text-[11px] font-normal">(Optional — for channel alerts)</span>
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="Optional: https://discord.com/api/webhooks/..."
                className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Optional Collapsed Advanced Fields */}
            <details className="pt-2 border-t border-purple-900/20 group">
              <summary className="text-xs font-semibold text-purple-400 hover:text-purple-300 cursor-pointer py-1 flex items-center justify-between">
                <span>Advanced Settings (Client ID, Guild ID, Bridge — Optional)</span>
                <span className="text-[10px] text-neutral-500 font-mono group-open:rotate-180 transition-transform">▼</span>
              </summary>

              <div className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Client ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Guild ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={guildId}
                      onChange={(e) => setGuildId(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Remote Bridge URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    placeholder="Optional (leave blank if not using custom remote bridge)"
                    className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </details>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-md shadow-purple-900/30 flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Discord Settings'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Existing Commands Browser & Tester */}
        <div className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Preserved Existing Commands Tester
            </h3>
            <span className="text-[11px] font-mono text-purple-400 font-bold">8 Commands Active</span>
          </div>

          <form onSubmit={handleExecuteCommandTest} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Select Existing Command
              </label>
              <select
                value={selectedCommand}
                onChange={(e) => setSelectedCommand(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              >
                {status?.registeredCommands.map((cmd) => (
                  <option key={cmd.name} value={cmd.name}>
                    /{cmd.name} — {cmd.description}
                  </option>
                ))}
              </select>
            </div>

            {selectedCommand.includes('whitelist') || selectedCommand.includes('hwid') || selectedCommand.includes('redeem') ? (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Target User (Discord ID or Roblox UserID)
                </label>
                <input
                  type="text"
                  required
                  value={commandUserArg}
                  onChange={(e) => setCommandUserArg(e.target.value)}
                  placeholder="e.g. 728491028374829103"
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono"
                />
              </div>
            ) : null}

            {selectedCommand === 'key generate' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  License Duration Type
                </label>
                <select
                  value={commandTypeArg}
                  onChange={(e) => setCommandTypeArg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono"
                >
                  <option value="lifetime">lifetime</option>
                  <option value="30d">30d</option>
                  <option value="7d">7d</option>
                  <option value="24h">24h</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={runningCommand}
              className="w-full py-2.5 px-4 rounded-xl border border-purple-600/40 bg-purple-950/40 hover:bg-purple-900/50 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-purple-400" />
              <span>{runningCommand ? 'Executing...' : `Simulate /${selectedCommand}`}</span>
            </button>
          </form>

          {/* Command Output Screen */}
          {commandOutput && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-mono space-y-1 ${
                commandOutput.success
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/30 border-red-500/30 text-red-300'
              }`}
            >
              <span className="font-bold block text-[10px] uppercase tracking-wider">
                Bot Response
              </span>
              <p>{commandOutput.message}</p>
            </div>
          )}

          {/* List of Registered Commands */}
          <div className="pt-2 border-t border-purple-900/20 space-y-2">
            <span className="text-[11px] font-semibold text-neutral-400 block">
              Commands Catalog in Bot Source:
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {status?.registeredCommands.map((cmd) => (
                <div
                  key={cmd.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#07030e] border border-purple-900/20 text-xs"
                >
                  <span className="font-mono font-bold text-purple-300">/{cmd.name}</span>
                  <span className="text-neutral-400 text-[11px] truncate max-w-[200px]">
                    {cmd.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
