import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, User } from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<{ success: boolean; configured: boolean }>;
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
    // Check for token in URL (from OAuth redirect) — this takes priority
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      // Always overwrite any existing token with the fresh OAuth token
      localStorage.setItem('token', urlToken);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    fetchUser();
  }, [fetchUser]);

  const login = async (): Promise<{ success: boolean; configured: boolean }> => {
    try {
      const { data } = await authApi.getGoogleAuthUrl();
      if (data.configured && data.url) {
        window.location.href = data.url;
        return { success: true, configured: true };
      }
      return { success: false, configured: false };
    } catch {
      return { success: false, configured: false };
    }
  };

  const devLogin = async () => {
    try {
      const { data } = await authApi.devLogin();
      localStorage.setItem('token', data.token);
      setUser(data.user);
      window.location.href = '/dashboard';
    } catch {
      toast.error('Failed to initialize demo session');
    }
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
