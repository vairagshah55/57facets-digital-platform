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
-- ── Product v4: add carat_options for dynamic carat selection ──
ALTER TABLE products ADD COLUMN IF NOT EXISTS carat_options JSONB;
`;

async function run() {
  console.log("Running product v4 migration...");
  try {
    await pool.query(migration);
    console.log("Product v4 migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
