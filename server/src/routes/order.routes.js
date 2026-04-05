const router = require("express").Router();
const { query, getClient } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const AppError = require("../utils/AppError");

router.use(authenticate);

// ── GET /api/orders ────────────────────────────────
// List orders with optional status filter
router.get("/", async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const conditions = ["o.retailer_id = $1"];
    const params = [req.retailer.id];
    let idx = 2;

    if (status) {
      conditions.push(`o.status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(o.order_number ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = `WHERE ${conditions.join(" AND ")}`;

    const { rows } = await query(
      `SELECT o.id, o.order_number, o.status, o.total, o.note, o.created_at,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    // Total count
    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM orders o ${where}`,
      params
    );

    // Status summary
    const { rows: summary } = await query(
      `SELECT status, COUNT(*) AS count FROM orders WHERE retailer_id = $1 GROUP BY status`,
      [req.retailer.id]
    );

    res.json({
      orders: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      summary: summary.reduce((acc, s) => { acc[s.status] = parseInt(s.count); return acc; }, {}),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders/:id ────────────────────────────
// Order detail with items + tracking
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT * FROM orders WHERE id = $1 AND retailer_id = $2",
      [req.params.id, req.retailer.id]
    );
    if (rows.length === 0) throw new AppError("Order not found", 404);

    // Items
    const { rows: items } = await query(
      `SELECT oi.*, p.name, p.sku,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image,
              c.name AS category
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE oi.order_id = $1`,
      [req.params.id]
    );

    // Tracking
    const { rows: tracking } = await query(
      "SELECT status, detail, created_at FROM order_tracking WHERE order_id = $1 ORDER BY created_at",
      [req.params.id]
    );

    res.json({ ...rows[0], items, tracking });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/orders ───────────────────────────────
// Place a new order request
router.post("/", async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const { items, note } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("Order must have at least one item");
    }

    // Generate order number
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    // Validate all products exist and calculate total from unitPrice sent by client
    // unitPrice is the dynamically calculated price (gold rate + carat + making charges)
    let total = 0;
    for (const item of items) {
      const { rows: products } = await client.query(
        "SELECT id FROM products WHERE id = $1",
        [item.productId]
      );
      if (products.length === 0) throw new AppError(`Product ${item.productId} not found`);
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const qty = parseInt(item.quantity) || 1;
      total += unitPrice * qty;
    }

    // Create order
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (order_number, retailer_id, total, note)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [orderNumber, req.retailer.id, total, note || null]
    );
    const order = orderRows[0];

    // Create order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, carat, metal_type,
         gold_colour, diamond_shape, diamond_shade, diamond_quality, color_stone_name, color_stone_quality, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [order.id, item.productId, item.quantity || 1, item.unitPrice || 0,
         item.carat || null, item.metalType || null,
         item.goldColour || null, item.diamondShape || null, item.diamondShade || null,
         item.diamondQuality || null, item.colorStoneName || null, item.colorStoneQuality || null,
         item.note || null]
      );
    }

    // Initial tracking entry
    await client.query(
      `INSERT INTO order_tracking (order_id, status, detail)
       VALUES ($1, 'Order Placed', 'Your order has been received')`,
      [order.id]
    );

    // Notify retailer
    await client.query(
      `INSERT INTO notifications (retailer_id, type, title, message, action_path)
       VALUES ($1, 'order-update', 'Order Placed', $2, '/retailer/orders')`,
      [req.retailer.id, `${orderNumber} has been submitted for review`]
    );

    // Notify admin
    await client.query(
      `INSERT INTO admin_notifications (type, title, message, action_path)
       VALUES ('order', $1, $2, '/admin/orders')`,
      [`New Order: ${orderNumber}`, `${req.retailer.name || "A retailer"} placed order ${orderNumber} — ${items.length} item(s), total ₹${total.toLocaleString("en-IN")}`]
    );

    await client.query("COMMIT");
    res.status(201).json(order);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/orders/check-product/:productId ──────
// Check if retailer has an active order for this product
router.get("/check-product/:productId", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT o.id, o.order_number, o.status, o.created_at
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.retailer_id = $1 AND oi.product_id = $2
         AND o.status NOT IN ('delivered', 'cancelled')
       ORDER BY o.created_at DESC LIMIT 1`,
      [req.retailer.id, req.params.productId]
    );
    res.json({ hasActiveOrder: rows.length > 0, order: rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders/summary/stats ──────────────────
// Dashboard summary
router.get("/summary/stats", async (req, res, next) => {
  try {
    const { rows: totals } = await query(
      `SELECT COUNT(*) AS total_orders,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS completed,
              SUM(total) AS total_spent
       FROM orders WHERE retailer_id = $1`,
      [req.retailer.id]
    );

    const { rows: lastOrder } = await query(
      `SELECT order_number, status, total, created_at,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
       FROM orders o WHERE retailer_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.retailer.id]
    );

    res.json({
      summary: totals[0],
      lastOrder: lastOrder[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
