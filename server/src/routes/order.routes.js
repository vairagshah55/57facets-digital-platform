const router = require("express").Router();
const { query, getClient } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const AppError = require("../utils/AppError");
const auditLog = require("../utils/auditLog");

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
              o.edit_allowed, o.edit_note,
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

// ── GET /api/orders/active-by-products ────────────
// Bulk check: returns active order (first) per productId for a list of ids
// Query param: ?ids=uuid1,uuid2,uuid3
// MUST be registered before /:id to avoid Express matching "active-by-products" as an id
router.get("/active-by-products", async (req, res, next) => {
  try {
    const ids = (req.query.ids || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return res.json({});

    const { rows } = await query(
      `SELECT DISTINCT ON (oi.product_id)
              oi.product_id, o.order_number, o.status
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.retailer_id = $1
         AND oi.product_id = ANY($2::uuid[])
         AND o.status NOT IN ('delivered', 'cancelled')
       ORDER BY oi.product_id, o.created_at DESC`,
      [req.retailer.id, ids]
    );

    const result = {};
    for (const row of rows) {
      result[row.product_id] = { order_number: row.order_number, status: row.status };
    }
    res.json(result);
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
              p.metal_type AS product_metal_type,
              p.gold_colour AS product_gold_colour,
              p.diamond_shape AS product_diamond_shape,
              p.diamond_color AS product_diamond_color,
              p.diamond_clarity AS product_diamond_clarity,
              p.color_stone_name AS product_color_stone_name,
              p.color_stone_quality AS product_color_stone_quality,
              p.carat_options AS product_carat_options,
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
        "SELECT id, availability FROM products WHERE id = $1",
        [item.productId]
      );
      if (products.length === 0) throw new AppError(`Product ${item.productId} not found`);
      if (products[0].availability === "out-of-stock") {
        throw new AppError(`Product ${item.productId} is currently unavailable`, 400);
      }
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

    auditLog({ actorType: "retailer", actorId: req.retailer.id, action: "order.placed", entityType: "order", entityId: order.id, details: { order_number: orderNumber, items: items.length, total } });

    res.status(201).json(order);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ── PUT /api/orders/:id ───────────────────────────
// Retailer edits an order (only when edit_allowed = true)
router.put("/:id", async (req, res, next) => {
  const client = await getClient();
  try {
    const { note, items = [] } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("Order must have at least one item");
    }

    await client.query("BEGIN");

    // Lock order row while we apply retailer edits.
    const { rows } = await client.query(
      "SELECT * FROM orders WHERE id = $1 AND retailer_id = $2 FOR UPDATE",
      [req.params.id, req.retailer.id]
    );
    if (!rows.length) throw new AppError("Order not found", 404);
    const order = rows[0];

    if (!order.edit_allowed) throw new AppError("Edit not permitted for this order", 403);

    // Snapshot current items before any changes.
    const { rows: oldItems } = await client.query(
      "SELECT * FROM order_items WHERE order_id = $1 ORDER BY id",
      [req.params.id]
    );

    const existingById = new Map(oldItems.map((row) => [row.id, row]));
    const existingByProductId = new Map(
      oldItems.filter((row) => row.product_id).map((row) => [row.product_id, row])
    );

    const cleanText = (value, fallback = null) => {
      if (typeof value === "string") {
        const t = value.trim();
        return t.length ? t : null;
      }
      if (value === null || value === undefined) return fallback;
      return value;
    };

    for (const item of items) {
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const itemNote = cleanText(item.note);

      if (item.id) {
        const existing = existingById.get(item.id);
        if (!existing) {
          throw new AppError("Invalid order item in edit payload", 400);
        }

        const unitPrice =
          Number.isFinite(parseFloat(item.unitPrice)) && parseFloat(item.unitPrice) > 0
            ? parseFloat(item.unitPrice)
            : parseFloat(existing.unit_price) || 0;
        const carat = Number.isFinite(parseFloat(item.carat))
          ? parseFloat(item.carat)
          : existing.carat;

        await client.query(
          `UPDATE order_items SET
             quantity = $1,
             unit_price = $2,
             carat = $3,
             metal_type = $4,
             gold_colour = $5,
             diamond_shape = $6,
             diamond_shade = $7,
             diamond_quality = $8,
             color_stone_name = $9,
             color_stone_quality = $10,
             note = $11
           WHERE id = $12 AND order_id = $13`,
          [
            qty,
            unitPrice,
            carat || null,
            cleanText(item.metalType, existing.metal_type || null),
            cleanText(item.goldColour, existing.gold_colour || null),
            cleanText(item.diamondShape, existing.diamond_shape || null),
            cleanText(item.diamondShade, existing.diamond_shade || null),
            cleanText(item.diamondQuality, existing.diamond_quality || null),
            cleanText(item.colorStoneName, existing.color_stone_name || null),
            cleanText(item.colorStoneQuality, existing.color_stone_quality || null),
            itemNote,
            item.id,
            req.params.id,
          ]
        );
        continue;
      }

      if (!item.productId) {
        throw new AppError("Each item must include either id or productId", 400);
      }

      // If the product already exists in the order, treat this as an update.
      const existingForProduct = existingByProductId.get(item.productId);
      if (existingForProduct) {
        const unitPrice =
          Number.isFinite(parseFloat(item.unitPrice)) && parseFloat(item.unitPrice) > 0
            ? parseFloat(item.unitPrice)
            : parseFloat(existingForProduct.unit_price) || 0;
        const carat = Number.isFinite(parseFloat(item.carat))
          ? parseFloat(item.carat)
          : existingForProduct.carat;

        await client.query(
          `UPDATE order_items SET
             quantity = $1,
             unit_price = $2,
             carat = $3,
             metal_type = $4,
             gold_colour = $5,
             diamond_shape = $6,
             diamond_shade = $7,
             diamond_quality = $8,
             color_stone_name = $9,
             color_stone_quality = $10,
             note = $11
           WHERE id = $12 AND order_id = $13`,
          [
            qty,
            unitPrice,
            carat || null,
            cleanText(item.metalType, existingForProduct.metal_type || null),
            cleanText(item.goldColour, existingForProduct.gold_colour || null),
            cleanText(item.diamondShape, existingForProduct.diamond_shape || null),
            cleanText(item.diamondShade, existingForProduct.diamond_shade || null),
            cleanText(item.diamondQuality, existingForProduct.diamond_quality || null),
            cleanText(item.colorStoneName, existingForProduct.color_stone_name || null),
            cleanText(item.colorStoneQuality, existingForProduct.color_stone_quality || null),
            itemNote,
            existingForProduct.id,
            req.params.id,
          ]
        );
        continue;
      }

      const { rows: products } = await client.query(
        `SELECT id, base_price, carat, metal_type, diamond_shape, diamond_color, diamond_clarity, availability
         FROM products WHERE id = $1 AND is_active = true`,
        [item.productId]
      );
      if (!products.length) throw new AppError("Product not found", 404);
      if (products[0].availability === "out-of-stock") {
        throw new AppError("Product is currently unavailable", 400);
      }

      const p = products[0];
      const unitPrice =
        Number.isFinite(parseFloat(item.unitPrice)) && parseFloat(item.unitPrice) > 0
          ? parseFloat(item.unitPrice)
          : parseFloat(p.base_price) || 0;
      const carat = Number.isFinite(parseFloat(item.carat))
        ? parseFloat(item.carat)
        : p.carat;

      const { rows: insertedRows } = await client.query(
        `INSERT INTO order_items (
          order_id, product_id, quantity, unit_price, carat, metal_type,
          gold_colour, diamond_shape, diamond_shade, diamond_quality,
          color_stone_name, color_stone_quality, note
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING id`,
        [
          req.params.id,
          p.id,
          qty,
          unitPrice,
          carat || null,
          item.metalType || p.metal_type || null,
          item.goldColour || null,
          item.diamondShape || p.diamond_shape || null,
          item.diamondShade || p.diamond_color || null,
          item.diamondQuality || p.diamond_clarity || null,
          item.colorStoneName || null,
          item.colorStoneQuality || null,
          itemNote,
        ]
      );
      existingByProductId.set(p.id, {
        id: insertedRows[0].id,
        unit_price: unitPrice,
        carat: carat || null,
        metal_type: item.metalType || p.metal_type || null,
        gold_colour: item.goldColour || null,
        diamond_shape: item.diamondShape || p.diamond_shape || null,
        diamond_shade: item.diamondShade || p.diamond_color || null,
        diamond_quality: item.diamondQuality || p.diamond_clarity || null,
        color_stone_name: item.colorStoneName || null,
        color_stone_quality: item.colorStoneQuality || null,
      });
    }

    const { rows: totalRows } = await client.query(
      "SELECT COALESCE(SUM(quantity * unit_price), 0) AS total FROM order_items WHERE order_id = $1",
      [req.params.id]
    );
    const newTotal = parseFloat(totalRows[0].total) || 0;
    if (newTotal <= 0) throw new AppError("Order must have at least one item");

    // Update order note, total, and consume the edit permission
    await client.query(
      `UPDATE orders SET note = $1, total = $2,
       edit_allowed = false, edited_by_retailer_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [note || null, newTotal, req.params.id]
    );

    // Fetch updated items for new snapshot
    const { rows: newItems } = await client.query(
      "SELECT * FROM order_items WHERE order_id = $1 ORDER BY id",
      [req.params.id]
    );

    // Save audit log
    await client.query(
      `INSERT INTO order_edit_logs
         (order_id, retailer_id, old_items, old_note, old_total, new_items, new_note, new_total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [req.params.id, req.retailer.id,
       JSON.stringify(oldItems), order.note, order.total,
       JSON.stringify(newItems), note || null, newTotal]
    );

    // Tracking entry
    await client.query(
      "INSERT INTO order_tracking (order_id, status, detail) VALUES ($1, 'Order Updated', 'Retailer updated order details')",
      [req.params.id]
    );

    // Notify retailer
    await client.query(
      `INSERT INTO notifications (retailer_id, type, title, message, action_path)
       VALUES ($1, 'order-update', 'Order Updated', $2, '/retailer/orders')`,
      [req.retailer.id, `${order.order_number} has been updated successfully.`]
    );

    // Notify admin
    await client.query(
      `INSERT INTO admin_notifications (type, title, message, action_path)
       VALUES ('order', $1, $2, '/admin/orders')`,
      [`Order Updated: ${order.order_number}`,
       `A retailer updated order ${order.order_number}. Review the changes in the order detail.`]
    );

    // Activity log
    await client.query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('retailer', $1, 'order_updated', 'order', $2, $3)`,
      [req.retailer.id, req.params.id, JSON.stringify({ order_number: order.order_number })]
    );

    await client.query("COMMIT");

    const { rows: result } = await query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
    res.json(result[0]);
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
    // Per-status counts + total value
    const { rows: totals } = await query(
      `SELECT COUNT(*) AS total_orders,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
              SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
              SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped,
              SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
              SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
              COALESCE(SUM(total), 0) AS total_value
       FROM orders WHERE retailer_id = $1`,
      [req.retailer.id]
    );

    // Category-wise buying (total pieces per category)
    const { rows: categoryBreakdown } = await query(
      `SELECT COALESCE(c.name, 'Other') AS category,
              SUM(oi.quantity) AS quantity
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE o.retailer_id = $1 AND o.status != 'cancelled'
       GROUP BY c.name
       ORDER BY quantity DESC`,
      [req.retailer.id]
    );

    // Monthly trends (last 6 months)
    const { rows: monthlyTrends } = await query(
      `SELECT TO_CHAR(o.created_at, 'YYYY-MM') AS month,
              COUNT(DISTINCT o.id) AS orders,
              COALESCE(SUM(o.total), 0) AS value,
              COALESCE(SUM(oi.quantity), 0) AS pcs
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.retailer_id = $1
         AND o.status != 'cancelled'
         AND o.created_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
       ORDER BY month ASC`,
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
      categoryBreakdown,
      monthlyTrends,
      lastOrder: lastOrder[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
