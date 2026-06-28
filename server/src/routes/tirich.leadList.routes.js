const router = require("express").Router();
const { query } = require("../config/db");

/* ════════════════════════════════════════════════════════════════
   Tirich lead LIST — read the captured leads (for the Tirich admin).
   Mounted at /api/sub-domain/lead-list.

   Returns lead PII (name/phone/city), so it's guarded by an API key
   when one is configured: set TIRICH_LEADS_KEY in the env and pass it
   as the "x-api-key" header or "?key=" query param. If the env var is
   not set the endpoint stays open (local dev convenience).
   ════════════════════════════════════════════════════════════════ */
function requireKey(req, res, next) {
  const need = process.env.TIRICH_LEADS_KEY;
  if (!need) return next(); // not configured → open (dev)
  const got = req.get("x-api-key") || req.query.key;
  if (got && got === need) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// ── GET /api/sub-domain/lead-list/data ──────────────
// All Tirich leads, newest first. Optional ?search= (name/phone/city),
// ?limit= (default 200, max 1000), ?offset= for paging.
router.get("/data", requireKey, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 1000);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const search = (req.query.search || "").trim();

    const params = [];
    let where = "";
    if (search) {
      params.push(`%${search}%`);
      where = "WHERE name ILIKE $1 OR phone ILIKE $1 OR city ILIKE $1";
    }

    const totalRes = await query(`SELECT COUNT(*)::int AS c FROM tirich_leads ${where}`, params);

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT id, name, phone, city, business_type, business_other, designation, created_at, updated_at
       FROM tirich_leads
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: { leads: rows, total: totalRes.rows[0].c, limit, offset } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
