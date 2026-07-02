'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');

// These check the auth gate that runs BEFORE any Supabase call, so they pass
// without credentials. Token-validity and CRUD are covered by live smoke tests.
describe('Auth gating', () => {
  it('rejects a protected route with no token (401)', async () => {
    const res = await request(app).get('/api/maintenance');
    expect(res.status).to.equal(401);
    expect(res.body).to.have.nested.property('error.message');
  });

  it('rejects a malformed Authorization header (401)', async () => {
    const res = await request(app).get('/api/expenses').set('Authorization', 'NotBearer xyz');
    expect(res.status).to.equal(401);
  });

  it('requires auth to update the profile (401)', async () => {
    const res = await request(app).patch('/api/auth/me').send({ name: 'x' });
    expect(res.status).to.equal(401);
  });
});
