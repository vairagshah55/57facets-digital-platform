/**
 * Migration: Seed product_images from existing uploads/products subfolders.
 *
 * Folder → Category mapping:
 *   "Earrings (1)"  → Earrings
 *   "Necklace (1)"  → Necklaces
 *   "Necklace_1"    → Necklaces
 *   "Pendants (1)"  → Pendants
 *   "Rings (1)"     → Rings
 *   "Rings_1"       → Rings
 *
 * For each folder:
 *   1. Find all products in that category (that have NO images yet)
 *   2. Distribute images across those products (round-robin)
 *   3. First image of each product is marked as primary
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const UPLOADS_DIR = path.join(__dirname, "../../uploads/products");

// Map folder name → category name (as stored in DB)
const FOLDER_CATEGORY_MAP = {
  "Earrings (1)":  "Earrings",
  "Necklace (1)":  "Necklaces",
  "Necklace_1":    "Necklaces",
  "Pendants (1)":  "Pendants",
  "Rings (1)":     "Rings",
  "Rings_1":       "Rings",
};

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [folder, categoryName] of Object.entries(FOLDER_CATEGORY_MAP)) {
      const folderPath = path.join(UPLOADS_DIR, folder);
      if (!fs.existsSync(folderPath)) {
        console.log(`⚠  Folder not found: ${folder}`);
        continue;
      }

      // Get all image files in this folder
      const files = fs.readdirSync(folderPath).filter((f) =>
        /\.(jpe?g|png|webp|avif)$/i.test(f)
      );

      if (files.length === 0) {
        console.log(`⚠  No images in folder: ${folder}`);
        continue;
      }

      // Find products in this category that have no images yet
      const { rows: products } = await client.query(
        `SELECT p.id, p.name, p.sku
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE c.name ILIKE $1
           AND NOT EXISTS (
             SELECT 1 FROM product_images pi WHERE pi.product_id = p.id
           )
         ORDER BY p.created_at`,
        [categoryName]
      );

      if (products.length === 0) {
        console.log(`⚠  No unimaged products found for category "${categoryName}" (folder: ${folder})`);
        continue;
      }

      console.log(`\n📁 ${folder} → ${categoryName} (${products.length} products, ${files.length} images)`);

      // Distribute images round-robin across products
      const productImages = {};
      products.forEach((p) => (productImages[p.id] = []));

      files.forEach((file, idx) => {
        const product = products[idx % products.length];
        productImages[product.id].push(file);
      });

      // Insert into product_images
      for (const product of products) {
        const imgs = productImages[product.id];
        if (imgs.length === 0) continue;

        for (let i = 0; i < imgs.length; i++) {
          const imageUrl = `/uploads/products/${encodeURIComponent(folder)}/${imgs[i]}`;
          const isPrimary = i === 0;

          await client.query(
            `INSERT INTO product_images (product_id, image_url, is_primary, sort_order, media_type)
             VALUES ($1, $2, $3, $4, 'image')
             ON CONFLICT DO NOTHING`,
            [product.id, imageUrl, isPrimary, i]
          );
        }

        console.log(`  ✓ ${product.sku} — ${product.name}: ${imgs.length} image(s) assigned`);
      }
    }

    await client.query("COMMIT");
    console.log("\n✅ Migration complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
