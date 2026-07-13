require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Products: add the "type category" (e.g. DIAMOND / GOLD / POLKI / KUNDAN) and
// "sub category" fields captured from the import template + product form.
// Both are nullable free-text so existing rows and partial data are unaffected.
const migration = `
ALTER TABLE products ADD COLUMN IF NOT EXISTS type_category VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category  VARCHAR(100);
`;

async function run() {
  console.log("Running product type_category/sub_category migration...");
  try {
    await pool.query(migration);
    console.log("Product type_category/sub_category migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
