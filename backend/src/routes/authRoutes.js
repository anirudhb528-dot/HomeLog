'use strict';

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  ctrl.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  ctrl.login
);

router.get('/me', requireAuth, ctrl.getMe);

router.patch(
  '/me',
  requireAuth,
  [
    body('name').optional().isString().trim().notEmpty(),
    body('avatarUrl').optional({ nullable: true }).isString(),
    body('avatarPath').optional({ nullable: true }).isString(),
    body('home').optional().isObject(),
    body('home.sizeSqFt').optional().isNumeric(),
    body('home.yearBuilt').optional().isNumeric(),
  ],
  validate,
  ctrl.updateMe
);

module.exports = router;
