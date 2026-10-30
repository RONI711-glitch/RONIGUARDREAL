import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertCircle, Sparkles, FileText, X, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { api } from '../api.ts';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Check URL query for OAuth token or callback errors
  useEffect(() => {
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

  const handleDiscordSignIn = () => {
    setIsLoading(true);
    setErrorMsg(null);

    // Build absolute URL to avoid Google 404 inside Google AI Studio iframes
    const isFramed = window.self !== window.top;
    const origin = window.location.origin;
    const loginEndpoint = `${origin}/api/auth/discord/login`;
    const directDiscordUrl =
      'https://discord.com/api/oauth2/authorize?client_id=1549804529778692237&redirect_uri=https%3A%2F%2Froniguardreal.wasmer.app%2Fapi%2Fauth%2Fdiscord%2Fcallback&response_type=code&scope=identify%20email';

    try {
      if (isFramed) {
        // In iframe: Discord OAuth cannot be embedded due to X-Frame-Options: SAMEORIGIN
        // Open the absolute authorization endpoint in a new tab/window
        const authPopup = window.open(directDiscordUrl, '_blank', 'noopener,noreferrer');
        if (!authPopup || authPopup.closed || typeof authPopup.closed === 'undefined') {
          // If popup blocker intervened, redirect top window or current frame
          window.location.href = directDiscordUrl;
        }
      } else {
        window.location.href = loginEndpoint;
      }
    } catch {
      window.location.href = directDiscordUrl;
    } finally {
      setIsLoading(false);
    }
  };

  // Instant developer sign in fallback for iframe sandbox preview
  const handleSandboxDiscordSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.loginWithDiscordDemo('Discord User', '1549804529778692237');
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Discord sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07040d] flex items-center justify-center p-4 selection:bg-purple-600 selection:text-white relative overflow-hidden font-sans">
      {/* Cosmic background nebulae */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-purple-900/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-indigo-900/15 rounded-full blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-[#0e071e]/95 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/70 relative backdrop-blur-xl">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-950 flex items-center justify-center text-white shadow-xl shadow-purple-600/40 mb-3.5 border border-purple-400/30">
              <ShieldAlert className="w-8 h-8 text-purple-200" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              RONI<span className="text-purple-400">GUARD</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
              Public Lua Script Protection, VM Obfuscation & API Licensing Platform
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-900/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Action: Only Discord Sign In */}
          <div className="space-y-3 mb-5">
            <button
              onClick={handleDiscordSignIn}
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm sm:text-base shadow-xl shadow-[#5865F2]/25 hover:shadow-[#5865F2]/40 flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-[0.99]"
            >
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>{isLoading ? 'Connecting to Discord...' : 'Sign in with Discord'}</span>
            </button>

            {/* Quick Sandbox Sign-in in case iframe restrictions block OAuth popups */}
            <button
              onClick={handleSandboxDiscordSignIn}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-800/40 text-purple-200 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Instant Web Sign-In (Direct Connect)</span>
            </button>
          </div>

          {/* User Limits Info Badge */}
          <div className="p-3 rounded-xl bg-black/40 border border-purple-900/30 text-[11px] text-neutral-400 space-y-1 mb-4">
            <div className="font-semibold text-purple-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>Free Public Account Quotas</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-neutral-400 font-mono">
              <span>• 15 Obfuscations / mo</span>
              <span>• 5 Protection Panels</span>
              <span>• 10 Scripts Created</span>
              <span>• 10 Updates / Project</span>
              <span className="col-span-2">• 1,000 Keys & Whitelists</span>
            </div>
          </div>

          {/* Footer Terms & Rules Trigger */}
          <div className="text-center pt-2 border-t border-purple-950/60">
            <button
              type="button"
              onClick={() => setShowPolicyModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 underline font-medium cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Terms of Service, Policy & Platform Rules</span>
            </button>
          </div>
        </div>
      </div>

      {/* Terms of Service, Privacy Policy & Security Rules Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0e071e] border border-purple-500/40 rounded-3xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">RONIGUARD Terms & Rules</h3>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 text-xs text-neutral-300 leading-relaxed pr-2">
              <div className="space-y-1">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-purple-300">
                  1. Platform Usage & Security Rules
                </h4>
                <p>
                  RONIGUARD is designed exclusively for securing and licensing proprietary Roblox and Luau scripts.
                  Malicious software, account-stealing scripts, or unapproved payload distributions are strictly prohibited.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-purple-300">
                  2. Standard Plan Quotas & Enforced Limits
                </h4>
                <ul className="list-disc pl-4 space-y-0.5 text-neutral-400 font-mono text-[11px]">
                  <li>15 Obfuscations per month (automatically resets monthly)</li>
                  <li>5 Maximum Protection Panels per account</li>
                  <li>10 Maximum Script projects per account</li>
                  <li>10 In-place updates per script project</li>
                  <li>1,000 Total License Keys and Whitelist entries combined</li>
                </ul>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-purple-300">
                  3. Privacy & Discord Identity Policy
                </h4>
                <p>
                  RONIGUARD utilizes Discord OAuth2 solely to identify users, ensure independent account isolation, and
                  provide Discord Bot slash command integration (/panelsetup, /lic, /hwid). We never store your Discord
                  password or private messages.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-purple-300">
                  4. Raw Loadstring & Browser Security
                </h4>
                <p>
                  Loadstring endpoints are locked down to authenticated Roblox executor clients only. Direct web browser visits
                  render the secure ACCESS UNAUTHORIZED sentinel page to prevent source extraction.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-purple-900/30 flex justify-end">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
