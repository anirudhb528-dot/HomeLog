'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/serviceController');

const router = express.Router();

// Public: browse and view providers.
router.get('/', ctrl.listProviders);

// "/bookings/mine" must precede "/:id" so it isn't captured as an id param.
router.get('/bookings/mine', requireAuth, ctrl.myBookings);

router.get('/:id', [param('id').isUUID()], validate, ctrl.getProvider);

// Authenticated: review and book.
router.post(
  '/:id/reviews',
  requireAuth,
  [
    param('id').isUUID(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
    body('comment').optional().isString().trim(),
  ],
  validate,
  ctrl.addReview
);

router.post(
  '/:id/book',
  requireAuth,
  [
    param('id').isUUID(),
    body('scheduledFor').optional().isISO8601(),
    body('notes').optional().isString().trim(),
  ],
  validate,
  ctrl.requestBooking
);

module.exports = router;
