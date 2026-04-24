import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { User, UserRole, isCrossWarehouseRole, canApproveQuotations, isSalesRep } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY  = 'user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  warehouseId: string | null;
  warehouseName: string | null;
  isSuperAdmin: boolean;
  isGeneralManager: boolean;
  isCrossWarehouse: boolean;
  isApprover: boolean;
  isAgent: boolean;
  isClerk: boolean;
  isAccountant: boolean;
  token: string | null;
  checkAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

function deriveFlags(user: User | null) {
  if (!user) {
    return {
      warehouseId: null, warehouseName: null,
      isSuperAdmin: false, isGeneralManager: false,
      isCrossWarehouse: false, isApprover: false,
      isAgent: false, isClerk: false, isAccountant: false,
    };
  }
  const role = user.role as UserRole;
  return {
    warehouseId:      user.warehouse_id ?? null,
    warehouseName:    user.warehouse_name ?? null,
    isSuperAdmin:     role === 'super_admin',
    isGeneralManager: role === 'general_manager',
    isCrossWarehouse: isCrossWarehouseRole(role),
    isApprover:       canApproveQuotations(role),
    isAgent:          isSalesRep(role),
    isClerk:          role === 'sales_clerk',
    isAccountant:     role === 'accountant',
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, isAuthenticated: false, isLoading: true,
  warehouseId: null, warehouseName: null,
  isSuperAdmin: false, isGeneralManager: false,
  isCrossWarehouse: false, isApprover: false,
  isAgent: false, isClerk: false, isAccountant: false,
  token: null,

  // Re-hydrate session on app start
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false, token: null, ...deriveFlags(null) });
        return;
      }
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user: User = response.data;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      set({ user, isAuthenticated: true, isLoading: false, token, ...deriveFlags(user) });
    } catch {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      delete api.defaults.headers.common['Authorization'];
      set({ user: null, isAuthenticated: false, isLoading: false, token: null, ...deriveFlags(null) });
    }
  },

  // Username + password login — calls our own /auth/login, no Supabase
  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user }: { token: string; user: User } = response.data;
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      set({ user, isAuthenticated: true, isLoading: false, token, ...deriveFlags(user) });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {
      // best-effort — clear locally regardless
    } finally {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      delete api.defaults.headers.common['Authorization'];
      set({ user: null, isAuthenticated: false, token: null, ...deriveFlags(null) });
    }
  },

  // Re-fetch profile after a role change etc.
  refreshUser: async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) return;
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user: User = response.data;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, ...deriveFlags(user) });
    } catch (error) {
      console.error('refreshUser error:', error);
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user, ...deriveFlags(user) }),
}));
