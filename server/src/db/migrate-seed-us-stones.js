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
   Seed the United States stone chart from the Indian one, so the US
   tab isn't empty — it starts with the same stone list (categories,
   names, quality, unit + India's values as a template) and the admin
   edits the US figures. DO NOTHING keeps any US rows already entered.
   ════════════════════════════════════════════════════════════════ */
const migration = `
INSERT INTO stone_rates (country, category, stone_name, quality, rate, rate_pc, unit, carat, pcs)
SELECT 'United States', category, stone_name, quality, rate, rate_pc, unit, carat, pcs
FROM stone_rates
WHERE country = 'India'
ON CONFLICT (country, category, stone_name, COALESCE(quality, '')) DO NOTHING;
`;

async function run() {
  console.log("Seeding United States stone rates from India...");
  try {
    const res = await pool.query(migration);
    console.log(`US stone seed completed (${res.rowCount} rows added).`);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
