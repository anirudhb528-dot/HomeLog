import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Read the API base URL from app.json -> expo.extra.apiBaseUrl. Falls back to
// localhost so a fresh checkout still points somewhere sensible.
const apiBaseUrl =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  Constants.manifest?.extra?.apiBaseUrl ||
  'http://localhost:5000/api';

export const TOKEN_KEY = 'homelog.token';

const client = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

// Attach the JWT to every request automatically.
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A hook the AuthContext registers so a 401 anywhere can clear the session.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      await onUnauthorized();
    }
    return Promise.reject(error);
  }
);

/** Pull a human-readable message out of an Axios error for display in the UI. */
export function errorMessage(error, fallback = 'Something went wrong') {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export { apiBaseUrl };
export default client;
