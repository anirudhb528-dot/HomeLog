'use strict';

const { getAdminClient } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { deleteImage, assertOwnedStoragePath } = require('../services/storageService');

// Register/login now happen in the app via the Supabase client. The backend
// owns the profile row (extra user data) and account deletion.

/** Combine the Supabase auth user with its profile row into the app's shape. */
function toUser(authUser, profile) {
  return {
    id: authUser.id,
    email: authUser.email,
    name: profile?.name || '',
    avatarUrl: profile?.avatar_url || null,
    avatarPath: profile?.avatar_path || null,
    home: profile?.home || {},
    createdAt: profile?.created_at || null,
  };
}

async function fetchProfile(userId) {
  const { data, error } = await getAdminClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new ApiError(500, 'Failed to load profile');
  return data;
}

/** GET /api/auth/me */
const getMe = asyncHandler(async (req, res) => {
  const profile = await fetchProfile(req.user.id);
  res.json({ user: toUser(req.user, profile) });
});

/** PATCH /api/auth/me — update name / home / avatar (upsert so a row always exists). */
const updateMe = asyncHandler(async (req, res) => {
  const { name, home, avatarUrl, avatarPath } = req.body;
  const patch = { id: req.user.id };

  if (typeof name === 'string') patch.name = name;
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl;
  if (avatarPath !== undefined) {
    if (avatarPath) assertOwnedStoragePath(avatarPath, req.user.id, 'avatars');
    patch.avatar_path = avatarPath;
  }
  if (home && typeof home === 'object') {
    const current = await fetchProfile(req.user.id);
    patch.home = { ...(current?.home || {}), ...home };
  }

  const { data, error } = await getAdminClient()
    .from('profiles')
    .upsert(patch)
    .select('*')
    .maybeSingle();
  if (error) throw new ApiError(500, 'Failed to update profile');
  res.json({ user: toUser(req.user, data) });
});

/**
 * DELETE /api/auth/me — permanently delete the account. Deleting the Supabase
 * auth user cascades (FK on delete cascade) to profile, tasks, expenses,
 * bookings, and reviews. Uploaded images are cleaned from storage first.
 */
const deleteMe = asyncHandler(async (req, res) => {
  const admin = getAdminClient();

  const [{ data: profile }, { data: expenses }] = await Promise.all([
    admin.from('profiles').select('avatar_path').eq('id', req.user.id).maybeSingle(),
    admin.from('expenses').select('receipt_path').eq('user_id', req.user.id),
  ]);
  const paths = [profile?.avatar_path, ...(expenses || []).map((e) => e.receipt_path)].filter(Boolean);
  await Promise.allSettled(paths.map((p) => deleteImage(p)));

  const { error } = await admin.auth.admin.deleteUser(req.user.id);
  if (error) throw new ApiError(500, 'Failed to delete account');
  res.json({ ok: true });
});

module.exports = { getMe, updateMe, deleteMe };
