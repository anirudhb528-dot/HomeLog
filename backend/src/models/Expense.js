'use strict';

const mongoose = require('mongoose');

const CATEGORIES = [
  'maintenance',
  'utilities',
  'improvement',
  'insurance',
  'taxes',
  'services',
  'other',
];

const expenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', trim: true, uppercase: true },
    category: { type: String, enum: CATEGORIES, default: 'other', index: true },
    date: { type: Date, required: true, default: Date.now },
    // Optional link back to the maintenance task that generated the expense.
    relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceTask' },
  },
  { timestamps: true }
);

// Supports the summary aggregation and date-ranged listings per user.
expenseSchema.index({ user: 1, date: -1 });

expenseSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.CATEGORIES = CATEGORIES;
