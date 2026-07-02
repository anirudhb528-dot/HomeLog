'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/maintenanceController');
const {
  MAINTENANCE_CATEGORIES: CATEGORIES,
  RECURRENCES,
  PRIORITIES,
  TASK_STATUSES: STATUSES,
} = require('../constants');

const router = express.Router();

// Every maintenance route requires authentication.
router.use(requireAuth);

// Optional rules shared by create and update (enums + notes).
const optionalRules = [
  body('category').optional().isIn(CATEGORIES),
  body('recurrence').optional().isIn(RECURRENCES),
  body('priority').optional().isIn(PRIORITIES),
  body('status').optional().isIn(STATUSES),
  body('notes').optional().isString(),
];

router.get('/', ctrl.listTasks);

router.post(
  '/',
  [
    body('title').isString().trim().notEmpty().withMessage('Title is required'),
    body('dueDate').isISO8601().withMessage('A valid dueDate is required'),
    ...optionalRules,
  ],
  validate,
  ctrl.createTask
);

router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('title').optional().isString().trim().notEmpty().withMessage('Title cannot be empty'),
    body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date'),
    ...optionalRules,
  ],
  validate,
  ctrl.updateTask
);

router.delete('/:id', [param('id').isUUID()], validate, ctrl.deleteTask);

router.post('/:id/complete', [param('id').isUUID()], validate, ctrl.completeTask);

module.exports = router;
