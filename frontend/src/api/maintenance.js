import client from './client';

export const maintenanceApi = {
  list: (params) => client.get('/maintenance', { params }).then((r) => r.data.tasks),
  create: (payload) => client.post('/maintenance', payload).then((r) => r.data.task),
  update: (id, payload) => client.patch(`/maintenance/${id}`, payload).then((r) => r.data.task),
  remove: (id) => client.delete(`/maintenance/${id}`).then((r) => r.data),
  complete: (id) => client.post(`/maintenance/${id}/complete`).then((r) => r.data),
};
