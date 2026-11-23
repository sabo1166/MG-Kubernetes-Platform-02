import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig, assertDbConfig } from '../src/config.js';

const silent = { info() {}, warn() {}, error() {}, fatal() {} };

function fakePool({ failing = false } = {}) {
  const rows = [];
  return {
    async query(sql, params) {
      if (failing) throw new Error('db down');
      if (sql.startsWith('SELECT 1')) return [[{ 1: 1 }]];
      if (sql.startsWith('INSERT')) {
        rows.unshift({ id: rows.length + 1, title: params[0], description: params[1] });
        return [{ insertId: rows.length }];
      }
      return [rows];
    },
  };
}

test('GET /health returns ok', async () => {
  const res = await request(createApp({ pool: fakePool(), logger: silent })).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('GET /health/db is 200 when DB is up and 503 when down', async () => {
  const up = await request(createApp({ pool: fakePool(), logger: silent })).get('/health/db');
  assert.equal(up.status, 200);
  const down = await request(createApp({ pool: fakePool({ failing: true }), logger: silent })).get('/health/db');
  assert.equal(down.status, 503);
});

test('GET /api/status reports database state', async () => {
  const res = await request(createApp({ pool: fakePool({ failing: true }), logger: silent })).get('/api/status');
  assert.equal(res.status, 200);
  assert.equal(res.body.database, 'disconnected');
  assert.equal(res.body.api, 'ok');
});

test('POST then GET /api/records', async () => {
  const app = createApp({ pool: fakePool(), logger: silent });
  const created = await request(app).post('/api/records').send({ title: 'First', description: 'hello' });
  assert.equal(created.status, 201);
  assert.equal(created.body.title, 'First');
  const list = await request(app).get('/api/records');
  assert.equal(list.status, 200);
  assert.equal(list.body.records.length, 1);
});

test('POST /api/records validates input', async () => {
  const app = createApp({ pool: fakePool(), logger: silent });
  const res = await request(app).post('/api/records').send({ title: '   ' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'validation_failed');
});

test('POST /api/records rejects malformed JSON', async () => {
  const app = createApp({ pool: fakePool(), logger: silent });
  const res = await request(app).post('/api/records').set('Content-Type', 'application/json').send('{bad');
  assert.equal(res.status, 400);
});

test('DB errors become 500 without leaking details', async () => {
  const app = createApp({ pool: fakePool({ failing: true }), logger: silent });
  const res = await request(app).get('/api/records');
  assert.equal(res.status, 500);
  assert.equal(res.body.error, 'internal_error');
});

test('unknown route is 404', async () => {
  const res = await request(createApp({ pool: fakePool(), logger: silent })).get('/nope');
  assert.equal(res.status, 404);
});

test('config requires DB credentials from env', () => {
  assert.throws(() => assertDbConfig(loadConfig({})), /DB_USER/);
  assert.doesNotThrow(() => assertDbConfig(loadConfig({ DB_USER: 'u', DB_PASSWORD: 'p', DB_NAME: 'd' })));
});
