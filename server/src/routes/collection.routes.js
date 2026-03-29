const router = require("express").Router();
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const AppError = require("../utils/AppError");

// ── GET /api/collections ───────────────────────────
// List all active collections
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { tag, search } = req.query;
    const conditions = ["c.is_active = true"];
    const params = [];
    let idx = 1;

    if (tag) {
      conditions.push(`c.tag = $${idx++}`);
      params.push(tag);
    }
    if (search) {
      conditions.push(`(c.name ILIKE $${idx} OR c.tagline ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const { rows } = await query(
      `SELECT c.id, c.name, c.tagline, c.description, c.tag, c.cover_image, c.launch_date,
              (SELECT COUNT(*) FROM collection_products cp WHERE cp.collection_id = c.id) AS product_count
       FROM collections c
       ${where}
       ORDER BY c.launch_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/collections/:id ───────────────────────
// Collection detail with products
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT * FROM collections WHERE id = $1 AND is_active = true",
      [req.params.id]
    );
    if (rows.length === 0) {
      throw new AppError("Collection not found", 404);
    }

    const { rows: products } = await query(
      `SELECT p.id, p.name, p.sku, p.base_price, p.carat, p.availability,
              cat.name AS category,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image
       FROM collection_products cp
       JOIN products p ON p.id = cp.product_id
       LEFT JOIN categories cat ON cat.id = p.category_id
       WHERE cp.collection_id = $1
       ORDER BY cp.sort_order`,
      [req.params.id]
    );

    res.json({ ...rows[0], products });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
