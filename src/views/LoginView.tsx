import React, { useState, useEffect } from 'react';
import { AlertCircle, FileText, X, CheckCircle2, ShieldCheck, Lock, Bot, ExternalLink, ArrowLeft } from 'lucide-react';
import { setStoredToken, fetchCurrentSessionUser } from '../authStorage.ts';
import { BrandLogo } from '../components/BrandLogo.tsx';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
  onBackToHome?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onBackToHome }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // 1. Listen for OAuth postMessage from popup window (AI Studio iframe constraint)
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const token = event.data.token;
        if (token) {
          setStoredToken(token);
          setIsLoading(true);
          if (event.data.user) {
            onLoginSuccess(event.data.user);
          } else {
            fetchCurrentSessionUser()
              .then((u) => onLoginSuccess(u || { id: 'usr_owner', username: 'Discord User', role: 'admin' }))
              .catch(() => {
                onLoginSuccess({ id: 'usr_owner', username: 'Discord User', role: 'admin' });
              });
          }
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setErrorMsg(decodeURIComponent(event.data.error || 'Authentication was cancelled'));
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onLoginSuccess]);

  // 2. Check URL query for OAuth token or callback errors (fallback when not in popup)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('auth_error');
    if (authError) {
      try {
        setErrorMsg(decodeURIComponent(authError));
      } catch {
        setErrorMsg(authError);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = urlParams.get('auth_token') || urlParams.get('token') || urlParams.get('user_token');
    if (token) {
      setStoredToken(token);
      setIsLoading(true);
      fetchCurrentSessionUser()
        .then((u) => {
          if (u) onLoginSuccess(u);
          else onLoginSuccess({ id: 'usr_owner', username: urlParams.get('username') || 'Discord User', role: 'user' });
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
    } else if (urlParams.get('code')) {
      window.location.href = `/api/auth/discord/callback${window.location.search}`;
    }
  }, [onLoginSuccess]);

  // 3. Initiate Discord OAuth (direct same-tab redirect in standalone browser; popup in iframe)
  const handleDiscordSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('roniguard_logged_out');
    }

    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    const mode = isIframe ? 'popup' : 'redirect';

    try {
      const res = await fetch(`/api/auth/url?mode=${mode}`);
      let authUrl = '';
      if (res.ok) {
        const data = await res.json();
        authUrl = data.url;
      }

      if (!authUrl) {
        const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/discord/callback`);
        const statePrefix = isIframe ? 'popup_' : 'redir_';
        authUrl = `https://discord.com/api/oauth2/authorize?client_id=1549804529778692237&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${statePrefix}${Date.now()}`;
      }

      if (!isIframe) {
        window.location.href = authUrl;
        return;
      }

      const authPopup = window.open(
        authUrl,
        'discord_oauth_popup',
        'width=560,height=720,menubar=no,toolbar=no,location=no,status=no'
      );

      if (!authPopup || authPopup.closed || typeof authPopup.closed === 'undefined') {
        window.location.href = authUrl;
      }
    } catch (err: any) {
      console.warn('OAuth initialization notice:', err);
      setErrorMsg('Could not initialize Discord sign-in. Please try again.');
    } finally {
      if (isIframe) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#06030c] flex items-center justify-center p-4 selection:bg-purple-600 selection:text-white relative overflow-hidden font-sans">
      {/* Winter midnight ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-purple-900/18 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-indigo-900/15 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-slide-up">
        {/* Main Card */}
        <div className="frost-surface rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/70 relative">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="mb-4 inline-flex items-center gap-1.5 text-xs text-purple-300 hover:text-white smooth-transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          )}

          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <BrandLogo size="lg" className="mb-3.5 border-purple-300/25 shadow-xl shadow-purple-950/60" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
              RONI<span className="text-purple-400">GUARD</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Lua &amp; Luau Script Protection, HWID Licensing &amp; Discord Bot Control
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-900/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Action: Discord Sign In + Add Bot to Server */}
          <div className="space-y-3 mb-5">
            <button
              onClick={handleDiscordSignIn}
              disabled={isLoading}
              className="w-full py-4 px-5 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm sm:text-base shadow-xl shadow-[#5865F2]/25 hover:shadow-[#5865F2]/40 flex items-center justify-center gap-3 smooth-transition cursor-pointer active:scale-[0.99]"
            >
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>{isLoading ? 'Connecting to Discord...' : 'Sign in with Discord'}</span>
            </button>

            <a
              href="https://discord.com/oauth2/authorize?client_id=1549804529778692237&permissions=8&scope=bot%20applications.commands"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-purple-400/25 hover:border-purple-300/50 text-purple-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 smooth-transition cursor-pointer group"
            >
              <Bot className="w-4 h-4 text-purple-300 group-hover:scale-110 smooth-transition" />
              <span>Add RONIGUARD Bot to Server</span>
              <ExternalLink className="w-3.5 h-3.5 text-purple-300 opacity-60" />
            </a>
          </div>

          {/* User Limits Info */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-slate-400 space-y-1.5 mb-4">
            <div className="font-semibold text-purple-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-300" />
              <span>Free Public Account Quotas</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono tabular-nums">
              <span>• 15 Obfuscations / mo</span>
              <span>• 5 Protection Panels</span>
              <span>• 10 Scripts Created</span>
              <span>• 10 Updates / Project</span>
              <span className="col-span-2">• 1,000 Keys &amp; Whitelists</span>
            </div>
          </div>

          {/* Footer Terms & Rules Trigger */}
          <div className="text-center pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowPolicyModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:text-white underline font-medium cursor-pointer smooth-transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Terms of Service, Policy &amp; Platform Rules</span>
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
                <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  1. Script Ownership & Fair Use
                </h4>
                <p className="text-neutral-400">
                  Users retain full intellectual ownership of all Lua/Luau scripts uploaded, obfuscated, and licensed through the RONIGUARD platform.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  2. Security & Anti-Abuse
                </h4>
                <p className="text-neutral-400">
                  Attempting to reverse-engineer, exploit server endpoints, flood API services, or bypass integrity validation seals will result in automatic HWID blacklist.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  3. Privacy & Zero-Email Policy
                </h4>
                <p className="text-neutral-400">
                  RONIGUARD strictly operates on Discord snowflake IDs and pseudonymous cryptographic handles. No email addresses are ever persisted.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-purple-900/30 flex justify-end">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
