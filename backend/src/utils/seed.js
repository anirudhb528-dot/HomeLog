'use strict';

/**
 * Seeding logic. `seedDatabase()` assumes an open Mongoose connection and is
 * reused both by the CLI script (`npm run seed`) and by the dev server when it
 * boots an in-memory database. Creates a demo user with sample maintenance
 * tasks, expenses across every category, and ~5 service providers with reviews.
 * Safe to re-run — it clears the demo user's data and the seeded providers first.
 */
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const MaintenanceTask = require('../models/MaintenanceTask');
const Expense = require('../models/Expense');
const ServiceProvider = require('../models/ServiceProvider');
const Booking = require('../models/Booking');

const DEMO_EMAIL = 'demo@homelog.app';
const DEMO_PASSWORD = 'password123';

/** Date helper: now offset by a number of days (negative = past). */
function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
/** Date helper: now offset by a number of months. */
function monthsFromNow(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

async function seedDatabase() {
  console.log('[seed] Seeding demo data...');

  // ── Demo user ──────────────────────────────────────────────────────────────
  await User.deleteOne({ email: DEMO_EMAIL });
  const user = new User({
    name: 'Demo Homeowner',
    email: DEMO_EMAIL,
    home: {
      nickname: 'The Maple House',
      type: 'house',
      sizeSqFt: 2100,
      yearBuilt: 1998,
      address: '14 Maple Street',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
    },
  });
  await user.setPassword(DEMO_PASSWORD);
  await user.save();

  // Clear this user's previous tasks/expenses/bookings so re-seeding is clean.
  await Promise.all([
    MaintenanceTask.deleteMany({ user: user._id }),
    Expense.deleteMany({ user: user._id }),
    Booking.deleteMany({ user: user._id }),
  ]);

  // ── Maintenance tasks (incl. recurring + overdue) ────────────────────────────
  await MaintenanceTask.create([
    {
      user: user._id,
      title: 'Replace HVAC air filter',
      category: 'hvac',
      dueDate: daysFromNow(-3), // overdue
      recurrence: 'quarterly',
      priority: 'high',
      notes: 'Use 16x25x1 MERV 11.',
    },
    {
      user: user._id,
      title: 'Test smoke & CO detectors',
      category: 'safety',
      dueDate: daysFromNow(5),
      recurrence: 'biannual',
      priority: 'high',
    },
    {
      user: user._id,
      title: 'Clean gutters',
      category: 'exterior',
      dueDate: daysFromNow(20),
      recurrence: 'biannual',
      priority: 'medium',
    },
    {
      user: user._id,
      title: 'Flush water heater',
      category: 'plumbing',
      dueDate: monthsFromNow(2),
      recurrence: 'annual',
      priority: 'medium',
    },
    {
      user: user._id,
      title: 'Service lawn mower',
      category: 'landscaping',
      dueDate: daysFromNow(-10), // overdue
      recurrence: 'annual',
      priority: 'low',
    },
    {
      user: user._id,
      title: 'Inspect roof shingles',
      category: 'exterior',
      dueDate: daysFromNow(40),
      recurrence: 'none',
      priority: 'low',
    },
  ]);

  // ── Expenses across every category ───────────────────────────────────────────
  await Expense.create([
    { user: user._id, description: 'Plumber — leak repair', amount: 240, category: 'maintenance', date: daysFromNow(-45) },
    { user: user._id, description: 'Electric bill', amount: 165.32, category: 'utilities', date: daysFromNow(-30) },
    { user: user._id, description: 'Kitchen backsplash tiling', amount: 1200, category: 'improvement', date: daysFromNow(-60) },
    { user: user._id, description: 'Homeowners insurance premium', amount: 980, category: 'insurance', date: daysFromNow(-90) },
    { user: user._id, description: 'Property tax installment', amount: 1500, category: 'taxes', date: daysFromNow(-75) },
    { user: user._id, description: 'Lawn care service', amount: 85, category: 'services', date: daysFromNow(-14) },
    { user: user._id, description: 'Water bill', amount: 58.4, category: 'utilities', date: daysFromNow(-5) },
    { user: user._id, description: 'Air filters (4-pack)', amount: 39.99, category: 'maintenance', date: daysFromNow(-7) },
    { user: user._id, description: 'Smart thermostat', amount: 199, category: 'improvement', date: daysFromNow(-20) },
    { user: user._id, description: 'Misc hardware store run', amount: 47.25, category: 'other', date: daysFromNow(-2) },
  ]);

  // ── Service providers with reviews ───────────────────────────────────────────
  // Clear previously seeded providers by their known names so re-seeding is clean.
  const providerNames = [
    'Lone Star Plumbing',
    'BrightSpark Electric',
    'CoolBreeze HVAC',
    'GreenThumb Landscaping',
    'TopShield Roofing',
  ];
  await ServiceProvider.deleteMany({ name: { $in: providerNames } });

  const providers = await ServiceProvider.create([
    {
      name: 'Lone Star Plumbing',
      trade: 'plumber',
      phone: '512-555-0101',
      email: 'hello@lonestarplumbing.example',
      city: 'Austin',
      state: 'TX',
      description: 'Licensed plumbers for leaks, water heaters, and repipes. 24/7 emergency service.',
    },
    {
      name: 'BrightSpark Electric',
      trade: 'electrician',
      phone: '512-555-0102',
      email: 'service@brightspark.example',
      city: 'Austin',
      state: 'TX',
      description: 'Panel upgrades, EV charger installs, and lighting. Family-owned since 2004.',
    },
    {
      name: 'CoolBreeze HVAC',
      trade: 'hvac',
      phone: '512-555-0103',
      email: 'support@coolbreeze.example',
      city: 'Round Rock',
      state: 'TX',
      description: 'AC tune-ups, furnace repair, and full system replacements.',
    },
    {
      name: 'GreenThumb Landscaping',
      trade: 'landscaper',
      phone: '512-555-0104',
      email: 'team@greenthumb.example',
      city: 'Austin',
      state: 'TX',
      description: 'Lawn care, irrigation, and seasonal cleanups.',
    },
    {
      name: 'TopShield Roofing',
      trade: 'roofer',
      phone: '512-555-0105',
      email: 'quotes@topshield.example',
      city: 'Cedar Park',
      state: 'TX',
      description: 'Roof inspections, repairs, and replacements. Free storm-damage assessments.',
    },
  ]);

  // Add a couple of reviews from the demo user and recompute ratings.
  const reviewSeed = [
    { idx: 0, rating: 5, comment: 'Fixed our leak in under an hour. Highly recommend.' },
    { idx: 0, rating: 4, comment: 'Fair pricing, friendly tech.' },
    { idx: 1, rating: 5, comment: 'Installed our EV charger cleanly.' },
    { idx: 2, rating: 4, comment: 'AC running great after the tune-up.' },
    { idx: 3, rating: 5, comment: 'Yard has never looked better.' },
    { idx: 4, rating: 3, comment: 'Good work but scheduling took a while.' },
  ];
  for (const r of reviewSeed) {
    const p = providers[r.idx];
    p.reviews.push({ user: user._id, authorName: user.name, rating: r.rating, comment: r.comment });
  }
  for (const p of providers) {
    p.recomputeRating();
    await p.save();
  }

  // One sample booking so "my bookings" isn't empty.
  await Booking.create({
    user: user._id,
    provider: providers[0]._id,
    scheduledFor: daysFromNow(7),
    notes: 'Check kitchen sink slow drain.',
    status: 'requested',
  });

  console.log('[seed] Done.');
  console.log(`[seed] Demo login → ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

module.exports = { seedDatabase, DEMO_EMAIL, DEMO_PASSWORD };

// When run directly (`npm run seed`): connect, seed, disconnect, exit.
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[seed] Failed:', err);
      await disconnectDB().catch(() => {});
      process.exit(1);
    }
  })();
}
