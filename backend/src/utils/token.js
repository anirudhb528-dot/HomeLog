'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/** Sign a JWT for a user id. Keep the payload minimal — just the subject. */
function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, {
    expiresIn: env.jwtExpires,
  });
}

/** Verify a token and return its decoded payload, or throw if invalid/expired. */
function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signToken, verifyToken };
