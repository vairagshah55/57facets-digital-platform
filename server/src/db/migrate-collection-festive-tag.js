require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Widen the collections.tag CHECK constraint to allow the new 'festive' tag.
// Safe to re-run: drops the existing constraint (if present) and re-adds it.
const migration = `
ALTER TABLE collections DROP CONSTRAINT IF EXISTS collections_tag_check;
ALTER TABLE collections ADD CONSTRAINT collections_tag_check
  CHECK (tag IN ('seasonal', 'themed', 'bridal', 'new-launch', 'festive'));
`;

async function run() {
  console.log("Adding 'festive' to collections.tag constraint...");
  try {
    await pool.query(migration);
    console.log("Done — 'festive' is now an allowed collection tag.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
