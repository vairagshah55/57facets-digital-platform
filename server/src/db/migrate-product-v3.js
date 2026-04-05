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
-- ── Product v3: add product_code, gold_colour, color stone fields ──
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code VARCHAR(50) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gold_colour TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_stone_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_stone_quality TEXT;

-- Widen columns to TEXT for multi-select comma-separated storage
ALTER TABLE products ALTER COLUMN metal_type TYPE TEXT;
ALTER TABLE products ALTER COLUMN diamond_shape TYPE TEXT;
ALTER TABLE products ALTER COLUMN diamond_color TYPE TEXT;
ALTER TABLE products ALTER COLUMN diamond_clarity TYPE TEXT;
`;

async function run() {
  console.log("Running product v3 migration...");
  try {
    await pool.query(migration);
    console.log("Product v3 migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
