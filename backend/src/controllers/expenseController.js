'use strict';

const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const WRITABLE = ['description', 'amount', 'currency', 'category', 'date', 'relatedTask'];

function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

/** GET /api/expenses — list the user's expenses (filterable), newest first. */
const listExpenses = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }

  const expenses = await Expense.find(filter).sort({ date: -1 });
  res.json({ expenses });
});

/** POST /api/expenses — log an expense for the user. */
const createExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({
    ...pickWritable(req.body),
    user: req.user._id,
  });
  res.status(201).json({ expense });
});

async function findOwnedExpense(userId, id) {
  const expense = await Expense.findOne({ _id: id, user: userId });
  if (!expense) throw ApiError.notFound('Expense not found');
  return expense;
}

/** PATCH /api/expenses/:id — update an owned expense. */
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await findOwnedExpense(req.user._id, req.params.id);
  Object.assign(expense, pickWritable(req.body));
  await expense.save();
  res.json({ expense });
});

/** DELETE /api/expenses/:id — delete an owned expense. */
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await findOwnedExpense(req.user._id, req.params.id);
  await expense.deleteOne();
  res.json({ ok: true, id: req.params.id });
});

/**
 * GET /api/expenses/summary — totals by category plus a monthly trend, computed
 * with MongoDB aggregation so the database does the heavy lifting.
 */
const summary = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const [byCategory, byMonth, totalAgg] = await Promise.all([
    Expense.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Expense.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    total: totalAgg[0]?.total || 0,
    byCategory: byCategory.map((c) => ({ category: c._id, total: c.total, count: c.count })),
    monthlyTrend: byMonth.map((m) => ({
      year: m._id.year,
      month: m._id.month,
      label: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      total: m.total,
    })),
  });
});

module.exports = { listExpenses, createExpense, updateExpense, deleteExpense, summary };
