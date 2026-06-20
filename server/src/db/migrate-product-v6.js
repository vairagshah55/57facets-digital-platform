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
   Product v6 — per-diamond colour stone
   ----------------------------------------------------------------
   Each diamond row in the editor now carries its own colour stone
   (name + quality), so store them per product_diamonds row. The
   product-level color_stone_name / color_stone_quality columns are
   kept (comma-joined across rows) for pricing/display.

   Fully idempotent.
   ════════════════════════════════════════════════════════════════ */
const migration = `
ALTER TABLE product_diamonds
  ADD COLUMN IF NOT EXISTS stone_name    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stone_quality VARCHAR(60);
`;

async function run() {
  console.log("Running product v6 (per-diamond stone) migration...");
  try {
    await pool.query(migration);
    console.log("Product v6 migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
