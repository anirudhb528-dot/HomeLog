import client from './client';

export const servicesApi = {
  list: (params) => client.get('/services', { params }).then((r) => r.data.providers),
  get: (id) => client.get(`/services/${id}`).then((r) => r.data.provider),
  addReview: (id, payload) =>
    client.post(`/services/${id}/reviews`, payload).then((r) => r.data.provider),
  book: (id, payload) => client.post(`/services/${id}/book`, payload).then((r) => r.data.booking),
  myBookings: () => client.get('/services/bookings/mine').then((r) => r.data.bookings),
};
