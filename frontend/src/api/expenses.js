import client from './client';

export const expensesApi = {
  list: (params) => client.get('/expenses', { params }).then((r) => r.data.expenses),
  summary: () => client.get('/expenses/summary').then((r) => r.data),
  create: (payload) => client.post('/expenses', payload).then((r) => r.data.expense),
  update: (id, payload) => client.patch(`/expenses/${id}`, payload).then((r) => r.data.expense),
  remove: (id) => client.delete(`/expenses/${id}`).then((r) => r.data),
};
