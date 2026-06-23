'use strict';

const mongoose = require('mongoose');

const STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'];

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
    scheduledFor: { type: Date },
    notes: { type: String, trim: true },
    status: { type: String, enum: STATUSES, default: 'requested', index: true },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, createdAt: -1 });

bookingSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.STATUSES = STATUSES;
