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
  supabaseToken: string | null;
  checkAuth: () => Promise<void>;
  login: (supabaseToken: string, user: User) => Promise<void>;
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
  user: null, 
  isAuthenticated: false, 
  isLoading: true,
  warehouseId: null, 
  warehouseName: null, 
  isSuperAdmin: false,
  isGeneralManager: false, 
  isCrossWarehouse: false, 
  isApprover: false,
  isAgent: false, 
  isClerk: false, 
  isAccountant: false,
  supabaseToken: null,

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      const supabaseToken = await AsyncStorage.getItem('supabase_token');
      if (!supabaseToken) { 
        set({ user: null, isAuthenticated: false, isLoading: false, supabaseToken: null, ...deriveFlags(null) }); 
        return; 
      }
      
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${supabaseToken}` }
      });
      
      const user: User = response.data;
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false, 
        supabaseToken,
        ...deriveFlags(user) 
      });
    } catch (error) {
      console.error('Check auth error:', error);
      await AsyncStorage.removeItem('supabase_token');
      await AsyncStorage.removeItem('user');
      set({ user: null, isAuthenticated: false, isLoading: false, supabaseToken: null, ...deriveFlags(null) });
    }
  },

  login: async (supabaseToken: string, user: User) => {
    try {
      set({ isLoading: true });
      
      await AsyncStorage.setItem('supabase_token', supabaseToken);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      api.defaults.headers.common['Authorization'] = `Bearer ${supabaseToken}`;
      
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false, 
        supabaseToken,
        ...deriveFlags(user) 
      });
    } catch (error) {
      console.error('Login error:', error);
      await AsyncStorage.removeItem('supabase_token');
      await AsyncStorage.removeItem('user');
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try { 
      const { supabase } = await import('../lib/supabase');
      await supabase.auth.signOut();
    } catch {}
    
    try {
      const token = await AsyncStorage.getItem('supabase_token');
      if (token) {
        await api.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {}
    
    finally {
      await AsyncStorage.removeItem('supabase_token');
      await AsyncStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      set({ 
        user: null, 
        isAuthenticated: false, 
        supabaseToken: null,
        ...deriveFlags(null) 
      });
    }
  },

  refreshUser: async () => {
    try {
      const token = await AsyncStorage.getItem('supabase_token');
      if (!token) return;
      
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const user: User = response.data;
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ user, ...deriveFlags(user) });
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user, ...deriveFlags(user) }),
}));
