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
   PRICING — Phase 1: database architecture
   ----------------------------------------------------------------
   Master rate chart (from MASTER RATE CHART WEBSITE.xlsx) + a layered
   per-retailer pricing model. A product's price is COMPUTED:

     price = metal + diamond + stone + making   (master chart)
     retailer_price = base × retailer factors (+ flat)   (per retailer)
     ... or an explicit per-(retailer,product) override.

   Design notes:
   • All money / rates are NUMERIC (never float) — exact decimal maths.
   • Natural keys on small lookup tables (gold_type) for fast joins;
     UUID surrogate keys elsewhere to match the rest of the schema.
   • UNIQUE constraints double as the covering indexes for the hot
     lookup path, so no redundant indexes are created.
   • set_updated_at() trigger keeps updated_at honest without relying
     on every query remembering to set it.
   • Fully idempotent: safe to run repeatedly.
   ════════════════════════════════════════════════════════════════ */

const migration = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reusable trigger: stamp updated_at on every UPDATE ───────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Diamond rates (ROUND + FANCY sheets) ──────────────────────────
-- rate_per_carat = f(shape_group, sieve_size, shade, clarity).
-- shade ∈ EF/FG/GH/HI/IJ ; clarity ∈ VVS/VVS-VS/VS/VS-SI/SI/I1
-- (clarity kept freeform VARCHAR to absorb compound grades like 'VS-SI').
CREATE TABLE IF NOT EXISTS diamond_rates (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shape_group    VARCHAR(40) NOT NULL,   -- 'ROUND' | 'MARQUISE/BAGUETTE' | 'PEAR/PRINCESS'
  sieve_size     VARCHAR(10) NOT NULL,   -- '-2','+2','-3','-7','+7','-11','+11'
  shade          VARCHAR(10) NOT NULL,   -- 'EF','FG','GH','HI','IJ'
  clarity        VARCHAR(10) NOT NULL,   -- 'VVS','VVS-VS','VS','VS-SI','SI','I1'
  rate_per_carat NUMERIC(12,2) NOT NULL CHECK (rate_per_carat >= 0),
  updated_by     UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shape_group, sieve_size, shade, clarity)
);
DROP TRIGGER IF EXISTS trg_diamond_rates_updated ON diamond_rates;
CREATE TRIGGER trg_diamond_rates_updated BEFORE UPDATE ON diamond_rates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Carat → sieve mapping ─────────────────────────────────────────
-- Products store carat; the rate matrix is keyed by sieve bucket.
-- carat_min inclusive, carat_max exclusive. NULL carat_max = open ended.
CREATE TABLE IF NOT EXISTS diamond_sieve_map (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shape_group VARCHAR(40) NOT NULL,
  carat_min   NUMERIC(6,3) NOT NULL,
  carat_max   NUMERIC(6,3),
  sieve_size  VARCHAR(10) NOT NULL,
  CHECK (carat_max IS NULL OR carat_max > carat_min),
  UNIQUE (shape_group, carat_min)
);
CREATE INDEX IF NOT EXISTS idx_sieve_map_lookup
  ON diamond_sieve_map (shape_group, carat_min, carat_max);

-- ── Stone rates (STONES sheet) ────────────────────────────────────
-- rate = f(category, stone_name [, quality]). unit = how rate applies.
CREATE TABLE IF NOT EXISTS stone_rates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category    VARCHAR(60)  NOT NULL,   -- 'Precious Stones','Semi Precious Stones','Synthetic Stones','Pearl','Kundan','Beads'
  stone_name  VARCHAR(100) NOT NULL,   -- 'EMERALD','Ruby','BLUE SAPPHIRE',...
  quality     VARCHAR(60),             -- nullable
  rate        NUMERIC(12,2) NOT NULL CHECK (rate >= 0),
  unit        VARCHAR(10) NOT NULL DEFAULT 'carat'
              CHECK (unit IN ('carat','piece','gram')),
  updated_by  UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- COALESCE(quality,'') so (name, NULL) and (name, '') can't both exist.
CREATE UNIQUE INDEX IF NOT EXISTS uq_stone_rates
  ON stone_rates (category, stone_name, COALESCE(quality, ''));
DROP TRIGGER IF EXISTS trg_stone_rates_updated ON stone_rates;
CREATE TRIGGER trg_stone_rates_updated BEFORE UPDATE ON stone_rates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Metal rates (METAL sheet) ─────────────────────────────────────
-- Per-gram gold rate; tracks the daily price, so it's edited often.
-- Natural PK (gold_type) — tiny table, fastest possible lookup.
CREATE TABLE IF NOT EXISTS metal_rates (
  gold_type     VARCHAR(10) PRIMARY KEY,   -- '14KT','18KT','22KT','24KT'
  rate_per_gram NUMERIC(12,2) NOT NULL CHECK (rate_per_gram >= 0),
  updated_by    UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_metal_rates_updated ON metal_rates;
CREATE TRIGGER trg_metal_rates_updated BEFORE UPDATE ON metal_rates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Making / labour charges ───────────────────────────────────────
-- scope 'default' is the fallback; category/gold_type scopes override.
CREATE TABLE IF NOT EXISTS making_charges (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope      VARCHAR(60) NOT NULL DEFAULT 'default',  -- 'default' | category name | gold_type
  mode       VARCHAR(10) NOT NULL CHECK (mode IN ('flat','percent')),
  value      NUMERIC(12,2) NOT NULL CHECK (value >= 0),
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (scope)
);
DROP TRIGGER IF EXISTS trg_making_charges_updated ON making_charges;
CREATE TRIGGER trg_making_charges_updated BEFORE UPDATE ON making_charges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Per-retailer pricing factors (Layer 1 + Layer 2) ──────────────
-- price_factor is the whole-catalog multiplier (the core requirement:
-- same product, different price per retailer). Component factors are
-- optional fine-grained overrides; NULL falls back to price_factor only.
ALTER TABLE retailers
  ADD COLUMN IF NOT EXISTS price_factor   NUMERIC(6,3) NOT NULL DEFAULT 1.000
                           CHECK (price_factor > 0),
  ADD COLUMN IF NOT EXISTS flat_markup    NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diamond_factor NUMERIC(6,3) CHECK (diamond_factor IS NULL OR diamond_factor > 0),
  ADD COLUMN IF NOT EXISTS gold_factor    NUMERIC(6,3) CHECK (gold_factor   IS NULL OR gold_factor   > 0),
  ADD COLUMN IF NOT EXISTS stone_factor   NUMERIC(6,3) CHECK (stone_factor  IS NULL OR stone_factor  > 0),
  ADD COLUMN IF NOT EXISTS making_factor  NUMERIC(6,3) CHECK (making_factor IS NULL OR making_factor > 0);

-- ── Per-(retailer, product) explicit override (Layer 3) ───────────
-- Highest precedence: a fixed price that bypasses the formula entirely.
CREATE TABLE IF NOT EXISTS retailer_product_price (
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  price       NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  updated_by  UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (retailer_id, product_id)
);
-- Reverse index for "all retailers with a custom price for this product".
CREATE INDEX IF NOT EXISTS idx_rpp_product ON retailer_product_price (product_id);
DROP TRIGGER IF EXISTS trg_rpp_updated ON retailer_product_price;
CREATE TRIGGER trg_rpp_updated BEFORE UPDATE ON retailer_product_price
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Seed the metal rows (rates 0 until admin sets the daily price) ─
INSERT INTO metal_rates (gold_type, rate_per_gram) VALUES
  ('14KT', 0), ('18KT', 0), ('22KT', 0), ('24KT', 0)
ON CONFLICT (gold_type) DO NOTHING;

-- ── Default making charge (0% until configured) ───────────────────
INSERT INTO making_charges (scope, mode, value) VALUES ('default', 'percent', 0)
ON CONFLICT (scope) DO NOTHING;
`;

async function run() {
  console.log("Running pricing (Phase 1) migration...");
  try {
    await pool.query(migration);
    console.log("Pricing migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
