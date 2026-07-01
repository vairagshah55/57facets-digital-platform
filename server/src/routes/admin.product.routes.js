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
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

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
      goldPricePerGram: goldPrice.length > 0 ? parseFloat(goldPrice[0].price_per_gram) : null,
    });
  } catch (err) {
    next(err);
  }
});

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
        color_stone_carat, color_stone_pcs
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,
        $33,$34,$35,$36,$37,$38,$39
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

// Decode the XML entities that appear in shared/inline strings.
function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&amp;/g, "&"); // keep last so we don't double-decode
}

// "AB12" → 0-based column index (AB → 27).
function colRefToIndex(ref) {
  const m = /^([A-Z]+)/.exec(ref);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// Pull the text out of <t>…</t> runs inside a chunk of cell/si XML.
function extractTextRuns(xml) {
  const parts = xml.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
  return decodeXmlEntities(parts.map((p) => p.replace(/<t[^>]*>([\s\S]*?)<\/t>/, "$1")).join(""));
}

// Minimal .xlsx reader — an .xlsx is just a zip of XML parts, so we reuse
// adm-zip (already a dependency) and read the first worksheet into a 2-D array
// of cell strings, the same shape the CSV path produces. No new dependency.
function parseXlsx(buffer) {
  const zip = new AdmZip(buffer);
  const read = (name) => {
    const e = zip.getEntry(name);
    return e ? e.getData().toString("utf-8") : "";
  };

  // Shared-strings table (most text cells reference it by index)
  const shared = [];
  const ssXml = read("xl/sharedStrings.xml");
  if (ssXml) {
    const siMatches = ssXml.match(/<si\b[^>]*?(?:\/>|>[\s\S]*?<\/si>)/g) || [];
    for (const si of siMatches) shared.push(extractTextRuns(si));
  }

  // First worksheet (prefer sheet1.xml, else any worksheet part)
  let sheetPath = "xl/worksheets/sheet1.xml";
  if (!zip.getEntry(sheetPath)) {
    const entry = zip.getEntries().find((e) => /^xl\/worksheets\/.*\.xml$/i.test(e.entryName));
    if (entry) sheetPath = entry.entryName;
  }
  const sheetXml = read(sheetPath);
  if (!sheetXml) throw new AppError("Could not read a worksheet from the .xlsx file");

  const rows = [];
  const rowMatches = sheetXml.match(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g) || [];
  for (const rowXml of rowMatches) {
    const cells = [];
    let maxIdx = -1;
    const cellMatches = rowXml.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || [];
    for (const cXml of cellMatches) {
      const refM = /\br="([A-Z]+\d+)"/.exec(cXml);
      const idx = refM ? colRefToIndex(refM[1]) : cells.length;
      const typeM = /\bt="([^"]+)"/.exec(cXml);
      const type = typeM ? typeM[1] : "n";

      let value = "";
      if (type === "inlineStr") {
        const isM = /<is>([\s\S]*?)<\/is>/.exec(cXml);
        if (isM) value = extractTextRuns(isM[1]);
      } else {
        const vM = /<v>([\s\S]*?)<\/v>/.exec(cXml);
        const raw = vM ? vM[1] : "";
        if (type === "s") value = shared[parseInt(raw, 10)] || "";
        else if (type === "b") value = raw === "1" ? "true" : "false";
        else if (type === "str") value = decodeXmlEntities(raw);
        else value = raw; // number — kept as text; the importer parses as needed
      }
      cells[idx] = value;
      if (idx > maxIdx) maxIdx = idx;
    }
    for (let i = 0; i <= maxIdx; i++) if (cells[i] === undefined) cells[i] = "";
    rows.push(cells);
  }
  return rows;
}

// ── POST /api/admin/products/import-csv ────────────
// Bulk import products from CSV, XLSX, or ZIP (CSV/XLSX + images)
router.post("/import-csv", upload.single("file"), async (req, res, next) => {
  const client = await getClient();
  try {
    if (!req.file) throw new AppError("A CSV, XLSX, or ZIP file is required");

    const imageFiles = new Map(); // filename -> Buffer
    const lowerName = (req.file.originalname || "").toLowerCase();
    const isXlsx =
      lowerName.endsWith(".xlsx") ||
      req.file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const isZip =
      !isXlsx &&
      (lowerName.endsWith(".zip") ||
        req.file.mimetype === "application/zip" ||
        req.file.mimetype === "application/x-zip-compressed");

    // CSV text → 2-D array of cell strings (one row per array)
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
    const parseCsvText = (text) =>
      text
        .replace(/[﻿\xEF\xBB\xBF]/g, "")
        .trim()
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map(parseCsvRow);

    // Normalise whatever was uploaded into rows[][] + an optional image map
    let rows;
    if (isZip) {
      const zip = new AdmZip(req.file.buffer);
      let csvEntry = null;
      let xlsxEntry = null;
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        const name = entry.entryName.split("/").pop().toLowerCase();
        if (name.endsWith(".csv") && !csvEntry) csvEntry = entry;
        else if (name.endsWith(".xlsx") && !xlsxEntry) xlsxEntry = entry;
        else if (/\.(jpg|jpeg|png|webp|avif)$/i.test(name)) imageFiles.set(name, entry.getData());
      }
      if (csvEntry) rows = parseCsvText(csvEntry.getData().toString("utf-8"));
      else if (xlsxEntry) rows = parseXlsx(xlsxEntry.getData());
      else throw new AppError("ZIP must contain a CSV or XLSX file");
    } else if (isXlsx) {
      rows = parseXlsx(req.file.buffer);
    } else {
      rows = parseCsvText(req.file.buffer.toString("utf-8"));
    }

    if (!rows || rows.length < 2) {
      throw new AppError("File must have a header row and at least one data row");
    }

    // Parse header — strip BOM, quotes, whitespace aggressively
    const headers = rows[0].map((h) => {
      const cleaned = (h == null ? "" : String(h))
        .replace(/[\uFEFF\xEF\xBB\xBF]/g, "")
        .replace(/^"|"$/g, "")
        .trim()
        .toLowerCase();
      // Drop any descriptive " - <note>" suffix so a header like
      // "sku - Barcode" or "base_price - Total" maps to its field name.
      return cleaned.split(/\s+-\s+/)[0].trim();
    });
    const col = (name) => headers.indexOf(name);
    // nth occurrence of a (duplicated) header — the template repeats "pcs"/"carat"
    // across the diamond and colour-stone sections.
    const colNth = (name, nth) => { let c = 0; for (let k = 0; k < headers.length; k++) { if (headers[k] === name) { if (c === nth) return k; c++; } } return -1; };
    const colAny = (...names) => { for (const n of names) { const i = headers.indexOf(n); if (i !== -1) return i; } return -1; };
    // Extra template fields (the yellow columns). Prefer unique names; otherwise
    // resolve the repeated "pcs"/"carat" headers by 1st (diamond) / 2nd (stone).
    const mfgIdx     = colAny("mfg_code", "mfg code", "mfg");
    const grossWtIdx = colAny("gross_weight", "gross weight");
    const netWtIdx   = colAny("net_weight", "net weight");
    const diaSizeIdx = colAny("diamond_size", "diamond size");
    const diaPcsIdx  = colAny("diamond_pcs") !== -1 ? colAny("diamond_pcs") : colNth("pcs", 0);
    const csPcsIdx   = colAny("color_stone_pcs", "cs_pcs") !== -1 ? colAny("color_stone_pcs", "cs_pcs") : colNth("pcs", 1);
    const csCaratIdx = colAny("color_stone_carat", "cs_carat") !== -1 ? colAny("color_stone_carat", "cs_carat") : colNth("carat", 1);
    // Pricing uses metal_weight — fall back to net weight when the template only has gross/net.
    const metalWtIdx = col("metal_weight") !== -1 ? col("metal_weight") : netWtIdx;

    // Field requirement tiers — driven by the colour-coded import template:
    //  • RED columns were removed from the template and are NOT imported
    //    (setting_type, hallmark, width_mm, height_mm, lead_time_days,
    //     min_order_qty, finish_options).
    //  • Un-coloured columns are REQUIRED — a row missing any is skipped.
    //  • Coloured columns are OPTIONAL (name, description, metal_type,
    //     gold_colour, diamond_certification, availability, occasion_tags).
    // Only SKU is required (matches the single-product form). Every other field is
    // optional on import — missing values are stored as null / sensible defaults.
    if (col("sku") === -1) throw new AppError("File must have a 'sku' column");

    // Helpers
    const getVal = (cols, idx) => {
      if (idx < 0 || idx >= cols.length) return null;
      const v = (cols[idx] == null ? "" : String(cols[idx])).replace(/^"|"$/g, "").trim();
      return v || null;
    };
    const getNum = (cols, idx) => {
      const v = getVal(cols, idx);
      if (!v) return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };
    // Normalise availability to the DB enum (in-stock/made-to-order/out-of-stock)
    // so free-text variants ("In Stock", "MTO", "sold out") don't fail the CHECK
    // constraint and silently drop the row.
    const normAvailability = (cols) => {
      const raw = (getVal(cols, col("availability")) || "").toLowerCase().replace(/[\s_]+/g, "-");
      if (!raw) return "in-stock";
      if (raw.includes("made") || raw === "mto" || raw.includes("order")) return "made-to-order";
      if (raw.includes("out") || raw.includes("sold") || raw === "oos" || raw.includes("unavailable")) return "out-of-stock";
      return "in-stock";
    };
    // Truthy parse for boolean-ish columns (yes/true/1/y).
    const normBool = (cols, name) => {
      const v = (getVal(cols, col(name)) || "").toLowerCase();
      return v === "true" || v === "yes" || v === "y" || v === "1";
    };

    await client.query("BEGIN");
    let imported = 0;
    let skipped = 0;
    let imagesImported = 0;
    let diamondsImported = 0;
    let stonesImported = 0;
    const errors = [];
    // A product can span several rows: the SKU row starts a product, the
    // following no-SKU rows append extra diamonds to it.
    let currentProductId = null;
    let currentDiaOrder = 0;
    let currentStoneOrder = 0;

    // Skip the hint/example row (row 2 of the template) if present
    const startRow = rows.length > 2 && rows[1].join(" ").toLowerCase().includes("e.g.") ? 2 : 1;

    for (let i = startRow; i < rows.length; i++) {
      const cols = rows[i];

      const name = getVal(cols, col("name")); // optional
      const sku = getVal(cols, col("sku"));

      // Diamond fields on this row (a product can have several — extra rows carry no SKU).
      const dia = {
        diamond_type: getVal(cols, col("diamond_type")),
        diamond_shape: getVal(cols, col("diamond_shape")),
        diamond_color: getVal(cols, col("diamond_color")),
        diamond_clarity: getVal(cols, col("diamond_clarity")),
        diamond_certification: getVal(cols, col("diamond_certification")),
        carat: getNum(cols, col("carat")),
        diamond_size: getVal(cols, diaSizeIdx),
        diamond_pcs: getNum(cols, diaPcsIdx),
      };
      const diaHas = !!(dia.diamond_type || dia.diamond_shape || dia.diamond_color || dia.diamond_clarity || dia.diamond_certification || dia.carat != null || dia.diamond_size || dia.diamond_pcs != null);
      // Default certification to GSI when a diamond is present but its cert is blank.
      if (diaHas && !dia.diamond_certification) dia.diamond_certification = "GSI";

      // Stone fields on this row (a product can have several — extra rows carry no SKU).
      const stone = {
        stone_name: getVal(cols, col("color_stone_name")),
        quality: getVal(cols, col("color_stone_quality")),
        carat: getNum(cols, csCaratIdx),
        pcs: getNum(cols, csPcsIdx),
      };
      const stoneHas = !!(stone.stone_name || stone.quality || stone.carat != null || stone.pcs != null);

      // No SKU → continuation row: extra diamond and/or stone for the most-recent product.
      // (A genuinely blank row is skipped quietly.)
      if (!sku) {
        if (currentProductId && (diaHas || stoneHas)) {
          if (diaHas) {
            await client.query("SAVEPOINT dia_sp");
            try {
              await client.query(
                `INSERT INTO product_diamonds (product_id, diamond_type, diamond_shape, diamond_color, diamond_clarity, diamond_certification, carat, diamond_size, diamond_pcs, sort_order)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                [currentProductId, dia.diamond_type, dia.diamond_shape, dia.diamond_color, dia.diamond_clarity, dia.diamond_certification, dia.carat, dia.diamond_size, dia.diamond_pcs, currentDiaOrder++]
              );
              await client.query("RELEASE SAVEPOINT dia_sp");
              diamondsImported++;
            } catch { await client.query("ROLLBACK TO SAVEPOINT dia_sp"); }
          }
          if (stoneHas) {
            await client.query("SAVEPOINT stn_sp");
            try {
              await client.query(
                `INSERT INTO product_stones (product_id, stone_name, quality, carat, pcs, sort_order)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [currentProductId, stone.stone_name, stone.quality, stone.carat, stone.pcs, currentStoneOrder++]
              );
              await client.query("RELEASE SAVEPOINT stn_sp");
              stonesImported++;
            } catch { await client.query("ROLLBACK TO SAVEPOINT stn_sp"); }
          }
        } else {
          skipped++;
        }
        continue;
      }

      // Check duplicates — the products_sku_key unique constraint spans ALL
      // rows. An ACTIVE product with this SKU is a real conflict and is
      // skipped. An INACTIVE one (deleted/deactivated) still occupies the SKU,
      // so we free it below (rename to <sku>_deleted_<id>) and import fresh.
      const { rows: existSku } = await client.query("SELECT id, is_active FROM products WHERE sku = $1", [sku]);
      let freeInactiveId = null;
      if (existSku.length > 0) {
        if (existSku[0].is_active) {
          skipped++;
          errors.push({ row: i + 1, reason: `Duplicate SKU (${sku})` });
          continue;
        }
        freeInactiveId = existSku[0].id;
      }

      // Isolate each row in a savepoint so an unexpected DB error (e.g. a
      // constraint violation) skips just this row instead of aborting the
      // whole import and surfacing as a 500 with no per-row feedback.
      await client.query("SAVEPOINT row_sp");
      try {
        // Free the SKU from the inactive product holding it, so this row can
        // import as a brand-new product. Inside the savepoint, so a later
        // failure on this row rolls the rename back too.
        if (freeInactiveId) {
          await client.query(
            "UPDATE products SET sku = sku || '_deleted_' || id, updated_at = NOW() WHERE id = $1",
            [freeInactiveId]
          );
        }

        // Resolve category name to id — create if not exists.
        // Match case-insensitively AND singular/plural so "RING"/"Ring" map to the
        // existing "Rings" instead of creating a duplicate category.
        let category_id = null;
        const catName = getVal(cols, col("category"));
        if (catName) {
          const { rows: cats } = await client.query(
            `SELECT id FROM categories
             WHERE lower(name) = lower($1)
                OR lower(name) = lower($1) || 's'
                OR lower(name) || 's' = lower($1)
             ORDER BY (lower(name) = lower($1)) DESC LIMIT 1`,
            [catName]);
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
            color_stone_name, color_stone_quality,
            availability, max_order_qty, is_new, occasion_tags,
            mfg_code, gross_weight, net_weight, diamond_size, diamond_pcs,
            color_stone_carat, color_stone_pcs
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
            $21,$22,$23,$24,$25,$26,$27
          ) RETURNING id`,
          [
            name || "", sku,
            getVal(cols, col("description")),
            category_id,
            getNum(cols, col("base_price")) || 0,
            getVal(cols, col("metal_type")),
            getVal(cols, col("gold_colour")),
            getNum(cols, metalWtIdx),
            getVal(cols, col("diamond_type")),
            getVal(cols, col("diamond_shape")),
            getVal(cols, col("diamond_color")),
            getVal(cols, col("diamond_clarity")),
            dia.diamond_certification,
            getNum(cols, col("carat")),
            getVal(cols, col("color_stone_name")),
            getVal(cols, col("color_stone_quality")),
            normAvailability(cols),
            getNum(cols, col("max_order_qty")) || 100,
            normBool(cols, "is_new"),
            getVal(cols, col("occasion_tags")) ? `{${getVal(cols, col("occasion_tags")).split(",").map((t) => `"${t.trim()}"`).join(",")}}` : "{}",
            getVal(cols, mfgIdx),
            getNum(cols, grossWtIdx),
            getNum(cols, netWtIdx),
            dia.diamond_size,
            dia.diamond_pcs,
            getNum(cols, csCaratIdx),
            getNum(cols, csPcsIdx),
          ]
        );

        const productId = inserted[0].id;
        currentProductId = productId;
        currentDiaOrder = 0;
        currentStoneOrder = 0;

        // This row's diamond → product_diamonds (product-level columns already set above)
        if (diaHas) {
          await client.query(
            `INSERT INTO product_diamonds (product_id, diamond_type, diamond_shape, diamond_color, diamond_clarity, diamond_certification, carat, diamond_size, diamond_pcs, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [productId, dia.diamond_type, dia.diamond_shape, dia.diamond_color, dia.diamond_clarity, dia.diamond_certification, dia.carat, dia.diamond_size, dia.diamond_pcs, currentDiaOrder++]
          );
          diamondsImported++;
        }

        // This row's stone → product_stones (product-level color_stone_* already set above)
        if (stoneHas) {
          await client.query(
            `INSERT INTO product_stones (product_id, stone_name, quality, carat, pcs, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [productId, stone.stone_name, stone.quality, stone.carat, stone.pcs, currentStoneOrder++]
          );
          stonesImported++;
        }

        // Handle images from ZIP — CSV column "images" has comma-separated filenames
        const imagesVal = getVal(cols, col("images"));
        let rowImages = 0;
        if (imagesVal && imageFiles.size > 0) {
          const fileNames = imagesVal.split(",").map((f) => f.trim()).filter(Boolean);
          let sortOrder = 0;
          for (const fn of fileNames) {
            const fnLower = fn.toLowerCase();
            const buf = imageFiles.get(fnLower);
            if (!buf) continue;
            const ext = path.extname(fnLower);
            const diskName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
            const imageUrl = await uploadFile(buf, `products/${diskName}`, 'image/jpeg');
            await client.query(
              `INSERT INTO product_images (product_id, image_url, is_primary, sort_order, media_type)
               VALUES ($1, $2, $3, $4, 'image')`,
              [productId, imageUrl, sortOrder === 0, sortOrder]
            );
            sortOrder++;
            rowImages++;
          }
        }

        await client.query("RELEASE SAVEPOINT row_sp");
        imported++;
        imagesImported += rowImages;
      } catch (rowErr) {
        await client.query("ROLLBACK TO SAVEPOINT row_sp");
        skipped++;
        errors.push({
          row: i + 1,
          reason: rowErr.code === "23505"
            ? `Duplicate SKU (${sku})`
            : rowErr.message || "Row failed to import",
        });
      }
    }

    await client.query("COMMIT");

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, details)
       VALUES ('admin', $1, 'products_csv_import', $2)`,
      [req.admin.id, JSON.stringify({ imported, skipped, imagesImported })]
    );

    res.json({ imported, skipped, imagesImported, diamondsImported, stonesImported, errors: errors.slice(0, 20), total: rows.length - startRow });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
