require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Background product-import jobs. The upload endpoint saves the file to disk,
// inserts a `queued` row here, and returns immediately (202). A separate worker
// process claims queued rows (FOR UPDATE SKIP LOCKED), processes them, and
// updates progress/counts so the client can poll GET /import-csv/jobs/:id.
const migration = `
CREATE TABLE IF NOT EXISTS import_jobs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status           VARCHAR(20) NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued','running','done','failed')),
  file_path        TEXT NOT NULL,
  original_name    TEXT,
  admin_id         UUID,
  total            INT NOT NULL DEFAULT 0,
  processed        INT NOT NULL DEFAULT 0,
  imported         INT NOT NULL DEFAULT 0,
  skipped          INT NOT NULL DEFAULT 0,
  images_imported  INT NOT NULL DEFAULT 0,
  diamonds_imported INT NOT NULL DEFAULT 0,
  stones_imported  INT NOT NULL DEFAULT 0,
  errors           JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at       TIMESTAMPTZ,
  finished_at      TIMESTAMPTZ
);
-- The worker polls for the oldest queued job; index keeps that cheap.
CREATE INDEX IF NOT EXISTS idx_import_jobs_status_created
  ON import_jobs (status, created_at);
`;

async function run() {
  console.log("Running import_jobs migration...");
  try {
    await pool.query(migration);
    console.log("import_jobs migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
