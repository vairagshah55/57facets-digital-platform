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
   TIRICH LEADS — capture form submissions from the Tirich LED site.
   ----------------------------------------------------------------
   Mirrors the Tirich lead model (name/phone/city/business_type/
   business_other/designation). Namespaced as `tirich_leads` so it
   never collides with any future generic leads table.

   • phone is UNIQUE — the store endpoint upserts on it so a returning
     visitor updates their record instead of erroring.
   • set_updated_at() is re-defined here (idempotent) so this migration
     is standalone and order-independent.
   • Fully idempotent: safe to run repeatedly.
   ════════════════════════════════════════════════════════════════ */

const migration = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS tirich_leads (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(255) NOT NULL,
  phone          VARCHAR(50)  UNIQUE NOT NULL,
  city           VARCHAR(255) NOT NULL,
  business_type  VARCHAR(50)  NOT NULL CHECK (business_type IN ('led-showroom','electrical-shop','distributor','other')),
  business_other VARCHAR(255),
  designation    VARCHAR(50)  NOT NULL CHECK (designation IN ('owner','interior','architect')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tirich_leads_phone ON tirich_leads(phone);

DROP TRIGGER IF EXISTS trg_tirich_leads_updated ON tirich_leads;
CREATE TRIGGER trg_tirich_leads_updated BEFORE UPDATE ON tirich_leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`;

async function run() {
  console.log("Running tirich-lead migration...");
  try {
    await pool.query(migration);
    console.log("Tirich lead migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
