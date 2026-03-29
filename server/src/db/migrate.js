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
-- ═══════════════════════════════════════════════════
--  57Facets Retailer Portal — Database Schema
-- ═══════════════════════════════════════════════════

-- ── Extensions ─────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Retailers ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS retailers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(15) UNIQUE NOT NULL,
  email         VARCHAR(255),
  company_name  VARCHAR(255),
  address       TEXT,
  is_active     BOOLEAN DEFAULT true,
  first_login   BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── OTP ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otps (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone         VARCHAR(15) NOT NULL,
  otp_code      VARCHAR(6) NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  is_used       BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otps_phone ON otps(phone);

-- ── Categories ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) UNIQUE NOT NULL,
  image_url     TEXT,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Products ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  sku           VARCHAR(50) UNIQUE NOT NULL,
  description   TEXT,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  base_price    NUMERIC(12,2) NOT NULL,
  carat         NUMERIC(5,2) DEFAULT 0,
  metal_type    VARCHAR(100),
  metal_weight  NUMERIC(6,2),
  diamond_type  VARCHAR(100),
  diamond_shape VARCHAR(100),
  diamond_color VARCHAR(10),
  diamond_clarity VARCHAR(10),
  diamond_certification VARCHAR(50),
  setting_type  VARCHAR(100),
  hallmark      VARCHAR(50),
  width_mm      NUMERIC(5,2),
  height_mm     NUMERIC(5,2),
  availability  VARCHAR(20) DEFAULT 'in-stock'
                CHECK (availability IN ('in-stock', 'made-to-order', 'out-of-stock')),
  is_new        BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- ── Product Images ─────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  is_primary    BOOLEAN DEFAULT false,
  sort_order    INT DEFAULT 0,
  media_type    VARCHAR(20) DEFAULT 'image'
                CHECK (media_type IN ('image', 'video', '360')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- ── Collections ────────────────────────────────────
CREATE TABLE IF NOT EXISTS collections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  tagline       VARCHAR(500),
  description   TEXT,
  tag           VARCHAR(20) DEFAULT 'themed'
                CHECK (tag IN ('seasonal', 'themed', 'bridal', 'new-launch')),
  cover_image   TEXT,
  launch_date   DATE,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Collection Products (junction) ─────────────────
CREATE TABLE IF NOT EXISTS collection_products (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  sort_order    INT DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

-- ── Wishlist ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id   UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(retailer_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlists_retailer ON wishlists(retailer_id);

-- ── Wishlist Folders ───────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist_folders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id   UUID REFERENCES retailers(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  color         VARCHAR(30) DEFAULT '#30B8BF',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Wishlist Folder Items ──────────────────────────
CREATE TABLE IF NOT EXISTS wishlist_folder_items (
  folder_id     UUID REFERENCES wishlist_folders(id) ON DELETE CASCADE,
  wishlist_id   UUID REFERENCES wishlists(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, wishlist_id)
);

-- ── Orders ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number  VARCHAR(20) UNIQUE NOT NULL,
  retailer_id   UUID REFERENCES retailers(id) ON DELETE CASCADE,
  status        VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  total         NUMERIC(12,2) NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_retailer ON orders(retailer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ── Order Items ────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity      INT NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL,
  carat         NUMERIC(5,2),
  metal_type    VARCHAR(100),
  note          TEXT
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ── Order Tracking ─────────────────────────────────
CREATE TABLE IF NOT EXISTS order_tracking (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID REFERENCES orders(id) ON DELETE CASCADE,
  status        VARCHAR(100) NOT NULL,
  detail        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order ON order_tracking(order_id);

-- ── Notifications ──────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id   UUID REFERENCES retailers(id) ON DELETE CASCADE,
  type          VARCHAR(20) NOT NULL
                CHECK (type IN ('order-update', 'new-collection', 'announcement', 'system')),
  title         VARCHAR(255) NOT NULL,
  message       TEXT,
  is_read       BOOLEAN DEFAULT false,
  action_path   VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_retailer ON notifications(retailer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(retailer_id, is_read) WHERE is_read = false;

-- ── Recently Viewed ────────────────────────────────
CREATE TABLE IF NOT EXISTS recently_viewed (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id   UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  viewed_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(retailer_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_retailer ON recently_viewed(retailer_id);

-- ── Gold Price (live rate cache) ───────────────────
CREATE TABLE IF NOT EXISTS gold_prices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metal_type    VARCHAR(50) NOT NULL,
  price_per_gram NUMERIC(10,2) NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
`;

async function run() {
  console.log("Running migrations...");
  try {
    await pool.query(migration);
    console.log("Migrations completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
