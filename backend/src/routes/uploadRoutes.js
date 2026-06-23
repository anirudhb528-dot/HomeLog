'use strict';

const express = require('express');
const multer = require('multer');

const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/uploadController');
const { MAX_BYTES } = require('../services/storageService');

const router = express.Router();

// Buffer uploads in memory (small images only) so we can hand the buffer to
// Supabase without writing to disk. Hard size cap mirrors the service validation.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

router.post('/image', requireAuth, upload.single('image'), ctrl.uploadSingleImage);

module.exports = router;
