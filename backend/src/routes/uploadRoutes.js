'use strict';

const express = require('express');
const multer = require('multer');
const { query } = require('express-validator');

const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/uploadController');
const { MAX_BYTES } = require('../services/storageService');

const router = express.Router();

// Buffer uploads in memory (small images only) so we can hand the buffer to
// Supabase without writing to disk. Hard size cap mirrors the service validation.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Use JPEG, PNG, or WebP.'));
    }
  },
});

router.post(
  '/image',
  requireAuth,
  [
    query('folder')
      .exists()
      .withMessage('folder is required')
      .isIn(['receipts', 'avatars', 'misc'])
      .withMessage('Folder must be receipts, avatars, or misc'),
  ],
  validate,
  upload.single('image'),
  ctrl.uploadSingleImage
);

module.exports = router;
