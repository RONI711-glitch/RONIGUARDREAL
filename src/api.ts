import {
  OverviewMetrics,
  Panel,
  ScriptItem,
  BuildHistoryItem,
  WhitelistEntry,
  LicenseKey,
  HwidBinding,
  ApiCredential,
  AuditLog,
  DiscordBotStatus,
  SourceRecoveryItem,
  SystemSettings,
  ObfuscationEngineInfo,
} from './types.ts';

const TOKEN_KEY = 'roniguard_owner_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  try {
    document.cookie = `roni_owner_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `roni_owner_email=ronizz.edit@gmail.com; path=/; max-age=2592000; SameSite=Lax`;
  } catch {}
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  try {
    document.cookie = 'roni_owner_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'roni_owner_email=; path=/; max-age=0; SameSite=Lax';
  } catch {}
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    if (endpoint !== '/api/auth/login' && endpoint !== '/api/auth/recover') {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('roniguard_unauthorized'));
    }
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }
    return data;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response;
}

export const api = {
  // Auth
  async login(email?: string, password?: string, quickOwnerLogin = false) {
    const res = await fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, quickOwnerLogin }),
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async logout() {
    try {
      await fetchWithAuth('/api/auth/logout', { method: 'POST' });
    } finally {
      clearStoredToken();
    }
  },

  async getMe() {
    return fetchWithAuth('/api/auth/me');
  },

  async recoverAccount(email: string, recoveryKey: string, newPassword: string) {
    return fetchWithAuth('/api/auth/recover', {
      method: 'POST',
      body: JSON.stringify({ email, recoveryKey, newPassword }),
    });
  },

  async updatePassword(currentPassword: string, newPassword: string) {
    return fetchWithAuth('/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Overview
  async getOverview(): Promise<OverviewMetrics> {
    return fetchWithAuth('/api/overview');
  },

  // Panels
  async getPanels(): Promise<Panel[]> {
    return fetchWithAuth('/api/panels');
  },

  async createPanel(data: Partial<Panel>): Promise<Panel> {
    return fetchWithAuth('/api/panels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePanel(id: string, data: Partial<Panel>): Promise<Panel> {
    return fetchWithAuth(`/api/panels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deletePanel(id: string): Promise<{ success: boolean; message: string }> {
    return fetchWithAuth(`/api/panels/${id}`, { method: 'DELETE' });
  },

  // Scripts
  async getScripts(): Promise<ScriptItem[]> {
    return fetchWithAuth('/api/scripts');
  },

  async uploadScript(filename: string, sourceCode: string, panelId?: string, notes?: string) {
    return fetchWithAuth('/api/scripts/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, sourceCode, panelId, notes }),
    });
  },

  async updateScript(id: string, data: { filename?: string; panelId?: string }) {
    return fetchWithAuth(`/api/scripts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteScript(id: string): Promise<{ success: boolean; message: string }> {
    return fetchWithAuth(`/api/scripts/${id}`, { method: 'DELETE' });
  },

  async downloadProtectedScript(id: string, filename: string) {
    const token = getStoredToken();
    const res = await fetch(`/api/scripts/${id}/download-protected`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to download protected file');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `protected_${filename}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Obfuscation
  async getEngines(): Promise<ObfuscationEngineInfo[]> {
    return fetchWithAuth('/api/obfuscation/engines');
  },

  async getBuildHistory(): Promise<BuildHistoryItem[]> {
    return fetchWithAuth('/api/obfuscation/history');
  },

  async triggerBuild(params: {
    scriptId?: string;
    rawSource?: string;
    filename?: string;
    options?: any;
    panelId?: string;
  }) {
    return fetchWithAuth('/api/obfuscation/build', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Source Recovery (Owner-Only)
  async getSourceRecoveryList(): Promise<SourceRecoveryItem[]> {
    return fetchWithAuth('/api/source-recovery/list');
  },

  async verifyAndDownloadOriginalSource(
    scriptId: string,
    filename: string,
    ownerPassword?: string,
    confirmationPhrase?: string
  ) {
    const token = getStoredToken();
    const res = await fetch(`/api/source-recovery/verify-and-download/${scriptId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ownerPassword, confirmationPhrase }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Authorization rejected' }));
      throw new Error(err.error || 'Failed to authenticate source recovery request');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORIGINAL_${filename}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async purgeOriginalSource(scriptId: string) {
    return fetchWithAuth(`/api/source-recovery/${scriptId}`, { method: 'DELETE' });
  },

  // Whitelist
  async getWhitelist(): Promise<WhitelistEntry[]> {
    return fetchWithAuth('/api/whitelist');
  },

  async addWhitelist(entry: {
    identifier: string;
    platform: string;
    panelId?: string;
    note?: string;
  }): Promise<WhitelistEntry> {
    return fetchWithAuth('/api/whitelist', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  async removeWhitelist(id: string): Promise<{ success: boolean }> {
    return fetchWithAuth(`/api/whitelist/${id}`, { method: 'DELETE' });
  },

  async importWhitelist(entries: any[], panelId?: string) {
    return fetchWithAuth('/api/whitelist/import', {
      method: 'POST',
      body: JSON.stringify({ entries, panelId }),
    });
  },

  // Keys
  async getKeys(): Promise<LicenseKey[]> {
    return fetchWithAuth('/api/keys');
  },

  async generateKeys(params: {
    type: string;
    panelId?: string;
    count?: number;
    maxUses?: number;
    hwidLocked?: boolean;
  }): Promise<LicenseKey[]> {
    return fetchWithAuth('/api/keys/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async revokeKey(id: string): Promise<{ success: boolean; key: LicenseKey }> {
    return fetchWithAuth(`/api/keys/revoke/${id}`, { method: 'POST' });
  },

  async testKeyValidation(key: string, hwid?: string, identifier?: string) {
    return fetchWithAuth('/api/keys/validate', {
      method: 'POST',
      body: JSON.stringify({ key, hwid, identifier }),
    });
  },

  // HWID
  async getHwidBindings(): Promise<HwidBinding[]> {
    return fetchWithAuth('/api/hwid');
  },

  async resetHwid(id: string) {
    return fetchWithAuth('/api/hwid/reset', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  async revokeHwid(id: string) {
    return fetchWithAuth(`/api/hwid/revoke/${id}`, { method: 'POST' });
  },

  // Discord Bot
  async getDiscordStatus(): Promise<DiscordBotStatus> {
    return fetchWithAuth('/api/discord/status');
  },

  async testDiscordConnection(token?: string) {
    return fetchWithAuth('/api/discord/test', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  async updateDiscordConfig(config: any) {
    return fetchWithAuth('/api/discord/update-config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async executeDiscordCommand(commandName: string, args: Record<string, string>) {
    return fetchWithAuth('/api/discord/command-execute', {
      method: 'POST',
      body: JSON.stringify({ commandName, args }),
    });
  },

  // API Credentials
  async getCredentials(): Promise<ApiCredential[]> {
    return fetchWithAuth('/api/credentials');
  },

  async generateCredential(name: string, scopes: string[]) {
    return fetchWithAuth('/api/credentials/generate', {
      method: 'POST',
      body: JSON.stringify({ name, scopes }),
    });
  },

  async revokeCredential(id: string) {
    return fetchWithAuth(`/api/credentials/${id}`, { method: 'DELETE' });
  },

  async getLoaderCode(panelId: string): Promise<string> {
    const token = getStoredToken();
    const res = await fetch(`/api/loader-code/${panelId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.text();
  },

  async getLoaderDetails(id: string) {
    return fetchWithAuth(`/api/loader/details/${id}`);
  },

  async simulateLoaderCheck(scriptId: string, simulateAsOwner: boolean) {
    return fetchWithAuth('/api/loader/simulate-check', {
      method: 'POST',
      body: JSON.stringify({ scriptId, simulateAsOwner }),
    });
  },

  // Analytics & Logs
  async getAnalytics() {
    return fetchWithAuth('/api/analytics');
  },

  async getLogs(): Promise<AuditLog[]> {
    return fetchWithAuth('/api/logs');
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    return fetchWithAuth('/api/settings');
  },

  async updateSettings(settings: Partial<SystemSettings>) {
    return fetchWithAuth('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
};
