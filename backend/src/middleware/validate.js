'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Collect express-validator results and, if any failed, short-circuit with a
 * 400 and a structured list of field errors. Place after the validation chain
 * on each route.
 */
function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));
  next(ApiError.badRequest('Validation failed', details));
}

module.exports = validate;
