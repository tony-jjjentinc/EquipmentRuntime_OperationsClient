import { create } from 'zustand';
import { JwtUserPayload } from '../types';
import { callGasApi } from '../api/gasClient';

interface AuthStore {
  token: string;
  user: JwtUserPayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initializeAuth: () => void;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  setError: (err: string | null) => void;
}

export function parseJwt(token?: string): JwtUserPayload | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT payload', e);
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: '',
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initializeAuth: () => {
    const savedToken = localStorage.getItem('eqrt_auth_token') || sessionStorage.getItem('sessionToken') || '';
    if (savedToken) {
      const parsed = parseJwt(savedToken);
      if (parsed && parsed.exp && parsed.exp * 1000 > Date.now()) {
        set({
          token: savedToken,
          user: parsed,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
        return;
      }
    }
    // No valid token
    localStorage.removeItem('eqrt_auth_token');
    sessionStorage.removeItem('sessionToken');
    set({ token: '', user: null, isAuthenticated: false, isLoading: false });
  },

  login: async (email: string, pass: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const res = await callGasApi<{ token: string; user: JwtUserPayload }>('login', {
        email,
        password: pass
      });

      if (res && res.token) {
        const parsed = parseJwt(res.token) || res.user;
        localStorage.setItem('eqrt_auth_token', res.token);
        sessionStorage.setItem('sessionToken', res.token);
        set({
          token: res.token,
          user: parsed,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
        return true;
      }
      throw new Error('Invalid response from authentication server.');
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Login failed. Please check credentials.'
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('eqrt_auth_token');
    sessionStorage.removeItem('sessionToken');
    set({ token: '', user: null, isAuthenticated: false, error: null });
  },

  setError: (err: string | null) => set({ error: err })
}));
