'use strict';

const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Central error handler producing a consistent JSON shape:
 *   { "error": { "message": "...", "details": [...] } }
 *
 * Translates common library errors (validation, bad ObjectId, duplicate key,
 * JWT) into appropriate status codes so controllers can stay focused on the
 * happy path.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Mongoose schema validation.
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }
  // Malformed ObjectId in a route param.
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  }
  // Duplicate unique key (e.g. email already registered).
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists`;
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  const body = { error: { message } };
  if (details) body.error.details = details;
  // Surface stack traces only outside production to aid local debugging.
  if (!env.isProduction && statusCode >= 500) body.error.stack = err.stack;

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
module.exports.ApiError = ApiError;
