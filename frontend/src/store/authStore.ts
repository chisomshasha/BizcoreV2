import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { User, UserRole, isCrossWarehouseRole, canApproveQuotations, isSalesRep } from '../types';

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
  checkAuth: () => Promise<void>;
  // CHANGED: login now receives the session_token directly from the OAuth deep-link
  // (no more session_id round-trip to backend)
  login: (sessionToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

function deriveFlags(user: User | null) {
  if (!user) {
    return { warehouseId: null, warehouseName: null, isSuperAdmin: false,
             isGeneralManager: false, isCrossWarehouse: false, isApprover: false,
             isAgent: false, isClerk: false, isAccountant: false };
  }
  const role = user.role as UserRole;
  return {
    warehouseId: user.warehouse_id ?? null,
    warehouseName: user.warehouse_name ?? null,
    isSuperAdmin: role === 'super_admin',
    isGeneralManager: role === 'general_manager',
    isCrossWarehouse: isCrossWarehouseRole(role),
    isApprover: canApproveQuotations(role),
    isAgent: isSalesRep(role),
    isClerk: role === 'sales_clerk',
    isAccountant: role === 'accountant',
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, isAuthenticated: false, isLoading: true,
  warehouseId: null, warehouseName: null, isSuperAdmin: false,
  isGeneralManager: false, isCrossWarehouse: false, isApprover: false,
  isAgent: false, isClerk: false, isAccountant: false,

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem('session_token');
      if (!token) { set({ user: null, isAuthenticated: false, isLoading: false, ...deriveFlags(null) }); return; }
      const response = await api.get('/auth/me');
      const user: User = response.data;
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false, ...deriveFlags(user) });
    } catch {
      await AsyncStorage.removeItem('session_token');
      await AsyncStorage.removeItem('user');
      set({ user: null, isAuthenticated: false, isLoading: false, ...deriveFlags(null) });
    }
  },

  // CHANGED: Google OAuth now resolves on the backend. The deep-link brings back
  // the session_token directly — we just store it and call /auth/me to get the user.
  login: async (sessionToken: string) => {
    try {
      set({ isLoading: true });
      await AsyncStorage.setItem('session_token', sessionToken);
      // Verify the token is valid and fetch the user profile
      const response = await api.get('/auth/me');
      const user: User = response.data;
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false, ...deriveFlags(user) });
    } catch (error) {
      // Token was invalid — clean up
      await AsyncStorage.removeItem('session_token');
      await AsyncStorage.removeItem('user');
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    finally {
      await AsyncStorage.removeItem('session_token');
      await AsyncStorage.removeItem('user');
      set({ user: null, isAuthenticated: false, ...deriveFlags(null) });
    }
  },

  refreshUser: async () => {
    try {
      const response = await api.get('/auth/me');
      const user: User = response.data;
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ user, ...deriveFlags(user) });
    } catch {}
  },

  setUser: (user) => set({ user, isAuthenticated: !!user, ...deriveFlags(user) }),
}));
