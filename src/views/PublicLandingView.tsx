import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Cpu,
  Bot,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Layers,
  ArrowRight,
  UserCheck,
  Snowflake,
  Copy,
  Check,
  Terminal,
  KeyRound,
} from 'lucide-react';
import { BrandLogo, RONIGUARD_LOGO_SRC } from '../components/BrandLogo.tsx';

interface PublicLandingViewProps {
  onSignInClick: () => void;
  botConnected?: boolean;
  snowEnabled?: boolean;
  onToggleSnow?: () => void;
}

type WorkflowTab = 'loadstring' | 'discord' | 'shield';

export const PublicLandingView: React.FC<PublicLandingViewProps> = ({
  onSignInClick,
  botConnected = true,
  snowEnabled = true,
  onToggleSnow,
}) => {
  const [activeTab, setActiveTab] = useState<WorkflowTab>('loadstring');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [discordActionPreview, setDiscordActionPreview] = useState<string>(
    'Select a panel button below to preview the Discord response.'
  );

  const botInviteUrl =
    'https://discord.com/oauth2/authorize?client_id=1549804529778692237&permissions=8&scope=bot%20applications.commands';

  const demoLoadstring = `Script_key = "YOUR_LICENSE_KEY"\nloadstring(game:HttpGet("https://roniguard-dfwh.onrender.com/loader.lua?script=demo"))()`;

  const handleCopySnippet = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(demoLoadstring).catch(() => {});
    }
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#06030c] text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      {/* Midnight Winter Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/4 w-[680px] h-[520px] bg-purple-800/20 rounded-full blur-[150px] animate-celestial-1" />
        <div className="absolute top-1/3 -right-28 w-[520px] h-[520px] bg-indigo-900/15 rounded-full blur-[160px] animate-celestial-2" />
        <div className="absolute -bottom-36 left-10 w-[560px] h-[440px] bg-slate-200/[0.04] rounded-full blur-[140px]" />
      </div>

      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 bg-[#06030c]/85 backdrop-blur-xl border-b border-slate-200/10">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand */}
          <a href="#" className="flex items-center gap-2.5 shrink-0">
            <BrandLogo size="sm" />
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap font-display">
              RONI<span className="text-purple-400">GUARD</span>
            </span>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#workflow" className="hover:text-white smooth-transition whitespace-nowrap">
              Workflow
            </a>
            <a href="#features" className="hover:text-white smooth-transition whitespace-nowrap">
              Protection
            </a>
            <a href="#security" className="hover:text-white smooth-transition whitespace-nowrap">
              Bot &amp; Keys
            </a>
            <a href="#access" className="hover:text-white smooth-transition whitespace-nowrap">
              Get Started
            </a>
          </nav>

          {/* Zone 3: Primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              onClick={onSignInClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-950/60 border border-white/15 smooth-transition cursor-pointer whitespace-nowrap shrink-0 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Sign In with Discord</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 max-w-6xl mx-auto px-5 sm:px-6 pt-10 pb-20 sm:pt-14 sm:pb-24 w-full space-y-20">
        {/* 2-Column Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch animate-fade-slide-up">
          {/* Left Copy Column */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 tracking-wide">
              <Snowflake className="w-4 h-4 text-slate-200 shrink-0" />
              <span>Winter Season · Lua &amp; Luau Script Security</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-extrabold text-white tracking-tight leading-[1.08] text-balance font-display">
              Defend and License{' '}
              <span className="bg-gradient-to-r from-slate-100 via-purple-300 to-purple-400 bg-clip-text text-transparent">
                Your Roblox Scripts
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-xl">
              Protect raw Lua and Luau code with multi-layer execution barriers, bind licenses to
              hardware IDs, and automate key redemptions 24/7 through the RONIGUARD Discord bot.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={onSignInClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#090414] hover:bg-slate-200 font-extrabold text-sm shadow-xl shadow-purple-950/40 smooth-transition cursor-pointer whitespace-nowrap hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Open Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <a
                href={botInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-slate-200/15 text-slate-200 text-sm font-semibold smooth-transition whitespace-nowrap"
              >
                <Bot className="w-4 h-4 text-purple-300" />
                <span>Invite Bot</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            </div>

            {/* Clean Inline Metadata Strip (zero pills, zero decorative dots) */}
            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
              <span>{botConnected ? 'Bot 24/7 Online' : 'Bot Standby'}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>HTTP 403 Browser Shield</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>Lifetime Keys &amp; HWID Lock</span>
              {onToggleSnow && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={onToggleSnow}
                    className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white smooth-transition cursor-pointer"
                  >
                    <Snowflake className="w-3.5 h-3.5 text-purple-300" />
                    <span>Snow: {snowEnabled ? 'On' : 'Off'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Crest Showcase Frame */}
          <div className="lg:col-span-5 flex">
            <div className="frost-surface rounded-3xl p-5 sm:p-6 w-full flex flex-col justify-between relative overflow-hidden shadow-2xl shadow-purple-950/50 smooth-transition">
              {/* Subtle frost rim highlight */}
              <div className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-slate-200/40 to-transparent" />

              <div className="relative rounded-2xl overflow-hidden bg-[#05020a] border border-white/10 aspect-square flex items-center justify-center">
                <img
                  src={RONIGUARD_LOGO_SRC}
                  alt="RONIGUARD Crest"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center select-none"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06030c] via-transparent to-transparent opacity-70" />
              </div>

              <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-purple-300 shrink-0" />
                  <span className="truncate">roniguard-dfwh.onrender.com</span>
                </div>
                <span className="font-mono text-[11px] text-purple-300 tabular-nums shrink-0">
                  403 Guard Active
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Live Workflow Section */}
        <section id="workflow" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-purple-300 tracking-wide">
                Live Architecture Preview
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
                Built for Executors and Discord Servers
              </h2>
            </div>

            {/* Interactive Tab Switcher */}
            <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('loadstring')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold smooth-transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'loadstring'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Executor Loadstring
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('discord')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold smooth-transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'discord'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Discord /panelsetup
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('shield')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold smooth-transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'shield'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                403 Browser Shield
              </button>
            </div>
          </div>

          {/* Interactive Tab Viewport */}
          <div className="frost-surface rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-950/30">
            {activeTab === 'loadstring' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-view-enter">
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold">
                    <Terminal className="w-4 h-4" />
                    <span>Zero-Leak Remote Loader</span>
                  </div>
                  <h3 className="text-xl font-bold text-white font-display">
                    One Clean Loadstring per Script
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                    Your users paste one lightweight loadstring with their license key or your
                    account Master Key. Raw script source never touches public URLs.
                  </p>
                </div>

                <div className="lg:col-span-7 bg-[#05020a] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">executor_loader.lua</span>
                    <button
                      type="button"
                      onClick={handleCopySnippet}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-medium smooth-transition cursor-pointer"
                    >
                      {copiedSnippet ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-purple-300" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs sm:text-[13px] font-mono text-purple-200 overflow-x-auto leading-relaxed">
                    <code>{demoLoadstring}</code>
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'discord' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-view-enter">
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold">
                    <Bot className="w-4 h-4" />
                    <span>Validated Panel Automation</span>
                  </div>
                  <h3 className="text-xl font-bold text-white font-display">
                    Permanent User Licensing in Discord
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                    Run <code className="text-purple-300">/panelsetup</code> with a real Panel ID
                    from your dashboard. Once a member redeems a key, their license persists until
                    you remove it.
                  </p>
                </div>

                <div className="lg:col-span-7 bg-[#0b0714] border border-purple-500/25 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <BrandLogo size="xs" />
                      <span className="text-sm font-bold text-white">RONIGUARD Control Panel</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">/panelsetup</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed min-h-[2.25rem]">
                    {discordActionPreview}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setDiscordActionPreview(
                          'Redeem Key: License bound permanently to your Discord ID until revoked by the owner.'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold smooth-transition cursor-pointer"
                    >
                      Redeem Key
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDiscordActionPreview(
                          'Get Script: Personal executor loadstring delivered privately via ephemeral Discord reply.'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold smooth-transition cursor-pointer"
                    >
                      Get Script
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDiscordActionPreview(
                          'Reset HWID: Hardware lock cleared so you can launch on your new PC.'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold smooth-transition cursor-pointer"
                    >
                      Reset HWID
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shield' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-view-enter">
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Direct Visit Interception</span>
                  </div>
                  <h3 className="text-xl font-bold text-white font-display">
                    Browsers Hit HTTP 403 Instantly
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                    Anyone opening your loader URL in Chrome, Safari, or cURL gets stopped by the
                    403 sentinel page—never your Luau source.
                  </p>
                </div>

                <div className="lg:col-span-7 bg-[#05020a] border border-red-500/25 rounded-2xl p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-red-400 uppercase tracking-wider">
                      HTTP 403 · Browser Request Blocked
                    </span>
                    <h4 className="text-base font-bold text-white">ACCESS UNAUTHORIZED</h4>
                    <p className="text-xs text-slate-400">
                      Source payload stays locked inside your private tenant vault unless invoked by
                      an authorized executor with a valid key.
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-red-950/50 border border-red-500/30 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Asymmetric 12-Column Bento Capabilities */}
        <section id="features" className="space-y-6 scroll-mt-24">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-purple-300 tracking-wide">Core Defense</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Everything Required to Protect &amp; Distribute
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Wide Card 1 */}
            <div className="lg:col-span-7 frost-surface rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 smooth-transition">
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-400/25 flex items-center justify-center text-purple-300">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white font-display">
                  Multi-Layer Lua &amp; Luau Protection
                </h3>
                <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                  Secures Roblox globals, services, and string literals without breaking runtime
                  behavior—keeping legitimate execution crisp while blocking reverse engineering.
                </p>
              </div>
            </div>

            {/* Narrow Card 2 */}
            <div className="lg:col-span-5 frost-surface rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 smooth-transition">
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-400/25 flex items-center justify-center text-slate-200">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white font-display">
                  HWID Locking &amp; Lifetime Access
                </h3>
                <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                  Bind keys to a single hardware signature and keep redeemed Discord licenses valid
                  until you revoke or blacklist them.
                </p>
              </div>
            </div>

            {/* Narrow Card 3 */}
            <div
              id="security"
              className="lg:col-span-5 frost-surface rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 smooth-transition scroll-mt-24"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-400/25 flex items-center justify-center text-purple-300">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white font-display">
                  Unified Account Master Key
                </h3>
                <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                  One master key authorizes your entire developer vault—no juggling separate script
                  tokens. Rotate it anytime from Account Settings.
                </p>
              </div>
            </div>

            {/* Wide Card 4 */}
            <div className="lg:col-span-7 frost-surface rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 smooth-transition">
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-400/25 flex items-center justify-center text-indigo-300">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white font-display">
                  Isolated Vaults &amp; 24/7 Discord Commands
                </h3>
                <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                  Every account gets private panels, scripts, and audit logs. Manage access from the
                  web or directly in Discord with{' '}
                  <code className="text-purple-300">/panelsetup</code>,{' '}
                  <code className="text-purple-300">/whitelist</code>,{' '}
                  <code className="text-purple-300">/redeem</code>, and{' '}
                  <code className="text-purple-300">/reset</code>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final Conversion CTA */}
        <section id="access" className="scroll-mt-24">
          <div className="frost-surface rounded-3xl p-8 sm:p-10 text-center space-y-5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-10 h-px bg-gradient-to-r from-transparent via-slate-200/40 to-transparent" />
            <div className="flex justify-center">
              <BrandLogo size="md" />
            </div>
            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
                Ready to Protect Your Scripts?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                Sign in with Discord to create your first panel, deploy obfuscated scripts, and
                share instant loadstrings.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                onClick={onSignInClick}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-white text-[#090414] hover:bg-slate-200 font-extrabold text-xs sm:text-sm shadow-xl smooth-transition cursor-pointer"
              >
                <span>Sign In with Discord</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href={botInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs sm:text-sm font-semibold smooth-transition"
              >
                <Lock className="w-3.5 h-3.5 text-purple-300" />
                <span>Add Bot to Server</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 px-6 text-center text-xs text-slate-500">
        <p>© 2026 RONIGUARD · Lua &amp; Luau Script Protection Platform</p>
      </footer>
    </div>
  );
};
