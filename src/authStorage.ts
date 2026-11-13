const TOKEN_KEY = 'roniguard_owner_token';
const LOCAL_STORE_KEY = 'roniguard_local_db_v3';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;

  if (typeof localStorage !== 'undefined' && localStorage.getItem('roniguard_logged_out') === 'true') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_token') || params.get('token') || params.get('user_token')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('auth_token') || params.get('token') || params.get('user_token');
  if (urlToken) {
    setStoredToken(urlToken);
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    return urlToken;
  }

  const local = localStorage.getItem(TOKEN_KEY);
  if (local) return local;

  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)(?:roni_user_token|roni_owner_token)=([^;]+)/);
    if (match && match[1]) {
      const tok = decodeURIComponent(match[1]);
      localStorage.setItem(TOKEN_KEY, tok);
      return tok;
    }
  }

  return null;
}

export function setStoredToken(token: string): void {
  if (typeof localStorage !== 'undefined') {
    const prevToken = localStorage.getItem(TOKEN_KEY);
    if (prevToken && prevToken !== token) {
      localStorage.removeItem(LOCAL_STORE_KEY);
      localStorage.removeItem('roniguard_local_db_v1');
      localStorage.removeItem('roniguard_local_db_v2');
      localStorage.removeItem('roniguard_local_db_v3');
    }
    localStorage.removeItem('roniguard_logged_out');
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (typeof document !== 'undefined') {
    try {
      document.cookie = `roni_user_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `roni_owner_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
    } catch {}
  }
}

export function clearStoredToken(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('roniguard_discord_user');
    localStorage.removeItem(LOCAL_STORE_KEY);
    localStorage.removeItem('roniguard_local_db_v1');
    localStorage.removeItem('roniguard_local_db_v2');
    localStorage.removeItem('roniguard_local_db_v3');
    localStorage.setItem('roniguard_logged_out', 'true');
  }
  if (typeof document !== 'undefined') {
    try {
      document.cookie = 'roni_user_token=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'roni_owner_token=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'roni_discord_user=; path=/; max-age=0; SameSite=Lax';
    } catch {}
  }
}

export async function fetchCurrentSessionUser(): Promise<any | null> {
  const token = getStoredToken();
  if (!token || (typeof localStorage !== 'undefined' && localStorage.getItem('roniguard_logged_out') === 'true')) {
    return null;
  }

  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      clearStoredToken();
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      return await response.json();
    }
  } catch {
    // Fallback if offline
  }

  if (typeof localStorage !== 'undefined') {
    const storedUser = localStorage.getItem('roniguard_discord_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return {
          id: parsed.id || 'usr_' + Math.random().toString(36).slice(2),
          discordId: parsed.id || '1549804529778692237',
          username: parsed.username || 'Discord Developer',
          avatar: parsed.avatar || null,
          email: null,
          role: 'user',
          lastLoginAt: new Date().toISOString(),
        };
      } catch {}
    }
  }

  return null;
}
