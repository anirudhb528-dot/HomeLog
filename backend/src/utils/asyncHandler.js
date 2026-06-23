'use strict';

/**
 * Wrap an async route handler so rejected promises are forwarded to Express's
 * error handler instead of crashing the process. Keeps controllers free of
 * repetitive try/catch blocks.
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
