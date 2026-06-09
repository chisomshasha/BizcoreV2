import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend host resolution order:
//   1. EXPO_PUBLIC_BACKEND_URL from .env or EAS Build secrets (recommended for production)
//   2. Hard-coded default for Railway deployment of BizCore
const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://bizcorev2-production.up.railway.app';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

if (__DEV__) {
  console.log('[api] Using BACKEND_URL:', BACKEND_URL);
}

// Attach the session token to every outgoing request.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('session_token');
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the local session. The RootLayout's auth watcher will
// see `isAuthenticated === false` and bounce the user to /login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('session_token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('session_expires_at');
    }
    return Promise.reject(error);
  },
);

export default api;
