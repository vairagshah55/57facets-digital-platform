const router = require("express").Router();
const { query, getClient } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");
const AppError = require("../utils/AppError");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.use(adminAuth);

// ── GET /api/admin/retailers ───────────────────────
// List all retailers with filters
router.get("/", async (req, res, next) => {
  try {
    const { search, tier, is_active, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(r.name ILIKE $${idx} OR r.phone ILIKE $${idx} OR r.email ILIKE $${idx} OR r.company_name ILIKE $${idx} OR r.business_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (tier) {
      conditions.push(`r.tier = $${idx++}`);
      params.push(tier);
    }
    if (is_active !== undefined) {
      conditions.push(`r.is_active = $${idx++}`);
      params.push(is_active === "true");
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows } = await query(
      `SELECT r.id, r.name, r.phone, r.email, r.company_name, r.business_name,
              r.city, r.state, r.tier, r.is_active, r.first_login, r.last_active_at, r.created_at,
              (SELECT COUNT(*) FROM orders WHERE retailer_id = r.id) AS order_count,
              (SELECT COALESCE(SUM(total), 0) FROM orders WHERE retailer_id = r.id) AS total_spent,
              (SELECT COUNT(*) FROM wishlists WHERE retailer_id = r.id) AS wishlist_count
       FROM retailers r
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM retailers r ${where}`,
      params
    );

    res.json({
      retailers: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/retailers ──────────────────────
// Create new retailer
router.post("/", async (req, res, next) => {
  try {
    const { name, phone, email, business_name, company_name, city, state, tier, address } = req.body;
    if (!name || !phone) throw new AppError("Name and phone are required");

    const { rows: existing } = await query("SELECT id FROM retailers WHERE phone = $1", [phone]);
    if (existing.length > 0) throw new AppError("Phone number already registered");

    const { rows } = await query(
      `INSERT INTO retailers (name, phone, email, business_name, company_name, city, state, tier, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, phone, email || null, business_name || null, company_name || null,
       city || null, state || null, tier || "standard", address || null]
    );

    // Log activity
    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'retailer_created', 'retailer', $2, $3)`,
      [req.admin.id, rows[0].id, JSON.stringify({ name, phone })]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/retailers/:id ───────────────────
// Retailer detail with full profile
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM retailers WHERE id = $1", [req.params.id]);
    if (rows.length === 0) throw new AppError("Retailer not found", 404);

    // Order history
    const { rows: orders } = await query(
      `SELECT id, order_number, status, total, created_at
       FROM orders WHERE retailer_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.params.id]
    );

    // Shortlist
    const { rows: wishlist } = await query(
      `SELECT p.id, p.name, p.sku, p.base_price, w.created_at AS added_at
       FROM wishlists w JOIN products p ON p.id = w.product_id
       WHERE w.retailer_id = $1 ORDER BY w.created_at DESC LIMIT 20`,
      [req.params.id]
    );

    // Login history (from activity log)
    const { rows: loginHistory } = await query(
      `SELECT created_at, details FROM activity_log
       WHERE actor_type = 'retailer' AND actor_id = $1 AND action = 'retailer_login'
       ORDER BY created_at DESC LIMIT 20`,
      [req.params.id]
    );

    // Recently viewed products
    const { rows: viewed } = await query(
      `SELECT p.id, p.name, p.sku, rv.viewed_at
       FROM recently_viewed rv JOIN products p ON p.id = rv.product_id
       WHERE rv.retailer_id = $1 ORDER BY rv.viewed_at DESC LIMIT 20`,
      [req.params.id]
    );

    // Active sessions
    const { rows: sessions } = await query(
      `SELECT id, created_at, expires_at FROM retailer_sessions
       WHERE retailer_id = $1 AND is_active = true AND expires_at > NOW()`,
      [req.params.id]
    );

    // Stats
    const { rows: stats } = await query(
      `SELECT
        (SELECT COUNT(*) FROM orders WHERE retailer_id = $1) AS total_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE retailer_id = $1) AS total_spent,
        (SELECT COUNT(*) FROM wishlists WHERE retailer_id = $1) AS wishlist_count,
        (SELECT COUNT(*) FROM recently_viewed WHERE retailer_id = $1) AS products_viewed`,
      [req.params.id]
    );

    res.json({
      ...rows[0],
      orders,
      wishlist,
      loginHistory,
      recentlyViewed: viewed,
      activeSessions: sessions,
      stats: stats[0],
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/retailers/:id ───────────────────
// Update retailer
router.put("/:id", async (req, res, next) => {
  try {
    const { name, email, business_name, company_name, city, state, tier, address } = req.body;
    const { rows } = await query(
      `UPDATE retailers SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        business_name = COALESCE($3, business_name),
        company_name = COALESCE($4, company_name),
        city = COALESCE($5, city),
        state = COALESCE($6, state),
        tier = COALESCE($7, tier),
        address = COALESCE($8, address),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [name, email, business_name, company_name, city, state, tier, address, req.params.id]
    );
    if (rows.length === 0) throw new AppError("Retailer not found", 404);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/retailers/:id/activate ──────────
router.put("/:id/activate", async (req, res, next) => {
  try {
    const { rows } = await query(
      "UPDATE retailers SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING id, is_active",
      [req.params.id]
    );
    if (rows.length === 0) throw new AppError("Retailer not found", 404);

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id)
       VALUES ('admin', $1, 'retailer_activated', 'retailer', $2)`,
      [req.admin.id, req.params.id]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/retailers/:id/deactivate ────────
router.put("/:id/deactivate", async (req, res, next) => {
  try {
    const { rows } = await query(
      "UPDATE retailers SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, is_active",
      [req.params.id]
    );
    if (rows.length === 0) throw new AppError("Retailer not found", 404);

    // Kill all active sessions
    await query(
      "UPDATE retailer_sessions SET is_active = false WHERE retailer_id = $1",
      [req.params.id]
    );

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id)
       VALUES ('admin', $1, 'retailer_deactivated', 'retailer', $2)`,
      [req.admin.id, req.params.id]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/retailers/:id/force-logout ─────
router.post("/:id/force-logout", async (req, res, next) => {
  try {
    const { rowCount } = await query(
      "UPDATE retailer_sessions SET is_active = false WHERE retailer_id = $1 AND is_active = true",
      [req.params.id]
    );

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'retailer_force_logout', 'retailer', $2, $3)`,
      [req.admin.id, req.params.id, JSON.stringify({ sessions_killed: rowCount })]
    );

    res.json({ success: true, sessionsKilled: rowCount });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/retailers/:id/notify ───────────
// Send manual notification to a retailer
router.post("/:id/notify", async (req, res, next) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) throw new AppError("Title and message are required");

    await query(
      `INSERT INTO notifications (retailer_id, type, title, message)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, type || "announcement", title, message]
    );

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'notification_sent', 'retailer', $2, $3)`,
      [req.admin.id, req.params.id, JSON.stringify({ title })]
    );

    res.json({ sent: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/retailers/notify-bulk ──────────
// Send notification to multiple retailers
router.post("/notify-bulk", async (req, res, next) => {
  try {
    const { retailerIds, title, message, type } = req.body;
    if (!Array.isArray(retailerIds) || !title || !message) {
      throw new AppError("retailerIds, title, and message are required");
    }

    for (const rid of retailerIds) {
      await query(
        `INSERT INTO notifications (retailer_id, type, title, message)
         VALUES ($1, $2, $3, $4)`,
        [rid, type || "announcement", title, message]
      );
    }

    res.json({ sent: retailerIds.length });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/retailers/import-csv ───────────
// Bulk import retailers from CSV
router.post("/import-csv", upload.single("file"), async (req, res, next) => {
  const client = await getClient();
  try {
    if (!req.file) throw new AppError("CSV file is required");

    const csv = req.file.buffer.toString("utf-8");
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new AppError("CSV must have a header row and at least one data row");

    // Parse header
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    const phoneIdx = headers.indexOf("phone");
    if (nameIdx === -1 || phoneIdx === -1) {
      throw new AppError("CSV must have 'name' and 'phone' columns");
    }

    const emailIdx = headers.indexOf("email");
    const businessIdx = headers.indexOf("business_name");
    const cityIdx = headers.indexOf("city");
    const stateIdx = headers.indexOf("state");
    const tierIdx = headers.indexOf("tier");

    await client.query("BEGIN");
    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const name = cols[nameIdx];
      const phone = cols[phoneIdx];
      if (!name || !phone) { skipped++; continue; }

      const { rowCount } = await client.query(
        `INSERT INTO retailers (name, phone, email, business_name, city, state, tier)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (phone) DO NOTHING`,
        [
          name,
          phone,
          emailIdx >= 0 ? cols[emailIdx] || null : null,
          businessIdx >= 0 ? cols[businessIdx] || null : null,
          cityIdx >= 0 ? cols[cityIdx] || null : null,
          stateIdx >= 0 ? cols[stateIdx] || null : null,
          tierIdx >= 0 ? cols[tierIdx] || "standard" : "standard",
        ]
      );
      if (rowCount > 0) imported++;
      else skipped++;
    }

    await client.query("COMMIT");

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, details)
       VALUES ('admin', $1, 'retailers_csv_import', $2)`,
      [req.admin.id, JSON.stringify({ imported, skipped })]
    );

    res.json({ imported, skipped, total: lines.length - 1 });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
