import { useEffect, useState } from 'react';
import { getAuth, type AuthState } from './auth';

export function useAuth() {
  const [auth, setAuthState] = useState<AuthState | null>(() => getAuth());

  useEffect(() => {
    const update = () => setAuthState(getAuth());
    window.addEventListener('auth-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('auth-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return auth;
}
