require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const migration = `
-- ── Order Items v2: add customization fields ──
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS gold_colour TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS diamond_shape TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS diamond_shade TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS diamond_quality TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color_stone_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color_stone_quality TEXT;

-- Migrate existing confirmed orders to processing
UPDATE orders SET status = 'processing' WHERE status = 'confirmed';

-- Update orders status constraint (remove confirmed, no payment gateway)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));

-- Admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          VARCHAR(30) NOT NULL DEFAULT 'order',
  title         VARCHAR(255) NOT NULL,
  message       TEXT,
  is_read       BOOLEAN DEFAULT false,
  action_path   VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(is_read) WHERE is_read = false;
`;

async function run() {
  console.log("Running order_items v2 migration...");
  try {
    await pool.query(migration);
    console.log("Order items v2 migration completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
