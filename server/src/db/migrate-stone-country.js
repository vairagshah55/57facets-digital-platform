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
   Stone rates per COUNTRY (India / United States).
   Rates differ by country (own currency, no conversion). Uniqueness
   becomes (country, category, stone_name, quality). Existing rows
   become the Indian stone chart; the US chart starts empty.
   ════════════════════════════════════════════════════════════════ */
const migration = `
ALTER TABLE stone_rates ADD COLUMN IF NOT EXISTS country VARCHAR(100);
UPDATE stone_rates SET country = 'India' WHERE country IS NULL;
ALTER TABLE stone_rates ALTER COLUMN country SET NOT NULL;

DROP INDEX IF EXISTS uq_stone_rates;
CREATE UNIQUE INDEX IF NOT EXISTS uq_stone_rates
  ON stone_rates (country, category, stone_name, COALESCE(quality, ''));
`;

async function run() {
  console.log("Running stone-rates country migration...");
  try {
    await pool.query(migration);
    console.log("Stone-rates country migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
