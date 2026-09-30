import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  devLogin: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const { data } = await authApi.getMe();
      setUser(data.user);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for token in URL (from OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    fetchUser();
  }, [fetchUser]);

  const login = async () => {
    const { data } = await authApi.getGoogleAuthUrl();
    window.location.href = data.url;
  };

  const devLogin = async () => {
    const { data } = await authApi.devLogin();
    localStorage.setItem('token', data.token);
    setUser(data.user);
    window.location.href = '/dashboard';
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, devLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
