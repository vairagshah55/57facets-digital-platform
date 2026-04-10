const router = require("express").Router();
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const AppError = require("../utils/AppError");
const auditLog = require("../utils/auditLog");

router.use(authenticate);

// ── GET /api/wishlist ──────────────────────────────
// Get all wishlist items
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT w.id AS wishlist_id, w.created_at AS added_at,
              p.id, p.name, p.sku, p.base_price, p.carat, p.availability,
              c.name AS category,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE w.retailer_id = $1
       ORDER BY w.created_at DESC`,
      [req.retailer.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/wishlist ─────────────────────────────
// Add product to wishlist
router.post("/", async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) throw new AppError("productId is required");

    const { rows } = await query(
      `INSERT INTO wishlists (retailer_id, product_id) VALUES ($1, $2)
       ON CONFLICT (retailer_id, product_id) DO NOTHING
       RETURNING id`,
      [req.retailer.id, productId]
    );

    if (rows.length > 0) {
      auditLog({ actorType: "retailer", actorId: req.retailer.id, action: "wishlist.added", entityType: "product", entityId: productId });
    }
    res.status(201).json({ added: rows.length > 0, wishlistId: rows[0]?.id });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/wishlist/:productId ────────────────
router.delete("/:productId", async (req, res, next) => {
  try {
    await query(
      "DELETE FROM wishlists WHERE retailer_id = $1 AND product_id = $2",
      [req.retailer.id, req.params.productId]
    );
    auditLog({ actorType: "retailer", actorId: req.retailer.id, action: "wishlist.removed", entityType: "product", entityId: req.params.productId });
    res.json({ removed: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/wishlist/bulk ────────────────────────
// Add multiple products
router.post("/bulk", async (req, res, next) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new AppError("productIds array is required");
    }

    for (const pid of productIds) {
      await query(
        `INSERT INTO wishlists (retailer_id, product_id) VALUES ($1, $2)
         ON CONFLICT (retailer_id, product_id) DO NOTHING`,
        [req.retailer.id, pid]
      );
    }

    res.status(201).json({ added: productIds.length });
  } catch (err) {
    next(err);
  }
});

// ═══ FOLDERS ═══════════════════════════════════════

// ── GET /api/wishlist/folders ──────────────────────
router.get("/folders", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT wf.id, wf.name, wf.color,
              COALESCE(
                (SELECT json_agg(w.product_id)
                 FROM wishlist_folder_items fi
                 JOIN wishlists w ON w.id = fi.wishlist_id
                 WHERE fi.folder_id = wf.id),
                '[]'::json
              ) AS "productIds"
       FROM wishlist_folders wf
       WHERE wf.retailer_id = $1
       ORDER BY wf.created_at`,
      [req.retailer.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/wishlist/folders ─────────────────────
router.post("/folders", async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name) throw new AppError("Folder name is required");

    const { rows } = await query(
      "INSERT INTO wishlist_folders (retailer_id, name, color) VALUES ($1, $2, $3) RETURNING *",
      [req.retailer.id, name, color || "#30B8BF"]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/wishlist/folders/:id ──────────────────
router.put("/folders/:id", async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const { rows } = await query(
      `UPDATE wishlist_folders SET name = COALESCE($1, name), color = COALESCE($2, color)
       WHERE id = $3 AND retailer_id = $4 RETURNING *`,
      [name, color, req.params.id, req.retailer.id]
    );
    if (rows.length === 0) throw new AppError("Folder not found", 404);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/wishlist/folders/:id ────────────────
router.delete("/folders/:id", async (req, res, next) => {
  try {
    await query(
      "DELETE FROM wishlist_folders WHERE id = $1 AND retailer_id = $2",
      [req.params.id, req.retailer.id]
    );
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/wishlist/folders/:id/items ───────────
// Move wishlist items to folder
router.post("/folders/:id/items", async (req, res, next) => {
  try {
    const { wishlistIds } = req.body;
    if (!Array.isArray(wishlistIds)) throw new AppError("wishlistIds array required");

    for (const wid of wishlistIds) {
      await query(
        "INSERT INTO wishlist_folder_items (folder_id, wishlist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [req.params.id, wid]
      );
    }
    res.json({ moved: wishlistIds.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
