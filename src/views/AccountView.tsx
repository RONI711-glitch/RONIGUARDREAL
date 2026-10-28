import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  LogOut,
  Calendar,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api.ts';
import { UserProfile } from '../types.ts';

interface AccountViewProps {
  onLogout: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onLogout, onShowToast }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getMe();
      setProfile(data);
    } catch (err: any) {
      onShowToast('error', 'Failed to load profile', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-purple-400" />
          Account & Discord Profile
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Manage your Discord authenticated identity, access permissions, and session credentials.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
          Loading user profile...
        </div>
      ) : (
        <div className="space-y-5">
          {/* Discord Profile Card */}
          <div className="bg-[#0e081c] border border-purple-900/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.username}
                    className="w-16 h-16 rounded-2xl border-2 border-purple-500/40 shadow-lg shadow-purple-900/40 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-900 border border-purple-500/40 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-900/30">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white">@{profile?.username}</h3>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        profile?.role === 'admin'
                          ? 'bg-purple-950 text-purple-300 border border-purple-700/60'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      }`}
                    >
                      {profile?.role === 'admin' ? 'ADMINISTRATOR' : 'VERIFIED DEVELOPER'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-purple-400 mt-0.5">
                    Discord ID: {profile?.discordId || 'N/A'}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {profile?.email || 'No public email provided'}
                  </p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 text-red-300 text-xs font-semibold transition-all shrink-0 self-start sm:self-auto"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Account Details & Multi-Tenant Isolation Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0e081c] border border-purple-900/30 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Data Isolation & Tenancy
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Your account is partitioned into an isolated tenant. Panels, scripts, and API keys created under this Discord account cannot be viewed or modified by any other developer.
              </p>
              <div className="pt-2 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Multi-Tenant Vault Encryption Active
              </div>
            </div>

            <div className="bg-[#0e081c] border border-purple-900/30 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-400" />
                Session & Permissions
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Last Authenticated:</span>
                  <span className="text-neutral-200 font-mono">
                    {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Authentication Provider:</span>
                  <span className="text-neutral-200 font-semibold">Discord OAuth2</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Host Endpoint:</span>
                  <span className="text-purple-300 font-mono text-[11px]">https://roniguardreal.wasmer.app</span>
                </div>
              </div>
            </div>

            {/* Discord Developer Portal Setup Guide */}
            <div className="bg-[#0e081c] border border-purple-900/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  Discord OAuth2 & Bot Configuration
                </h4>
                <a
                  href="https://discord.com/developers/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
                >
                  Discord Developer Portal
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed">
                To link your Discord Bot and OAuth2 login, configure these in the Discord Developer Portal and your server environment variables:
              </p>

              {/* Redirect URI */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  OAuth2 Redirect URI (Add to Discord Portal &rarr; OAuth2 &rarr; Redirects):
                </label>
                <div className="flex items-center gap-2 bg-[#06030b] border border-purple-900/40 rounded-xl px-3 py-2">
                  <code className="text-xs font-mono text-purple-300 select-all flex-1 truncate">
                    https://roniguardreal.wasmer.app/api/auth/discord/callback
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://roniguardreal.wasmer.app/api/auth/discord/callback');
                      onShowToast('success', 'Copied to clipboard', 'OAuth2 Redirect URI copied!');
                    }}
                    className="text-xs bg-purple-950/60 hover:bg-purple-900 border border-purple-600/30 text-purple-200 px-2.5 py-1 rounded-lg transition-colors font-medium cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Environment Variables Reference */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Server Environment Variables (.env / Secrets):
                </label>
                <div className="bg-[#06030b] border border-purple-900/30 rounded-xl p-3 text-[11px] font-mono text-neutral-300 space-y-1 select-all">
                  <div><span className="text-purple-400">DISCORD_CLIENT_ID</span>="1549804529778692237"</div>
                  <div><span className="text-purple-400">DISCORD_CLIENT_SECRET</span>="YOUR_DISCORD_CLIENT_SECRET"</div>
                  <div><span className="text-purple-400">DISCORD_BOT_TOKEN</span>="YOUR_DISCORD_BOT_TOKEN"</div>
                  <div><span className="text-purple-400">DISCORD_REDIRECT_URI</span>="https://roniguardreal.wasmer.app/api/auth/discord/callback"</div>
                </div>
              </div>

              {/* Active Slash Commands */}
              <div className="pt-2 border-t border-purple-900/20 text-xs space-y-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Active Clean Slash Commands:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-purple-950/20 border border-purple-900/20 rounded-lg p-2">
                    <span className="text-purple-300 font-mono font-bold">/panelsetup</span>
                    <p className="text-neutral-400 text-[10px] mt-0.5">Deploys interactive button panel (Script, Redeem, HWID, Key Info)</p>
                  </div>
                  <div className="bg-purple-950/20 border border-purple-900/20 rounded-lg p-2">
                    <span className="text-purple-300 font-mono font-bold">/lic &lt;check|info|revoke|list|gen&gt;</span>
                    <p className="text-neutral-400 text-[10px] mt-0.5">Inspect and manage script-specific license keys</p>
                  </div>
                  <div className="bg-purple-950/20 border border-purple-900/20 rounded-lg p-2">
                    <span className="text-purple-300 font-mono font-bold">/hwid reset &lt;user&gt;</span>
                    <p className="text-neutral-400 text-[10px] mt-0.5">Reset hardware ID binding for new devices</p>
                  </div>
                  <div className="bg-purple-950/20 border border-purple-900/20 rounded-lg p-2">
                    <span className="text-purple-300 font-mono font-bold">/status</span>
                    <p className="text-neutral-400 text-[10px] mt-0.5">Display bot health, panel count, and security stats</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
