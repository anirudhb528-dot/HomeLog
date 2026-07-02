import 'react-native-url-polyfill/auto'; // supabase-js needs a full URL impl in RN
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};
const supabaseUrl = extra.supabaseUrl;
const supabaseAnonKey = extra.supabaseAnonKey;

/**
 * The app authenticates directly with Supabase using the PUBLIC anon key
 * (safe to ship). The session (access token) is persisted on-device via
 * AsyncStorage and auto-refreshed; the Axios client attaches that token when
 * calling the Render API.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
