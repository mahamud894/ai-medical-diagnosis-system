// API tests that do not need a database (validation, auth guard, security headers).
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-test-secret-test-secret-123';
const app = require('../server');

let server, base;
test.before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
test.after(() => new Promise(r => server.close(r)));
const json = (path, opts = {}) => fetch(base + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });

test('health check responds', async () => {
  const res = await fetch(base + '/api/health');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('security headers are set', async () => {
  const res = await fetch(base + '/api/health');
  assert.ok(res.headers.get('content-security-policy'));
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('unknown API route returns JSON 404', async () => {
  const res = await fetch(base + '/api/nope');
  assert.equal(res.status, 404);
  assert.match((await res.json()).message, /Route not found/);
});

test('protected routes require a token', async () => {
  for (const p of ['/api/patients', '/api/diagnosis/history', '/api/reports', '/api/diagnosis/symptoms']) {
    assert.equal((await fetch(base + p)).status, 401, p);
  }
  const bad = await fetch(base + '/api/patients', { headers: { Authorization: 'Bearer not-a-real-token' } });
  assert.equal(bad.status, 401);
});

test('register validates input before touching the database', async () => {
  let res = await json('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'A', email: 'not-an-email', password: 'password1' }) });
  assert.equal(res.status, 400);
  res = await json('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'A', email: 'a@b.co', password: 'short' }) });
  assert.equal(res.status, 400);
});

test('malformed JSON gives a clear 400', async () => {
  const res = await json('/api/auth/login', { method: 'POST', body: '{bad json' });
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /not valid JSON/);
});
