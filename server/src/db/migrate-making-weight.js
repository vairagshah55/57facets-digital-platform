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
   Making charges — add weight-based modes 'gross' and 'net'.
   makingCost = value × (product gross_weight | net_weight).
   Drops the old mode CHECK (whatever it's named) and re-adds it with
   the expanded set. Idempotent.
   ════════════════════════════════════════════════════════════════ */
const migration = `
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'making_charges'::regclass AND contype = 'c'
             AND pg_get_constraintdef(oid) ILIKE '%mode%' LOOP
    EXECUTE 'ALTER TABLE making_charges DROP CONSTRAINT ' || quote_ident(c);
  END LOOP;
  ALTER TABLE making_charges
    ADD CONSTRAINT making_charges_mode_check CHECK (mode IN ('flat','percent','gross','net'));

  FOR c IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'retailer_making_charges'::regclass AND contype = 'c'
             AND pg_get_constraintdef(oid) ILIKE '%mode%' LOOP
    EXECUTE 'ALTER TABLE retailer_making_charges DROP CONSTRAINT ' || quote_ident(c);
  END LOOP;
  ALTER TABLE retailer_making_charges
    ADD CONSTRAINT retailer_making_charges_mode_check CHECK (mode IN ('flat','percent','gross','net'));
END $$;
`;

async function run() {
  console.log("Running making-weight (gross/net modes) migration...");
  try {
    await pool.query(migration);
    console.log("Making-weight migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
