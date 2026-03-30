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
-- ═══════════════════════════════════════════════════
--  57Facets Admin Panel — Database Schema
-- ═══════════════════════════════════════════════════

-- ── Admins ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) DEFAULT 'admin'
                CHECK (role IN ('super_admin', 'admin', 'manager')),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Activity Log ───────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_type    VARCHAR(20) NOT NULL CHECK (actor_type IN ('admin', 'retailer', 'system')),
  actor_id      UUID,
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(50),
  entity_id     UUID,
  details       JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log(actor_type, actor_id);

-- ── OTP Queue view (admin sees pending OTPs) ───────
-- Uses existing otps table, no new table needed

-- ── Low Stock Alerts ───────────────────────────────
-- Uses existing products table (availability = 'out-of-stock'), no new table needed
`;

async function run() {
  console.log("Running admin migrations...");
  try {
    await pool.query(migration);
    console.log("Admin migrations completed successfully.");
  } catch (err) {
    console.error("Admin migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
