// All configuration comes from the environment. No defaults for secrets.
export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT || 8080),
    logLevel: env.LOG_LEVEL || 'info',
    corsOrigin: env.CORS_ORIGIN || '*',
    db: {
      host: env.DB_HOST || 'localhost',
      port: Number(env.DB_PORT || 3306),
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      connectionLimit: Number(env.DB_POOL_SIZE || 10),
    },
  };
}

export function assertDbConfig(cfg) {
  const missing = ['user', 'password', 'database'].filter((k) => !cfg.db[k]);
  if (missing.length) {
    throw new Error(`Missing required DB env vars: ${missing.map((m) => 'DB_' + m.toUpperCase()).join(', ')}`);
  }
}
