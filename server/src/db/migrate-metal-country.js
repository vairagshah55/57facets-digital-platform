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
   Metal (gold) rates per COUNTRY.
   ----------------------------------------------------------------
   Gold rates differ by country (India vs United States) and are
   entered separately (no currency conversion). Key becomes
   (country, gold_type). Existing rows are the Indian chart.
   ════════════════════════════════════════════════════════════════ */
const migration = `
ALTER TABLE metal_rates ADD COLUMN IF NOT EXISTS country VARCHAR(100);
UPDATE metal_rates SET country = 'India' WHERE country IS NULL;
ALTER TABLE metal_rates ALTER COLUMN country SET NOT NULL;

-- Swap the single-column PK (gold_type) for a composite (country, gold_type).
ALTER TABLE metal_rates DROP CONSTRAINT IF EXISTS metal_rates_pkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'metal_rates_country_gold_pk') THEN
    ALTER TABLE metal_rates ADD CONSTRAINT metal_rates_country_gold_pk PRIMARY KEY (country, gold_type);
  END IF;
END $$;

-- Seed both countries' karat rows (0 until admin sets them).
INSERT INTO metal_rates (country, gold_type, rate_per_gram) VALUES
  ('India','14KT',0),('India','18KT',0),('India','22KT',0),('India','24KT',0),
  ('United States','14KT',0),('United States','18KT',0),('United States','22KT',0),('United States','24KT',0)
ON CONFLICT (country, gold_type) DO NOTHING;
`;

async function run() {
  console.log("Running metal-rates country migration...");
  try {
    await pool.query(migration);
    console.log("Metal-rates country migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
