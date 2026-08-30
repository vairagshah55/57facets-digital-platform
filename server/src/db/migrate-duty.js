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
   DUTY — import/customs duty charged as a PERCENT of the product's
   total value (metal + diamond + stone + making).
   ----------------------------------------------------------------
   Duty is a per-COUNTRY rate (a US retailer pays import duty, an
   Indian one typically doesn't), with an optional per-retailer
   override — the same country-base + retailer-overlay shape every
   other rate table in this schema uses.

   Seeded at 0 for both countries, so pricing is unchanged until an
   admin actually enters a rate in Pricing → Duty.
   ════════════════════════════════════════════════════════════════ */
const migration = `
CREATE TABLE IF NOT EXISTS duty_charges (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country    VARCHAR(100)  NOT NULL,
  percent    NUMERIC(6,3)  NOT NULL DEFAULT 0 CHECK (percent >= 0),
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (country)
);
DROP TRIGGER IF EXISTS trg_duty_charges_updated ON duty_charges;
CREATE TRIGGER trg_duty_charges_updated BEFORE UPDATE ON duty_charges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Per-retailer override. A row here REPLACES the country rate for that
-- retailer; no row = inherit the country rate.
CREATE TABLE IF NOT EXISTS retailer_duty_charges (
  retailer_id UUID PRIMARY KEY REFERENCES retailers(id) ON DELETE CASCADE,
  percent     NUMERIC(6,3) NOT NULL CHECK (percent >= 0),
  updated_by  UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_retailer_duty_updated ON retailer_duty_charges;
CREATE TRIGGER trg_retailer_duty_updated BEFORE UPDATE ON retailer_duty_charges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 0% until configured — deploying this changes no price.
INSERT INTO duty_charges (country, percent) VALUES ('India', 0), ('United States', 0)
ON CONFLICT (country) DO NOTHING;
`;

async function run() {
  console.log("Running duty-charges migration...");
  try {
    await pool.query(migration);
    console.log("Duty-charges migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
