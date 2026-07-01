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
   Making / labour charges per COUNTRY (India / United States).
   Base charges differ by country; per-retailer overrides unchanged.
   Uniqueness becomes (country, scope). Existing rows → India.
   ════════════════════════════════════════════════════════════════ */
const migration = `
ALTER TABLE making_charges ADD COLUMN IF NOT EXISTS country VARCHAR(100);
UPDATE making_charges SET country = 'India' WHERE country IS NULL;
ALTER TABLE making_charges ALTER COLUMN country SET NOT NULL;

ALTER TABLE making_charges DROP CONSTRAINT IF EXISTS making_charges_scope_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'making_charges_country_scope_key') THEN
    ALTER TABLE making_charges ADD CONSTRAINT making_charges_country_scope_key UNIQUE (country, scope);
  END IF;
END $$;

INSERT INTO making_charges (country, scope, mode, value) VALUES
  ('India','default','percent',0), ('United States','default','percent',0)
ON CONFLICT (country, scope) DO NOTHING;
`;

async function run() {
  console.log("Running making-charges country migration...");
  try {
    await pool.query(migration);
    console.log("Making-charges country migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
