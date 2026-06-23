'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');

describe('Auth gating', () => {
  it('rejects a protected route with no token (401) before touching the DB', async () => {
    const res = await request(app).get('/api/maintenance');
    expect(res.status).to.equal(401);
    expect(res.body).to.have.nested.property('error.message');
  });

  it('rejects a malformed Authorization header (401)', async () => {
    const res = await request(app).get('/api/expenses').set('Authorization', 'NotBearer xyz');
    expect(res.status).to.equal(401);
  });

  it('rejects an invalid bearer token (401)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).to.equal(401);
  });

  it('rejects registration with invalid input (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'nope', password: '123' });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.nested.property('error.details');
  });
});
