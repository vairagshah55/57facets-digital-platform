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
   LAB-GROWN diamond rates
   ----------------------------------------------------------------
   Lab-grown stones are priced from their own chart, so the rate
   tables gain a `diamond_type` dimension ('NATURAL' | 'LAB') rather
   than being duplicated into parallel tables: one schema, one set of
   queries, one admin UI parameterised by type.

   Every existing row is NATURAL, which is what the DEFAULT backfills,
   so no price changes when this runs. Products carry the matching
   value in product_diamonds.diamond_type ('Natural' / 'Lab-grown').

   Fully idempotent.
   ════════════════════════════════════════════════════════════════ */
const migration = `
-- ── Country/global chart ──────────────────────────────────────────
ALTER TABLE diamond_rates
  ADD COLUMN IF NOT EXISTS diamond_type VARCHAR(20) NOT NULL DEFAULT 'NATURAL';
UPDATE diamond_rates SET diamond_type = 'NATURAL' WHERE diamond_type IS NULL;

-- Uniqueness now includes the type, so a lab row can sit beside the
-- natural one for the same shape/sieve/grade.
ALTER TABLE diamond_rates DROP CONSTRAINT IF EXISTS diamond_rates_country_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diamond_rates_country_type_key') THEN
    ALTER TABLE diamond_rates ADD CONSTRAINT diamond_rates_country_type_key
      UNIQUE (country, diamond_type, shape_group, sieve_size, shade, clarity);
  END IF;
END $$;

-- ── Per-retailer overlay ──────────────────────────────────────────
ALTER TABLE retailer_diamond_rates
  ADD COLUMN IF NOT EXISTS diamond_type VARCHAR(20) NOT NULL DEFAULT 'NATURAL';
UPDATE retailer_diamond_rates SET diamond_type = 'NATURAL' WHERE diamond_type IS NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retailer_diamond_rates_pkey') THEN
    ALTER TABLE retailer_diamond_rates DROP CONSTRAINT retailer_diamond_rates_pkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retailer_diamond_rates_pkey_v2') THEN
    ALTER TABLE retailer_diamond_rates ADD CONSTRAINT retailer_diamond_rates_pkey_v2
      PRIMARY KEY (retailer_id, diamond_type, shape_group, sieve_size, shade, clarity);
  END IF;
END $$;

-- ── Sieve row list (matrix rows, independent of rates) ────────────
ALTER TABLE diamond_sieves
  ADD COLUMN IF NOT EXISTS diamond_type VARCHAR(20) NOT NULL DEFAULT 'NATURAL';
UPDATE diamond_sieves SET diamond_type = 'NATURAL' WHERE diamond_type IS NULL;

ALTER TABLE diamond_sieves DROP CONSTRAINT IF EXISTS diamond_sieves_shape_group_sieve_size_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diamond_sieves_type_key') THEN
    ALTER TABLE diamond_sieves ADD CONSTRAINT diamond_sieves_type_key
      UNIQUE (diamond_type, shape_group, sieve_size);
  END IF;
END $$;
`;

async function run() {
  console.log("Running lab-grown diamond rates migration...");
  try {
    await pool.query(migration);
    const { rows } = await pool.query(
      "SELECT diamond_type, COUNT(*)::int n FROM diamond_rates GROUP BY diamond_type ORDER BY n DESC");
    console.log("diamond_rates by type:", rows.map((r) => `${r.diamond_type} (${r.n})`).join(", ") || "(none)");
    console.log("Lab-grown diamond rates migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
