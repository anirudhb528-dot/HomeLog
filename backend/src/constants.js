'use strict';

// Shared enums/constants (previously embedded in the Mongoose models).
module.exports = {
  MAINTENANCE_CATEGORIES: [
    'hvac',
    'plumbing',
    'electrical',
    'exterior',
    'appliances',
    'safety',
    'landscaping',
    'general',
  ],
  RECURRENCES: ['none', 'monthly', 'quarterly', 'biannual', 'annual'],
  PRIORITIES: ['low', 'medium', 'high'],
  TASK_STATUSES: ['pending', 'done', 'skipped'],
  EXPENSE_CATEGORIES: [
    'maintenance',
    'utilities',
    'improvement',
    'insurance',
    'taxes',
    'services',
    'other',
  ],
  TRADES: [
    'plumber',
    'electrician',
    'hvac',
    'landscaper',
    'roofer',
    'painter',
    'cleaner',
    'handyman',
    'pest-control',
    'general',
  ],
  BOOKING_STATUSES: ['requested', 'confirmed', 'completed', 'cancelled'],
  // Months each recurrence advances a task's due date.
  RECURRENCE_MONTHS: { monthly: 1, quarterly: 3, biannual: 6, annual: 12 },
};
