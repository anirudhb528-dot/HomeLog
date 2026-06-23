'use strict';

const { verifyToken } = require('../utils/token');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Require a valid `Authorization: Bearer <token>` header. On success, attaches
 * the authenticated user document to `req.user`. Runs before any DB query that
 * could leak data, so unauthenticated requests are rejected with 401 up front.
 *
 * This layer is intentionally thin and isolated: swapping JWT for Firebase Auth
 * later means changing only how the token is verified and the user resolved.
 */
async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Missing or malformed Authorization header');
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (_err) {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
