const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");
const AppError = require("../utils/AppError");

// ── POST /api/admin/auth/login ─────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError("Email and password are required");

    const { rows } = await query(
      "SELECT id, name, email, password_hash, role FROM admins WHERE email = $1 AND is_active = true",
      [email]
    );
    if (rows.length === 0) throw new AppError("Invalid credentials", 401);

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) throw new AppError("Invalid credentials", 401);

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, type: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Log activity
    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, details)
       VALUES ('admin', $1, 'admin_login', $2)`,
      [admin.id, JSON.stringify({ email: admin.email })]
    );

    res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/auth/me ─────────────────────────
router.get("/me", adminAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, name, email, role, created_at FROM admins WHERE id = $1",
      [req.admin.id]
    );
    if (rows.length === 0) throw new AppError("Admin not found", 404);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
