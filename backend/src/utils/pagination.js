'use strict';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Parse `page`/`limit` query params into safe `{ page, limit, skip }` values.
 * Limit is capped to avoid unbounded queries; page is at least 1.
 */
function parsePagination(query = {}) {
  let limit = parseInt(query.limit, 10);
  if (Number.isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  let page = parseInt(query.page, 10);
  if (Number.isNaN(page) || page < 1) page = 1;

  return { page, limit, skip: (page - 1) * limit };
}

/** Build a response `meta` object from pagination params and a total count. */
function buildMeta({ page, limit }, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: page * limit < total,
  };
}

module.exports = { parsePagination, buildMeta, DEFAULT_LIMIT, MAX_LIMIT };
