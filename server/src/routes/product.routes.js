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
      is_new, unseen, collection, type_category, sub_category, page = 1, limit = 20,
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
    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.sku ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (availability) {
      // The UI may send a comma-separated list (multi-select) — match any of them.
      const avails = String(availability).split(",").map((s) => s.trim()).filter(Boolean);
      conditions.push(`p.availability = ANY($${idx++})`);
      params.push(avails);
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
    // Unseen = active products this retailer has never viewed. Folded into the
    // main list so it inherits the same filters + pagination (no separate capped path).
    if (unseen === "true" && req.retailer?.id) {
      conditions.push(
        `NOT EXISTS (SELECT 1 FROM recently_viewed rv WHERE rv.product_id = p.id AND rv.retailer_id = $${idx++})`
      );
      params.push(req.retailer.id);
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

// ── GET /api/products/filter-options ───────────────
// Distinct type_category and sub_category values across active products,
// used to populate the catalog filter dropdowns.
router.get("/filter-options", authenticate, async (req, res, next) => {
  try {
    const [types, subs, avails] = await Promise.all([
      query(`SELECT DISTINCT type_category AS v FROM products
             WHERE is_active = true AND type_category IS NOT NULL AND type_category <> ''
             ORDER BY type_category`),
      query(`SELECT DISTINCT sub_category AS v FROM products
             WHERE is_active = true AND sub_category IS NOT NULL AND sub_category <> ''
             ORDER BY sub_category`),
      query(`SELECT DISTINCT availability AS v FROM products
             WHERE is_active = true AND availability IS NOT NULL AND availability <> ''
             ORDER BY availability`),
    ]);
    res.json({
      types: types.rows.map((r) => r.v),
      subCategories: subs.rows.map((r) => r.v),
      availabilities: avails.rows.map((r) => r.v),
    });
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
    const [tot, nw, rv, wl, un] = await Promise.all([
      query("SELECT COUNT(*)::int AS c FROM products WHERE is_active = true"),
      query("SELECT COUNT(*)::int AS c FROM products WHERE is_active = true AND is_new = true"),
      rid ? query("SELECT COUNT(*)::int AS c FROM recently_viewed WHERE retailer_id = $1", [rid]) : zero,
      rid ? query("SELECT COUNT(*)::int AS c FROM wishlists WHERE retailer_id = $1", [rid]) : zero,
      // Unseen = active products the retailer has never viewed. Pure COUNT(*), no row fetch.
      rid
        ? query(
            `SELECT COUNT(*)::int AS c FROM products p
             WHERE p.is_active = true
               AND NOT EXISTS (SELECT 1 FROM recently_viewed rv WHERE rv.product_id = p.id AND rv.retailer_id = $1)`,
            [rid]
          )
        : query("SELECT COUNT(*)::int AS c FROM products WHERE is_active = true"),
    ]);
    res.json({
      total: tot.rows[0].c,
      newArrivals: nw.rows[0].c,
      recentlyViewed: Math.min(rv.rows[0].c, 20), // the recently-viewed list is capped at 20
      wishlist: wl.rows[0].c,
      unseen: un.rows[0].c,
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

// ── GET /api/products/unseen ───────────────────────
// Active products the retailer has NOT recently viewed (inverse of recently-viewed).
router.get("/unseen", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.id, p.name, p.sku, p.base_price, p.carat, p.metal_type, p.metal_weight,
              p.gross_weight, p.net_weight, p.availability, p.is_new,
              p.diamond_shape, p.diamond_size, p.diamond_pcs, p.diamond_color, p.diamond_clarity,
              p.color_stone_name, p.color_stone_quality, p.color_stone_carat, p.color_stone_pcs,
              c.name AS category,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = true
         AND NOT EXISTS (SELECT 1 FROM recently_viewed rv WHERE rv.product_id = p.id AND rv.retailer_id = $1)
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT 200`,
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

    // Matching variants = companion pieces of the SAME jewellery SET.
    //
    // SKU format is [2-digit piece/category code][6-digit design serial], e.g.
    //   11 250021 → PENDENT SET PENDENT   (the pendant piece)
    //   12 250021 → PENDENT SET EARRING   (the earring piece) ← variant of the above
    //   02 250021 → PENDENT (standalone)  ← NOT a variant, just reuses the serial
    //
    // So variants CANNOT be matched by SKU digits alone: many unrelated products
    // (e.g. a ring 01240057 and a bangle 04240057) share a design serial by
    // coincidence. A product only has variants when it belongs to a SET category
    // ("… SET …"); its variants are the OTHER pieces of the same set family
    // ("PENDENT SET", "NECKLACE SET") that carry the same 6-digit design serial.
    // Matching is driven off the category name (not the SKU prefix), so it's
    // robust to prefix/category data-entry mismatches.
    let variants = [];
    {
      const { rows: vRows } = await query(
        `WITH me AS (
           SELECT p.id,
                  SUBSTRING(p.sku FROM 3)               AS serial,
                  SUBSTRING(UPPER(c.name) FROM '^(.*SET)') AS set_family
           FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
           WHERE p.id = $1 AND LENGTH(p.sku) = 8
         )
         SELECT p.id, p.sku, p.name, p.metal_type, p.gold_colour, c.name AS category,
                (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image
         FROM products p
         JOIN categories c ON c.id = p.category_id
         CROSS JOIN me
         WHERE p.is_active = true
           AND p.id <> me.id
           AND me.set_family IS NOT NULL
           AND LENGTH(p.sku) = 8
           AND SUBSTRING(UPPER(c.name) FROM '^(.*SET)') = me.set_family
           AND SUBSTRING(p.sku FROM 3) = me.serial
         ORDER BY p.sku`,
        [req.params.id]
      );
      variants = vRows;
    }

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

    // When the gold (metal) rate for this retailer's country was last updated —
    // shown as the "Spot Price ... hrs (IST)" timestamp on the product page.
    const { rows: goldMeta } = await query(
      "SELECT MAX(updated_at) AS updated_at FROM metal_rates WHERE country = $1",
      [priced.country || "India"]
    );

    res.json({
      ...rows[0],
      price: priced.price,
      price_source: priced.source,
      price_breakdown: priced.breakdown,
      images,
      diamonds,
      stones,
      variants,
      country: priced.country || "India",
      // The gold rate actually used in the price (per the retailer's country),
      // falling back to the legacy gold_prices table only if unavailable.
      goldPricePerGram: priced.breakdown?.detail?.gold?.rate_per_gram
        ?? (goldPrice.length > 0 ? parseFloat(goldPrice[0].price_per_gram) : null),
      goldPriceUpdatedAt: goldMeta[0]?.updated_at || null,
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
