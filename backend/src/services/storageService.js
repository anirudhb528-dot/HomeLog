'use strict';

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Lazily-created Supabase client (only when storage is configured).
let client = null;
function getClient() {
  if (!env.storageEnabled) {
    // 503: the feature is unavailable until SUPABASE_* env vars are set.
    throw new ApiError(503, 'Image storage is not configured on the server');
  }
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_FOLDERS = new Set(['avatars', 'receipts', 'misc']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

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
 * Upload an image buffer to Supabase Storage under `<folder>/<userId>/<random>.<ext>`
 * and return its public URL + storage path.
 */
async function uploadImage({ file, userId, folder = 'misc' }) {
  validateImage(file);
  if (!ALLOWED_FOLDERS.has(folder)) throw ApiError.badRequest('Invalid upload folder');
  const supabase = getClient();

  const ext = EXT_BY_MIME[file.mimetype] || 'bin';
  const path = `${folder}/${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(env.supabaseBucket).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) {
    console.error('Supabase storage upload error:', error);
    throw new ApiError(502, 'Storage operation failed');
  }

  const { data } = supabase.storage.from(env.supabaseBucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Best-effort delete of a previously uploaded object (ignores missing files). */
async function deleteImage(path) {
  if (!path || !env.storageEnabled) return;
  const supabase = getClient();
  await supabase.storage.from(env.supabaseBucket).remove([path]);
}

module.exports = { uploadImage, deleteImage, validateImage, ALLOWED_MIME, MAX_BYTES };
