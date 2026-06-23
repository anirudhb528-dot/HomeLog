'use strict';

const mongoose = require('mongoose');

const CATEGORIES = [
  'hvac',
  'plumbing',
  'electrical',
  'exterior',
  'appliances',
  'safety',
  'landscaping',
  'general',
];
const RECURRENCES = ['none', 'monthly', 'quarterly', 'biannual', 'annual'];
const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['pending', 'done', 'skipped'];

// How many months each recurrence advances the due date.
const RECURRENCE_MONTHS = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  annual: 12,
};

const maintenanceTaskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    category: { type: String, enum: CATEGORIES, default: 'general' },
    dueDate: { type: Date, required: true },
    recurrence: { type: String, enum: RECURRENCES, default: 'none' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Common query: a user's tasks ordered by due date.
maintenanceTaskSchema.index({ user: 1, dueDate: 1 });

/**
 * Compute the next due date for a recurring task, advancing from the current
 * dueDate by the recurrence interval. Returns null for non-recurring tasks.
 */
maintenanceTaskSchema.methods.computeNextDueDate = function computeNextDueDate() {
  const months = RECURRENCE_MONTHS[this.recurrence];
  if (!months) return null;
  const next = new Date(this.dueDate);
  next.setMonth(next.getMonth() + months);
  return next;
};

maintenanceTaskSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('MaintenanceTask', maintenanceTaskSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.RECURRENCES = RECURRENCES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.STATUSES = STATUSES;
