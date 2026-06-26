'use strict';

const express = require('express');
const mongoose = require('mongoose');

const authRoutes = require('./authRoutes');
const maintenanceRoutes = require('./maintenanceRoutes');
const expenseRoutes = require('./expenseRoutes');
const serviceRoutes = require('./serviceRoutes');
const uploadRoutes = require('./uploadRoutes');
const env = require('../config/env');

const router = express.Router();

// Maps mongoose connection.readyState codes to readable labels.
const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/** Liveness/readiness probe — no auth. Reports DB + storage status. */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: DB_STATES[mongoose.connection.readyState] || 'unknown',
    storage: env.storageEnabled ? 'enabled' : 'disabled',
  });
});

router.use('/auth', authRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/expenses', expenseRoutes);
router.use('/services', serviceRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;
