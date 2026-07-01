require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Retailer: add a country column (alongside the existing state & city), so the
// admin can capture Country → State → City.
const migration = `
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS country VARCHAR(100);
`;

async function run() {
  console.log("Running retailer country migration...");
  try {
    await pool.query(migration);
    console.log("Retailer country migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
