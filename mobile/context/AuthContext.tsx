import React, { createContext, useContext, useState } from 'react';
import { apiFetch } from '@/constants/api';

export interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null });

  const login = async (phone: string, password: string) => {
    const res = await apiFetch<{ access_token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    setState({ user: res.user, token: res.access_token });
  };

  const register = async (phone: string, password: string, name?: string) => {
    const res = await apiFetch<{ access_token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, ...(name ? { name } : {}) }),
    });
    setState({ user: res.user, token: res.access_token });
  };

  const logout = () => setState({ user: null, token: null });

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
