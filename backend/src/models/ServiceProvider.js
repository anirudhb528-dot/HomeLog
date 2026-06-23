'use strict';

const mongoose = require('mongoose');

const TRADES = [
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
];

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: true }
);

const serviceProviderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    trade: { type: String, enum: TRADES, required: true, index: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    city: { type: String, trim: true, index: true },
    state: { type: String, trim: true },
    description: { type: String, trim: true },
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    reviews: { type: [reviewSchema], default: [] },
  },
  { timestamps: true }
);

// Text index powers keyword search across name and description.
serviceProviderSchema.index({ name: 'text', description: 'text' });

/** Recompute avgRating and reviewCount from the embedded reviews array. */
serviceProviderSchema.methods.recomputeRating = function recomputeRating() {
  const count = this.reviews.length;
  this.reviewCount = count;
  if (count === 0) {
    this.avgRating = 0;
  } else {
    const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
    // Round to one decimal place for a clean display value.
    this.avgRating = Math.round((sum / count) * 10) / 10;
  }
  return this.avgRating;
};

serviceProviderSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
module.exports.TRADES = TRADES;
