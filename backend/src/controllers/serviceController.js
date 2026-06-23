'use strict';

const ServiceProvider = require('../models/ServiceProvider');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, buildMeta } = require('../utils/pagination');

/** GET /api/services — browse/search providers (public). */
const listProviders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.trade) filter.trade = req.query.trade;
  if (req.query.city) filter.city = new RegExp(`^${escapeRegExp(req.query.city)}`, 'i');
  if (req.query.q) {
    const rx = new RegExp(escapeRegExp(req.query.q), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }

  const pg = parsePagination(req.query);
  const [providers, total] = await Promise.all([
    ServiceProvider.find(filter)
      .select('-reviews') // keep the list lightweight; reviews load on detail
      .sort({ avgRating: -1, reviewCount: -1 })
      .skip(pg.skip)
      .limit(pg.limit),
    ServiceProvider.countDocuments(filter),
  ]);
  res.json({ providers, meta: buildMeta(pg, total) });
});

/** GET /api/services/:id — provider detail with reviews (public). */
const getProvider = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.params.id);
  if (!provider) throw ApiError.notFound('Service provider not found');
  res.json({ provider });
});

/** POST /api/services/:id/reviews — add a 1–5 review and recompute the average. */
const addReview = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.params.id);
  if (!provider) throw ApiError.notFound('Service provider not found');

  provider.reviews.push({
    user: req.user._id,
    authorName: req.user.name,
    rating: req.body.rating,
    comment: req.body.comment,
  });
  provider.recomputeRating();
  await provider.save();

  res.status(201).json({ provider });
});

/** POST /api/services/:id/book — request a booking (status: requested). */
const requestBooking = asyncHandler(async (req, res) => {
  const provider = await ServiceProvider.findById(req.params.id);
  if (!provider) throw ApiError.notFound('Service provider not found');

  const booking = await Booking.create({
    user: req.user._id,
    provider: provider._id,
    scheduledFor: req.body.scheduledFor,
    notes: req.body.notes,
    status: 'requested',
  });

  res.status(201).json({ booking });
});

/** GET /api/services/bookings/mine — list the user's bookings. */
const myBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate('provider', 'name trade city state phone')
    .sort({ createdAt: -1 });
  res.json({ bookings });
});

/** Escape user input before building a RegExp to avoid ReDoS / injection. */
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { listProviders, getProvider, addReview, requestBooking, myBookings };
