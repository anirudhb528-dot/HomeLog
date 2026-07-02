'use strict';

const { getUserFromToken } = require('../config/supabase');
const ApiError = require('../utils/ApiError');

/**
 * Require a valid Supabase access token in `Authorization: Bearer <token>`.
 * The app signs in with Supabase (public anon key) and sends that token here;
 * we validate it against Supabase's auth server and attach the user.
 *
 * `req.user` = the Supabase auth user ({ id (uuid), email, ... }).
 */
async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Missing or malformed Authorization header');
    }

    const user = await getUserFromToken(token);
    if (!user) throw ApiError.unauthorized('Invalid or expired session');

    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
