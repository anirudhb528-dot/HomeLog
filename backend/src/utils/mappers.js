'use strict';

// Convert Postgres rows (snake_case) to the API shape the app already expects
// (camelCase, `_id`). This keeps the frontend contract stable across the DB move.
const num = (v) => (v == null ? v : Number(v));

const taskToApi = (r) =>
  r && {
    _id: r.id,
    title: r.title,
    notes: r.notes,
    category: r.category,
    dueDate: r.due_date,
    recurrence: r.recurrence,
    priority: r.priority,
    status: r.status,
    completedAt: r.completed_at,
    createdAt: r.created_at,
  };

const expenseToApi = (r) =>
  r && {
    _id: r.id,
    description: r.description,
    amount: num(r.amount),
    currency: r.currency,
    category: r.category,
    date: r.date,
    relatedTask: r.related_task_id,
    receiptUrl: r.receipt_url,
    receiptPath: r.receipt_path,
    createdAt: r.created_at,
  };

const reviewToApi = (r) =>
  r && {
    _id: r.id,
    user: r.user_id,
    authorName: r.author_name,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  };

const providerToApi = (r) =>
  r && {
    _id: r.id,
    name: r.name,
    trade: r.trade,
    phone: r.phone,
    email: r.email,
    city: r.city,
    state: r.state,
    description: r.description,
    avgRating: num(r.avg_rating),
    reviewCount: r.review_count,
    reviews: (r.reviews || []).map(reviewToApi),
  };

const bookingToApi = (r) =>
  r && {
    _id: r.id,
    provider: r.provider
      ? {
          _id: r.provider.id,
          name: r.provider.name,
          trade: r.provider.trade,
          city: r.provider.city,
          state: r.provider.state,
          phone: r.provider.phone,
        }
      : r.provider_id,
    scheduledFor: r.scheduled_for,
    notes: r.notes,
    status: r.status,
    createdAt: r.created_at,
  };

module.exports = { taskToApi, expenseToApi, reviewToApi, providerToApi, bookingToApi };
