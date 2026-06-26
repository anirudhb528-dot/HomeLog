'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/expenseController');
const { CATEGORIES } = require('../models/Expense');

const router = express.Router();

// Every expense route requires authentication.
router.use(requireAuth);

router.get('/', ctrl.listExpenses);

// Note: /summary must be declared before /:id-style routes (there are none that
// collide here, but keeping summary explicit and first is clearest).
router.get('/summary', ctrl.summary);

router.post(
  '/',
  [
    body('description').isString().trim().notEmpty().withMessage('Description is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
    body('category').optional().isIn(CATEGORIES),
    body('date').optional().isISO8601(),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }),
    body('receiptUrl').optional({ nullable: true }).isString(),
    body('receiptPath').optional({ nullable: true }).isString(),
  ],
  validate,
  ctrl.createExpense
);

router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('description').optional().isString().trim().notEmpty(),
    body('amount').optional().isFloat({ min: 0 }),
    body('category').optional().isIn(CATEGORIES),
    body('date').optional().isISO8601(),
    body('receiptUrl').optional({ nullable: true }).isString(),
    body('receiptPath').optional({ nullable: true }).isString(),
  ],
  validate,
  ctrl.updateExpense
);

router.delete('/:id', [param('id').isMongoId()], validate, ctrl.deleteExpense);

module.exports = router;
