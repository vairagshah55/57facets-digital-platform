const router = require("express").Router();
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const AppError = require("../utils/AppError");

// ── GET /api/products ──────────────────────────────
// List products with filters
router.get("/", authenticate, async (req, res, next) => {
  try {
    const {
      category, search, availability,
      min_price, max_price, min_carat, max_carat,
      is_new, page = 1, limit = 20,
    } = req.query;

    const conditions = ["p.is_active = true"];
    const params = [];
    let idx = 1;

    if (category) {
      conditions.push(`c.name = $${idx++}`);
      params.push(category);
    }
    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.sku ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (availability) {
      conditions.push(`p.availability = $${idx++}`);
      params.push(availability);
    }
    if (min_price) {
      conditions.push(`p.base_price >= $${idx++}`);
      params.push(min_price);
    }
    if (max_price) {
      conditions.push(`p.base_price <= $${idx++}`);
      params.push(max_price);
    }
    if (min_carat) {
      conditions.push(`p.carat >= $${idx++}`);
      params.push(min_carat);
    }
    if (max_carat) {
      conditions.push(`p.carat <= $${idx++}`);
      params.push(max_carat);
    }
    if (is_new === "true") {
      conditions.push("p.is_new = true");
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT p.id, p.name, p.sku, p.base_price, p.carat, p.metal_type,
              p.availability, p.is_new, p.diamond_shape,
              c.name AS category,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    // Total count
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

// ── GET /api/products/categories ───────────────────
router.get("/categories", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, name, image_url FROM categories ORDER BY sort_order"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/new-arrivals ─────────────────
router.get("/new-arrivals", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.id, p.name, p.sku, p.base_price, p.carat, p.availability, p.is_new,
              c.name AS category,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_new = true AND p.is_active = true
       ORDER BY p.created_at DESC LIMIT 12`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/recently-viewed ──────────────
router.get("/recently-viewed", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.id, p.name, p.sku, p.base_price, p.carat, p.availability,
              c.name AS category,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image,
              rv.viewed_at
       FROM recently_viewed rv
       JOIN products p ON p.id = rv.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE rv.retailer_id = $1
       ORDER BY rv.viewed_at DESC LIMIT 20`,
      [req.retailer.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/:id ──────────────────────────
// Product detail
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, c.name AS category
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      throw new AppError("Product not found", 404);
    }

    // Images
    const { rows: images } = await query(
      "SELECT id, image_url, is_primary, media_type, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order",
      [req.params.id]
    );

    // Gold price for metal type
    const { rows: goldPrice } = await query(
      "SELECT price_per_gram FROM gold_prices WHERE metal_type = $1",
      [rows[0].metal_type]
    );

    // Track recently viewed
    await query(
      `INSERT INTO recently_viewed (retailer_id, product_id) VALUES ($1, $2)
       ON CONFLICT (retailer_id, product_id) DO UPDATE SET viewed_at = NOW()`,
      [req.retailer.id, req.params.id]
    );

    res.json({
      ...rows[0],
      images,
      goldPricePerGram: goldPrice.length > 0 ? parseFloat(goldPrice[0].price_per_gram) : null,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/gold-prices ──────────────────
router.get("/meta/gold-prices", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query("SELECT metal_type, price_per_gram, updated_at FROM gold_prices");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
