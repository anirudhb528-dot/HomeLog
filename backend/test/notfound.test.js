'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');

describe('Unknown routes', () => {
  it('returns a structured 404 for an unmatched path', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).to.equal(404);
    expect(res.body).to.have.nested.property('error.message');
  });
});
