require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/* ════════════════════════════════════════════════════════════════
   product_stones — multiple colour stones per product, each with its
   own name, quality, carat and piece count. Mirrors product_diamonds.
   Stones are now a section of their own (separate from diamonds).
   Fully idempotent.
   ════════════════════════════════════════════════════════════════ */
const migration = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS product_stones (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stone_name    VARCHAR(80),
  quality       VARCHAR(80),
  carat         NUMERIC(8,3),
  pcs           INTEGER,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_stones_product ON product_stones (product_id);
`;

async function run() {
  console.log("Running product_stones migration...");
  try {
    await pool.query(migration);
    console.log("product_stones migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
