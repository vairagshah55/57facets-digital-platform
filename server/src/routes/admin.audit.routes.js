const router = require("express").Router();
const { query } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");

router.use(adminAuth);

// ── GET /api/admin/audit ──────────────────────────
// Paginated audit log with filters
router.get("/", async (req, res, next) => {
  try {
    const {
      page = "1",
      limit = "30",
      actor_type,     // "retailer" | "admin" | "system"
      action,         // e.g. "login", "order.placed"
      entity_type,    // e.g. "order", "product"
      search,         // search in actor name or details
      date_from,      // ISO date string
      date_to,        // ISO date string
    } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (actor_type) {
      conditions.push(`al.actor_type = $${idx++}`);
      params.push(actor_type);
    }
    if (action) {
      conditions.push(`al.action = $${idx++}`);
      params.push(action);
    }
    if (entity_type) {
      conditions.push(`al.entity_type = $${idx++}`);
      params.push(entity_type);
    }
    if (date_from) {
      conditions.push(`al.created_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`al.created_at <= $${idx++}::timestamptz + interval '1 day'`);
      params.push(date_to);
    }
    if (search) {
      conditions.push(`(
        COALESCE(r.name, a.name, '') ILIKE $${idx} OR
        COALESCE(r.company_name, '') ILIKE $${idx} OR
        al.action ILIKE $${idx} OR
        al.details::text ILIKE $${idx}
      )`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const pageNum = Math.max(1, parseInt(page));
    const lim = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * lim;

    // Count
    const countResult = await query(
      `SELECT COUNT(*) FROM activity_log al
       LEFT JOIN retailers r ON al.actor_type = 'retailer' AND al.actor_id = r.id
       LEFT JOIN admins a ON al.actor_type = 'admin' AND al.actor_id = a.id
       ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Fetch
    const { rows } = await query(
      `SELECT al.id, al.actor_type, al.actor_id, al.action, al.entity_type, al.entity_id,
              al.details, al.created_at,
              CASE
                WHEN al.actor_type = 'retailer' THEN r.name
                WHEN al.actor_type = 'admin' THEN a.name
                ELSE 'System'
              END AS actor_name,
              CASE
                WHEN al.actor_type = 'retailer' THEN r.company_name
                ELSE NULL
              END AS actor_company,
              CASE
                WHEN al.actor_type = 'retailer' THEN r.phone
                ELSE a.email
              END AS actor_contact
       FROM activity_log al
       LEFT JOIN retailers r ON al.actor_type = 'retailer' AND al.actor_id = r.id
       LEFT JOIN admins a ON al.actor_type = 'admin' AND al.actor_id = a.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, lim, offset]
    );

    // Distinct actions for filter dropdown
    const actionsResult = await query(
      "SELECT DISTINCT action FROM activity_log ORDER BY action"
    );

    res.json({
      logs: rows,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / lim),
      actions: actionsResult.rows.map((r) => r.action),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/audit/stats ────────────────────
// Quick counts for the header
router.get("/stats", async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE created_at > NOW() - interval '24 hours') AS last_24h,
        COUNT(*) FILTER (WHERE actor_type = 'retailer') AS retailer_actions,
        COUNT(*) FILTER (WHERE actor_type = 'admin') AS admin_actions
      FROM activity_log
    `);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
