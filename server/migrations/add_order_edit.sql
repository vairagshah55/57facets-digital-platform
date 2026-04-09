-- Migration: Order edit permission + audit trail
-- Run this against your PostgreSQL database before deploying

ALTER TABLE orders ADD COLUMN IF NOT EXISTS edit_allowed boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS edit_allowed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS edit_allowed_by varchar;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS edit_note text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS edited_by_retailer_at timestamptz;

CREATE TABLE IF NOT EXISTS order_edit_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  retailer_id      uuid NOT NULL,
  edited_at        timestamptz DEFAULT NOW(),
  old_items        jsonb NOT NULL DEFAULT '[]',
  old_note         text,
  old_total        numeric(12,2),
  new_items        jsonb NOT NULL DEFAULT '[]',
  new_note         text,
  new_total        numeric(12,2)
);

CREATE INDEX IF NOT EXISTS idx_order_edit_logs_order ON order_edit_logs(order_id);
