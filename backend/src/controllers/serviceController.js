'use strict';

const { getAdminClient } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { providerToApi, bookingToApi } = require('../utils/mappers');

/** GET /api/services — browse/search providers (public). */
const listProviders = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query);
  let q = getAdminClient()
    .from('service_providers')
    .select('id,name,trade,phone,email,city,state,description,avg_rating,review_count', {
      count: 'exact',
    });
  if (req.query.trade) q = q.eq('trade', req.query.trade);
  if (req.query.city) q = q.ilike('city', `${req.query.city}%`);
  if (req.query.q) q = q.or(`name.ilike.%${req.query.q}%,description.ilike.%${req.query.q}%`);
  q = q
    .order('avg_rating', { ascending: false })
    .order('review_count', { ascending: false })
    .order('id', { ascending: true })
    .range(pg.skip, pg.skip + pg.limit - 1);

  const { data, count, error } = await q;
  if (error) throw new ApiError(500, 'Failed to list providers');
  res.json({ providers: data.map(providerToApi), meta: buildMeta(pg, count || 0) });
});

/** GET /api/services/:id — provider detail + reviews (public). */
const getProvider = asyncHandler(async (req, res) => {
  const { data, error } = await getAdminClient()
    .from('service_providers')
    .select('*, reviews(*)')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) throw new ApiError(500, 'Failed to load provider');
  if (!data) throw ApiError.notFound('Service provider not found');
  res.json({ provider: providerToApi(data) });
});

/** POST /api/services/:id/reviews — add a review, then recompute the provider's rating. */
const addReview = asyncHandler(async (req, res) => {
  const admin = getAdminClient();
  const { data: prov } = await admin
    .from('service_providers')
    .select('id')
    .eq('id', req.params.id)
    .maybeSingle();
  if (!prov) throw ApiError.notFound('Service provider not found');

  const authorName = req.user.user_metadata?.name || req.user.email || 'Anonymous';
  const { error: insErr } = await admin.from('reviews').insert({
    provider_id: req.params.id,
    user_id: req.user.id,
    author_name: authorName,
    rating: req.body.rating,
    comment: req.body.comment,
  });
  if (insErr) throw new ApiError(500, 'Failed to add review');

  const { data: reviews } = await admin
    .from('reviews')
    .select('rating')
    .eq('provider_id', req.params.id);
  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  await admin
    .from('service_providers')
    .update({ avg_rating: avg, review_count: count })
    .eq('id', req.params.id);

  const { data: full } = await admin
    .from('service_providers')
    .select('*, reviews(*)')
    .eq('id', req.params.id)
    .maybeSingle();
  res.status(201).json({ provider: providerToApi(full) });
});

/** POST /api/services/:id/book — request a booking. */
const requestBooking = asyncHandler(async (req, res) => {
  const admin = getAdminClient();
  const { data: prov } = await admin
    .from('service_providers')
    .select('id')
    .eq('id', req.params.id)
    .maybeSingle();
  if (!prov) throw ApiError.notFound('Service provider not found');

  const { data, error } = await admin
    .from('bookings')
    .insert({
      user_id: req.user.id,
      provider_id: req.params.id,
      scheduled_for: req.body.scheduledFor,
      notes: req.body.notes,
      status: 'requested',
    })
    .select('*')
    .single();
  if (error) throw new ApiError(500, 'Failed to request booking');
  res.status(201).json({ booking: bookingToApi(data) });
});

/** GET /api/services/bookings/mine */
const myBookings = asyncHandler(async (req, res) => {
  const { data, error } = await getAdminClient()
    .from('bookings')
    .select('*, provider:service_providers(id,name,trade,city,state,phone)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) throw new ApiError(500, 'Failed to load bookings');
  res.json({ bookings: data.map(bookingToApi) });
});

module.exports = { listProviders, getProvider, addReview, requestBooking, myBookings };
