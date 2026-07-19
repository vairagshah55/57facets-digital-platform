require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Per-diamond customization for multi-diamond order items. Holds a JSON array,
// one entry per diamond: [{ shape, shade, clarity, type, carat }]. Single-diamond
// items keep using the flat diamond_shape/diamond_shade/diamond_quality columns.
const migration = `
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS diamond_customizations JSONB;
`;

async function run() {
  console.log("Running order_items diamond_customizations migration...");
  try {
    await pool.query(migration);
    console.log("diamond_customizations migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
