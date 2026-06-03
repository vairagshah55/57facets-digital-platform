const router = require("express").Router();
const { query } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");
const AppError = require("../utils/AppError");

router.use(adminAuth);

const ALLOWED_TAGS = ["seasonal", "themed", "bridal", "new-launch", "festive"];

// Replace the product links for a collection with the given ordered ids.
async function setCollectionProducts(collectionId, productIds) {
  await query("DELETE FROM collection_products WHERE collection_id = $1", [collectionId]);
  if (!Array.isArray(productIds)) return;
  let order = 0;
  for (const productId of productIds) {
    if (!productId) continue;
    await query(
      `INSERT INTO collection_products (collection_id, product_id, sort_order)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [collectionId, productId, order++]
    );
  }
}

// ── GET /api/admin/collections ─────────────────────
// List all collections (active + inactive) with product counts
router.get("/", async (req, res, next) => {
  try {
    const { search, tag } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(c.name ILIKE $${idx} OR c.tagline ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (tag) {
      conditions.push(`c.tag = $${idx++}`);
      params.push(tag);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT c.id, c.name, c.tagline, c.description, c.tag, c.cover_image,
              c.launch_date, c.is_active, c.created_at,
              (SELECT COUNT(*) FROM collection_products cp WHERE cp.collection_id = c.id) AS product_count
       FROM collections c
       ${where}
       ORDER BY c.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/collections/:id ─────────────────
// Collection detail with its products (for editing)
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM collections WHERE id = $1", [req.params.id]);
    if (rows.length === 0) throw new AppError("Collection not found", 404);

    const { rows: products } = await query(
      `SELECT p.id, p.name, p.sku, p.base_price, p.availability,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image
       FROM collection_products cp
       JOIN products p ON p.id = cp.product_id
       WHERE cp.collection_id = $1
       ORDER BY cp.sort_order`,
      [req.params.id]
    );

    res.json({ ...rows[0], products, product_ids: products.map((p) => p.id) });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/collections ────────────────────
// Create a collection (optionally linking products)
router.post("/", async (req, res, next) => {
  try {
    const { name, tagline, description, tag, cover_image, launch_date, product_ids } = req.body;

    if (!name || !name.trim()) throw new AppError("Collection name is required");
    const tagValue = tag || "themed";
    if (!ALLOWED_TAGS.includes(tagValue)) {
      throw new AppError(`Tag must be one of: ${ALLOWED_TAGS.join(", ")}`);
    }

    const { rows } = await query(
      `INSERT INTO collections (name, tagline, description, tag, cover_image, launch_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        name.trim(),
        tagline || null,
        description || null,
        tagValue,
        cover_image || null,
        launch_date || null,
      ]
    );
    const collection = rows[0];

    await setCollectionProducts(collection.id, product_ids);

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'collection_created', 'collection', $2, $3)`,
      [req.admin.id, collection.id, JSON.stringify({ name: collection.name, tag: tagValue })]
    );

    // Notify active retailers about the new collection (non-fatal)
    try {
      const { rows: retailers } = await query("SELECT id FROM retailers WHERE is_active = true");
      if (retailers.length > 0) {
        await query(
          `INSERT INTO notifications (retailer_id, type, title, message, action_path) VALUES ${retailers
            .map((_, i) => `($${i * 4 + 1},'new-collection',$${i * 4 + 2},$${i * 4 + 3},$${i * 4 + 4})`)
            .join(",")}`,
          retailers.flatMap((r) => [
            r.id,
            "New Collection",
            `The "${collection.name}" collection is now available. Take a look!`,
            `/retailer/collections/${collection.id}`,
          ])
        );
      }
    } catch (notifyErr) {
      console.error("[admin.collections] notify failed:", notifyErr.message);
    }

    res.status(201).json(collection);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/collections/:id ─────────────────
// Update a collection and (if provided) its product links
router.put("/:id", async (req, res, next) => {
  try {
    const { name, tagline, description, tag, cover_image, launch_date, is_active, product_ids } = req.body;

    const { rows: existing } = await query("SELECT id FROM collections WHERE id = $1", [req.params.id]);
    if (existing.length === 0) throw new AppError("Collection not found", 404);

    if (tag && !ALLOWED_TAGS.includes(tag)) {
      throw new AppError(`Tag must be one of: ${ALLOWED_TAGS.join(", ")}`);
    }

    const { rows } = await query(
      `UPDATE collections SET
         name = COALESCE($1, name),
         tagline = $2,
         description = $3,
         tag = COALESCE($4, tag),
         cover_image = $5,
         launch_date = $6,
         is_active = COALESCE($7, is_active),
         updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [
        name ? name.trim() : null,
        tagline ?? null,
        description ?? null,
        tag || null,
        cover_image ?? null,
        launch_date || null,
        typeof is_active === "boolean" ? is_active : null,
        req.params.id,
      ]
    );

    if (Array.isArray(product_ids)) {
      await setCollectionProducts(req.params.id, product_ids);
    }

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'collection_updated', 'collection', $2, $3)`,
      [req.admin.id, req.params.id, JSON.stringify({ name: rows[0].name })]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/collections/:id ──────────────
// Soft-delete (deactivate) a collection
router.delete("/:id", async (req, res, next) => {
  try {
    const { rows } = await query(
      "UPDATE collections SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, name",
      [req.params.id]
    );
    if (rows.length === 0) throw new AppError("Collection not found", 404);

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'collection_deleted', 'collection', $2, $3)`,
      [req.admin.id, req.params.id, JSON.stringify({ name: rows[0].name })]
    );

    res.json({ message: "Collection deactivated", id: rows[0].id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
