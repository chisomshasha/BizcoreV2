import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Priority:
// 1. EXPO_PUBLIC_BACKEND_URL from .env or EAS Build secrets (recommended for production)
// 2. Fallback (you can set a sensible default)
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://bizcore-v2.fly.dev';   // ← Update this with your actual Fly.io URL

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add debug logging in development
if (__DEV__) {
  console.log('[api] Using BACKEND_URL:', BACKEND_URL);
}

// UPDATED: Add Supabase token to requests (changed from 'supabase_token' to 'supabase_token')
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('supabase_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (logout on auth failure)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // UPDATED: Remove supabase_token instead of supabase_token
      await AsyncStorage.removeItem('supabase_token');
      await AsyncStorage.removeItem('user');
      // Optional: You could navigate to login screen here if you have access to navigation
    }
    return Promise.reject(error);
  }
);

export default api;
