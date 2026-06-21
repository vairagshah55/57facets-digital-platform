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
   Stone rates v2 — per-stone weight (carat) + pieces on the chart.
   Lets the admin record a default carat & piece count per stone and
   see the computed price (rate/ct × carat × pcs) right in the table.
   Fully idempotent.
   ════════════════════════════════════════════════════════════════ */
const migration = `
ALTER TABLE stone_rates
  ADD COLUMN IF NOT EXISTS carat NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS pcs   INTEGER;

ALTER TABLE retailer_stone_rates
  ADD COLUMN IF NOT EXISTS carat NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS pcs   INTEGER;
`;

async function run() {
  console.log("Running stone-rates v2 (carat + pcs) migration...");
  try {
    await pool.query(migration);
    console.log("Stone-rates v2 migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
