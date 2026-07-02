'use strict';

const { getAdminClient } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { taskToApi } = require('../utils/mappers');
const { RECURRENCE_MONTHS } = require('../constants');

// Map allowed API fields (camelCase) → DB columns (snake_case).
const WRITABLE = {
  title: 'title',
  notes: 'notes',
  category: 'category',
  dueDate: 'due_date',
  recurrence: 'recurrence',
  priority: 'priority',
  status: 'status',
};
function toRow(body) {
  const row = {};
  for (const [k, col] of Object.entries(WRITABLE)) if (body[k] !== undefined) row[col] = body[k];
  return row;
}

/** GET /api/maintenance */
const listTasks = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query);
  let q = getAdminClient()
    .from('maintenance_tasks')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id);
  if (req.query.status) q = q.eq('status', req.query.status);
  if (req.query.upcoming === 'true') q = q.eq('status', 'pending');
  q = q
    .order('due_date', { ascending: true })
    .order('id', { ascending: true })
    .range(pg.skip, pg.skip + pg.limit - 1);

  const { data, count, error } = await q;
  if (error) throw new ApiError(500, 'Failed to list tasks');
  res.json({ tasks: data.map(taskToApi), meta: buildMeta(pg, count || 0) });
});

/** POST /api/maintenance */
const createTask = asyncHandler(async (req, res) => {
  const row = { ...toRow(req.body), user_id: req.user.id };
  const { data, error } = await getAdminClient()
    .from('maintenance_tasks')
    .insert(row)
    .select('*')
    .single();
  if (error) throw new ApiError(500, 'Failed to create task');
  res.status(201).json({ task: taskToApi(data) });
});

async function findOwnedTask(userId, id) {
  const { data, error } = await getAdminClient()
    .from('maintenance_tasks')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new ApiError(500, 'Failed to load task');
  if (!data) throw ApiError.notFound('Task not found');
  return data;
}

/** PATCH /api/maintenance/:id */
const updateTask = asyncHandler(async (req, res) => {
  await findOwnedTask(req.user.id, req.params.id);
  const { data, error } = await getAdminClient()
    .from('maintenance_tasks')
    .update(toRow(req.body))
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error) throw new ApiError(500, 'Failed to update task');
  res.json({ task: taskToApi(data) });
});

/** DELETE /api/maintenance/:id */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req.user.id, req.params.id);
  const { error } = await getAdminClient()
    .from('maintenance_tasks')
    .delete()
    .eq('id', task.id)
    .eq('user_id', req.user.id);
  if (error) throw new ApiError(500, 'Failed to delete task');
  res.json({ ok: true, id: req.params.id });
});

/** Advance a due date by the recurrence interval, or null if non-recurring. */
function nextDueDate(dueDate, recurrence) {
  const months = RECURRENCE_MONTHS[recurrence];
  if (!months) return null;
  const d = new Date(dueDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/** POST /api/maintenance/:id/complete — mark done + spawn next if recurring. */
const completeTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req.user.id, req.params.id);
  const admin = getAdminClient();

  const { data: done, error } = await admin
    .from('maintenance_tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', task.id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();
  if (error) throw new ApiError(500, 'Failed to complete task');

  let nextTask = null;
  const nd = nextDueDate(task.due_date, task.recurrence);
  if (nd) {
    const { data: created, error: e2 } = await admin
      .from('maintenance_tasks')
      .insert({
        user_id: req.user.id,
        title: task.title,
        notes: task.notes,
        category: task.category,
        due_date: nd,
        recurrence: task.recurrence,
        priority: task.priority,
        status: 'pending',
      })
      .select('*')
      .single();
    if (e2) throw new ApiError(500, 'Failed to create the next occurrence');
    nextTask = taskToApi(created);
  }

  res.json({ task: taskToApi(done), nextTask });
});

module.exports = { listTasks, createTask, updateTask, deleteTask, completeTask };
