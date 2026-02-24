import React, { createContext, useContext, useState } from 'react';
import { apiFetch } from '@/constants/api';

export interface MedicUser {
  id: string;
  phone: string;
  name: string;
  experienceYears: number;
  rating: number | null;
  balance: number;
  isOnline: boolean;
}

interface AuthState {
  medic: MedicUser | null;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, name: string, experienceYears?: number) => Promise<void>;
  updateOnlineStatus: (isOnline: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ medic: null, token: null });

  const login = async (phone: string, password: string) => {
    const res = await apiFetch<{ access_token: string; medic: MedicUser }>('/medics/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    setState({ medic: res.medic, token: res.access_token });
  };

  const register = async (
    phone: string,
    password: string,
    name: string,
    experienceYears?: number,
  ) => {
    const res = await apiFetch<{ access_token: string; medic: MedicUser }>('/medics/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, name, experienceYears }),
    });
    setState({ medic: res.medic, token: res.access_token });
  };

  const updateOnlineStatus = (isOnline: boolean) => {
    setState((s) => ({
      ...s,
      medic: s.medic ? { ...s.medic, isOnline } : null,
    }));
  };

  const logout = () => setState({ medic: null, token: null });

  return (
    <AuthContext.Provider value={{ ...state, login, register, updateOnlineStatus, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
