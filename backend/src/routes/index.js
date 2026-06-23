'use strict';

const express = require('express');

const authRoutes = require('./authRoutes');
const maintenanceRoutes = require('./maintenanceRoutes');
const expenseRoutes = require('./expenseRoutes');
const serviceRoutes = require('./serviceRoutes');

const router = express.Router();

/** Liveness probe — no auth, no DB. */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/expenses', expenseRoutes);
router.use('/services', serviceRoutes);

module.exports = router;
