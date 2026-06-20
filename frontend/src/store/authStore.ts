import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { User, UserRole, isCrossWarehouseRole, canApproveQuotations, isSalesRep } from '../types';

// Storage keys
const TOKEN_KEY  = 'session_token';
const EXPIRES_KEY = 'session_expires_at';
const USER_KEY   = 'user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  warehouseId: string | null;
  warehouseName: string | null;
  isSuperAdmin: boolean;
  isGeneralManager: boolean;
  isWarehouseManager: boolean;
  isCrossWarehouse: boolean;
  isApprover: boolean;
  isAgent: boolean;
  isClerk: boolean;      // true for sales_clerk only (kept for backward compat)
  isSalesClerk: boolean;
  isPurchaseClerk: boolean;
  isAccountant: boolean;
  sessionToken: string | null;
  sessionExpiresAt: string | null;
  checkAuth: () => Promise<void>;
  login: (sessionToken: string, user: User, expiresAt?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

function deriveFlags(user: User | null) {
  if (!user) {
    return { warehouseId: null, warehouseName: null, isSuperAdmin: false,
             isGeneralManager: false, isWarehouseManager: false, isCrossWarehouse: false,
             isApprover: false, isAgent: false, isClerk: false, isAccountant: false,
             isSalesClerk: false, isPurchaseClerk: false };
  }
  const role = user.role as UserRole;
  return {
    warehouseId: user.warehouse_id ?? null,
    warehouseName: user.warehouse_name ?? null,
    isSuperAdmin: role === 'super_admin',
    isGeneralManager: role === 'general_manager',
    isWarehouseManager: role === 'warehouse_manager',
    isCrossWarehouse: isCrossWarehouseRole(role),
    isApprover: canApproveQuotations(role),
    isAgent: isSalesRep(role),
    // isClerk kept for backward compat — true only for sales_clerk
    isClerk: role === 'sales_clerk',
    isSalesClerk: role === 'sales_clerk',
    isPurchaseClerk: role === 'purchase_clerk',
    isAccountant: role === 'accountant',
  };
}

/** Internal: persist a session to AsyncStorage and update axios default header. */
async function persistSession(token: string, user: User, expiresAt: string | null) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  if (expiresAt) {
    await AsyncStorage.setItem(EXPIRES_KEY, expiresAt);
  } else {
    await AsyncStorage.removeItem(EXPIRES_KEY);
  }
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

/** Internal: clear the persisted session. */
async function clearPersistedSession() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem(EXPIRES_KEY);
  delete api.defaults.headers.common['Authorization'];
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  warehouseId: null,
  warehouseName: null,
  isSuperAdmin: false,
  isGeneralManager: false,
  isWarehouseManager: false,
  isCrossWarehouse: false,
  isApprover: false,
  isAgent: false,
  isClerk: false,
  isSalesClerk: false,
  isPurchaseClerk: false,
  isAccountant: false,
  sessionToken: null,
  sessionExpiresAt: null,

  checkAuth: async () => {
    try {
      set({ isLoading: true });

      const sessionToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!sessionToken) {
        set({
          user: null, isAuthenticated: false, isLoading: false,
          sessionToken: null, sessionExpiresAt: null,
          ...deriveFlags(null),
        });
        return;
      }

      // Optimistically restore the cached user so the UI doesn't flash.
      const cachedRaw = await AsyncStorage.getItem(USER_KEY);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as User;
          set({
            user: cached,
            isAuthenticated: true,
            sessionToken,
            ...deriveFlags(cached),
          });
        } catch { /* ignore parse errors */ }
      }

      // Ask the server to confirm the session is still valid + return the
      // freshest user record. If it 401s we wipe the session and bounce to login.
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const user = response.data as User;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        sessionToken,
        ...deriveFlags(user),
      });
    } catch (error) {
      console.warn('Check auth error:', error);
      await clearPersistedSession();
      set({
        user: null, isAuthenticated: false, isLoading: false,
        sessionToken: null, sessionExpiresAt: null,
        ...deriveFlags(null),
      });
    }
  },

  login: async (sessionToken: string, user: User, expiresAt?: string) => {
    try {
      set({ isLoading: true });
      await persistSession(sessionToken, user, expiresAt ?? null);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        sessionToken,
        sessionExpiresAt: expiresAt ?? null,
        ...deriveFlags(user),
      });
    } catch (error) {
      console.error('Login error:', error);
      await clearPersistedSession();
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          await api.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (e) {
          // best-effort; still clear locally
        }
      }
    } finally {
      await clearPersistedSession();
      set({
        user: null,
        isAuthenticated: false,
        sessionToken: null,
        sessionExpiresAt: null,
        ...deriveFlags(null),
      });
    }
  },

  refreshUser: async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) return;

      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = response.data as User;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, ...deriveFlags(user) });
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user, ...deriveFlags(user) }),
}));
