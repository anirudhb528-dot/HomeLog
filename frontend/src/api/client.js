import axios from 'axios';
import Constants from 'expo-constants';

import { supabase } from '../lib/supabase';

// Read the API base URL from app config (EXPO_PUBLIC_API_URL at build time).
const apiBaseUrl =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  Constants.manifest?.extra?.apiBaseUrl ||
  'http://localhost:5000/api';

const client = axios.create({
  baseURL: apiBaseUrl,
  // Generous timeout so a cold Render free-tier instance (first request after
  // idle can take ~50s to wake) doesn't fail outright.
  timeout: 60000,
});

// Attach the current Supabase access token (auto-refreshed by supabase-js).
client.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the API rejects the token, sign out so the app returns to the login screen.
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);

/** Pull a human-readable message out of an Axios/Supabase error for the UI. */
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
