import mysql from 'mysql2/promise';

export function createPool(dbConfig) {
  return mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    connectionLimit: dbConfig.connectionLimit,
    waitForConnections: true,
    connectTimeout: 5000,
  });
}
