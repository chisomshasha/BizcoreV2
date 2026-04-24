import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Priority:
// 1. EXPO_PUBLIC_BACKEND_URL from .env or EAS Build secrets (set in eas.json per profile)
// 2. Hardcoded Railway fallback
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://bizcorev2-production.up.railway.app';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Debug logging in development
if (__DEV__) {
  console.log('[api] Using BACKEND_URL:', BACKEND_URL);
}

// Attach auth token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear session and let the app redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['auth_token', 'user']);
      delete api.defaults.headers.common['Authorization'];
    }
    return Promise.reject(error);
  }
);

export default api;
