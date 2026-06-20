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
   Product v5 — extra fields from the import template (yellow columns)
   ----------------------------------------------------------------
   • mfg_code            manufacturing code (separate from sku)
   • gross_weight        total piece weight (g)
   • net_weight          metal-only weight (g)
   • diamond_size        diamond size / sieve label (e.g. "-2", "+2")
   • diamond_pcs         number of diamonds of this spec
   • color_stone_carat   colour-stone weight (carat)
   • color_stone_pcs     number of colour stones

   diamond_size & diamond_pcs are added to BOTH products (product-level,
   mirrors the first diamond) and product_diamonds (per-diamond), matching
   how diamond_type/shape/color/clarity/carat already work.

   Fully idempotent: safe to run repeatedly.
   ════════════════════════════════════════════════════════════════ */

const migration = `
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS mfg_code          VARCHAR(80),
  ADD COLUMN IF NOT EXISTS gross_weight      NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS net_weight        NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS diamond_size      VARCHAR(40),
  ADD COLUMN IF NOT EXISTS diamond_pcs       INTEGER,
  ADD COLUMN IF NOT EXISTS color_stone_carat NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS color_stone_pcs   INTEGER;

ALTER TABLE product_diamonds
  ADD COLUMN IF NOT EXISTS diamond_size VARCHAR(40),
  ADD COLUMN IF NOT EXISTS diamond_pcs  INTEGER;
`;

async function run() {
  console.log("Running product v5 (template extra fields) migration...");
  try {
    await pool.query(migration);
    console.log("Product v5 migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
