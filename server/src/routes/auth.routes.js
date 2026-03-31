const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const AppError = require("../utils/AppError");

// ── POST /api/auth/request-otp ─────────────────────
// Retailer sends phone number → generate OTP
router.post("/request-otp", async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 10) {
      throw new AppError("Valid phone number is required");
    }

    // Check retailer exists
    const { rows: retailers } = await query(
      "SELECT id FROM retailers WHERE phone = $1 AND is_active = true",
      [phone]
    );
    if (retailers.length === 0) {
      throw new AppError("Phone number not registered. Contact admin for access.", 403);
    }

    // Generate 6-digit OTP (static for development)
    //  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpCode =  "123456";
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store OTP
    await query(
      "INSERT INTO otps (phone, otp_code, expires_at) VALUES ($1, $2, $3)",
      [phone, otpCode, expiresAt]
    );

    // TODO: Send OTP via SMS gateway (for now, admin provides it manually)
    // In development, return OTP in response
    const response = { message: "OTP generated. Contact admin to receive it." };
    if (process.env.NODE_ENV === "development") {
      response.otp = otpCode; // Remove in production!
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/verify-otp ──────────────────────
// Retailer sends phone + OTP → get JWT token
router.post("/verify-otp", async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      throw new AppError("Phone and OTP are required");
    }

    // Find valid OTP
    const { rows: otps } = await query(
      `SELECT id FROM otps
       WHERE phone = $1 AND otp_code = $2 AND is_used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, otp]
    );
    if (otps.length === 0) {
      throw new AppError("Invalid or expired OTP", 401);
    }

    // Mark OTP as used
    await query("UPDATE otps SET is_used = true WHERE id = $1", [otps[0].id]);

    // Get retailer
    const { rows: retailers } = await query(
      "SELECT id, name, phone, email, company_name, first_login FROM retailers WHERE phone = $1",
      [phone]
    );
    const retailer = retailers[0];

    // Update first_login flag
    if (retailer.first_login) {
      await query("UPDATE retailers SET first_login = false WHERE id = $1", [retailer.id]);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: retailer.id, phone: retailer.phone },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      token,
      retailer: {
        id: retailer.id,
        name: retailer.name,
        phone: retailer.phone,
        email: retailer.email,
        companyName: retailer.company_name,
        firstLogin: retailer.first_login,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ───────────────────────────────
// Get current retailer profile
const { authenticate } = require("../middleware/auth");
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, name, phone, email, company_name, address, first_login, created_at FROM retailers WHERE id = $1",
      [req.retailer.id]
    );
    if (rows.length === 0) {
      throw new AppError("Retailer not found", 404);
    }
    const r = rows[0];
    res.json({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      companyName: r.company_name,
      address: r.address,
      firstLogin: r.first_login,
      createdAt: r.created_at,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
