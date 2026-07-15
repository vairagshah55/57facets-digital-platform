require("dotenv").config({ path: __dirname + "/../../.env" });
const fs = require("fs");
const path = require("path");
const { query } = require("../config/db");
const { generateImageVariants, variantName } = require("../utils/imageVariants");

// One-off: generate resized WebP variants + blur placeholders for images that
// were uploaded before the variant pipeline existed. Idempotent — skips images
// whose "card" variant already exists on disk, so it's safe to re-run.
//
// Runs against local disk (uploads/), which is where both local AND prod store
// files (NODE_ENV=local on prod). Only touches image files; videos are skipped.

const UPLOADS = path.join(__dirname, "../../uploads");
const CONCURRENCY = 4;
const IMG_RE = /\.(jpe?g|png|webp|avif)$/i;

// "/uploads/products/x.jpg" or "https://host/uploads/products/x.jpg" -> "products/x.jpg"
function toFilename(url) {
  const i = url.indexOf("/uploads/");
  return i === -1 ? null : url.slice(i + "/uploads/".length);
}

async function collectUrls() {
  const urls = new Set();
  const add = (rows, col) => rows.forEach((r) => r[col] && urls.add(r[col]));
  add((await query("SELECT DISTINCT image_url FROM product_images WHERE media_type = 'image'")).rows, "image_url");
  add((await query("SELECT DISTINCT image_url FROM categories WHERE image_url IS NOT NULL")).rows, "image_url");
  add((await query("SELECT DISTINCT cover_image FROM collections WHERE cover_image IS NOT NULL")).rows, "cover_image");
  return [...urls];
}

async function run() {
  const urls = await collectUrls();
  const jobs = [];
  for (const url of urls) {
    const filename = toFilename(url);
    if (!filename || !IMG_RE.test(filename)) continue;
    jobs.push(filename);
  }
  console.log(`Found ${jobs.length} image(s) to consider.`);

  let done = 0, skipped = 0, missing = 0, failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const filename = jobs[cursor++];
      const diskPath = path.join(UPLOADS, filename);
      const cardPath = path.join(UPLOADS, variantName(filename, "card"));
      try {
        if (!fs.existsSync(diskPath)) { missing++; continue; }
        if (fs.existsSync(cardPath)) { skipped++; continue; } // already backfilled
        await generateImageVariants(fs.readFileSync(diskPath), filename);
        done++;
        if (done % 25 === 0) console.log(`  …${done} processed`);
      } catch (e) {
        failed++;
        console.error("  failed:", filename, e.message);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Done. generated=${done} skipped(existing)=${skipped} missing=${missing} failed=${failed}`);
  process.exit(0);
}

run().catch((e) => { console.error("Backfill failed:", e.message); process.exit(1); });
