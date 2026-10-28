import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Lock,
  Save,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Database,
  Terminal,
  FileCode2,
} from 'lucide-react';
import { api } from '../api.ts';
import { SystemSettings, ObfuscationEngineInfo } from '../types.ts';
import { SectionId } from '../components/Sidebar.tsx';

interface SettingsViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
  onNavigate: (section: SectionId) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onShowToast, onNavigate }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [engines, setEngines] = useState<ObfuscationEngineInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [projectName, setProjectName] = useState('RONIGUARD');
  const [defaultEngine, setDefaultEngine] = useState('RoniGuard-Luau-V3');
  const [defaultProfile, setDefaultProfile] = useState<'basic' | 'advanced' | 'maximum'>('advanced');
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(10);
  const [requirePasswordForSourceRecovery, setRequirePasswordForSourceRecovery] = useState(true);
  const [autoPurgeDays, setAutoPurgeDays] = useState(60);
  const [saving, setSaving] = useState(false);

  // Password update form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsData, enginesData] = await Promise.all([
        api.getSettings(),
        api.getEngines(),
      ]);
      setSettings(settingsData);
      setEngines(enginesData);
      setProjectName(settingsData.projectName);
      setDefaultEngine(settingsData.defaultEngine);
      setDefaultProfile(settingsData.defaultProfile);
      setMaxFileSizeMb(settingsData.maxFileSizeMb);
      setRequirePasswordForSourceRecovery(settingsData.requirePasswordForSourceRecovery);
      setAutoPurgeDays(settingsData.autoPurgeBuildHistoryDays);
    } catch (err: any) {
      onShowToast('error', 'Failed to load settings', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateSettings({
        projectName,
        defaultEngine,
        defaultProfile,
        maxFileSizeMb,
        requirePasswordForSourceRecovery,
        autoPurgeBuildHistoryDays: autoPurgeDays,
      });
      setSettings(res.settings);
      onShowToast('success', 'Settings Saved', 'System configurations updated.');
    } catch (err: any) {
      onShowToast('error', 'Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      onShowToast('error', 'Mismatch', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      onShowToast('error', 'Password too short', 'Minimum 8 characters required.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.updatePassword(currentPassword, newPassword);
      onShowToast('success', 'Password Updated', 'Your owner password was securely rotated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      onShowToast('error', 'Update Failed', err.message);
    } finally {
      setUpdatingPassword(false);
    }
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
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">System & Security Settings</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Global preferences for obfuscation profiles, source vault boundaries, and owner authentication.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Preferences Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* General & Obfuscation Preferences */}
          <form onSubmit={handleSaveSettings} className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              General & Engine Defaults
            </h3>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Default Protection Engine
                </label>
                <select
                  value={defaultEngine}
                  onChange={(e) => setDefaultEngine(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  {engines.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Default Protection Profile
                </label>
                <select
                  value={defaultProfile}
                  onChange={(e) => setDefaultProfile(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs capitalize focus:outline-none focus:border-purple-500"
                >
                  <option value="basic">Basic (Fast Identifier Mangling)</option>
                  <option value="advanced">Advanced (String Table & Sentinels)</option>
                  <option value="maximum">Maximum (Control Flow Flattening)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Max Upload File Size (MB)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxFileSizeMb}
                  onChange={(e) => setMaxFileSizeMb(parseInt(e.target.value, 10) || 10)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Auto-Purge Build History (Days)
                </label>
                <input
                  type="number"
                  min={7}
                  max={365}
                  value={autoPurgeDays}
                  onChange={(e) => setAutoPurgeDays(parseInt(e.target.value, 10) || 60)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs font-mono"
                />
              </div>
            </div>

            {/* Source Protection Toggles */}
            <div className="pt-2 border-t border-purple-900/20 space-y-3">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Source Vault Policies
              </h4>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#080410] border border-purple-900/30 cursor-pointer">
                <div className="pr-4">
                  <p className="text-xs font-semibold text-white">
                    Strict Password Re-Entry for Source Recovery
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Require owner password before streaming original Lua files from vault
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requirePasswordForSourceRecovery}
                  onChange={(e) => setRequirePasswordForSourceRecovery(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-md shadow-purple-900/30 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save System Settings'}</span>
            </button>
          </form>

          {/* Owner Password Rotation */}
          <form onSubmit={handleUpdatePassword} className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Owner Password Rotation
            </h3>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current owner password"
                className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="py-2.5 px-4 rounded-xl border border-purple-600/40 bg-purple-950/40 hover:bg-purple-900/50 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
              <span>{updatingPassword ? 'Rotating...' : 'Rotate Owner Password'}</span>
            </button>
          </form>
        </div>

        {/* Right Col: Identity & Quick Navigation Links */}
        <div className="space-y-4">
          {/* Identity Card */}
          <div className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Authenticated Owner
            </h3>
            <div>
              <span className="text-xs text-neutral-400 block">Owner Email</span>
              <span className="font-mono font-bold text-white text-sm break-all">
                {settings?.ownerEmail || 'ronizz.edit@gmail.com'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              This email is the immutable owner identifier configured for RONIGUARD. Source recovery and admin operations are locked to this identity.
            </p>
          </div>

          {/* Quick links to configuration sections */}
          <div className="p-5 rounded-2xl bg-[#0f0a1c] border border-purple-900/25 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Integrated Modules
            </h3>

            <button
              onClick={() => onNavigate('overview')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#080410] border border-purple-900/30 text-xs text-neutral-300 hover:text-white hover:border-purple-600/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <span>Discord Bot Sentinel Status</span>
              </span>
              <span className="text-purple-400 font-mono text-[11px]">&rarr;</span>
            </button>

            <button
              onClick={() => onNavigate('licenses')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#080410] border border-purple-900/30 text-xs text-neutral-300 hover:text-white hover:border-purple-600/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span>Script Licenses & Loadstrings</span>
              </span>
              <span className="text-purple-400 font-mono text-[11px]">&rarr;</span>
            </button>

            <button
              onClick={() => onNavigate('scripts')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#080410] border border-purple-900/30 text-xs text-neutral-300 hover:text-white hover:border-purple-600/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Scripts & Source Files</span>
              </span>
              <span className="text-amber-400 font-mono text-[11px]">&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
