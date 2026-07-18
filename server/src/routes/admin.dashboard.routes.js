const router = require("express").Router();
const { query } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");

router.use(adminAuth);

// ── GET /api/admin/dashboard/stats ─────────────────
// Today's stats: active sessions, orders today, new retailers, pending OTPs
router.get("/stats", async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [ordersToday, newRetailers, totalRetailers, totalProducts, totalOrders] =
      await Promise.all([
        query("SELECT COUNT(*) FROM orders WHERE created_at::date = $1", [today]),
        query("SELECT COUNT(*) FROM retailers WHERE created_at::date = $1", [today]),
        query("SELECT COUNT(*) FROM retailers WHERE is_active = true"),
        query("SELECT COUNT(*) FROM products WHERE is_active = true"),
        query("SELECT COUNT(*) FROM orders"),
      ]);

    res.json({
      ordersToday: parseInt(ordersToday.rows[0].count),
      newRetailersToday: parseInt(newRetailers.rows[0].count),
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
    const [pendingOrders, activeOrders, lowStock, shortlistActivity] = await Promise.all([
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
      lowStock: lowStock.rows,
      shortlistActivity: shortlistActivity.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/dashboard/activity ──────────────
// Recent activity feed — the main actions taken by retailers.
// Recent logins and recent orders are fetched SEPARATELY then merged, so a
// burst of orders can't push logins out of the feed (both are always shown).
router.get("/activity", async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const n = parseInt(limit) || 20;
    const loginLimit = Math.ceil(n / 2);
    const orderLimit = Math.floor(n / 2);

    const { rows } = await query(
      `SELECT * FROM (
         (SELECT al.id, al.actor_type, al.action, al.entity_type, al.details, al.created_at,
                 (SELECT name FROM retailers WHERE id = al.actor_id) AS actor_name
          FROM activity_log al
          WHERE al.actor_type = 'retailer' AND al.action = 'login'
          ORDER BY al.created_at DESC LIMIT $1)
         UNION ALL
         (SELECT al.id, al.actor_type, al.action, al.entity_type, al.details, al.created_at,
                 (SELECT name FROM retailers WHERE id = al.actor_id) AS actor_name
          FROM activity_log al
          WHERE al.actor_type = 'retailer' AND al.action IN ('order.placed', 'order.cancelled')
          ORDER BY al.created_at DESC LIMIT $2)
       ) combined
       ORDER BY created_at DESC`,
      [loginLimit, orderLimit]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/dashboard/charts/category-breakdown ───
// Platform-wide category-wise buying (total pieces per category, optional time filter)
router.get("/charts/category-breakdown", async (req, res, next) => {
  try {
    const categoryPeriod = req.query.categoryPeriod; // "1d","3m","6m","1y","all"
    let dateFilter = "";
    if (categoryPeriod === "1d") dateFilter = "AND o.created_at >= NOW() - INTERVAL '1 day'";
    else if (categoryPeriod === "3m") dateFilter = "AND o.created_at >= NOW() - INTERVAL '3 months'";
    else if (categoryPeriod === "6m") dateFilter = "AND o.created_at >= NOW() - INTERVAL '6 months'";
    else if (categoryPeriod === "1y") dateFilter = "AND o.created_at >= NOW() - INTERVAL '1 year'";
    // "all" or missing = no date filter

    const { rows } = await query(
      `SELECT COALESCE(c.name, 'Other') AS category,
              SUM(oi.quantity) AS quantity
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE o.status != 'cancelled'
       ${dateFilter}
       GROUP BY c.name
       ORDER BY quantity DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/dashboard/charts/monthly-trends ───
// Platform-wide monthly buying trends (period: 3m/6m/1y/all, default 6m)
router.get("/charts/monthly-trends", async (req, res, next) => {
  try {
    const period = req.query.period; // "3m","6m","1y","all"
    let dateFilter = "AND o.created_at >= NOW() - INTERVAL '6 months'"; // default 6m
    if (period === "3m") dateFilter = "AND o.created_at >= NOW() - INTERVAL '3 months'";
    else if (period === "1y") dateFilter = "AND o.created_at >= NOW() - INTERVAL '1 year'";
    else if (period === "all") dateFilter = "";

    const { rows } = await query(
      `SELECT TO_CHAR(o.created_at, 'YYYY-MM') AS month,
              COUNT(DISTINCT o.id) AS orders,
              COALESCE(SUM(o.total), 0) AS value,
              COALESCE(SUM(oi.quantity), 0) AS pcs
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.status != 'cancelled'
         ${dateFilter}
       GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
       ORDER BY month ASC`
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

// ── GET /api/admin/dashboard/notifications ────────
router.get("/notifications", async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50"
    );
    const { rows: countRows } = await query(
      "SELECT COUNT(*) FROM admin_notifications WHERE is_read = false"
    );
    res.json({ notifications: rows, unreadCount: parseInt(countRows[0].count) });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/dashboard/notifications/:id/read
router.put("/notifications/:id/read", async (req, res, next) => {
  try {
    await query("UPDATE admin_notifications SET is_read = true WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/dashboard/notifications/read-all
router.put("/notifications/read-all", async (req, res, next) => {
  try {
    await query("UPDATE admin_notifications SET is_read = true WHERE is_read = false");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
