require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const migration = `
-- Trigram extension powers fast ILIKE / similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Replace the plain btree on sku (kept for equality) with a GIN
-- trigram index that also accelerates ILIKE '%query%'.
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
  ON products USING GIN (sku gin_trgm_ops);

-- Active products are filtered on every list query
CREATE INDEX IF NOT EXISTS idx_products_active
  ON products (is_active) WHERE is_active = true;
`;

async function run() {
  console.log("Running search trigram migration...");
  try {
    await pool.query(migration);
    console.log("Search trigram migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
