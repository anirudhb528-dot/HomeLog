'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const env = require('./src/config/env');
const apiRoutes = require('./src/routes');
const notFound = require('./src/middleware/notFound');
const errorHandler = require('./src/middleware/errorHandler');
const openapiSpec = require('./openapi');

const app = express();

// Trust proxy hops (configurable via TRUST_PROXY) so req.ip and
// express-rate-limit see the real client IP from X-Forwarded-For. Default 1
// (single load balancer like Render); avoids trusting spoofable headers.
app.set('trust proxy', env.trustProxy);

// ── Security & cross-cutting middleware ──────────────────────────────────────
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins, // '*' or an explicit allow-list from CORS_ORIGIN
    credentials: true,
  })
);
app.use(compression()); // gzip responses
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
// Strip keys containing `$`/`.` from req.body/query/params to block NoSQL injection.
app.use(mongoSanitize());

// Request logging — quiet during tests to keep output clean.
if (!env.isTest) {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

// ── Rate limiting ────────────────────────────────────────────────────────────
// A loose global limiter, plus a stricter one on auth to blunt brute-force.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many auth attempts, please try again later' } },
});
if (!env.isTest) {
  app.use('/api', globalLimiter);
  app.use('/api/auth', authLimiter);
}

// ── API docs ─────────────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'HomeLog API docs' }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── 404 + central error handler (must be last) ───────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
