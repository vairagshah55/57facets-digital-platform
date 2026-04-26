const router = require("express").Router();
const { query } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");
const auditLog = require("../utils/auditLog");
const AppError = require("../utils/AppError");

router.use(adminAuth);

/* ─── Helpers ─────────────────────────────────────── */

function clampLimit(v, def = 1000, max = 10000) {
  const n = parseInt(v);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(n, max);
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  let s;
  if (v instanceof Date) s = v.toISOString();
  else if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(columns, rows) {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => csvEscape(row[c.key])).join(","))
    .join("\n");
  // BOM so Excel reads UTF-8 correctly
  return "﻿" + header + "\n" + body + "\n";
}

function sendReport(req, res, reportType, columns, rows) {
  const format = (req.query.format || "json").toLowerCase();
  if (format === "csv") {
    const csv = toCsv(columns, rows);
    const filename = `${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    auditLog({
      actorType: "admin",
      actorId: req.admin.id,
      action: "report.exported",
      details: { report: reportType, format: "csv", row_count: rows.length, filters: req.query },
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  }
  res.json({ report: reportType, columns, rows, total: rows.length });
}

/* ─── Report Definitions ──────────────────────────── */

const REPORTS = {
  /* 1. Orders by Date Range */
  "orders-by-date": {
    columns: [
      { key: "order_number",     label: "Order #" },
      { key: "created_at",       label: "Date" },
      { key: "status",           label: "Status" },
      { key: "retailer_name",    label: "Retailer" },
      { key: "retailer_company", label: "Company" },
      { key: "retailer_phone",   label: "Phone" },
      { key: "item_count",       label: "Items" },
      { key: "total",            label: "Total" },
      { key: "note",             label: "Note" },
    ],
    async run(req) {
      const from = parseDate(req.query.from);
      const to   = parseDate(req.query.to);
      const status = req.query.status || null;
      const conditions = [];
      const params = [];
      let idx = 1;
      if (from)   { conditions.push(`o.created_at >= $${idx++}`); params.push(from); }
      if (to)     { conditions.push(`o.created_at <= $${idx++}`); params.push(to); }
      if (status) { conditions.push(`o.status = $${idx++}`);      params.push(status); }
      const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
      const limit = clampLimit(req.query.limit);
      const { rows } = await query(
        `SELECT o.order_number, o.created_at, o.status, o.total, o.note,
                r.name AS retailer_name,
                COALESCE(r.business_name, r.company_name) AS retailer_company,
                r.phone AS retailer_phone,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
         FROM orders o
         LEFT JOIN retailers r ON r.id = o.retailer_id
         ${where}
         ORDER BY o.created_at DESC
         LIMIT $${idx}`,
        [...params, limit]
      );
      return rows;
    },
  },

  /* 2. Orders by Retailer */
  "orders-by-retailer": {
    columns: [
      { key: "order_number",     label: "Order #" },
      { key: "created_at",       label: "Date" },
      { key: "status",           label: "Status" },
      { key: "retailer_name",    label: "Retailer" },
      { key: "retailer_company", label: "Company" },
      { key: "retailer_phone",   label: "Phone" },
      { key: "item_count",       label: "Items" },
      { key: "total",            label: "Total" },
    ],
    async run(req) {
      const retailerId = req.query.retailer_id || null;
      const from = parseDate(req.query.from);
      const to   = parseDate(req.query.to);
      if (!retailerId) throw new AppError("retailer_id is required");
      const conditions = ["o.retailer_id = $1"];
      const params = [retailerId];
      let idx = 2;
      if (from) { conditions.push(`o.created_at >= $${idx++}`); params.push(from); }
      if (to)   { conditions.push(`o.created_at <= $${idx++}`); params.push(to); }
      const limit = clampLimit(req.query.limit);
      const { rows } = await query(
        `SELECT o.order_number, o.created_at, o.status, o.total,
                r.name AS retailer_name,
                COALESCE(r.business_name, r.company_name) AS retailer_company,
                r.phone AS retailer_phone,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
         FROM orders o
         LEFT JOIN retailers r ON r.id = o.retailer_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY o.created_at DESC
         LIMIT $${idx}`,
        [...params, limit]
      );
      return rows;
    },
  },

  /* 3. Most Viewed Products
        - view_count: total per-view events from activity_log (populated after Phase 2 logging)
        - unique_viewers: distinct retailers from recently_viewed (works historically) */
  "most-viewed-products": {
    columns: [
      { key: "name",            label: "Product" },
      { key: "sku",             label: "SKU" },
      { key: "category",        label: "Category" },
      { key: "view_count",      label: "Total Views" },
      { key: "unique_viewers",  label: "Unique Viewers" },
      { key: "last_viewed_at",  label: "Last Viewed" },
    ],
    async run(req) {
      const from = parseDate(req.query.from);
      const to   = parseDate(req.query.to);
      const dateConds = [];
      const params = [];
      let idx = 1;
      if (from) { dateConds.push(`ts >= $${idx++}`); params.push(from); }
      if (to)   { dateConds.push(`ts <= $${idx++}`); params.push(to); }
      const evWhere = dateConds.length
        ? "WHERE al.action = 'product.viewed' AND " + dateConds.map((c) => c.replace("ts", "al.created_at")).join(" AND ")
        : "WHERE al.action = 'product.viewed'";
      const rvWhere = dateConds.length
        ? "WHERE " + dateConds.map((c) => c.replace("ts", "rv.viewed_at")).join(" AND ")
        : "";
      const limit = clampLimit(req.query.limit, 100, 1000);
      const { rows } = await query(
        `WITH ev AS (
           SELECT al.entity_id AS product_id,
                  COUNT(*)::int AS view_count,
                  MAX(al.created_at) AS last_event_at
           FROM activity_log al
           ${evWhere}
           GROUP BY al.entity_id
         ),
         rv AS (
           SELECT rv.product_id,
                  COUNT(DISTINCT rv.retailer_id)::int AS unique_viewers,
                  MAX(rv.viewed_at) AS last_viewed_at
           FROM recently_viewed rv
           ${rvWhere}
           GROUP BY rv.product_id
         )
         SELECT p.name, p.sku, c.name AS category,
                COALESCE(ev.view_count, 0) AS view_count,
                COALESCE(rv.unique_viewers, 0) AS unique_viewers,
                GREATEST(ev.last_event_at, rv.last_viewed_at) AS last_viewed_at
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN ev ON ev.product_id = p.id
         LEFT JOIN rv ON rv.product_id = p.id
         WHERE COALESCE(ev.view_count, 0) > 0 OR COALESCE(rv.unique_viewers, 0) > 0
         ORDER BY view_count DESC, unique_viewers DESC, last_viewed_at DESC
         LIMIT $${idx}`,
        [...params, limit]
      );
      return rows;
    },
  },

  /* 4. Most Ordered Products */
  "most-ordered-products": {
    columns: [
      { key: "name",         label: "Product" },
      { key: "sku",          label: "SKU" },
      { key: "category",     label: "Category" },
      { key: "order_count",  label: "Orders" },
      { key: "total_qty",    label: "Total Qty" },
      { key: "revenue",      label: "Revenue" },
    ],
    async run(req) {
      const from = parseDate(req.query.from);
      const to   = parseDate(req.query.to);
      const conditions = [];
      const params = [];
      let idx = 1;
      if (from) { conditions.push(`o.created_at >= $${idx++}`); params.push(from); }
      if (to)   { conditions.push(`o.created_at <= $${idx++}`); params.push(to); }
      const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
      const limit = clampLimit(req.query.limit, 100, 1000);
      const { rows } = await query(
        `SELECT p.name, p.sku, c.name AS category,
                COUNT(DISTINCT oi.order_id) AS order_count,
                COALESCE(SUM(oi.quantity), 0) AS total_qty,
                COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         ${where}
         GROUP BY p.id, p.name, p.sku, c.name
         ORDER BY order_count DESC, total_qty DESC
         LIMIT $${idx}`,
        [...params, limit]
      );
      return rows;
    },
  },

  /* 5. Retailer Activity Log */
  "retailer-activity": {
    columns: [
      { key: "created_at",    label: "When" },
      { key: "retailer_name", label: "Retailer" },
      { key: "company",       label: "Company" },
      { key: "phone",         label: "Phone" },
      { key: "action",        label: "Action" },
      { key: "entity_type",   label: "Entity" },
      { key: "details",       label: "Details" },
    ],
    async run(req) {
      const retailerId = req.query.retailer_id || null;
      const from = parseDate(req.query.from);
      const to   = parseDate(req.query.to);
      const conditions = ["al.actor_type = 'retailer'"];
      const params = [];
      let idx = 1;
      if (retailerId) { conditions.push(`al.actor_id = $${idx++}`);  params.push(retailerId); }
      if (from)       { conditions.push(`al.created_at >= $${idx++}`); params.push(from); }
      if (to)         { conditions.push(`al.created_at <= $${idx++}`); params.push(to); }
      const limit = clampLimit(req.query.limit);
      const { rows } = await query(
        `SELECT al.created_at, al.action, al.entity_type, al.details,
                r.name AS retailer_name,
                COALESCE(r.business_name, r.company_name) AS company,
                r.phone
         FROM activity_log al
         LEFT JOIN retailers r ON r.id = al.actor_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY al.created_at DESC
         LIMIT $${idx}`,
        [...params, limit]
      );
      return rows;
    },
  },

  /* 6. Shortlist Analysis — shortlisted but not ordered */
  "shortlist-analysis": {
    columns: [
      { key: "retailer_name",   label: "Retailer" },
      { key: "company",         label: "Company" },
      { key: "phone",           label: "Phone" },
      { key: "product_name",    label: "Product" },
      { key: "sku",             label: "SKU" },
      { key: "category",        label: "Category" },
      { key: "shortlisted_at",  label: "Shortlisted" },
      { key: "days_in_list",    label: "Days In List" },
    ],
    async run(req) {
      const limit = clampLimit(req.query.limit);
      const { rows } = await query(
        `SELECT r.name AS retailer_name,
                COALESCE(r.business_name, r.company_name) AS company,
                r.phone,
                p.name AS product_name, p.sku,
                c.name AS category,
                w.created_at AS shortlisted_at,
                EXTRACT(DAY FROM NOW() - w.created_at)::int AS days_in_list
         FROM wishlists w
         JOIN retailers r ON r.id = w.retailer_id
         JOIN products p  ON p.id = w.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE NOT EXISTS (
           SELECT 1 FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           WHERE o.retailer_id = w.retailer_id
             AND oi.product_id = w.product_id
         )
         ORDER BY w.created_at DESC
         LIMIT $1`,
        [limit]
      );
      return rows;
    },
  },

  /* 7. Customisation Trends */
  "customisation-trends": {
    columns: [
      { key: "dimension", label: "Field" },
      { key: "value",     label: "Value" },
      { key: "count",     label: "Times Requested" },
    ],
    async run(req) {
      const from = parseDate(req.query.from);
      const to   = parseDate(req.query.to);
      const dateConds = [];
      const params = [];
      let idx = 1;
      if (from) { dateConds.push(`o.created_at >= $${idx++}`); params.push(from); }
      if (to)   { dateConds.push(`o.created_at <= $${idx++}`); params.push(to); }
      const dateWhere = dateConds.length ? "WHERE " + dateConds.join(" AND ") : "";

      const fields = [
        ["metal_type",          "Metal Type"],
        ["gold_colour",         "Gold Colour"],
        ["diamond_shape",       "Diamond Shape"],
        ["diamond_shade",       "Diamond Shade"],
        ["diamond_quality",     "Diamond Quality"],
        ["color_stone_name",    "Color Stone"],
        ["color_stone_quality", "Stone Quality"],
      ];
      const textUnions = fields
        .map(
          ([col, label]) => `
            SELECT '${label}'::text AS dimension, items.${col} AS value, COUNT(*)::int AS count
            FROM items
            WHERE items.${col} IS NOT NULL AND items.${col} <> ''
            GROUP BY items.${col}
          `
        )
        .join(" UNION ALL ");

      const sql = `
        WITH items AS (
          SELECT oi.*
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          ${dateWhere}
        )
        ${textUnions}
        UNION ALL
        SELECT 'Carat'::text AS dimension,
               CASE
                 WHEN items.carat < 0.5 THEN '< 0.5 ct'
                 WHEN items.carat < 1   THEN '0.5–1 ct'
                 WHEN items.carat < 2   THEN '1–2 ct'
                 WHEN items.carat < 3   THEN '2–3 ct'
                 ELSE '3+ ct'
               END AS value,
               COUNT(*)::int AS count
        FROM items
        WHERE items.carat IS NOT NULL
        GROUP BY value
        ORDER BY dimension, count DESC
      `;
      const { rows } = await query(sql, params);
      return rows;
    },
  },

  /* 8. New vs Repeat Retailers */
  "new-vs-repeat-retailers": {
    columns: [
      { key: "retailer_name",  label: "Retailer" },
      { key: "company",        label: "Company" },
      { key: "phone",          label: "Phone" },
      { key: "joined_at",      label: "Joined" },
      { key: "order_count",    label: "Orders" },
      { key: "total_spent",    label: "Total Spent" },
      { key: "first_order_at", label: "First Order" },
      { key: "last_order_at",  label: "Last Order" },
      { key: "segment",        label: "Segment" },
    ],
    async run(req) {
      const limit = clampLimit(req.query.limit);
      const { rows } = await query(
        `SELECT r.name AS retailer_name,
                COALESCE(r.business_name, r.company_name) AS company,
                r.phone,
                r.created_at AS joined_at,
                COUNT(o.id)::int AS order_count,
                COALESCE(SUM(o.total), 0) AS total_spent,
                MIN(o.created_at) AS first_order_at,
                MAX(o.created_at) AS last_order_at,
                CASE
                  WHEN COUNT(o.id) = 0 THEN 'inactive'
                  WHEN COUNT(o.id) = 1 THEN 'new'
                  ELSE 'repeat'
                END AS segment
         FROM retailers r
         LEFT JOIN orders o ON o.retailer_id = r.id
         WHERE r.is_active = true
         GROUP BY r.id, r.name, r.business_name, r.company_name, r.phone, r.created_at
         ORDER BY order_count DESC, total_spent DESC
         LIMIT $1`,
        [limit]
      );
      return rows;
    },
  },

  /* 9. OTP Usage Report */
  "otp-usage": {
    columns: [
      { key: "phone",          label: "Phone" },
      { key: "retailer_name",  label: "Retailer" },
      { key: "otp_code",       label: "OTP" },
      { key: "created_at",     label: "Generated" },
      { key: "expires_at",     label: "Expires" },
      { key: "is_used",        label: "Used" },
      { key: "outcome",        label: "Outcome" },
    ],
    async run(req) {
      const from = parseDate(req.query.from);
      const to   = parseDate(req.query.to);
      const outcome = req.query.outcome || null; // used | expired | active
      const conditions = [];
      const params = [];
      let idx = 1;
      if (from) { conditions.push(`o.created_at >= $${idx++}`); params.push(from); }
      if (to)   { conditions.push(`o.created_at <= $${idx++}`); params.push(to); }
      if (outcome === "used")    conditions.push("o.is_used = true");
      if (outcome === "expired") conditions.push("o.is_used = false AND o.expires_at <= NOW()");
      if (outcome === "active")  conditions.push("o.is_used = false AND o.expires_at > NOW()");
      const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
      const limit = clampLimit(req.query.limit);
      const { rows } = await query(
        `SELECT o.phone, o.otp_code, o.created_at, o.expires_at, o.is_used,
                r.name AS retailer_name,
                CASE
                  WHEN o.is_used = true THEN 'used'
                  WHEN o.expires_at <= NOW() THEN 'expired'
                  ELSE 'active'
                END AS outcome
         FROM otps o
         LEFT JOIN retailers r ON r.phone = o.phone
         ${where}
         ORDER BY o.created_at DESC
         LIMIT $${idx}`,
        [...params, limit]
      );
      return rows;
    },
  },

  /* 10. Audit Trail Export */
  "audit-trail": {
    columns: [
      { key: "created_at",  label: "When" },
      { key: "actor_type",  label: "Actor" },
      { key: "actor_name",  label: "Name" },
      { key: "actor_contact", label: "Contact" },
      { key: "action",      label: "Action" },
      { key: "entity_type", label: "Entity Type" },
      { key: "entity_id",   label: "Entity ID" },
      { key: "details",     label: "Details" },
    ],
    async run(req) {
      const from       = parseDate(req.query.from);
      const to         = parseDate(req.query.to);
      const retailerId = req.query.retailer_id || null;
      const actorType  = req.query.actor_type || null;
      const conditions = [];
      const params = [];
      let idx = 1;
      if (from)       { conditions.push(`al.created_at >= $${idx++}`); params.push(from); }
      if (to)         { conditions.push(`al.created_at <= $${idx++}`); params.push(to); }
      if (retailerId) { conditions.push(`al.actor_type = 'retailer' AND al.actor_id = $${idx++}`); params.push(retailerId); }
      if (actorType && !retailerId) { conditions.push(`al.actor_type = $${idx++}`); params.push(actorType); }
      const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
      const limit = clampLimit(req.query.limit, 5000, 50000);
      const { rows } = await query(
        `SELECT al.created_at, al.actor_type, al.action, al.entity_type, al.entity_id, al.details,
                CASE
                  WHEN al.actor_type = 'retailer' THEN r.name
                  WHEN al.actor_type = 'admin' THEN a.name
                  ELSE 'System'
                END AS actor_name,
                CASE
                  WHEN al.actor_type = 'retailer' THEN r.phone
                  WHEN al.actor_type = 'admin' THEN a.email
                  ELSE NULL
                END AS actor_contact
         FROM activity_log al
         LEFT JOIN retailers r ON al.actor_type = 'retailer' AND al.actor_id = r.id
         LEFT JOIN admins a    ON al.actor_type = 'admin'    AND al.actor_id = a.id
         ${where}
         ORDER BY al.created_at DESC
         LIMIT $${idx}`,
        [...params, limit]
      );
      return rows;
    },
  },
};

/* ─── Routes ──────────────────────────────────────── */

// List all available reports + their column metadata (for the client shell)
router.get("/", (_req, res) => {
  const reports = Object.entries(REPORTS).map(([key, def]) => ({
    key,
    columns: def.columns,
  }));
  res.json({ reports });
});

// Run a report (json or csv)
router.get("/:reportType", async (req, res, next) => {
  try {
    const def = REPORTS[req.params.reportType];
    if (!def) throw new AppError("Unknown report", 404);
    const rows = await def.run(req);
    sendReport(req, res, req.params.reportType, def.columns, rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
