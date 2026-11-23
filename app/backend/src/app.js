import express from 'express';
import { z } from 'zod';

const recordSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(120),
  description: z.string().trim().max(1000).optional().default(''),
});

// `pool` only needs a mysql2/promise-style `query(sql, params)` method,
// which keeps the app testable without a real database.
export function createApp({ pool, logger, corsOrigin = '*' }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', corsOrigin);
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info({ method: req.method, url: req.originalUrl, status: res.statusCode, ms: Date.now() - start }, 'request');
    });
    next();
  });

  const dbUp = async () => {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (err) {
      logger.warn({ err: err.message }, 'database check failed');
      return false;
    }
  };

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/health/db', async (_req, res) => {
    const up = await dbUp();
    res.status(up ? 200 : 503).json({ status: up ? 'ok' : 'unavailable', database: up ? 'connected' : 'disconnected' });
  });

  app.get('/api/status', async (_req, res) => {
    const up = await dbUp();
    res.json({
      application: 'MG Kubernetes Platform',
      api: 'ok',
      database: up ? 'connected' : 'disconnected',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/records', async (_req, res, next) => {
    try {
      const [rows] = await pool.query(
        'SELECT id, title, description, created_at AS createdAt FROM records ORDER BY id DESC LIMIT 100',
      );
      res.json({ records: rows });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/records', async (req, res, next) => {
    const parsed = recordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_failed', details: parsed.error.issues.map((i) => i.message) });
    }
    try {
      const { title, description } = parsed.data;
      const [result] = await pool.query('INSERT INTO records (title, description) VALUES (?, ?)', [title, description]);
      res.status(201).json({ id: result.insertId, title, description });
    } catch (err) {
      next(err);
    }
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
    logger.error({ err: err.message }, 'unhandled error');
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}
