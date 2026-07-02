import client from './client';

// Registration & login happen via the Supabase client (see AuthContext).
// These call our Render API for the user's profile, using the Supabase token.
export const authApi = {
  me: () => client.get('/auth/me').then((r) => r.data),
  updateMe: (payload) => client.patch('/auth/me', payload).then((r) => r.data),
  deleteMe: () => client.delete('/auth/me').then((r) => r.data),
};
