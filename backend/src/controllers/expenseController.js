'use strict';

const { getAdminClient } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { expenseToApi } = require('../utils/mappers');
const { assertOwnedStoragePath } = require('../services/storageService');

const WRITABLE = {
  description: 'description',
  amount: 'amount',
  currency: 'currency',
  category: 'category',
  date: 'date',
  relatedTask: 'related_task_id',
  receiptUrl: 'receipt_url',
  receiptPath: 'receipt_path',
};
function toRow(body) {
  const row = {};
  for (const [k, col] of Object.entries(WRITABLE)) if (body[k] !== undefined) row[col] = body[k];
  return row;
}

/** GET /api/expenses */
const listExpenses = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query);
  let q = getAdminClient()
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id);
  if (req.query.category) q = q.eq('category', req.query.category);
  if (req.query.from) q = q.gte('date', req.query.from);
  if (req.query.to) q = q.lte('date', req.query.to);
  q = q
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .range(pg.skip, pg.skip + pg.limit - 1);

  const { data, count, error } = await q;
  if (error) throw new ApiError(500, 'Failed to list expenses');
  res.json({ expenses: data.map(expenseToApi), meta: buildMeta(pg, count || 0) });
});

/** POST /api/expenses */
const createExpense = asyncHandler(async (req, res) => {
  assertOwnedStoragePath(req.body.receiptPath, req.user.id, 'receipts');
  const row = { ...toRow(req.body), user_id: req.user.id };
  const { data, error } = await getAdminClient().from('expenses').insert(row).select('*').single();
  if (error) throw new ApiError(500, 'Failed to create expense');
  res.status(201).json({ expense: expenseToApi(data) });
});

async function findOwned(userId, id) {
  const { data, error } = await getAdminClient()
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new ApiError(500, 'Failed to load expense');
  if (!data) throw ApiError.notFound('Expense not found');
  return data;
}

/** PATCH /api/expenses/:id */
const updateExpense = asyncHandler(async (req, res) => {
  assertOwnedStoragePath(req.body.receiptPath, req.user.id, 'receipts');
  await findOwned(req.user.id, req.params.id);
  const { data, error } = await getAdminClient()
    .from('expenses')
    .update(toRow(req.body))
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error) throw new ApiError(500, 'Failed to update expense');
  res.json({ expense: expenseToApi(data) });
});

/** DELETE /api/expenses/:id */
const deleteExpense = asyncHandler(async (req, res) => {
  const exp = await findOwned(req.user.id, req.params.id);
  const { error } = await getAdminClient()
    .from('expenses')
    .delete()
    .eq('id', exp.id)
    .eq('user_id', req.user.id);
  if (error) throw new ApiError(500, 'Failed to delete expense');
  res.json({ ok: true, id: req.params.id });
});

/** GET /api/expenses/summary — totals by category + monthly trend (computed in JS). */
const summary = asyncHandler(async (req, res) => {
  const { data, error } = await getAdminClient()
    .from('expenses')
    .select('amount,category,date')
    .eq('user_id', req.user.id);
  if (error) throw new ApiError(500, 'Failed to build summary');

  let total = 0;
  const cat = {};
  const months = {};
  for (const e of data) {
    const amt = Number(e.amount) || 0;
    total += amt;
    if (!cat[e.category]) cat[e.category] = { total: 0, count: 0 };
    cat[e.category].total += amt;
    cat[e.category].count += 1;
    const d = new Date(e.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    months[key] = (months[key] || 0) + amt;
  }

  const byCategory = Object.entries(cat)
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);
  const monthlyTrend = Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, mtotal]) => {
      const [y, m] = label.split('-');
      return { year: Number(y), month: Number(m), label, total: mtotal };
    });

  res.json({ total, byCategory, monthlyTrend });
});

module.exports = { listExpenses, createExpense, updateExpense, deleteExpense, summary };
