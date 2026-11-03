import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  LogOut,
  Calendar,
  CheckCircle2,
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
  const [avatarError, setAvatarError] = useState(false);

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
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5 tracking-tight text-cosmic-glow">
          <User className="w-6 h-6 text-purple-300" />
          <span>Account & Discord Profile</span>
        </h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Manage your Discord authenticated identity, access permissions, and session credentials.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-purple-300/70 flex flex-col items-center gap-3">
          <RefreshCw className="w-7 h-7 animate-spin text-purple-400" />
          Authenticating Discord identity...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Discord Profile Card with Luminous White & Cosmic Purple Styling */}
          <div className="relative overflow-hidden rounded-2xl p-7 bg-gradient-to-br from-[#1d1038]/90 via-[#130a26]/95 to-[#0b0518] border border-white/15 shadow-[0_10px_35px_-5px_rgba(168,85,247,0.25)] backdrop-blur-xl">
            {/* Luminous pearl white top glow */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="absolute -top-24 -right-24 w-56 h-56 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-5">
                {/* User Discord Avatar */}
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl p-[2px] bg-gradient-to-br from-white/60 via-purple-400 to-indigo-600 shadow-xl shadow-purple-950/50">
                    <img
                      src={(() => {
                        let src = profile?.avatar;
                        const dId = profile?.discordId || '1549804529778692237';
                        if (src && !src.startsWith('http')) {
                          src = `https://cdn.discordapp.com/avatars/${dId}/${src}.${src.startsWith('a_') ? 'gif' : 'png'}?size=256`;
                        }
                        if (!src) {
                          const idx = /^\d+$/.test(dId) ? Number((BigInt(dId) >> 22n) % 6n) : 0;
                          src = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
                        }
                        return src;
                      })()}
                      alt={profile?.username || 'Discord Avatar'}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('embed/avatars')) {
                          target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                        }
                      }}
                      className="w-full h-full rounded-[14px] object-cover bg-[#100723]"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#130a26] shadow-sm flex items-center justify-center" title="Online & Connected">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-extrabold text-white tracking-tight drop-shadow-sm">
                      @{profile?.username}
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-full tracking-wider ${
                        profile?.role === 'admin'
                          ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                          : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                      }`}
                    >
                      {profile?.role === 'admin' ? 'ADMINISTRATOR' : 'VERIFIED DEVELOPER'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-purple-300/90 mt-1.5 flex items-center gap-1.5">
                    <span className="text-neutral-400">Discord ID:</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-bold text-white">
                      {profile?.discordId || '1549804529778692237'}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-700/50 text-red-200 text-xs font-bold transition-all shadow-md hover:shadow-red-950/50 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-300" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Account Details & Multi-Tenant Isolation Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative rounded-2xl p-6 bg-gradient-to-b from-[#160d2e]/85 to-[#0e071e]/90 border border-white/10 shadow-lg shadow-purple-950/20 space-y-3.5 backdrop-blur-xl">
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-purple-300/30 to-transparent" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-300" />
                Data Isolation & Tenancy
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Your account is isolated in its own private tenant partition. Panels, scripts, and API keys created under this Discord account are strictly scoped to you and cannot be accessed or viewed by any other developer.
              </p>
              <div className="pt-2 text-xs text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-Tenant Vault Isolation Active</span>
              </div>
            </div>

            <div className="relative rounded-2xl p-6 bg-gradient-to-b from-[#160d2e]/85 to-[#0e071e]/90 border border-white/10 shadow-lg shadow-purple-950/20 space-y-3.5 backdrop-blur-xl">
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-purple-300/30 to-transparent" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-300" />
                Session & Permissions
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Last Authenticated:</span>
                  <span className="text-white font-mono font-medium">
                    {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Auth Provider:</span>
                  <span className="text-purple-200 font-semibold px-2 py-0.5 rounded bg-purple-950/50 border border-purple-800/40">
                    Discord OAuth2
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Host Endpoint:</span>
                  <span className="text-purple-300 font-mono text-[11px] font-semibold">
                    https://roniguardreal.wasmer.app
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
