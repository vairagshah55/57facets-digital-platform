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
-- ── Product v2: extended fields for catalog management ──
ALTER TABLE products ADD COLUMN IF NOT EXISTS occasion_tags TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS gold_purity_options TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS carat_range_min NUMERIC(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS carat_range_max NUMERIC(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS finish_options TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_modifiers JSONB DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_days INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order_qty INT DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_order_qty INT DEFAULT 100;
`;

async function run() {
  console.log("Running product v2 migrations...");
  try {
    await pool.query(migration);
    console.log("Product v2 migrations completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
