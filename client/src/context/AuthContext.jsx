import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on load (GET /auth/me).
  useEffect(() => {
    let alive = true;
    api
      .get('/auth/me')
      .then((d) => alive && setUser(d.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api.post('/auth/login', { email, password });
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    }
    setUser(null);
  }, []);

  // Called by the API layer / guards when a 401 is seen.
  const onUnauthorized = useCallback(() => setUser(null), []);

  const value = { user, loading, login, logout, onUnauthorized, isManager: user?.role === 'team_lead' || user?.role === 'admin' };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
