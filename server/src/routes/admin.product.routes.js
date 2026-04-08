const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const { query, getClient } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");
const AppError = require("../utils/AppError");
const multer = require("multer");
const AdmZip = require("adm-zip");
const { uploadToGCS } = require("../utils/gcsUpload");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.use(adminAuth);

// ── GET /api/admin/products ────────────────────────
// List all products with filters
router.get("/", async (req, res, next) => {
  try {
    const { search, category, availability, is_new, page = 1, limit = 20 } = req.query;
    const conditions = ["p.is_active = true"];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.sku ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`c.name = $${idx++}`);
      params.push(category);
    }
    if (availability) {
      conditions.push(`p.availability = $${idx++}`);
      params.push(availability);
    }
    if (is_new === "true") {
      conditions.push("p.is_new = true");
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows } = await query(
      `SELECT p.id, p.name, p.sku, p.base_price, p.carat, p.metal_type,
              p.availability, p.is_new, p.is_active, p.min_order_qty, p.max_order_qty,
              p.lead_time_days, p.occasion_tags, p.created_at,
              c.name AS category,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image,
              (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS image_count,
              (SELECT COUNT(*) FROM recently_viewed rv WHERE rv.product_id = p.id) AS view_count,
              (SELECT COUNT(*) FROM wishlists w WHERE w.product_id = p.id) AS wishlist_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
      params
    );

    res.json({
      products: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countRows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/products/:id ────────────────────
// Full product detail for editing
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) throw new AppError("Product not found", 404);

    const { rows: images } = await query(
      "SELECT id, image_url AS url, is_primary, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order",
      [req.params.id]
    );

    // Collections this product belongs to
    const { rows: collections } = await query(
      `SELECT c.id, c.name FROM collection_products cp
       JOIN collections c ON c.id = cp.collection_id
       WHERE cp.product_id = $1`,
      [req.params.id]
    );

    // Stats
    const { rows: stats } = await query(
      `SELECT
        (SELECT COUNT(*) FROM recently_viewed WHERE product_id = $1) AS view_count,
        (SELECT COUNT(*) FROM wishlists WHERE product_id = $1) AS wishlist_count,
        (SELECT COUNT(*) FROM order_items WHERE product_id = $1) AS order_count`,
      [req.params.id]
    );

    res.json({ ...rows[0], images, collections, stats: stats[0] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/products ───────────────────────
// Create a new product
router.post("/", async (req, res, next) => {
  try {
    const {
      name, sku, description, category_id,
      base_price, carat, metal_type, gold_colour, metal_weight,
      diamond_type, diamond_shape, diamond_color, diamond_clarity,
      diamond_certification, setting_type, hallmark,
      width_mm, height_mm, availability,
      is_new, occasion_tags, gold_purity_options,
      carat_range_min, carat_range_max, finish_options,
      price_modifiers, lead_time_days,
      min_order_qty, max_order_qty,
      color_stone_name, color_stone_quality, carat_options,
      collection_ids,
    } = req.body;

    if (!name || !sku) throw new AppError("Name and SKU are required");

    // Check SKU uniqueness (only active products)
    const { rows: existing } = await query("SELECT id FROM products WHERE sku = $1 AND is_active = true", [sku]);
    if (existing.length > 0) throw new AppError("SKU already exists");

    const { rows } = await query(
      `INSERT INTO products (
        name, sku, description, category_id, base_price, carat,
        metal_type, gold_colour, metal_weight, diamond_type, diamond_shape,
        diamond_color, diamond_clarity, diamond_certification,
        setting_type, hallmark, width_mm, height_mm, availability,
        is_new, occasion_tags, gold_purity_options,
        carat_range_min, carat_range_max, finish_options,
        price_modifiers, lead_time_days, min_order_qty, max_order_qty,
        color_stone_name, color_stone_quality, carat_options
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
      ) RETURNING *`,
      [
        name, sku, description || null, category_id || null,
        base_price || 0, carat || 0, metal_type || null, gold_colour || null,
        metal_weight || null,
        diamond_type || null, diamond_shape || null, diamond_color || null,
        diamond_clarity || null, diamond_certification || null,
        setting_type || null, hallmark || null, width_mm || null, height_mm || null,
        availability || "in-stock", is_new || false,
        occasion_tags || [], gold_purity_options || [],
        carat_range_min || null, carat_range_max || null, finish_options || [],
        price_modifiers ? JSON.stringify(price_modifiers) : "{}",
        lead_time_days || null, min_order_qty || 1, max_order_qty || 100,
        color_stone_name || null, color_stone_quality || null,
        Array.isArray(carat_options) && carat_options.length ? JSON.stringify(carat_options) : null,
      ]
    );

    // Link to collections
    if (Array.isArray(collection_ids)) {
      for (const colId of collection_ids) {
        await query(
          "INSERT INTO collection_products (collection_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [colId, rows[0].id]
        );
      }
    }

    // Activity log
    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'product_created', 'product', $2, $3)`,
      [req.admin.id, rows[0].id, JSON.stringify({ name, sku })]
    );

    // Notify all active retailers about new product
    const { rows: retailers } = await query("SELECT id FROM retailers WHERE is_active = true");
    if (retailers.length > 0) {
      await query(
        `INSERT INTO notifications (retailer_id, type, title, message, action_path) VALUES ${
          retailers.map((_, i) => `($${i * 4 + 1},'new-collection',$${i * 4 + 2},$${i * 4 + 3},$${i * 4 + 4})`).join(",")
        }`,
        retailers.flatMap((r) => [r.id, "New Product Added", `${name} has been added to the catalog. Check it out!`, `/retailer/product/${rows[0].id}`])
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/products/:id ────────────────────
// Update product
router.put("/:id", async (req, res, next) => {
  try {
    const {
      name, description, category_id,
      base_price, carat, metal_type, gold_colour, metal_weight,
      diamond_type, diamond_shape, diamond_color, diamond_clarity,
      diamond_certification, setting_type, hallmark,
      width_mm, height_mm, availability, is_new, is_active,
      occasion_tags, gold_purity_options,
      carat_range_min, carat_range_max, finish_options,
      price_modifiers, lead_time_days,
      min_order_qty, max_order_qty,
      color_stone_name, color_stone_quality, carat_options,
      collection_ids,
    } = req.body;

    const { rows } = await query(
      `UPDATE products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category_id = COALESCE($3, category_id),
        base_price = COALESCE($4, base_price),
        carat = COALESCE($5, carat),
        metal_type = COALESCE($6, metal_type),
        gold_colour = COALESCE($7, gold_colour),
        metal_weight = COALESCE($8, metal_weight),
        diamond_type = COALESCE($9, diamond_type),
        diamond_shape = COALESCE($10, diamond_shape),
        diamond_color = COALESCE($11, diamond_color),
        diamond_clarity = COALESCE($12, diamond_clarity),
        diamond_certification = COALESCE($13, diamond_certification),
        setting_type = COALESCE($14, setting_type),
        hallmark = COALESCE($15, hallmark),
        width_mm = COALESCE($16, width_mm),
        height_mm = COALESCE($17, height_mm),
        availability = COALESCE($18, availability),
        is_new = COALESCE($19, is_new),
        is_active = COALESCE($20, is_active),
        occasion_tags = COALESCE($21, occasion_tags),
        gold_purity_options = COALESCE($22, gold_purity_options),
        carat_range_min = COALESCE($23, carat_range_min),
        carat_range_max = COALESCE($24, carat_range_max),
        finish_options = COALESCE($25, finish_options),
        price_modifiers = COALESCE($26, price_modifiers),
        lead_time_days = COALESCE($27, lead_time_days),
        min_order_qty = COALESCE($28, min_order_qty),
        max_order_qty = COALESCE($29, max_order_qty),
        color_stone_name = COALESCE($30, color_stone_name),
        color_stone_quality = COALESCE($31, color_stone_quality),
        carat_options = $32,
        updated_at = NOW()
       WHERE id = $33 RETURNING *`,
      [
        name, description, category_id,
        base_price, carat, metal_type, gold_colour, metal_weight,
        diamond_type, diamond_shape, diamond_color, diamond_clarity,
        diamond_certification, setting_type, hallmark,
        width_mm, height_mm, availability, is_new, is_active,
        occasion_tags, gold_purity_options,
        carat_range_min, carat_range_max, finish_options,
        price_modifiers ? JSON.stringify(price_modifiers) : null,
        lead_time_days, min_order_qty, max_order_qty,
        color_stone_name, color_stone_quality,
        Array.isArray(carat_options) && carat_options.length ? JSON.stringify(carat_options) : null,
        req.params.id,
      ]
    );
    if (rows.length === 0) throw new AppError("Product not found", 404);

    // Update collection links
    if (Array.isArray(collection_ids)) {
      await query("DELETE FROM collection_products WHERE product_id = $1", [req.params.id]);
      for (const colId of collection_ids) {
        await query(
          "INSERT INTO collection_products (collection_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [colId, req.params.id]
        );
      }
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/products/:id ─────────────────
// Soft delete (set is_active = false)
router.delete("/:id", async (req, res, next) => {
  try {
    await query(
      `UPDATE products SET is_active = false, sku = sku || '_deleted_' || id, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id)
       VALUES ('admin', $1, 'product_deactivated', 'product', $2)`,
      [req.admin.id, req.params.id]
    );

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/products/meta/categories ────────
router.get("/meta/categories", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT id, name FROM categories ORDER BY sort_order");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/products/meta/collections ───────
router.get("/meta/collections", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT id, name, tag FROM collections WHERE is_active = true ORDER BY name");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/products/import-csv ────────────
// Bulk import products from CSV or ZIP (CSV + images)
router.post("/import-csv", upload.single("file"), async (req, res, next) => {
  const client = await getClient();
  try {
    if (!req.file) throw new AppError("A CSV or ZIP file is required");

    let csvText = "";
    const imageFiles = new Map(); // filename -> Buffer

    const isZip = req.file.originalname.endsWith(".zip") || req.file.mimetype === "application/zip" || req.file.mimetype === "application/x-zip-compressed";

    if (isZip) {
      const zip = new AdmZip(req.file.buffer);
      const entries = zip.getEntries();
      let csvEntry = null;
      for (const entry of entries) {
        if (entry.isDirectory) continue;
        const name = entry.entryName.split("/").pop().toLowerCase();
        if (name.endsWith(".csv") && !csvEntry) {
          csvEntry = entry;
        } else if (/\.(jpg|jpeg|png|webp|avif)$/i.test(name)) {
          imageFiles.set(name, entry.getData());
        }
      }
      if (!csvEntry) throw new AppError("ZIP must contain a CSV file");
      csvText = csvEntry.getData().toString("utf-8");
    } else {
      csvText = req.file.buffer.toString("utf-8");
    }

    csvText = csvText.replace(/^\uFEFF/, "").replace(/^\ufeff/, "").replace(/^\xEF\xBB\xBF/, "").trim();
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new AppError("CSV must have a header row and at least one data row");

    // Parse header — strip BOM, quotes, whitespace aggressively
    const headers = lines[0].split(",").map((h) => h.replace(/[\uFEFF\xEF\xBB\xBF]/g, "").replace(/^"|"$/g, "").trim().toLowerCase());
    const col = (name) => headers.indexOf(name);

    const reqCols = ["name", "sku"];
    for (const r of reqCols) {
      if (col(r) === -1) throw new AppError(`CSV must have a '${r}' column`);
    }

    // Helpers
    const getVal = (cols, idx) => {
      if (idx < 0 || idx >= cols.length) return null;
      const v = cols[idx].replace(/^"|"$/g, "").trim();
      return v || null;
    };
    const getNum = (cols, idx) => {
      const v = getVal(cols, idx);
      if (!v) return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };
    const parseCsvRow = (line) => {
      const cols = [];
      let cur = "";
      let inQuote = false;
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === "," && !inQuote) { cols.push(cur); cur = ""; continue; }
        cur += ch;
      }
      cols.push(cur);
      return cols;
    };


    await client.query("BEGIN");
    let imported = 0;
    let skipped = 0;
    let imagesImported = 0;
    const errors = [];

    // Skip hint row if it starts with "e.g."
    const startRow = lines.length > 2 && lines[1].toLowerCase().includes("e.g.") ? 2 : 1;

    for (let i = startRow; i < lines.length; i++) {
      const cols = parseCsvRow(lines[i]);

      const name = getVal(cols, col("name"));
      const sku = getVal(cols, col("sku"));

      if (!name || !sku) {
        skipped++;
        errors.push({ row: i + 1, reason: "Missing name or sku" });
        continue;
      }

      // Check duplicates (only active products)
      const { rows: existSku } = await client.query("SELECT id FROM products WHERE sku = $1 AND is_active = true", [sku]);
      if (existSku.length > 0) {
        skipped++;
        errors.push({ row: i + 1, reason: `Duplicate SKU (${sku})` });
        continue;
      }

      // Resolve category name to id — create if not exists
      let category_id = null;
      const catName = getVal(cols, col("category"));
      if (catName) {
        const { rows: cats } = await client.query("SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1", [catName]);
        if (cats.length > 0) {
          category_id = cats[0].id;
        } else {
          const { rows: maxSort } = await client.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories");
          const { rows: newCat } = await client.query(
            "INSERT INTO categories (name, sort_order) VALUES ($1, $2) RETURNING id",
            [catName, maxSort[0].next]
          );
          category_id = newCat[0].id;
        }
      }

      const { rows: inserted } = await client.query(
        `INSERT INTO products (
          name, sku, description, category_id, base_price,
          metal_type, gold_colour, metal_weight, diamond_type, diamond_shape,
          diamond_color, diamond_clarity, diamond_certification, carat,
          setting_type, hallmark, width_mm, height_mm,
          color_stone_name, color_stone_quality,
          availability, lead_time_days, min_order_qty, max_order_qty,
          is_new, occasion_tags, finish_options
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
          $19,$20,$21,$22,$23,$24,$25,$26,$27
        ) RETURNING id`,
        [
          name, sku,
          getVal(cols, col("description")),
          category_id,
          getNum(cols, col("base_price")) || 0,
          getVal(cols, col("metal_type")),
          getVal(cols, col("gold_colour")),
          getNum(cols, col("metal_weight")),
          getVal(cols, col("diamond_type")),
          getVal(cols, col("diamond_shape")),
          getVal(cols, col("diamond_color")),
          getVal(cols, col("diamond_clarity")),
          getVal(cols, col("diamond_certification")),
          getNum(cols, col("carat")),
          getVal(cols, col("setting_type")),
          getVal(cols, col("hallmark")),
          getNum(cols, col("width_mm")),
          getNum(cols, col("height_mm")),
          getVal(cols, col("color_stone_name")),
          getVal(cols, col("color_stone_quality")),
          getVal(cols, col("availability")) || "in-stock",
          getNum(cols, col("lead_time_days")),
          getNum(cols, col("min_order_qty")) || 1,
          getNum(cols, col("max_order_qty")) || 100,
          getVal(cols, col("is_new")) === "true",
          getVal(cols, col("occasion_tags")) ? `{${getVal(cols, col("occasion_tags")).split(",").map((t) => `"${t.trim()}"`).join(",")}}` : "{}",
          getVal(cols, col("finish_options")) ? `{${getVal(cols, col("finish_options")).split(",").map((t) => `"${t.trim()}"`).join(",")}}` : "{}",
        ]
      );

      const productId = inserted[0].id;

      // Handle images from ZIP — CSV column "images" has comma-separated filenames
      const imagesVal = getVal(cols, col("images"));
      if (imagesVal && imageFiles.size > 0) {
        const fileNames = imagesVal.split(",").map((f) => f.trim()).filter(Boolean);
        let sortOrder = 0;
        for (const fn of fileNames) {
          const fnLower = fn.toLowerCase();
          const buf = imageFiles.get(fnLower);
          if (!buf) continue;
          const ext = path.extname(fnLower);
          const diskName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        const imageUrl = await uploadToGCS(buf, `products/${diskName}`, 'image/jpeg');
          await client.query(
            `INSERT INTO product_images (product_id, image_url, is_primary, sort_order, media_type)
             VALUES ($1, $2, $3, $4, 'image')`,
            [productId, imageUrl, sortOrder === 0, sortOrder]
          );
          sortOrder++;
          imagesImported++;
        }
      }

      imported++;
    }

    await client.query("COMMIT");

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, details)
       VALUES ('admin', $1, 'products_csv_import', $2)`,
      [req.admin.id, JSON.stringify({ imported, skipped, imagesImported })]
    );

    res.json({ imported, skipped, imagesImported, errors: errors.slice(0, 20), total: lines.length - startRow });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
