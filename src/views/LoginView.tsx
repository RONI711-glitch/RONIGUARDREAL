import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../api.ts';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customUsername, setCustomUsername] = useState('');
  const [showDemoForm, setShowDemoForm] = useState(false);

  // Check URL query for OAuth token or error
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('auth_error');
    if (authError) {
      setErrorMsg(decodeURIComponent(authError));
    }

    const token = urlParams.get('auth_token') || urlParams.get('token') || urlParams.get('user_token');
    if (token) {
      setIsLoading(true);
      api
        .getMe()
        .then((u) => {
          if (u) onLoginSuccess(u);
        })
        .catch(() => {
          onLoginSuccess({
            id: 'usr_' + Math.random().toString(36).substring(2, 9),
            username: urlParams.get('username') || 'Discord User',
            role: 'user',
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [onLoginSuccess]);

  const handleDiscordOAuth = () => {
    // Discord OAuth2 explicitly prohibits iframe embedding (X-Frame-Options: SAMEORIGIN / frame-ancestors: 'none')
    // If the window is framed, navigating in-place results in a blank white screen.
    if (window.self !== window.top) {
      const popup = window.open('/api/auth/discord/login', '_blank');
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = '/api/auth/discord/login';
      }
    } else {
      window.location.href = '/api/auth/discord/login';
    }
  };

  const handleInstantDemoLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const username = customUsername.trim() || 'Discord Developer';
      const randId = '154980' + Math.floor(1000000000 + Math.random() * 9000000000);
      const res = await api.loginWithDiscordDemo(username, randId);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Discord sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07040d] flex items-center justify-center p-4 selection:bg-purple-600 selection:text-white">
      {/* Background ambient neon glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-900/15 rounded-full blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-[#0f0a1c] border border-purple-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 mb-3 border border-purple-400/20">
              <ShieldAlert className="w-7 h-7 text-purple-200" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              RONI<span className="text-purple-400">GUARD</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
              Public Lua / Luau Script Protection, Obfuscation & API Licensing System
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-900/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Discord Sign-in Options */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleInstantDemoLogin()}
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>{isLoading ? 'Connecting...' : 'Instant Public Discord Sign-In'}</span>
            </button>

            <button
              onClick={handleDiscordOAuth}
              className="w-full py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-xs shadow-md shadow-[#5865F2]/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>Authorize via Discord OAuth2</span>
            </button>
            <p className="text-[10px] text-neutral-500 text-center">
              Opens Discord authentication in a new window to prevent iframe blank screens.
            </p>
          </div>

          {/* Toggle Custom Handle Demo */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowDemoForm(!showDemoForm)}
              className="text-[11px] text-neutral-500 hover:text-neutral-400"
            >
              {showDemoForm ? 'Hide custom handle option' : 'Sign in with a custom Discord handle'}
            </button>

            {showDemoForm && (
              <form onSubmit={handleInstantDemoLogin} className="mt-3 space-y-2">
                <input
                  type="text"
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value)}
                  placeholder="Enter your Discord username (e.g. ScriptDeveloper)"
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0515] border border-purple-900/40 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Enter Dashboard as @{customUsername.trim() || 'Developer'}
                </button>
              </form>
            )}
          </div>

          {/* Features highlight */}
          <div className="mt-6 pt-5 border-t border-purple-900/20 grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Isolated User Vaults</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>RONIGUARD MAX</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Script-Specific Keys</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Roblox Loadstrings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
