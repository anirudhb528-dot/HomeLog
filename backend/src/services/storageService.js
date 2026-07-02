'use strict';

const crypto = require('crypto');
const env = require('../config/env');
const { getAdminClient } = require('../config/supabase');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_FOLDERS = new Set(['avatars', 'receipts', 'misc']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** The Supabase Storage bucket, or throw 503 if storage isn't configured. */
function storageBucket() {
  if (!env.storageEnabled) {
    throw new ApiError(503, 'Image storage is not configured on the server');
  }
  return getAdminClient().storage.from(env.supabaseBucket);
}

/** Throw a 400 if the uploaded file isn't an allowed image within the size cap. */
function validateImage(file) {
  if (!file) throw ApiError.badRequest('No file provided (field name: "image")');
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw ApiError.badRequest('Unsupported file type. Use JPEG, PNG, or WebP.');
  }
  if (file.size > MAX_BYTES) {
    throw ApiError.badRequest('Image too large (max 5 MB).');
  }
}

/**
 * Upload an image buffer to `<folder>/<userId>/<random>.<ext>` and return its
 * public URL + storage path.
 */
async function uploadImage({ file, userId, folder = 'misc' }) {
  validateImage(file);
  if (!ALLOWED_FOLDERS.has(folder)) throw ApiError.badRequest('Invalid upload folder');
  const bucket = storageBucket();

  const ext = EXT_BY_MIME[file.mimetype] || 'bin';
  const path = `${folder}/${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await bucket.upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) {
    console.error('Supabase storage upload error:', error);
    throw new ApiError(502, 'Storage operation failed');
  }

  const { data } = bucket.getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Best-effort delete of a previously uploaded object (no-op if storage is off). */
async function deleteImage(path) {
  if (!path || !env.storageEnabled) return;
  await getAdminClient().storage.from(env.supabaseBucket).remove([path]);
}

/**
 * Reject a storage path not owned by this user. Uploads are written under
 * `<folder>/<userId>/...`, so a client-supplied path must carry that prefix.
 */
function assertOwnedStoragePath(path, userId, folder) {
  if (!path) return;
  const prefix = `${folder}/${String(userId)}/`;
  if (typeof path !== 'string' || !path.startsWith(prefix)) {
    throw ApiError.badRequest('Invalid storage path');
  }
}

module.exports = {
  uploadImage,
  deleteImage,
  validateImage,
  assertOwnedStoragePath,
  ALLOWED_MIME,
  MAX_BYTES,
};
