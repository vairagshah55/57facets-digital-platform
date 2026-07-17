require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Order edit permission + audit trail. An admin grants edit_allowed on an
// order; the retailer's edit then writes a before/after snapshot to
// order_edit_logs, which the admin reads back as a full edit history.
//
// Fully idempotent.
const migration = `
ALTER TABLE orders ADD COLUMN IF NOT EXISTS edit_allowed          BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS edit_allowed_at       TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS edit_allowed_by       VARCHAR;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS edit_note             TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS edited_by_retailer_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS order_edit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  retailer_id UUID NOT NULL,
  edited_at   TIMESTAMPTZ DEFAULT NOW(),
  old_items   JSONB NOT NULL DEFAULT '[]',
  old_note    TEXT,
  old_total   NUMERIC(12,2),
  new_items   JSONB NOT NULL DEFAULT '[]',
  new_note    TEXT,
  new_total   NUMERIC(12,2)
);
CREATE INDEX IF NOT EXISTS idx_order_edit_logs_order ON order_edit_logs(order_id);
`;

async function run() {
  console.log("Running order-edit (permission + audit trail) migration...");
  try {
    await pool.query(migration);
    console.log("Order-edit migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
