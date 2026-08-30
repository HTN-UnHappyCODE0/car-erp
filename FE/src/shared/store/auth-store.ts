'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/shared/config/constants';

const COOKIE_TOKEN_NAME = 'car_erp_token';

const setAuthCookie = (token: string) => {
  if (typeof document !== 'undefined') {
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    // Lưu cookie cho Next.js Middleware Server-Side đọc (7 ngày)
    document.cookie = `${COOKIE_TOKEN_NAME}=${encodeURIComponent(
      token
    )}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
  }
};

const clearAuthCookie = () => {
  if (typeof document !== 'undefined') {
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    document.cookie = `${COOKIE_TOKEN_NAME}=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
  }
};

export interface AuthUser {
  id: string;
  employee_id: string;
  username: string;
  role: string;
  branch_id: string;
  created_at: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken?: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        setAuthCookie(accessToken);
        set({
          user,
          accessToken,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
        });
      },

      setAccessToken: (accessToken) => {
        setAuthCookie(accessToken);
        set({ accessToken });
      },

      clearAuth: () => {
        clearAuthCookie();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      logout: () => {
        clearAuthCookie();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: STORAGE_KEYS.AUTH_SESSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
