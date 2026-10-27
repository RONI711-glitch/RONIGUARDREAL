import React, { useState, useEffect } from 'react';
import { api, getStoredToken, clearStoredToken } from './api.ts';
import { SectionId, Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { LoginView } from './views/LoginView.tsx';

// Views
import { OverviewView } from './views/OverviewView.tsx';
import { PanelsView } from './views/PanelsView.tsx';
import { ScriptsView } from './views/ScriptsView.tsx';
import { ObfuscationView } from './views/ObfuscationView.tsx';
import { WhitelistView } from './views/WhitelistView.tsx';
import { KeysView } from './views/KeysView.tsx';
import { HwidView } from './views/HwidView.tsx';
import { BuildHistoryView } from './views/BuildHistoryView.tsx';
import { SourceRecoveryView } from './views/SourceRecoveryView.tsx';
import { DiscordBotView } from './views/DiscordBotView.tsx';
import { ApiManagementView } from './views/ApiManagementView.tsx';
import { AnalyticsView } from './views/AnalyticsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { UnauthorizedLandingView } from './views/UnauthorizedLandingView.tsx';

export default function App() {
  const isLoadstringRoute = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/api/loader/raw') ||
    window.location.pathname.startsWith('/raw/') ||
    window.location.pathname === '/loader.lua' ||
    window.location.pathname === '/raw/latest.lua' ||
    window.location.pathname.startsWith('/load/') ||
    window.location.pathname.endsWith('.lua')
  );

  if (isLoadstringRoute) {
    return <UnauthorizedLandingView />;
  }

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [ownerEmail, setOwnerEmail] = useState('ronizz.edit@gmail.com');
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Navigation context parameters (e.g. scriptId passed to obfuscation)
  const [targetScriptForObfuscation, setTargetScriptForObfuscation] = useState<string | null>(null);

  // Bot header status & count telemetry
  const [botConnected, setBotConnected] = useState(false);
  const [botUsername, setBotUsername] = useState<string | undefined>();
  const [sidebarCounts, setSidebarCounts] = useState<{
    panels: number;
    scripts: number;
    activeKeys: number;
    whitelist: number;
  }>({
    panels: 0,
    scripts: 0,
    activeKeys: 0,
    whitelist: 0,
  });

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => {
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
        whitelist: overview.whitelistedUsers,
      });
    } catch {
      // Ignore background refresh errors
    }
  };

  // Check existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const me = await api.getMe();
        setOwnerEmail(me.email || 'ronizz.edit@gmail.com');
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
      showToast('warning', 'Session Expired', 'Please re-authenticate with your owner credentials.');
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
    setIsAuthenticated(false);
    showToast('info', 'Logged Out', 'Owner vault session locked.');
  };

  const handleNavigateToObfuscation = (scriptId: string) => {
    setTargetScriptForObfuscation(scriptId);
    setActiveSection('obfuscation');
  };

  // Initial checking spinner
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#07040d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-xs text-neutral-400 font-mono">Authenticating RONIGUARD Vault...</span>
        </div>
      </div>
    );
  }

  // Login view if unauthenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginView
          onLoginSuccess={(user) => {
            setOwnerEmail(user.email || 'ronizz.edit@gmail.com');
            setIsAuthenticated(true);
            showToast('success', 'Authenticated', `Welcome back, sole owner ${user.email}`);
            refreshTelemetry();
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  const SECTION_TITLES: Record<SectionId, string> = {
    overview: 'Overview & Telemetry',
    panels: 'Panels Management',
    scripts: 'Script Management',
    obfuscation: 'Obfuscation Pipeline Studio',
    whitelist: 'Whitelist Access Control',
    keys: 'License Keys Manager',
    hwid: 'Hardware ID (HWID) Devices',
    history: 'Build History Audit',
    'source-recovery': 'Owner Original Source Vault',
    discord: 'Discord Bot Integration',
    api: 'API Credentials & Loaders',
    analytics: 'Security Analytics & Audit Ledger',
    settings: 'System & Security Settings',
  };

  return (
    <div className="min-h-screen bg-[#07040d] text-white flex flex-col antialiased selection:bg-purple-600 selection:text-white">
      {/* Top Header */}
      <Header
        currentSectionTitle={SECTION_TITLES[activeSection]}
        botConnected={botConnected}
        botUsername={botUsername}
        ownerEmail={ownerEmail}
        onToggleMobileNav={() => setIsMobileNavOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar
          activeSection={activeSection}
          onSelectSection={(sec) => {
            setActiveSection(sec);
            refreshTelemetry();
          }}
          isOpenMobile={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          counts={sidebarCounts}
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

          {activeSection === 'panels' && (
            <PanelsView onShowToast={showToast} />
          )}

          {activeSection === 'scripts' && (
            <ScriptsView
              onShowToast={showToast}
              onNavigateToObfuscation={handleNavigateToObfuscation}
            />
          )}

          {activeSection === 'obfuscation' && (
            <ObfuscationView
              initialScriptId={targetScriptForObfuscation}
              onShowToast={showToast}
            />
          )}

          {activeSection === 'whitelist' && (
            <WhitelistView onShowToast={showToast} />
          )}

          {activeSection === 'keys' && (
            <KeysView onShowToast={showToast} />
          )}

          {activeSection === 'hwid' && (
            <HwidView onShowToast={showToast} />
          )}

          {activeSection === 'history' && (
            <BuildHistoryView onShowToast={showToast} />
          )}

          {activeSection === 'source-recovery' && (
            <SourceRecoveryView onShowToast={showToast} />
          )}

          {activeSection === 'discord' && (
            <DiscordBotView onShowToast={showToast} />
          )}

          {activeSection === 'api' && (
            <ApiManagementView onShowToast={showToast} />
          )}

          {activeSection === 'analytics' && (
            <AnalyticsView onShowToast={showToast} />
          )}

          {activeSection === 'settings' && (
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
