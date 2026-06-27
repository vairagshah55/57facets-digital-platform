const router = require("express").Router();
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const auditLog = require("../utils/auditLog");
const AppError = require("../utils/AppError");
const pricing = require("../services/pricing.service");

// ── GET /api/products ──────────────────────────────
// List products with filters
router.get("/", authenticate, async (req, res, next) => {
  try {
    const {
      category, search, availability,
      min_price, max_price, min_carat, max_carat,
      is_new, collection, page = 1, limit = 20,
    } = req.query;

    const conditions = ["p.is_active = true"];
    const params = [];
    let idx = 1;

    if (collection) {
      conditions.push(
        `EXISTS (SELECT 1 FROM collection_products cp WHERE cp.product_id = p.id AND cp.collection_id = $${idx++})`
      );
      params.push(collection);
    }
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
    // NOTE: price is computed dynamically from the rate chart (not a column),
    // so the price-range filter is applied AFTER pricing, in JS (below).
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

    const pageNum = parseInt(page), lim = parseInt(limit);
    const offset = (pageNum - 1) * lim;
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const COLS = `p.id, p.name, p.sku, p.base_price, p.carat, p.metal_type, p.metal_weight,
              p.gross_weight, p.net_weight,
              p.availability, p.is_new, p.diamond_shape, p.diamond_size, p.diamond_pcs,
              p.diamond_color, p.diamond_clarity,
              p.color_stone_name, p.color_stone_quality, p.color_stone_carat, p.color_stone_pcs,
              c.name AS category,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image`;
    const baseQuery = `SELECT ${COLS} FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where} ORDER BY p.created_at DESC, p.id DESC`;

    const minP = min_price ? Number(min_price) : null;
    const maxP = max_price ? Number(max_price) : null;
    const hasPriceFilter = minP != null || maxP != null;

    let pageProducts, total;
    if (hasPriceFilter) {
      // Price every matching product, filter by computed price, then paginate in JS.
      const { rows: allRows } = await query(baseQuery, params);
      let priced = await pricing.priceProductsForRetailer(allRows, req.retailer?.id);
      priced = priced.filter((p) => (minP == null || p.price >= minP) && (maxP == null || p.price <= maxP));
      total = priced.length;
      pageProducts = priced.slice(offset, offset + lim);
    } else {
      const { rows } = await query(`${baseQuery} LIMIT $${idx++} OFFSET $${idx++}`, [...params, lim, offset]);
      pageProducts = await pricing.priceProductsForRetailer(rows, req.retailer?.id);
      const { rows: countRows } = await query(
        `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where}`, params);
      total = parseInt(countRows[0].count);
    }

    if (search && req.retailer?.id) {
      auditLog({
        actorType: "retailer",
        actorId: req.retailer.id,
        action: "product.searched",
        details: { query: search, category: category || null, result_count: total },
      });
    }

    res.json({
      products: pageProducts,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / lim),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/categories ───────────────────
router.get("/categories", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.name,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = true)::int AS product_count,
        COALESCE(
          c.image_url,
          (SELECT pi.image_url FROM product_images pi
           JOIN products p ON p.id = pi.product_id
           WHERE p.category_id = c.id AND pi.is_primary = true AND p.is_active = true
           ORDER BY p.created_at DESC, p.id DESC LIMIT 1)
        ) AS image_url
       FROM categories c ORDER BY c.sort_order`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/counts ───────────────────────
// Lightweight badge counts — pure COUNT(*) (no row fetching / pricing).
router.get("/counts", authenticate, async (req, res, next) => {
  try {
    const rid = req.retailer?.id;
    const zero = Promise.resolve({ rows: [{ c: 0 }] });
    const [tot, nw, rv, wl] = await Promise.all([
      query("SELECT COUNT(*)::int AS c FROM products WHERE is_active = true"),
      query("SELECT COUNT(*)::int AS c FROM products WHERE is_active = true AND is_new = true"),
      rid ? query("SELECT COUNT(*)::int AS c FROM recently_viewed WHERE retailer_id = $1", [rid]) : zero,
      rid ? query("SELECT COUNT(*)::int AS c FROM wishlists WHERE retailer_id = $1", [rid]) : zero,
    ]);
    res.json({
      total: tot.rows[0].c,
      newArrivals: nw.rows[0].c,
      recentlyViewed: Math.min(rv.rows[0].c, 20), // the recently-viewed list is capped at 20
      wishlist: wl.rows[0].c,
    });
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
       ORDER BY p.created_at DESC, p.id DESC LIMIT 12`
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
      `SELECT p.id, p.name, p.sku, p.base_price, p.carat, p.metal_type, p.metal_weight,
              p.gross_weight, p.net_weight, p.availability, p.is_new,
              p.diamond_shape, p.diamond_size, p.diamond_pcs, p.diamond_color, p.diamond_clarity,
              p.color_stone_name, p.color_stone_quality, p.color_stone_carat, p.color_stone_pcs,
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
    // Attach the per-retailer dynamic price (same as the catalog list).
    const priced = await pricing.priceProductsForRetailer(rows, req.retailer?.id);
    res.json(priced);
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

    // Diamonds (multiple per product)
    const { rows: diamonds } = await query(
      `SELECT id, diamond_type, diamond_shape, diamond_size, diamond_color, diamond_clarity, diamond_certification, carat, diamond_pcs
       FROM product_diamonds WHERE product_id = $1 ORDER BY sort_order, created_at`,
      [req.params.id]
    );

    // Stones (multiple per product)
    const { rows: stones } = await query(
      `SELECT id, stone_name, quality, carat, pcs
       FROM product_stones WHERE product_id = $1 ORDER BY sort_order, created_at`,
      [req.params.id]
    );

    // Track recently viewed (one row per retailer/product, last viewed)
    await query(
      `INSERT INTO recently_viewed (retailer_id, product_id) VALUES ($1, $2)
       ON CONFLICT (retailer_id, product_id) DO UPDATE SET viewed_at = NOW()`,
      [req.retailer.id, req.params.id]
    );

    // Per-event log so reports can count repeat views
    auditLog({
      actorType: "retailer",
      actorId: req.retailer.id,
      action: "product.viewed",
      entityType: "product",
      entityId: req.params.id,
    });

    // Per-retailer computed price + full cost breakdown
    const priced = await pricing.priceForRetailer(rows[0], req.retailer?.id);

    res.json({
      ...rows[0],
      price: priced.price,
      price_source: priced.source,
      price_breakdown: priced.breakdown,
      images,
      diamonds,
      stones,
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
