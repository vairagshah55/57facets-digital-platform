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
   Diamond rate matrix per COUNTRY (India / United States).
   Base rates differ by country (entered in that country's currency,
   no conversion). Key becomes (country, shape_group, sieve_size,
   shade, clarity). Existing rows become the Indian matrix.
   Per-retailer overrides (retailer_diamond_rates) are unchanged.
   ════════════════════════════════════════════════════════════════ */
const migration = `
ALTER TABLE diamond_rates ADD COLUMN IF NOT EXISTS country VARCHAR(100);
UPDATE diamond_rates SET country = 'India' WHERE country IS NULL;
ALTER TABLE diamond_rates ALTER COLUMN country SET NOT NULL;

ALTER TABLE diamond_rates DROP CONSTRAINT IF EXISTS diamond_rates_shape_group_sieve_size_shade_clarity_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diamond_rates_country_key') THEN
    ALTER TABLE diamond_rates ADD CONSTRAINT diamond_rates_country_key
      UNIQUE (country, shape_group, sieve_size, shade, clarity);
  END IF;
END $$;
`;

async function run() {
  console.log("Running diamond-rates country migration...");
  try {
    await pool.query(migration);
    console.log("Diamond-rates country migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
