'use strict';

const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

/**
 * Server-side Supabase access.
 *
 * The Render API uses the **service_role** key, which bypasses Row-Level
 * Security and can read/write any row — so it must NEVER be exposed to the app.
 * The app authenticates with Supabase directly (public anon key) and sends its
 * access token to this API; we verify that token here and then do the actual
 * data work with the admin client.
 */
let admin = null;

/** Lazily-created admin client (service_role). Server-side only. */
function getAdminClient() {
  if (!env.supabaseConfigured) {
    throw new Error('Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  if (!admin) {
    admin = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/**
 * Validate a Supabase access token (JWT from the app) and return the auth user
 * `{ id, email, ... }`, or null if invalid/expired. Uses Supabase's auth server
 * so we don't need to hold the JWT signing secret.
 */
async function getUserFromToken(token) {
  if (!token) return null;
  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
}

module.exports = { getAdminClient, getUserFromToken };
