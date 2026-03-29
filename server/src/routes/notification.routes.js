const router = require("express").Router();
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// ── GET /api/notifications ─────────────────────────
// Get all notifications for current retailer
router.get("/", async (req, res, next) => {
  try {
    const { unread_only } = req.query;
    const conditions = ["retailer_id = $1"];
    const params = [req.retailer.id];

    if (unread_only === "true") {
      conditions.push("is_read = false");
    }

    const { rows } = await query(
      `SELECT id, type, title, message, is_read, action_path, created_at
       FROM notifications
       WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT 50`,
      params
    );

    const { rows: countRows } = await query(
      "SELECT COUNT(*) FROM notifications WHERE retailer_id = $1 AND is_read = false",
      [req.retailer.id]
    );

    res.json({
      notifications: rows,
      unreadCount: parseInt(countRows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/notifications/:id/read ────────────────
// Mark single notification as read
router.put("/:id/read", async (req, res, next) => {
  try {
    await query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND retailer_id = $2",
      [req.params.id, req.retailer.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/notifications/read-all ────────────────
// Mark all as read
router.put("/read-all", async (req, res, next) => {
  try {
    await query(
      "UPDATE notifications SET is_read = true WHERE retailer_id = $1 AND is_read = false",
      [req.retailer.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
