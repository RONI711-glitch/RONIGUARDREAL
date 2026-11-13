import React, { useState, useEffect, Suspense, lazy } from 'react';
import { api, getStoredToken, clearStoredToken } from './api.ts';
import { SectionId, Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { UserProfile } from './types.ts';
import { UnauthorizedLandingView } from './views/UnauthorizedLandingView.tsx';
import { PublicLandingView } from './views/PublicLandingView.tsx';
import { SnowfallOverlay } from './components/SnowfallOverlay.tsx';

const LoginView = lazy(() => import('./views/LoginView.tsx').then((m) => ({ default: m.LoginView })));
const OverviewView = lazy(() => import('./views/OverviewView.tsx').then((m) => ({ default: m.OverviewView })));
const PanelsView = lazy(() => import('./views/PanelsView.tsx').then((m) => ({ default: m.PanelsView })));
const ScriptsView = lazy(() => import('./views/ScriptsView.tsx').then((m) => ({ default: m.ScriptsView })));
const LicensesView = lazy(() => import('./views/LicensesView.tsx').then((m) => ({ default: m.LicensesView })));
const AccountView = lazy(() => import('./views/AccountView.tsx').then((m) => ({ default: m.AccountView })));
const AntiTamperView = lazy(() => import('./views/AntiTamperView.tsx').then((m) => ({ default: m.AntiTamperView })));
const CosmicAudioPlayer = lazy(() => import('./components/CosmicAudioPlayer.tsx').then((m) => ({ default: m.CosmicAudioPlayer })));

export default function App() {
  const isLoadstringRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/api/loader') ||
      window.location.pathname === '/loader' ||
      window.location.pathname === '/loader.lua' ||
      window.location.pathname.startsWith('/raw/') ||
      window.location.pathname === '/raw/latest.lua' ||
      window.location.pathname === '/raw/latest' ||
      window.location.pathname.startsWith('/load/') ||
      window.location.pathname.startsWith('/files/v4/') ||
      window.location.pathname.startsWith('/v4/') ||
      (window.location.pathname.startsWith('/scripts/') && window.location.pathname.endsWith('/raw')) ||
      (window.location.pathname.startsWith('/api/scripts/') && window.location.pathname.endsWith('/raw')) ||
      window.location.pathname === '/unauthorized' ||
      window.location.pathname.endsWith('.lua'));

  if (isLoadstringRoute) {
    return <UnauthorizedLandingView />;
  }

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showLoginView, setShowLoginView] = useState(() => {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search);
    return Boolean(p.get('auth_error') || p.get('auth_token') || p.get('code'));
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [snowEnabled, setSnowEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('roniguard_snow') !== 'false';
  });

  const handleToggleSnow = () => {
    setSnowEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('roniguard_snow', String(next));
      }
      return next;
    });
  };

  // Telemetry counts
  const [botConnected, setBotConnected] = useState(true);
  const [botUsername, setBotUsername] = useState<string | undefined>('RONIGUARD Sentinel');
  const [sidebarCounts, setSidebarCounts] = useState<{
    panels: number;
    scripts: number;
    activeKeys: number;
  }>({
    panels: 0,
    scripts: 0,
    activeKeys: 0,
  });

  const showToast = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    description?: string
  ) => {
    const newToast: ToastMessage = {
      id: 'toast_' + Math.random().toString(36).slice(2, 9),
      type,
      title,
      description,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshTelemetry = async () => {
    try {
      const overview = await api.getOverview();
      setBotConnected(overview.botConnected);
      setBotUsername(overview.botUsername);
      setSidebarCounts({
        panels: overview.totalPanels,
        scripts: overview.totalScripts,
        activeKeys: overview.activeKeys,
      });
    } catch {
      // Background refresh ignore
    }
  };

  // Check session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        return;
      }

      try {
        const user = await api.getMe();
        if (user && user.id) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          refreshTelemetry();
          return;
        }
      } catch (err) {
        console.warn('Initial session verification note:', err);
      }

      // If session verification failed, clear stale token and prompt login
      clearStoredToken();
      setIsAuthenticated(false);
      setCurrentUser(null);
    };

    checkAuth();

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      showToast('warning', 'Session Expired', 'Please sign in with Discord again.');
    };
    window.addEventListener('roniguard_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('roniguard_unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout request completed with local fallback', e);
    } finally {
      clearStoredToken();
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setCurrentUser(null);
      setIsAuthenticated(false);
      showToast('info', 'Signed Out', 'You have been disconnected from RONIGUARD.');
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#07040d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-xs text-neutral-400 font-mono">Authenticating RONIGUARD Platform...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!showLoginView) {
      return (
        <>
          <SnowfallOverlay enabled={snowEnabled} density={46} />
          <PublicLandingView
            onSignInClick={() => setShowLoginView(true)}
            botConnected={botConnected}
            snowEnabled={snowEnabled}
            onToggleSnow={handleToggleSnow}
          />
          <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
        </>
      );
    }

    return (
      <>
        <SnowfallOverlay enabled={snowEnabled} density={40} />
        <Suspense
          fallback={
            <div className="min-h-screen bg-[#06030c] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
          }
        >
          <LoginView
            onBackToHome={() => setShowLoginView(false)}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              setIsAuthenticated(true);
              showToast('success', 'Authenticated', `Welcome back, @${user.username || 'Developer'}`);
              refreshTelemetry();
            }}
          />
        </Suspense>
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  const SECTION_TITLES: Record<SectionId, string> = {
    overview: 'Dashboard',
    panels: 'Panels Management',
    scripts: 'Script Management',
    licenses: 'Script Licenses',
    'anti-tamper': 'Anti-Tamper Security',
    account: 'Account & Settings',
  };

  return (
    <div className="min-h-screen bg-[#06030e] text-white flex flex-col antialiased selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      {/* Transcendent Cosmic Universe Nebulae & Starlight */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/3 w-[700px] h-[700px] bg-purple-600/12 rounded-full blur-[160px] animate-celestial-1" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[180px] animate-celestial-2" />
        <div className="absolute -bottom-40 left-10 w-[650px] h-[650px] bg-fuchsia-700/8 rounded-full blur-[170px]" />
        {/* Subtle white starlight dust */}
        <div className="absolute top-[15%] left-[20%] w-1.5 h-1.5 bg-white/70 rounded-full shadow-[0_0_8px_white]" style={{ animation: 'star-twinkle 4s ease-in-out infinite' }} />
        <div className="absolute top-[35%] right-[25%] w-1 h-1 bg-white/60 rounded-full shadow-[0_0_6px_white]" style={{ animation: 'star-twinkle 6s ease-in-out infinite 1.5s' }} />
        <div className="absolute bottom-[30%] left-[45%] w-1.5 h-1.5 bg-purple-200/70 rounded-full shadow-[0_0_8px_rgba(192,132,252,0.8)]" style={{ animation: 'star-twinkle 5s ease-in-out infinite 2.5s' }} />
        <div className="absolute top-[70%] right-[15%] w-1 h-1 bg-white/50 rounded-full shadow-[0_0_6px_white]" style={{ animation: 'star-twinkle 7s ease-in-out infinite 3.5s' }} />
      </div>

      <SnowfallOverlay enabled={snowEnabled} density={34} />

      {/* Top Header */}
      <Header
        currentSectionTitle={SECTION_TITLES[activeSection]}
        botConnected={botConnected}
        botUsername={botUsername}
        userLabel={currentUser?.username || 'Developer'}
        userRole={currentUser?.role || 'user'}
        discordId={currentUser?.discordId || '1549804529778692237'}
        avatarUrl={currentUser?.avatar}
        snowEnabled={snowEnabled}
        onToggleSnow={handleToggleSnow}
        onToggleMobileNav={() => setIsMobileNavOpen(true)}
        onLogout={handleLogout}
        onNavigateToAntiTamper={() => {
          setActiveSection('anti-tamper');
          refreshTelemetry();
        }}
      />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar with clean sections */}
        <Sidebar
          activeSection={activeSection}
          onSelectSection={(sec) => {
            setActiveSection(sec);
            refreshTelemetry();
          }}
          isOpenMobile={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          counts={sidebarCounts}
          username={currentUser?.username || 'Developer'}
          userRole={currentUser?.role || 'user'}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative z-10">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[320px]">
                <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              </div>
            }
          >
            <div key={activeSection} className="animate-view-enter">
              {activeSection === 'overview' && (
                <OverviewView
                  onNavigate={(sec) => {
                    setActiveSection(sec);
                    refreshTelemetry();
                  }}
                />
              )}

              {activeSection === 'panels' && <PanelsView onShowToast={showToast} />}

              {activeSection === 'scripts' && <ScriptsView onShowToast={showToast} />}

              {activeSection === 'licenses' && <LicensesView onShowToast={showToast} />}

              {activeSection === 'anti-tamper' && <AntiTamperView onShowToast={showToast} />}

              {activeSection === 'account' && (
                <AccountView onLogout={handleLogout} onShowToast={showToast} />
              )}
            </div>
          </Suspense>
        </main>
      </div>

      {/* Floating Cosmic Audio Synthesizer */}
      <Suspense fallback={null}>
        <CosmicAudioPlayer />
      </Suspense>

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
