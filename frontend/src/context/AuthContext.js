import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import client, { TOKEN_KEY, setUnauthorizedHandler } from '../api/client';
import { authApi } from '../api/auth';

const USER_KEY = 'homelog.user';

const AuthContext = createContext(null);

/**
 * Deliberately thin auth layer: token + user state, plus login/register/logout.
 * Swapping JWT for Firebase later means changing only `login`/`register` here
 * and the token verification on the backend — screens stay untouched.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while hydrating on boot

  // Persist + apply a session, or clear it when passed null.
  const applySession = useCallback(async (nextToken, nextUser) => {
    if (nextToken) {
      await AsyncStorage.setItem(TOKEN_KEY, nextToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }
    setToken(nextToken || null);
    setUser(nextUser || null);
  }, []);

  const logout = useCallback(async () => {
    await applySession(null, null);
  }, [applySession]);

  // Restore a saved session on launch, then refresh the profile if possible.
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (savedToken) {
          setToken(savedToken);
          if (savedUser) setUser(JSON.parse(savedUser));
          // Validate the token and refresh the stored user.
          try {
            const { user: fresh } = await authApi.me();
            setUser(fresh);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
          } catch (_e) {
            // 401 handler (below) will clear the session if the token is bad.
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Let a 401 from any request clear the session globally.
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await applySession(null, null);
    });
  }, [applySession]);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login({ email, password });
      await applySession(data.token, data.user);
      return data.user;
    },
    [applySession]
  );

  const register = useCallback(
    async (name, email, password) => {
      const data = await authApi.register({ name, email, password });
      await applySession(data.token, data.user);
      return data.user;
    },
    [applySession]
  );

  // Update profile via the API and keep local/persisted user in sync.
  const updateProfile = useCallback(async (payload) => {
    const { user: updated } = await authApi.updateMe(payload);
    setUser(updated);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    return updated;
  }, []);

  // Permanently delete the account, then clear the local session.
  const deleteAccount = useCallback(async () => {
    await authApi.deleteMe();
    await applySession(null, null);
  }, [applySession]);

  const value = {
    token,
    user,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    updateProfile,
    deleteAccount,
    apiBaseUrl: client.defaults.baseURL,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;
