'use strict';

const User = require('../models/User');
const MaintenanceTask = require('../models/MaintenanceTask');
const Expense = require('../models/Expense');
const Booking = require('../models/Booking');
const ServiceProvider = require('../models/ServiceProvider');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { deleteImage, assertOwnedStoragePath } = require('../services/storageService');

/** POST /api/auth/register — create an account and return a JWT. */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('That email is already registered');

  const user = new User({ name, email });
  await user.setPassword(password);
  await user.save();

  const token = signToken(user._id);
  res.status(201).json({ token, user });
});

/** POST /api/auth/login — verify credentials and return a JWT. */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // passwordHash is select:false, so request it explicitly for comparison.
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signToken(user._id);
  // Re-fetch without the hash (or rely on toJSON) — toJSON already strips it.
  res.json({ token, user });
});

/** GET /api/auth/me — return the authenticated user's profile. */
const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

/** PATCH /api/auth/me — update name and/or embedded home details. */
const updateMe = asyncHandler(async (req, res) => {
  const { name, home, avatarUrl, avatarPath } = req.body;

  if (typeof name === 'string') req.user.name = name;
  if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl;
  if (avatarPath !== undefined) {
    // Only accept a path inside this user's own avatars namespace.
    assertOwnedStoragePath(avatarPath, req.user._id, 'avatars');
    req.user.avatarPath = avatarPath;
  }
  if (home && typeof home === 'object') {
    // Merge provided home fields onto the existing sub-document.
    req.user.home = { ...(req.user.home?.toObject?.() ?? req.user.home), ...home };
  }

  await req.user.save();
  res.json({ user: req.user });
});

/**
 * DELETE /api/auth/me — permanently delete the account and all of the user's
 * data. Required by App Store Guideline 5.1.1(v) for any app with sign-up.
 * Removes tasks, expenses, bookings, the user's provider reviews (recomputing
 * ratings), and uploaded images (best-effort), then the account itself.
 */
const deleteMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Collect uploaded image paths to remove from storage afterwards.
  const expenses = await Expense.find({ user: userId }).select('receiptPath');
  const imagePaths = [req.user.avatarPath, ...expenses.map((e) => e.receiptPath)].filter(Boolean);

  // Remove the user's own records.
  await Promise.all([
    MaintenanceTask.deleteMany({ user: userId }),
    Expense.deleteMany({ user: userId }),
    Booking.deleteMany({ user: userId }),
  ]);

  // Remove the user's reviews from any providers and recompute their ratings.
  const providers = await ServiceProvider.find({ 'reviews.user': userId });
  await Promise.all(
    providers.map((p) => {
      p.reviews = p.reviews.filter((r) => !r.user.equals(userId));
      p.recomputeRating();
      return p.save();
    })
  );

  // Best-effort: delete uploaded images from Supabase (no-op if storage is off).
  await Promise.allSettled(imagePaths.map((path) => deleteImage(path)));

  await User.deleteOne({ _id: userId });

  res.json({ ok: true });
});

module.exports = { register, login, getMe, updateMe, deleteMe };
