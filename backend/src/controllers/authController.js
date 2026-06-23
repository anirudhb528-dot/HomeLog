'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');

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
  const { name, home } = req.body;

  if (typeof name === 'string') req.user.name = name;
  if (home && typeof home === 'object') {
    // Merge provided home fields onto the existing sub-document.
    req.user.home = { ...(req.user.home?.toObject?.() ?? req.user.home), ...home };
  }

  await req.user.save();
  res.json({ user: req.user });
});

module.exports = { register, login, getMe, updateMe };
