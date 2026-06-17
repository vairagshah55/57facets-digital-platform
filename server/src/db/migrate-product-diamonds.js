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
   Multiple diamonds per product
   ----------------------------------------------------------------
   A product can carry several diamonds, each with its own
   type/shape/shade/clarity/certification/carat (entered Excel-style
   in the admin product editor). The product-level diamond_* columns
   are kept in sync with the FIRST row for backward compatibility with
   the current pricing/display path.

   Fully idempotent.
   ════════════════════════════════════════════════════════════════ */

const migration = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS product_diamonds (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  diamond_type          VARCHAR(60),
  diamond_shape         VARCHAR(60),
  diamond_color         VARCHAR(20),
  diamond_clarity       VARCHAR(20),
  diamond_certification VARCHAR(20),
  carat                 NUMERIC(8,3),
  sort_order            INT DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_diamonds_product ON product_diamonds (product_id);
`;

async function run() {
  console.log("Running product_diamonds migration...");
  try {
    await pool.query(migration);
    console.log("product_diamonds migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
