'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { uploadImage } = require('../services/storageService');

/**
 * POST /api/uploads/image — upload a single image to Supabase Storage and return
 * its URL. The caller then saves that URL onto an expense (`receiptUrl`) or the
 * user profile (`avatarUrl`). `?folder=receipts|avatars` namespaces the object.
 */
const uploadSingleImage = asyncHandler(async (req, res) => {
  const folderParam = req.query.folder;
  const folder = ['receipts', 'avatars'].includes(folderParam) ? folderParam : 'misc';

  const result = await uploadImage({ file: req.file, userId: req.user._id, folder });
  res.status(201).json(result); // { url, path }
});

module.exports = { uploadSingleImage };
