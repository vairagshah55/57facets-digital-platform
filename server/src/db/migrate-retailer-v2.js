require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const migration = `
-- ── Retailer v2: add tier, city, state, business fields ──
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'standard'
  CHECK (tier IN ('standard', 'silver', 'gold', 'platinum'));
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- ── Retailer Sessions (for force-logout) ───────────
CREATE TABLE IF NOT EXISTS retailer_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id   UUID REFERENCES retailers(id) ON DELETE CASCADE,
  token_hash    VARCHAR(64) NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_retailer ON retailer_sessions(retailer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON retailer_sessions(is_active) WHERE is_active = true;
`;

async function run() {
  console.log("Running retailer v2 migrations...");
  try {
    await pool.query(migration);
    console.log("Retailer v2 migrations completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
