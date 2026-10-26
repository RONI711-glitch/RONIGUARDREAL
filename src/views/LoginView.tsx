import React, { useState } from 'react';
import { ShieldAlert, Lock, Mail, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api.ts';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('ronizz.edit@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recovery modal state
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await api.login(email.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify owner credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);
    setIsLoading(true);

    try {
      const res = await api.recoverAccount(email.trim(), recoveryKey.trim(), newPassword);
      setRecoverySuccess(res.message || 'Password successfully reset. You may now log in.');
      setPassword(newPassword);
      setIsRecovering(false);
    } catch (err: any) {
      setRecoveryError(err.message || 'Account recovery failed. Invalid recovery key.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07040d] flex items-center justify-center p-4 selection:bg-purple-600 selection:text-white">
      {/* Background ambient neon glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-900/15 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-[#0f0a1c] border border-purple-900/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 mb-3 border border-purple-400/20">
              <ShieldAlert className="w-6 h-6 text-purple-200" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              RONI<span className="text-purple-400">GUARD</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs">
              Private Lua / Luau Script Protection & Discord Bot Core
            </p>
          </div>

          {/* Owner Notice */}
          <div className="mb-5 p-3 rounded-xl bg-purple-950/30 border border-purple-900/40 text-xs text-neutral-300 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Owner-Only Private Access</p>
              <p className="text-neutral-400 text-[11px] mt-0.5">
                Configured owner identity: <span className="text-purple-300 font-mono">ronizz.edit@gmail.com</span>. Public registration is permanently disabled.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-900/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {recoverySuccess && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/40 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{recoverySuccess}</span>
            </div>
          )}

          {/* 1-Click Instant Owner Login */}
          <div className="mb-6">
            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                setIsLoading(true);
                setErrorMsg(null);
                try {
                  const res = await api.login(undefined, undefined, true);
                  onLoginSuccess(res.user);
                } catch (err: any) {
                  setErrorMsg(err.message || 'Quick login failed');
                } finally {
                  setIsLoading(false);
                }
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              <span>⚡ Enter Directly (1-Click Owner Sign In)</span>
            </button>
            <p className="text-[11px] text-neutral-400 text-center mt-1.5">
              No need to memorize passwords. One click verifies your owner environment.
            </p>
          </div>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-purple-900/30 w-full" />
            <span className="bg-[#0f0a1c] px-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider shrink-0">
              Or sign in with password
            </span>
            <div className="border-t border-purple-900/30 w-full" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Owner Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ronizz.edit@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsRecovering(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  Lost Access?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter owner password..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#080410] border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Default initial credential: <span className="font-mono text-purple-400">RoniguardOwner2026!</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Authenticate to Console</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Account Recovery Modal */}
      {isRecovering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f0a1c] border border-purple-900/40 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">Owner Account Recovery</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Enter your Master Recovery Key to verify owner authority and configure a new password.
            </p>

            {recoveryError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-900/40 text-xs text-red-300">
                {recoveryError}
              </div>
            )}

            <form onSubmit={handleRecover} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Master Recovery Key
                </label>
                <input
                  type="text"
                  required
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder="e.g. RONI-RECOVER-XXXX-XXXX"
                  className="w-full px-3 py-2 rounded-lg bg-[#080410] border border-purple-900/40 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 rounded-lg bg-[#080410] border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecovering(false)}
                  className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 text-xs font-medium hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  {isLoading ? 'Verifying...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
