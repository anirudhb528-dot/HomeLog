'use strict';

// Ensure middleware that varies by env (logging, rate limit) takes the test path.
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');

describe('GET /api/health', () => {
  it('returns status ok without auth or a database', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('status', 'ok');
  });
});
