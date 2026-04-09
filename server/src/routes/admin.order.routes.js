const router = require("express").Router();
const { query, getClient } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");
const AppError = require("../utils/AppError");

router.use(adminAuth);

const VALID_TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const STATUS_LABELS = {
  processing: "Order Accepted & Processing",
  shipped: "Order Shipped",
  delivered: "Order Delivered",
  cancelled: "Order Cancelled",
};

const STATUS_MESSAGES = {
  processing: "Your order has been accepted and is now being processed. We'll notify you once it ships.",
  shipped: "Your order has been shipped and is on its way to you.",
  delivered: "Your order has been delivered. Thank you for your purchase!",
  cancelled: "Your order has been cancelled.",
};

// ── GET /api/admin/orders ─────────────────────────
// List all orders with filters
router.get("/", async (req, res, next) => {
  try {
    const { status, search, retailer_id, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`o.status = $${idx++}`);
      params.push(status);
    }
    if (retailer_id) {
      conditions.push(`o.retailer_id = $${idx++}`);
      params.push(retailer_id);
    }
    if (search) {
      conditions.push(`(o.order_number ILIKE $${idx} OR r.name ILIKE $${idx} OR r.business_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows } = await query(
      `SELECT o.id, o.order_number, o.status, o.total, o.note, o.created_at, o.updated_at,
              r.name AS retailer_name, r.business_name AS retailer_company, r.phone AS retailer_phone,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       LEFT JOIN retailers r ON r.id = o.retailer_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM orders o LEFT JOIN retailers r ON r.id = o.retailer_id ${where}`,
      params
    );

    const { rows: summary } = await query(
      "SELECT status, COUNT(*) AS count FROM orders GROUP BY status"
    );

    res.json({
      orders: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countRows[0].count) / parseInt(limit)),
      summary: summary.reduce((acc, s) => { acc[s.status] = parseInt(s.count); return acc; }, {}),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/orders/:id ─────────────────────
// Full order detail
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT o.*, r.name AS retailer_name, r.business_name AS retailer_company,
              r.phone AS retailer_phone, r.email AS retailer_email
       FROM orders o
       LEFT JOIN retailers r ON r.id = o.retailer_id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) throw new AppError("Order not found", 404);

    // edit_logs count
    const { rows: logCount } = await query(
      "SELECT COUNT(*) FROM order_edit_logs WHERE order_id = $1",
      [req.params.id]
    );

    const { rows: items } = await query(
      `SELECT oi.*, p.name, p.sku,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image,
              c.name AS category
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [req.params.id]
    );

    const { rows: tracking } = await query(
      "SELECT status, detail, created_at FROM order_tracking WHERE order_id = $1 ORDER BY created_at",
      [req.params.id]
    );

    res.json({ ...rows[0], items, tracking, edit_logs_count: parseInt(logCount[0].count) });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/orders/:id/allow-edit ──────────
// Grant retailer permission to edit this order
router.put("/:id/allow-edit", async (req, res, next) => {
  const client = await getClient();
  try {
    const { note } = req.body;

    await client.query("BEGIN");

    const { rows } = await client.query("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [req.params.id]);
    if (!rows.length) throw new AppError("Order not found", 404);
    const order = rows[0];

    await client.query(
      `UPDATE orders SET edit_allowed = true, edit_allowed_at = NOW(),
       edit_allowed_by = $1, edit_note = $2 WHERE id = $3`,
      [req.admin.id, note || null, req.params.id]
    );

    // Notify retailer
    const msg = `You can now edit order ${order.order_number}. Open your orders to review and update.${note ? ` Admin note: ${note}` : ""}`;
    await client.query(
      `INSERT INTO notifications (retailer_id, type, title, message, action_path)
       VALUES ($1, 'order-update', 'Order Edit Available', $2, '/retailer/orders')`,
      [order.retailer_id, msg]
    );

    await client.query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'order_edit_allowed', 'order', $2, $3)`,
      [req.admin.id, req.params.id, JSON.stringify({ order_number: order.order_number, note })]
    );

    await client.query("COMMIT");
    res.json({ message: "Edit permission granted" });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ── DELETE /api/admin/orders/:id/allow-edit ───────
// Revoke retailer edit permission
router.delete("/:id/allow-edit", async (req, res, next) => {
  try {
    await query(
      "UPDATE orders SET edit_allowed = false, edit_note = null WHERE id = $1",
      [req.params.id]
    );
    res.json({ message: "Edit permission revoked" });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/orders/:id/edit-logs ───────────
// Full audit trail of retailer edits for an order
router.get("/:id/edit-logs", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT el.*, r.name AS retailer_name
       FROM order_edit_logs el
       LEFT JOIN retailers r ON r.id = el.retailer_id
       WHERE el.order_id = $1 ORDER BY el.edited_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/orders/:id/status ──────────────
// Update order status
router.put("/:id/status", async (req, res, next) => {
  const client = await getClient();
  try {
    const { status, detail } = req.body;
    if (!status) throw new AppError("Status is required");

    // Fetch current order
    const { rows } = await client.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
    if (rows.length === 0) throw new AppError("Order not found", 404);
    const order = rows[0];

    // Validate transition
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(`Cannot change status from '${order.status}' to '${status}'`);
    }

    await client.query("BEGIN");

    // Update order status
    await client.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, req.params.id]
    );

    // Create tracking entry
    const trackingLabel = STATUS_LABELS[status] || status;
    await client.query(
      "INSERT INTO order_tracking (order_id, status, detail) VALUES ($1, $2, $3)",
      [req.params.id, trackingLabel, detail || null]
    );

    // Notify retailer
    const notifMsg = `${order.order_number}: ${STATUS_MESSAGES[status] || `Status updated to ${status}`}${detail ? ` — ${detail}` : ""}`;
    await client.query(
      `INSERT INTO notifications (retailer_id, type, title, message, action_path)
       VALUES ($1, 'order-update', $2, $3, '/retailer/orders')`,
      [order.retailer_id, trackingLabel, notifMsg]
    );

    // Log activity
    await client.query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'order_status_updated', 'order', $2, $3)`,
      [req.admin.id, req.params.id, JSON.stringify({ from: order.status, to: status, detail })]
    );

    await client.query("COMMIT");

    // Return updated order
    const { rows: updated } = await query(
      `SELECT o.*, r.name AS retailer_name, r.business_name AS retailer_company
       FROM orders o LEFT JOIN retailers r ON r.id = o.retailer_id
       WHERE o.id = $1`,
      [req.params.id]
    );

    res.json(updated[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
