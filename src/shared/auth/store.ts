import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/shared/config/constants';

export interface AuthUser {
  name: string;
  email: string;
  permission: number;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  // Actions
  setSession: (payload: { token: string; user: AuthUser }) => void;
  clearSession: () => void;
  markInitialized: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,

      setSession: ({ token, user }) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),

      clearSession: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),

      markInitialized: () => set({ isInitialized: true }),
    }),
    {
      name: 'apex-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

/**
 * Hydrate the legacy localStorage keys (`jwt`, `permission`, `user_name`, `user_email`)
 * from the persisted Zustand state. This is called once on app boot so the axios
 * request interceptor finds the token under the `jwt` key the backend expects.
 */
export function syncLegacyStorage(): void {
  const state = useAuthStore.getState();
  if (state.token) {
    localStorage.setItem(STORAGE_KEYS.JWT, state.token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.JWT);
  }
  if (state.user) {
    localStorage.setItem(STORAGE_KEYS.PERMISSION, String(state.user.permission));
    localStorage.setItem(STORAGE_KEYS.USER_NAME, state.user.name);
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, state.user.email);
  } else {
    localStorage.removeItem(STORAGE_KEYS.PERMISSION);
    localStorage.removeItem(STORAGE_KEYS.USER_NAME);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
}

// Keep legacy storage in sync whenever the store changes
useAuthStore.subscribe(syncLegacyStorage);
