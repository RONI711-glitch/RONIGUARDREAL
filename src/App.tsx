import React, { useState, useEffect } from 'react';
import { api, getStoredToken, clearStoredToken } from './api.ts';
import { SectionId, Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { LoginView } from './views/LoginView.tsx';
import { UserProfile } from './types.ts';

// 5 Core Views
import { OverviewView } from './views/OverviewView.tsx';
import { PanelsView } from './views/PanelsView.tsx';
import { ScriptsView } from './views/ScriptsView.tsx';
import { LicensesView } from './views/LicensesView.tsx';
import { AccountView } from './views/AccountView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { UnauthorizedLandingView } from './views/UnauthorizedLandingView.tsx';

export default function App() {
  const isLoadstringRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/api/loader/raw') ||
      window.location.pathname.startsWith('/raw/') ||
      window.location.pathname === '/loader.lua' ||
      window.location.pathname === '/raw/latest.lua' ||
      window.location.pathname.startsWith('/load/') ||
      window.location.pathname === '/unauthorized' ||
      window.location.pathname.endsWith('.lua'));

  if (isLoadstringRoute) {
    return <UnauthorizedLandingView />;
  }

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
        return;
      }

      try {
        const user = await api.getMe();
        setCurrentUser(user);
        setIsAuthenticated(true);
        refreshTelemetry();
      } catch {
        clearStoredToken();
        setIsAuthenticated(false);
      }
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
    } catch {
      clearStoredToken();
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    showToast('info', 'Signed Out', 'You have been disconnected from RONIGUARD.');
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
    return (
      <>
        <LoginView
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
            showToast('success', 'Authenticated', `Welcome back, @${user.username || 'Developer'}`);
            refreshTelemetry();
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  const SECTION_TITLES: Record<SectionId, string> = {
    overview: 'Dashboard',
    panels: 'Panels Management',
    scripts: 'Script Management',
    licenses: 'Script Licenses',
    account: 'Account & Settings',
    admin: 'Administrator Vault',
  };

  return (
    <div className="min-h-screen bg-[#07040d] text-white flex flex-col antialiased selection:bg-purple-600 selection:text-white">
      {/* Top Header */}
      <Header
        currentSectionTitle={SECTION_TITLES[activeSection]}
        botConnected={botConnected}
        botUsername={botUsername}
        userLabel={currentUser?.username || 'Developer'}
        userRole={currentUser?.role || 'user'}
        onToggleMobileNav={() => setIsMobileNavOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar with simplified 5 sections */}
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
          isAdmin={currentUser?.role === 'admin'}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
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

          {activeSection === 'account' && (
            <AccountView onLogout={handleLogout} onShowToast={showToast} />
          )}

          {activeSection === 'admin' && (
            <SettingsView
              onShowToast={showToast}
              onNavigate={(sec) => setActiveSection(sec)}
            />
          )}
        </main>
      </div>

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
