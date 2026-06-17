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
   PRICING — Phase 2: per-retailer rate charts
   ----------------------------------------------------------------
   Each retailer can keep their OWN rate values for every component
   (gold / diamond / stone / making / sieve map). These mirror the
   global master-chart tables but are keyed by retailer_id.

   The pricing engine OVERLAYS a retailer's rows on top of the global
   chart: a value the retailer has set wins; anything they haven't set
   falls back to the Global default. This keeps the global tables and
   the existing routes/seed 100% intact (no risky ALTERs), while giving
   every retailer a full, independent, editable chart.

   Fully idempotent: safe to run repeatedly.
   ════════════════════════════════════════════════════════════════ */

const migration = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Per-retailer diamond rates ────────────────────────────────────
CREATE TABLE IF NOT EXISTS retailer_diamond_rates (
  retailer_id    UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  shape_group    VARCHAR(40) NOT NULL,
  sieve_size     VARCHAR(10) NOT NULL,
  shade          VARCHAR(10) NOT NULL,
  clarity        VARCHAR(10) NOT NULL,
  rate_per_carat NUMERIC(12,2) NOT NULL CHECK (rate_per_carat >= 0),
  updated_by     UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (retailer_id, shape_group, sieve_size, shade, clarity)
);

-- ── Per-retailer carat → sieve map ────────────────────────────────
CREATE TABLE IF NOT EXISTS retailer_sieve_map (
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  shape_group VARCHAR(40) NOT NULL,
  carat_min   NUMERIC(6,3) NOT NULL,
  carat_max   NUMERIC(6,3),
  sieve_size  VARCHAR(10) NOT NULL,
  CHECK (carat_max IS NULL OR carat_max > carat_min),
  PRIMARY KEY (retailer_id, shape_group, carat_min)
);

-- ── Per-retailer stone rates ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS retailer_stone_rates (
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  category    VARCHAR(60)  NOT NULL,
  stone_name  VARCHAR(100) NOT NULL,
  quality     VARCHAR(60),
  rate        NUMERIC(12,2) NOT NULL CHECK (rate >= 0),
  unit        VARCHAR(10) NOT NULL DEFAULT 'carat' CHECK (unit IN ('carat','piece','gram')),
  updated_by  UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ret_stone_rates
  ON retailer_stone_rates (retailer_id, category, stone_name, COALESCE(quality, ''));

-- ── Per-retailer metal (gold) rates ───────────────────────────────
CREATE TABLE IF NOT EXISTS retailer_metal_rates (
  retailer_id   UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  gold_type     VARCHAR(10) NOT NULL,
  rate_per_gram NUMERIC(12,2) NOT NULL CHECK (rate_per_gram >= 0),
  updated_by    UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (retailer_id, gold_type)
);

-- ── Per-retailer making / labour charges ──────────────────────────
CREATE TABLE IF NOT EXISTS retailer_making_charges (
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  scope       VARCHAR(60) NOT NULL DEFAULT 'default',
  mode        VARCHAR(10) NOT NULL CHECK (mode IN ('flat','percent')),
  value       NUMERIC(12,2) NOT NULL CHECK (value >= 0),
  updated_by  UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (retailer_id, scope)
);
`;

async function run() {
  console.log("Running pricing (Phase 2) per-retailer-charts migration...");
  try {
    await pool.query(migration);
    console.log("Per-retailer charts migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
