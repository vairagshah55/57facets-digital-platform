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
   Stone rates: separate per-piece rate.
   ----------------------------------------------------------------
   A stone can have BOTH a per-carat rate (`rate`) and a per-piece
   rate (`rate_pc`) stored independently, so toggling the Unit no
   longer overwrites the other value. `unit` selects which applies.

   Existing piece-unit rows kept their per-piece value in `rate`, so
   move it into `rate_pc` (and reset `rate` to 0 = "no per-ct rate").
   ════════════════════════════════════════════════════════════════ */
const migration = `
ALTER TABLE stone_rates           ADD COLUMN IF NOT EXISTS rate_pc NUMERIC(12,2);
ALTER TABLE retailer_stone_rates  ADD COLUMN IF NOT EXISTS rate_pc NUMERIC(12,2);

UPDATE stone_rates
   SET rate_pc = rate, rate = 0
 WHERE unit = 'piece' AND rate_pc IS NULL AND rate > 0;

UPDATE retailer_stone_rates
   SET rate_pc = rate, rate = 0
 WHERE unit = 'piece' AND rate_pc IS NULL AND rate > 0;
`;

async function run() {
  console.log("Running stone rate_pc migration...");
  try {
    await pool.query(migration);
    console.log("Stone rate_pc migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
