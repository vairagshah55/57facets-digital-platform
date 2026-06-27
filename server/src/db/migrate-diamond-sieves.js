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
   DIAMOND SIEVES — a plain list of sieve sizes per shape group.
   ----------------------------------------------------------------
   The diamond rate matrix needs to show sieve rows even before any
   rate is entered. We can't store these in diamond_sieve_map (that
   is a carat→sieve PRICING map consumed by pricing.service.sieveFor)
   — a bogus carat range there would corrupt pricing. So sieve rows
   live in their own table.
   ════════════════════════════════════════════════════════════════ */
const migration = `
CREATE TABLE IF NOT EXISTS diamond_sieves (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shape_group TEXT NOT NULL,
  sieve_size  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shape_group, sieve_size)
);
`;

async function run() {
  console.log("Running diamond_sieves migration...");
  try {
    await pool.query(migration);
    console.log("diamond_sieves migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
