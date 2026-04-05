const router = require("express").Router();
const { query } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");

router.use(adminAuth);

// ── GET /api/admin/dashboard/stats ─────────────────
// Today's stats: active sessions, orders today, new retailers, pending OTPs
router.get("/stats", async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [ordersToday, newRetailers, pendingOtps, totalRetailers, totalProducts, totalOrders] =
      await Promise.all([
        query("SELECT COUNT(*) FROM orders WHERE created_at::date = $1", [today]),
        query("SELECT COUNT(*) FROM retailers WHERE created_at::date = $1", [today]),
        query("SELECT COUNT(*) FROM otps WHERE is_used = false AND expires_at > NOW()"),
        query("SELECT COUNT(*) FROM retailers WHERE is_active = true"),
        query("SELECT COUNT(*) FROM products WHERE is_active = true"),
        query("SELECT COUNT(*) FROM orders"),
      ]);

    res.json({
      ordersToday: parseInt(ordersToday.rows[0].count),
      newRetailersToday: parseInt(newRetailers.rows[0].count),
      pendingOtps: parseInt(pendingOtps.rows[0].count),
      totalRetailers: parseInt(totalRetailers.rows[0].count),
      totalProducts: parseInt(totalProducts.rows[0].count),
      totalOrders: parseInt(totalOrders.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/dashboard/quick-access ──────────
// Pending orders, OTP queue, low stock, shortlist activity
router.get("/quick-access", async (req, res, next) => {
  try {
    const [pendingOrders, activeOrders, otpQueue, lowStock, shortlistActivity] = await Promise.all([
      query(
        `SELECT o.id, o.order_number, o.total, o.status, o.created_at, r.name AS retailer_name
         FROM orders o JOIN retailers r ON r.id = o.retailer_id
         WHERE o.status = 'pending'
         ORDER BY o.created_at DESC LIMIT 10`
      ),
      query(
        `SELECT o.id, o.order_number, o.total, o.status, o.created_at, o.updated_at, r.name AS retailer_name
         FROM orders o JOIN retailers r ON r.id = o.retailer_id
         WHERE o.status IN ('processing', 'shipped')
         ORDER BY o.updated_at DESC LIMIT 10`
      ),
      query(
        `SELECT o.phone, o.otp_code, o.expires_at, o.created_at, r.name AS retailer_name
         FROM otps o
         LEFT JOIN retailers r ON r.phone = o.phone
         WHERE o.is_used = false AND o.expires_at > NOW()
         ORDER BY o.created_at DESC LIMIT 10`
      ),
      query(
        `SELECT p.id, p.name, p.sku, p.availability, c.name AS category
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.availability = 'out-of-stock' AND p.is_active = true
         ORDER BY p.updated_at DESC LIMIT 10`
      ),
      query(
        `SELECT p.name AS product_name, r.name AS retailer_name, w.created_at
         FROM wishlists w
         JOIN products p ON p.id = w.product_id
         JOIN retailers r ON r.id = w.retailer_id
         ORDER BY w.created_at DESC LIMIT 10`
      ),
    ]);

    res.json({
      pendingOrders: pendingOrders.rows,
      activeOrders: activeOrders.rows,
      otpQueue: otpQueue.rows,
      lowStock: lowStock.rows,
      shortlistActivity: shortlistActivity.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/dashboard/activity ──────────────
// Recent activity feed
router.get("/activity", async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const { rows } = await query(
      `SELECT al.id, al.actor_type, al.action, al.entity_type, al.details, al.created_at,
              CASE
                WHEN al.actor_type = 'admin' THEN (SELECT name FROM admins WHERE id = al.actor_id)
                WHEN al.actor_type = 'retailer' THEN (SELECT name FROM retailers WHERE id = al.actor_id)
                ELSE 'System'
              END AS actor_name
       FROM activity_log al
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/dashboard/charts/orders ─────────
// Orders over last 30 days
router.get("/charts/orders", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT d::date AS date, COALESCE(cnt, 0) AS count
       FROM generate_series(
         CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day'
       ) AS d
       LEFT JOIN (
         SELECT created_at::date AS day, COUNT(*) AS cnt
         FROM orders
         WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
         GROUP BY day
       ) o ON o.day = d::date
       ORDER BY d`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/dashboard/charts/top-products ───
// Most viewed products (from recently_viewed)
router.get("/charts/top-products", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.id, p.name, p.sku, COUNT(rv.id) AS view_count
       FROM recently_viewed rv
       JOIN products p ON p.id = rv.product_id
       GROUP BY p.id, p.name, p.sku
       ORDER BY view_count DESC
       LIMIT 10`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/dashboard/charts/top-retailers ──
// Most active retailers (by orders)
router.get("/charts/top-retailers", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT r.id, r.name, r.company_name, COUNT(o.id) AS order_count, SUM(o.total) AS total_spent
       FROM retailers r
       JOIN orders o ON o.retailer_id = r.id
       GROUP BY r.id, r.name, r.company_name
       ORDER BY order_count DESC
       LIMIT 10`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
