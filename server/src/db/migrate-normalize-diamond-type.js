require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Normalize diamond_type to the canonical casing/spelling used by the app
// presets ("Natural" / "Lab-grown"). Imported data arrived as "NATURAL" and
// "LAB GROWN", which showed as duplicate/oddly-cased options in the type dropdown.
// Idempotent: matching is case-insensitive and space/hyphen-insensitive, so it's
// safe to re-run.
const migration = `
UPDATE product_diamonds SET diamond_type = 'Natural'
  WHERE diamond_type IS NOT NULL AND UPPER(TRIM(diamond_type)) = 'NATURAL';
UPDATE product_diamonds SET diamond_type = 'Lab-grown'
  WHERE diamond_type IS NOT NULL AND UPPER(REPLACE(TRIM(diamond_type), '-', ' ')) IN ('LAB GROWN', 'LABGROWN');

UPDATE products SET diamond_type = 'Natural'
  WHERE diamond_type IS NOT NULL AND UPPER(TRIM(diamond_type)) = 'NATURAL';
UPDATE products SET diamond_type = 'Lab-grown'
  WHERE diamond_type IS NOT NULL AND UPPER(REPLACE(TRIM(diamond_type), '-', ' ')) IN ('LAB GROWN', 'LABGROWN');
`;

async function run() {
  console.log("Normalizing diamond_type values...");
  try {
    await pool.query(migration);
    const { rows: pd } = await pool.query(
      "SELECT diamond_type AS v, COUNT(*)::int n FROM product_diamonds GROUP BY diamond_type ORDER BY n DESC"
    );
    const { rows: p } = await pool.query(
      "SELECT diamond_type AS v, COUNT(*)::int n FROM products GROUP BY diamond_type ORDER BY n DESC"
    );
    console.log("product_diamonds.diamond_type:", pd.map((r) => `${r.v} (${r.n})`).join(", "));
    console.log("products.diamond_type:", p.map((r) => `${r.v} (${r.n})`).join(", "));
    console.log("diamond_type normalization completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
