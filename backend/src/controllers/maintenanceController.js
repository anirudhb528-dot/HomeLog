'use strict';

const MaintenanceTask = require('../models/MaintenanceTask');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, buildMeta } = require('../utils/pagination');

/** Fields a client is allowed to set/update on a task. */
const WRITABLE = ['title', 'notes', 'category', 'dueDate', 'recurrence', 'priority', 'status'];

function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

/** GET /api/maintenance — list the user's tasks (filterable), sorted by due date. */
const listTasks = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.upcoming === 'true') {
    filter.status = 'pending';
  }

  const pg = parsePagination(req.query);
  const [tasks, total] = await Promise.all([
    MaintenanceTask.find(filter).sort({ dueDate: 1 }).skip(pg.skip).limit(pg.limit),
    MaintenanceTask.countDocuments(filter),
  ]);
  // Backward compatible: same `tasks` array, plus pagination `meta`.
  res.json({ tasks, meta: buildMeta(pg, total) });
});

/** POST /api/maintenance — create a task for the user. */
const createTask = asyncHandler(async (req, res) => {
  const task = await MaintenanceTask.create({
    ...pickWritable(req.body),
    user: req.user._id,
  });
  res.status(201).json({ task });
});

/** Load a task that belongs to the current user, or 404. */
async function findOwnedTask(userId, id) {
  const task = await MaintenanceTask.findOne({ _id: id, user: userId });
  if (!task) throw ApiError.notFound('Task not found');
  return task;
}

/** PATCH /api/maintenance/:id — update an owned task. */
const updateTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req.user._id, req.params.id);
  Object.assign(task, pickWritable(req.body));
  await task.save();
  res.json({ task });
});

/** DELETE /api/maintenance/:id — delete an owned task. */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req.user._id, req.params.id);
  await task.deleteOne();
  res.json({ ok: true, id: req.params.id });
});

/**
 * POST /api/maintenance/:id/complete — mark an owned task done. If it recurs,
 * auto-create the next occurrence with the advanced due date.
 */
const completeTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req.user._id, req.params.id);

  task.status = 'done';
  task.completedAt = new Date();
  await task.save();

  let nextTask = null;
  const nextDue = task.computeNextDueDate();
  if (nextDue) {
    nextTask = await MaintenanceTask.create({
      user: req.user._id,
      title: task.title,
      notes: task.notes,
      category: task.category,
      dueDate: nextDue,
      recurrence: task.recurrence,
      priority: task.priority,
      status: 'pending',
    });
  }

  res.json({ task, nextTask });
});

module.exports = { listTasks, createTask, updateTask, deleteTask, completeTask };
