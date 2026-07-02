import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { supabase } from '../lib/supabase';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

/**
 * Auth is handled by Supabase (the app talks to Supabase directly with the
 * public anon key). We keep the Supabase `session` for gating, and load the
 * user's `profile` (name/home/avatar) from our Render API. Swapping providers
 * later means changing only this file.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null); // backend profile shape
  const [loading, setLoading] = useState(true);

  // Load the profile (name/home/avatar) from the API for the signed-in user.
  const loadProfile = useCallback(async () => {
    try {
      const { user: profile } = await authApi.me();
      setUser(profile);
    } catch (_e) {
      // Non-fatal; a 401 will trigger sign-out via the Axios interceptor.
    }
  }, []);

  // Restore any saved session on launch, then keep it in sync with Supabase.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile();
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) loadProfile();
      else setUser(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    // With email confirmation OFF, a session is returned immediately and the
    // onAuthStateChange listener logs the user in. If confirmation is ON, no
    // session comes back — surface that so the UI can tell the user to verify.
    return { needsConfirmation: !data.session };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const { user: updated } = await authApi.updateMe(payload);
    setUser(updated);
    return updated;
  }, []);

  const deleteAccount = useCallback(async () => {
    await authApi.deleteMe();
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  }, []);

  const value = {
    session,
    user,
    loading,
    isAuthenticated: !!session,
    login,
    register,
    logout,
    updateProfile,
    deleteAccount,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;
