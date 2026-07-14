const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const { query, getClient } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");
const AppError = require("../utils/AppError");
const multer = require("multer");
const AdmZip = require("adm-zip");
const { uploadFile } = require("../utils/gcsUpload");
const pricing = require("../services/pricing.service");

// Bulk imports are streamed to disk (not held in RAM) and processed by the
// background worker (see src/worker/import.worker.js). memoryStorage would
// buffer the whole upload in memory on a RAM-tight box and risk an OOM.
const IMPORT_DIR = path.join(__dirname, "../../uploads/imports");
fs.mkdirSync(IMPORT_DIR, { recursive: true });
const importUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMPORT_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
});

router.use(adminAuth);

// ── GET /api/admin/products/:id/preview ────────────
// Returns the SAME shape as the retailer product detail, priced for the given
// retailer (or base price when none). Lets an admin preview exactly what a
// retailer sees. Read-only — no recently_viewed / audit side effects.
router.get("/:id/preview", async (req, res, next) => {
  try {
    const { retailerId } = req.query;
    const { rows } = await query(
      `SELECT p.*, c.name AS category FROM products p
       LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) throw new AppError("Product not found", 404);
    const { rows: images } = await query(
      "SELECT id, image_url, is_primary, media_type, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order",
      [req.params.id]
    );
    const { rows: goldPrice } = await query(
      "SELECT price_per_gram FROM gold_prices WHERE metal_type = $1", [rows[0].metal_type]
    );
    const { rows: diamonds } = await query(
      `SELECT id, diamond_type, diamond_shape, diamond_size, diamond_color, diamond_clarity, diamond_certification, carat, diamond_pcs
       FROM product_diamonds WHERE product_id = $1 ORDER BY sort_order, created_at`,
      [req.params.id]
    );
    const { rows: stones } = await query(
      `SELECT id, stone_name, quality, carat, pcs
       FROM product_stones WHERE product_id = $1 ORDER BY sort_order, created_at`,
      [req.params.id]
    );
    const priced = await pricing.priceForRetailer(rows[0], retailerId || null);
    res.json({
      ...rows[0],
      price: priced.price,
      price_source: priced.source,
      price_breakdown: priced.breakdown,
      images,
      diamonds,
      stones,
      country: priced.country || "India",
      // Gold rate actually used in the price (per the retailer's country),
      // falling back to the legacy gold_prices table only if unavailable.
      goldPricePerGram: priced.breakdown?.detail?.gold?.rate_per_gram
        ?? (goldPrice.length > 0 ? parseFloat(goldPrice[0].price_per_gram) : null),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/products ────────────────────────
// List all products with filters
router.get("/", async (req, res, next) => {
  try {
    const { search, category, availability, is_new, type_category, sub_category, page = 1, limit = 20 } = req.query;
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
    if (type_category) {
      // Comma-separated list (multi-select) — match any of the chosen types.
      const types = String(type_category).split(",").map((s) => s.trim()).filter(Boolean);
      conditions.push(`p.type_category = ANY($${idx++})`);
      params.push(types);
    }
    if (sub_category) {
      const subs = String(sub_category).split(",").map((s) => s.trim()).filter(Boolean);
      conditions.push(`p.sub_category = ANY($${idx++})`);
      params.push(subs);
    }
    if (availability) {
      conditions.push(`p.availability = $${idx++}`);
      params.push(availability);
    }
    if (is_new === "true") {
      conditions.push("p.is_new = true");
    } else if (is_new === "false") {
      conditions.push("p.is_new = false");
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows } = await query(
      `SELECT p.id, p.name, p.sku, p.base_price, p.carat, p.metal_type,
              p.availability, p.is_new, p.is_active, p.min_order_qty, p.max_order_qty,
              p.lead_time_days, p.occasion_tags, p.created_at,
              c.name AS category,
              (SELECT COALESCE(json_agg(json_build_object(
                       'type', pd.diamond_type,
                       'shape', pd.diamond_shape,
                       'color', pd.diamond_color,
                       'clarity', pd.diamond_clarity,
                       'certification', pd.diamond_certification,
                       'carat', pd.carat
                     ) ORDER BY pd.sort_order, pd.created_at), '[]')
                 FROM product_diamonds pd WHERE pd.product_id = p.id) AS diamonds,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image,
              (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS image_count,
              (SELECT COUNT(*) FROM recently_viewed rv WHERE rv.product_id = p.id) AS view_count,
              (SELECT COUNT(*) FROM wishlists w WHERE w.product_id = p.id) AS wishlist_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.created_at DESC, p.id DESC
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

    // Diamonds (multiple per product)
    const { rows: diamonds } = await query(
      `SELECT id, diamond_type, diamond_shape, diamond_color, diamond_clarity, diamond_certification, carat, diamond_size, diamond_pcs, stone_name, stone_quality
       FROM product_diamonds WHERE product_id = $1 ORDER BY sort_order, created_at`,
      [req.params.id]
    );

    // Stones (multiple per product — own name/quality/carat/pcs)
    const { rows: stones } = await query(
      `SELECT id, stone_name, quality, carat, pcs
       FROM product_stones WHERE product_id = $1 ORDER BY sort_order, created_at`,
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

    res.json({ ...rows[0], images, collections, diamonds, stones, stats: stats[0] });
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
      collection_ids, diamonds, stones,
      mfg_code, gross_weight, net_weight, color_stone_carat, color_stone_pcs,
      type_category, sub_category,
    } = req.body;

    if (!sku) throw new AppError("SKU is required");

    // Check SKU uniqueness (only active products)
    const { rows: existing } = await query("SELECT id FROM products WHERE sku = $1 AND is_active = true", [sku]);
    if (existing.length > 0) throw new AppError("SKU already exists");

    // Multiple stones: the FIRST row bridges to the product-level color_stone_*
    // columns (pricing fallback + display).
    const s0 = (Array.isArray(stones) && stones.length) ? stones[0] : {};
    const csName  = s0.stone_name ?? color_stone_name;
    const csQual  = s0.stone_quality ?? color_stone_quality;
    const csCarat = (s0.carat != null && s0.carat !== "") ? s0.carat : color_stone_carat;
    const csPcs   = (s0.pcs != null && s0.pcs !== "") ? s0.pcs : color_stone_pcs;

    // Multiple diamonds: the FIRST row also fills the product-level diamond_*
    // columns, kept for the current pricing/display path.
    const d0 = (Array.isArray(diamonds) && diamonds.length) ? diamonds[0] : {};
    const dType = d0.diamond_type ?? diamond_type;
    const dShape = d0.diamond_shape ?? diamond_shape;
    const dColor = d0.diamond_color ?? diamond_color;
    const dClarity = d0.diamond_clarity ?? diamond_clarity;
    const dCert = d0.diamond_certification ?? diamond_certification;
    const dCarat = (d0.carat != null && d0.carat !== "") ? d0.carat : carat;
    const dSize = d0.diamond_size ?? null;
    const dPcs = (d0.diamond_pcs != null && d0.diamond_pcs !== "") ? d0.diamond_pcs : null;

    const { rows } = await query(
      `INSERT INTO products (
        name, sku, description, category_id, base_price, carat,
        metal_type, gold_colour, metal_weight, diamond_type, diamond_shape,
        diamond_color, diamond_clarity, diamond_certification,
        setting_type, hallmark, width_mm, height_mm, availability,
        is_new, occasion_tags, gold_purity_options,
        carat_range_min, carat_range_max, finish_options,
        price_modifiers, lead_time_days, min_order_qty, max_order_qty,
        color_stone_name, color_stone_quality, carat_options,
        mfg_code, gross_weight, net_weight, diamond_size, diamond_pcs,
        color_stone_carat, color_stone_pcs, type_category, sub_category
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,
        $33,$34,$35,$36,$37,$38,$39,$40,$41
      ) RETURNING *`,
      [
        name || "", sku, description || null, category_id || null,
        base_price || 0, dCarat || 0, metal_type || null, gold_colour || null,
        metal_weight || null,
        dType || null, dShape || null, dColor || null,
        dClarity || null, dCert || null,
        setting_type || null, hallmark || null, width_mm || null, height_mm || null,
        availability || "in-stock", is_new || false,
        occasion_tags || [], gold_purity_options || [],
        carat_range_min || null, carat_range_max || null, finish_options || [],
        price_modifiers ? JSON.stringify(price_modifiers) : "{}",
        lead_time_days || null, min_order_qty || 1, max_order_qty || 100,
        csName || null, csQual || null,
        Array.isArray(carat_options) && carat_options.length ? JSON.stringify(carat_options) : null,
        mfg_code || null, gross_weight || null, net_weight || null,
        dSize || null, dPcs, csCarat || null, csPcs || null,
        type_category || null, sub_category || null,
      ]
    );

    // Stones (multiple per product)
    if (Array.isArray(stones)) {
      let so = 0;
      for (const s of stones) {
        if (!s || (!s.stone_name && !s.stone_quality && (s.carat == null || s.carat === ""))) continue;
        await query(
          `INSERT INTO product_stones (product_id, stone_name, quality, carat, pcs, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [rows[0].id, s.stone_name || null, s.stone_quality || null,
           (s.carat === "" || s.carat == null) ? null : s.carat,
           (s.pcs === "" || s.pcs == null) ? null : s.pcs, so++]
        );
      }
    }

    // Diamonds (multiple per product)
    if (Array.isArray(diamonds)) {
      let order = 0;
      for (const d of diamonds) {
        if (!d || (!d.diamond_type && !d.diamond_shape && !d.diamond_color && !d.diamond_clarity && !d.diamond_certification && (d.carat == null || d.carat === ""))) continue;
        await query(
          `INSERT INTO product_diamonds (product_id, diamond_type, diamond_shape, diamond_color, diamond_clarity, diamond_certification, carat, diamond_size, diamond_pcs, stone_name, stone_quality, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [rows[0].id, d.diamond_type || null, d.diamond_shape || null, d.diamond_color || null,
           d.diamond_clarity || null, d.diamond_certification || null,
           (d.carat === "" || d.carat == null) ? null : d.carat,
           d.diamond_size || null, (d.diamond_pcs === "" || d.diamond_pcs == null) ? null : d.diamond_pcs,
           d.stone_name || null, d.stone_quality || null, order++]
        );
      }
    }

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
      name, sku, description, category_id,
      base_price, carat, metal_type, gold_colour, metal_weight,
      diamond_type, diamond_shape, diamond_color, diamond_clarity,
      diamond_certification, setting_type, hallmark,
      width_mm, height_mm, availability, is_new, is_active,
      occasion_tags, gold_purity_options,
      carat_range_min, carat_range_max, finish_options,
      price_modifiers, lead_time_days,
      min_order_qty, max_order_qty,
      color_stone_name, color_stone_quality, carat_options,
      collection_ids, diamonds, stones,
      mfg_code, gross_weight, net_weight, color_stone_carat, color_stone_pcs,
      type_category, sub_category,
    } = req.body;

    // First stone row bridges to the product-level color_stone_* columns.
    // When a stones array is sent, it wins (empty string clears the name so a
    // product with no stones no longer prices a phantom stone).
    const stonesProvided = Array.isArray(stones);
    const s0 = stonesProvided && stones.length ? stones[0] : null;
    const csName  = stonesProvided ? (s0?.stone_name ?? "") : (color_stone_name ?? null);
    const csQual  = stonesProvided ? (s0?.stone_quality ?? "") : (color_stone_quality ?? null);
    const csCarat = stonesProvided ? (s0 && s0.carat != null && s0.carat !== "" ? s0.carat : null) : (color_stone_carat ?? null);
    const csPcs   = stonesProvided ? (s0 && s0.pcs != null && s0.pcs !== "" ? s0.pcs : null) : (color_stone_pcs ?? null);

    // SKU is editable: normalise (blank = keep existing) and ensure it stays
    // unique among other active products before saving.
    const newSku = (sku != null && String(sku).trim() !== "") ? String(sku).trim() : null;
    if (newSku) {
      const { rows: dup } = await query(
        "SELECT id FROM products WHERE sku = $1 AND is_active = true AND id <> $2",
        [newSku, req.params.id]);
      if (dup.length > 0) throw new AppError("SKU already exists");
    }

    // First diamond row bridges to the product-level diamond_* columns.
    const d0 = (Array.isArray(diamonds) && diamonds.length) ? diamonds[0] : {};
    const dType = d0.diamond_type ?? diamond_type;
    const dShape = d0.diamond_shape ?? diamond_shape;
    const dColor = d0.diamond_color ?? diamond_color;
    const dClarity = d0.diamond_clarity ?? diamond_clarity;
    const dCert = d0.diamond_certification ?? diamond_certification;
    const dCarat = (d0.carat != null && d0.carat !== "") ? d0.carat : carat;
    const dSize = d0.diamond_size ?? null;
    const dPcs = (d0.diamond_pcs != null && d0.diamond_pcs !== "") ? d0.diamond_pcs : null;

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
        mfg_code = COALESCE($33, mfg_code),
        gross_weight = COALESCE($34, gross_weight),
        net_weight = COALESCE($35, net_weight),
        diamond_size = COALESCE($36, diamond_size),
        diamond_pcs = COALESCE($37, diamond_pcs),
        color_stone_carat = COALESCE($38, color_stone_carat),
        color_stone_pcs = COALESCE($39, color_stone_pcs),
        sku = COALESCE($40, sku),
        type_category = COALESCE($42, type_category),
        sub_category = COALESCE($43, sub_category),
        updated_at = NOW()
       WHERE id = $41 RETURNING *`,
      [
        name, description, category_id,
        base_price, dCarat, metal_type, gold_colour, metal_weight,
        dType, dShape, dColor, dClarity,
        dCert, setting_type, hallmark,
        width_mm, height_mm, availability, is_new, is_active,
        occasion_tags, gold_purity_options,
        carat_range_min, carat_range_max, finish_options,
        price_modifiers ? JSON.stringify(price_modifiers) : null,
        lead_time_days, min_order_qty, max_order_qty,
        csName, csQual,
        Array.isArray(carat_options) && carat_options.length ? JSON.stringify(carat_options) : null,
        mfg_code ?? null, gross_weight ?? null, net_weight ?? null,
        dSize ?? null, dPcs ?? null, csCarat, csPcs,
        newSku,
        req.params.id,
        type_category ?? null, sub_category ?? null,
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

    // Replace diamonds (multiple per product) when provided
    if (Array.isArray(diamonds)) {
      await query("DELETE FROM product_diamonds WHERE product_id = $1", [req.params.id]);
      let order = 0;
      for (const d of diamonds) {
        if (!d || (!d.diamond_type && !d.diamond_shape && !d.diamond_color && !d.diamond_clarity && !d.diamond_certification && (d.carat == null || d.carat === ""))) continue;
        await query(
          `INSERT INTO product_diamonds (product_id, diamond_type, diamond_shape, diamond_color, diamond_clarity, diamond_certification, carat, diamond_size, diamond_pcs, stone_name, stone_quality, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [req.params.id, d.diamond_type || null, d.diamond_shape || null, d.diamond_color || null,
           d.diamond_clarity || null, d.diamond_certification || null,
           (d.carat === "" || d.carat == null) ? null : d.carat,
           d.diamond_size || null, (d.diamond_pcs === "" || d.diamond_pcs == null) ? null : d.diamond_pcs,
           d.stone_name || null, d.stone_quality || null, order++]
        );
      }
    }

    // Replace stones (multiple per product) when provided
    if (Array.isArray(stones)) {
      await query("DELETE FROM product_stones WHERE product_id = $1", [req.params.id]);
      let so = 0;
      for (const s of stones) {
        if (!s || (!s.stone_name && !s.stone_quality && (s.carat == null || s.carat === ""))) continue;
        await query(
          `INSERT INTO product_stones (product_id, stone_name, quality, carat, pcs, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [req.params.id, s.stone_name || null, s.stone_quality || null,
           (s.carat === "" || s.carat == null) ? null : s.carat,
           (s.pcs === "" || s.pcs == null) ? null : s.pcs, so++]
        );
      }
    }

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'product_updated', 'product', $2, $3)`,
      [req.admin.id, req.params.id, JSON.stringify({ name: rows[0].name, sku: rows[0].sku })]
    );

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

// ── GET /api/admin/products/meta/filter-options ────
// Distinct type_category and sub_category values for the admin filter bar.
router.get("/meta/filter-options", async (req, res, next) => {
  try {
    const [types, subs] = await Promise.all([
      query(`SELECT DISTINCT type_category AS v FROM products
             WHERE type_category IS NOT NULL AND type_category <> '' ORDER BY type_category`),
      query(`SELECT DISTINCT sub_category AS v FROM products
             WHERE sub_category IS NOT NULL AND sub_category <> '' ORDER BY sub_category`),
    ]);
    res.json({
      types: types.rows.map((r) => r.v),
      subCategories: subs.rows.map((r) => r.v),
    });
  } catch (err) {
    next(err);
  }
});

// NOTE: the CSV/XLSX/ZIP parser + the row-insert logic that used to live here
// now lives in src/services/productImport.service.js so the background worker
// (src/worker/import.worker.js) can run it off the request thread. This route
// only accepts the upload, enqueues a job, and returns 202.

// ── POST /api/admin/products/import-csv ────────────
// Accept a CSV/XLSX/ZIP upload, persist it to disk, and enqueue a background
// job. Returns 202 + { jobId } immediately — the request no longer blocks
// while thousands of rows import. Poll GET /import-csv/jobs/:id for progress.
router.post("/import-csv", importUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError("A CSV, XLSX, or ZIP file is required");
    const { rows } = await query(
      `INSERT INTO import_jobs (status, file_path, original_name, admin_id)
       VALUES ('queued', $1, $2, $3) RETURNING id`,
      [req.file.path, req.file.originalname || null, req.admin.id]
    );
    res.status(202).json({ jobId: rows[0].id, status: "queued" });
  } catch (err) {
    // Clean up the orphaned upload if we couldn't enqueue it.
    if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

// ── GET /api/admin/products/import-csv/jobs/:id ────
// Poll an import job's status + progress + final counts.
router.get("/import-csv/jobs/:id", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, status, total, processed, imported, skipped,
              images_imported AS "imagesImported",
              diamonds_imported AS "diamondsImported",
              stones_imported AS "stonesImported",
              errors, error_message AS "errorMessage",
              created_at, started_at, finished_at
       FROM import_jobs WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) throw new AppError("Import job not found", 404);
    const job = rows[0];
    // Surface only the first 20 errors to the client (mirrors the old response).
    if (Array.isArray(job.errors)) job.errors = job.errors.slice(0, 20);
    res.json(job);
  } catch (err) {
    next(err);
  }
});


module.exports = router;
