'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const { expect } = require('chai');
const app = require('../../app');
const { startTestDb, stopTestDb, clearTestDb } = require('./setup');

// Helper: register a user and return { token, user }.
async function registerUser(overrides = {}) {
  const payload = {
    name: 'Test User',
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  return { res, ...res.body };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('Integration: HomeLog API (in-memory MongoDB)', function () {
  this.timeout(60000); // first run downloads the Mongo binary

  before(startTestDb);
  after(stopTestDb);
  afterEach(clearTestDb);

  describe('Auth', () => {
    it('registers a user and returns a token without the password hash', async () => {
      const { res } = await registerUser();
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('token').that.is.a('string');
      expect(res.body.user).to.not.have.property('passwordHash');
    });

    it('logs in with valid credentials and rejects bad ones', async () => {
      await registerUser({ email: 'login@example.com' });
      const ok = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'password123' });
      expect(ok.status).to.equal(200);
      expect(ok.body).to.have.property('token');

      const bad = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'wrong-password' });
      expect(bad.status).to.equal(401);
    });

    it('rejects duplicate email registration with 409', async () => {
      await registerUser({ email: 'dupe@example.com' });
      const again = await registerUser({ email: 'dupe@example.com' });
      expect(again.res.status).to.equal(409);
    });
  });

  describe('Maintenance', () => {
    it('creates a task and lists it with pagination meta', async () => {
      const { token } = await registerUser();
      const create = await request(app)
        .post('/api/maintenance')
        .set(authHeader(token))
        .send({ title: 'Clean gutters', dueDate: new Date().toISOString(), priority: 'high' });
      expect(create.status).to.equal(201);

      const list = await request(app).get('/api/maintenance').set(authHeader(token));
      expect(list.status).to.equal(200);
      expect(list.body.tasks).to.have.lengthOf(1);
      expect(list.body).to.have.nested.property('meta.total', 1);
    });

    it('completing a recurring task spawns the next occurrence with an advanced due date', async () => {
      const { token } = await registerUser();
      const due = new Date('2026-01-15T00:00:00.000Z');
      const create = await request(app)
        .post('/api/maintenance')
        .set(authHeader(token))
        .send({ title: 'Replace filter', dueDate: due.toISOString(), recurrence: 'quarterly' });
      const taskId = create.body.task._id;

      const done = await request(app)
        .post(`/api/maintenance/${taskId}/complete`)
        .set(authHeader(token));
      expect(done.status).to.equal(200);
      expect(done.body.task.status).to.equal('done');
      expect(done.body.nextTask).to.be.an('object');
      // Quarterly = +3 months → April.
      expect(new Date(done.body.nextTask.dueDate).getUTCMonth()).to.equal(3);
    });

    it("does not let a user touch another user's task (ownership scoping)", async () => {
      const a = await registerUser();
      const b = await registerUser();
      const create = await request(app)
        .post('/api/maintenance')
        .set(authHeader(a.token))
        .send({ title: 'A private task', dueDate: new Date().toISOString() });
      const taskId = create.body.task._id;

      // B cannot patch or delete A's task → 404 (not found in B's scope).
      const patch = await request(app)
        .patch(`/api/maintenance/${taskId}`)
        .set(authHeader(b.token))
        .send({ title: 'hijacked' });
      expect(patch.status).to.equal(404);

      // B's list is empty.
      const list = await request(app).get('/api/maintenance').set(authHeader(b.token));
      expect(list.body.tasks).to.have.lengthOf(0);
    });
  });

  describe('Expenses', () => {
    it('aggregates a summary by category and total', async () => {
      const { token } = await registerUser();
      const post = (body) => request(app).post('/api/expenses').set(authHeader(token)).send(body);
      await post({ description: 'Plumber', amount: 100, category: 'maintenance' });
      await post({ description: 'Filters', amount: 50, category: 'maintenance' });
      await post({ description: 'Power bill', amount: 75, category: 'utilities' });

      const summary = await request(app).get('/api/expenses/summary').set(authHeader(token));
      expect(summary.status).to.equal(200);
      expect(summary.body.total).to.equal(225);
      const maintenance = summary.body.byCategory.find((c) => c.category === 'maintenance');
      expect(maintenance.total).to.equal(150);
    });
  });

  describe('Account deletion', () => {
    it('deletes the account and all the user data, leaving other users intact', async () => {
      const a = await registerUser();
      const b = await registerUser();

      await request(app)
        .post('/api/maintenance')
        .set(authHeader(a.token))
        .send({ title: 'A task', dueDate: new Date().toISOString() });
      await request(app)
        .post('/api/expenses')
        .set(authHeader(a.token))
        .send({ description: 'A expense', amount: 10, category: 'other' });
      await request(app)
        .post('/api/maintenance')
        .set(authHeader(b.token))
        .send({ title: 'B task', dueDate: new Date().toISOString() });

      const del = await request(app).delete('/api/auth/me').set(authHeader(a.token));
      expect(del.status).to.equal(200);
      expect(del.body).to.have.property('ok', true);

      // A's token no longer resolves to a user.
      const me = await request(app).get('/api/auth/me').set(authHeader(a.token));
      expect(me.status).to.equal(401);

      // A cannot log back in.
      const relogin = await request(app)
        .post('/api/auth/login')
        .send({ email: a.user.email, password: 'password123' });
      expect(relogin.status).to.equal(401);

      // B's data is untouched.
      const bList = await request(app).get('/api/maintenance').set(authHeader(b.token));
      expect(bList.body.tasks).to.have.lengthOf(1);
    });

    it('requires authentication', async () => {
      const res = await request(app).delete('/api/auth/me');
      expect(res.status).to.equal(401);
    });
  });

  describe('Uploads (storage disabled in test env)', () => {
    it('returns 503 when Supabase storage is not configured', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/uploads/image')
        .query({ folder: 'receipts' })
        .set(authHeader(token))
        .attach('image', Buffer.from('fake-image-bytes'), { filename: 'r.png', contentType: 'image/png' });
      expect(res.status).to.equal(503);
    });

    it('rejects a missing/invalid folder with 400', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/uploads/image')
        .query({ folder: 'not-a-folder' })
        .set(authHeader(token))
        .attach('image', Buffer.from('x'), { filename: 'r.png', contentType: 'image/png' });
      expect(res.status).to.equal(400);
    });

    it('requires authentication', async () => {
      const res = await request(app).post('/api/uploads/image');
      expect(res.status).to.equal(401);
    });
  });
});
