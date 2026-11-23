-- Runs once on first MySQL start (empty data directory).
-- The database and application user are created by the MYSQL_* environment variables.
CREATE TABLE IF NOT EXISTS records (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(120) NOT NULL,
  description VARCHAR(1000) NOT NULL DEFAULT '',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_records_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO records (title, description) VALUES
  ('Welcome', 'First record seeded by init.sql');
