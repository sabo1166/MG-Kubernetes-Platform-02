import pino from 'pino';

export function createLogger(level = 'info') {
  return pino({
    level,
    base: { service: 'mg-platform-api' },
    redact: ['req.headers.authorization', 'password'],
  });
}
