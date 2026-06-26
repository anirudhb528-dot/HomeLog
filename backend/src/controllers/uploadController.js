'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { uploadImage } = require('../services/storageService');

/**
 * POST /api/uploads/image — upload a single image to Supabase Storage and return
 * its URL. The caller then saves that URL onto an expense (`receiptUrl`) or the
 * user profile (`avatarUrl`). `?folder=receipts|avatars|misc` namespaces the object.
 */
const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Image file is required');
  const folder = req.query.folder;

  const result = await uploadImage({ file: req.file, userId: req.user._id, folder });
  res.status(201).json(result); // { url, path }
});

module.exports = { uploadSingleImage };
