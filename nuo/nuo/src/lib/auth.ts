export type UserRole = 'owner' | 'co_owner' | 'reseller' | 'customer' | string;

export type AuthState = {
  token: string;
  role: UserRole;
  username: string;
  userId?: string;
  tokenExpiry?: string;
};

function getStorageWithAuth(): Storage | null {
  // Prefer whichever storage currently holds a token
  const lsToken = localStorage.getItem('authToken');
  if (lsToken) return localStorage;
  const ssToken = sessionStorage.getItem('authToken');
  if (ssToken) return sessionStorage;
  return null;
}

export function getAuth(): AuthState | null {
  const storage = getStorageWithAuth();
  if (!storage) return null;

  const token = storage.getItem('authToken');
  const role = storage.getItem('userType');
  const username = storage.getItem('username');
  const userId = storage.getItem('userId') || undefined;
  const tokenExpiry = storage.getItem('tokenExpiry') || undefined;

  if (!token || !role || !username) return null;
  if (tokenExpiry) {
    const expiryDate = new Date(tokenExpiry);
    if (expiryDate <= new Date()) {
      clearAuth();
      return null;
    }
  }

  return { token, role, username, userId, tokenExpiry };
}

export function setAuth(
  state: Omit<AuthState, 'tokenExpiry'> & { tokenExpiry?: string },
  remember: boolean
) {
  const storage = remember ? localStorage : sessionStorage;

  storage.setItem('authToken', state.token);
  storage.setItem('userType', String(state.role));
  storage.setItem('username', state.username);
  if (state.userId) storage.setItem('userId', String(state.userId));

  // Default expiry to 24 hours (matches your original plain-site behavior)
  const expiry = state.tokenExpiry || (() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d.toISOString();
  })();
  storage.setItem('tokenExpiry', expiry);

  // Ensure the other storage is cleared to avoid conflicting state
  (remember ? sessionStorage : localStorage).removeItem('authToken');
  (remember ? sessionStorage : localStorage).removeItem('userType');
  (remember ? sessionStorage : localStorage).removeItem('username');
  (remember ? sessionStorage : localStorage).removeItem('userId');
  (remember ? sessionStorage : localStorage).removeItem('tokenExpiry');

  notifyAuthChanged();
}

export function clearAuth() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userType');
  localStorage.removeItem('username');
  localStorage.removeItem('userId');
  localStorage.removeItem('tokenExpiry');

  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('userType');
  sessionStorage.removeItem('username');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('tokenExpiry');

  notifyAuthChanged();
}

export function getDashboardPath(role: UserRole): string {
  const r = String(role).toLowerCase();
  if (r === 'owner' || r === 'co_owner') return '/dashboard/admin';
  if (r === 'reseller') return '/dashboard/reseller';
  return '/dashboard/customer';
}

export function notifyAuthChanged() {
  window.dispatchEvent(new Event('auth-changed'));
}
