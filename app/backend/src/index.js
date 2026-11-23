import { loadConfig, assertDbConfig } from './config.js';
import { createLogger } from './logger.js';
import { createPool } from './db.js';
import { createApp } from './app.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);

try {
  assertDbConfig(config);
} catch (err) {
  logger.fatal(err.message);
  process.exit(1);
}

const pool = createPool(config.db);
const app = createApp({ pool, logger, corsOrigin: config.corsOrigin });
const server = app.listen(config.port, () => logger.info({ port: config.port }, 'api listening'));

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  const force = setTimeout(() => process.exit(1), 10000);
  force.unref();
  server.close(async () => {
    try {
      await pool.end();
    } catch (err) {
      logger.error({ err: err.message }, 'error closing pool');
    }
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
