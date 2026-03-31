const router = require("express").Router();
const { query, getClient } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");
const AppError = require("../utils/AppError");

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
      base_price, carat, metal_type, metal_weight,
      diamond_type, diamond_shape, diamond_color, diamond_clarity,
      diamond_certification, setting_type, hallmark,
      width_mm, height_mm, availability,
      is_new, occasion_tags, gold_purity_options,
      carat_range_min, carat_range_max, finish_options,
      price_modifiers, lead_time_days,
      min_order_qty, max_order_qty,
      collection_ids,
    } = req.body;

    if (!name || !sku) throw new AppError("Name and SKU are required");

    // Check SKU uniqueness
    const { rows: existing } = await query("SELECT id FROM products WHERE sku = $1", [sku]);
    if (existing.length > 0) throw new AppError("SKU already exists");

    const { rows } = await query(
      `INSERT INTO products (
        name, sku, description, category_id, base_price, carat,
        metal_type, metal_weight, diamond_type, diamond_shape,
        diamond_color, diamond_clarity, diamond_certification,
        setting_type, hallmark, width_mm, height_mm, availability,
        is_new, occasion_tags, gold_purity_options,
        carat_range_min, carat_range_max, finish_options,
        price_modifiers, lead_time_days, min_order_qty, max_order_qty
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28
      ) RETURNING *`,
      [
        name, sku, description || null, category_id || null,
        base_price || 0, carat || 0, metal_type || null, metal_weight || null,
        diamond_type || null, diamond_shape || null, diamond_color || null,
        diamond_clarity || null, diamond_certification || null,
        setting_type || null, hallmark || null, width_mm || null, height_mm || null,
        availability || "in-stock", is_new || false,
        occasion_tags || [], gold_purity_options || [],
        carat_range_min || null, carat_range_max || null, finish_options || [],
        price_modifiers ? JSON.stringify(price_modifiers) : "{}",
        lead_time_days || null, min_order_qty || 1, max_order_qty || 100,
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
      base_price, carat, metal_type, metal_weight,
      diamond_type, diamond_shape, diamond_color, diamond_clarity,
      diamond_certification, setting_type, hallmark,
      width_mm, height_mm, availability, is_new, is_active,
      occasion_tags, gold_purity_options,
      carat_range_min, carat_range_max, finish_options,
      price_modifiers, lead_time_days,
      min_order_qty, max_order_qty,
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
        metal_weight = COALESCE($7, metal_weight),
        diamond_type = COALESCE($8, diamond_type),
        diamond_shape = COALESCE($9, diamond_shape),
        diamond_color = COALESCE($10, diamond_color),
        diamond_clarity = COALESCE($11, diamond_clarity),
        diamond_certification = COALESCE($12, diamond_certification),
        setting_type = COALESCE($13, setting_type),
        hallmark = COALESCE($14, hallmark),
        width_mm = COALESCE($15, width_mm),
        height_mm = COALESCE($16, height_mm),
        availability = COALESCE($17, availability),
        is_new = COALESCE($18, is_new),
        is_active = COALESCE($19, is_active),
        occasion_tags = COALESCE($20, occasion_tags),
        gold_purity_options = COALESCE($21, gold_purity_options),
        carat_range_min = COALESCE($22, carat_range_min),
        carat_range_max = COALESCE($23, carat_range_max),
        finish_options = COALESCE($24, finish_options),
        price_modifiers = COALESCE($25, price_modifiers),
        lead_time_days = COALESCE($26, lead_time_days),
        min_order_qty = COALESCE($27, min_order_qty),
        max_order_qty = COALESCE($28, max_order_qty),
        updated_at = NOW()
       WHERE id = $29 RETURNING *`,
      [
        name, description, category_id,
        base_price, carat, metal_type, metal_weight,
        diamond_type, diamond_shape, diamond_color, diamond_clarity,
        diamond_certification, setting_type, hallmark,
        width_mm, height_mm, availability, is_new, is_active,
        occasion_tags, gold_purity_options,
        carat_range_min, carat_range_max, finish_options,
        price_modifiers ? JSON.stringify(price_modifiers) : null,
        lead_time_days, min_order_qty, max_order_qty,
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
    await query("UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1", [req.params.id]);

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

module.exports = router;
