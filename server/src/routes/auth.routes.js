const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const AppError = require("../utils/AppError");
const auditLog = require("../utils/auditLog");
const { sendMail, getAdminRecipients } = require("../utils/mailer");
const { otpEmail, loginAlertEmail } = require("../utils/emailTemplates");

// Notify admins that a retailer just logged in. Fire-and-forget —
// never block or fail the login if email/SMTP has a problem.
async function notifyAdminOfLogin(retailer, method, ip) {
  try {
    const recipients = await getAdminRecipients();
    if (recipients.length === 0) return;

    const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const { subject, html, text } = loginAlertEmail({ retailer, method, ip, when });
    await sendMail({ to: recipients, subject, text, html });
  } catch (err) {
    console.error("[auth] notifyAdminOfLogin failed:", err.message);
  }
}

// Email a one-time passcode to the retailer. Throws on failure so the
// caller can tell the retailer the email couldn't be sent.
async function sendOtpEmail(to, otpCode, expiryMinutes, name) {
  const { subject, html, text } = otpEmail({ name, otpCode, expiryMinutes });
  await sendMail({ to, subject, text, html, throwOnError: true });
}

// Resolve a retailer by phone OR email. OTPs are always keyed by the
// retailer's phone, so the email path just looks up the matching phone.
async function findActiveRetailer({ phone, email }) {
  if (email) {
    const { rows } = await query(
      "SELECT id, phone, email, name FROM retailers WHERE LOWER(email) = LOWER($1) AND is_active = true",
      [email.trim()]
    );
    if (rows.length === 0) {
      throw new AppError("Email not registered. Contact admin for access.", 403);
    }
    return rows[0];
  }

  if (!phone || phone.length < 10) {
    throw new AppError("Valid phone number is required");
  }
  const { rows } = await query(
    "SELECT id, phone, email, name FROM retailers WHERE phone = $1 AND is_active = true",
    [phone]
  );
  if (rows.length === 0) {
    throw new AppError("Phone number not registered. Contact admin for access.", 403);
  }
  return rows[0];
}

// ── POST /api/auth/request-otp ─────────────────────
// Retailer sends phone number OR email → generate OTP
router.post("/request-otp", async (req, res, next) => {
  try {
    const { phone, email } = req.body;
    if (!phone && !email) {
      throw new AppError("Phone number or email is required");
    }

    // Check retailer exists (by phone or email) and resolve their phone
    const retailer = await findActiveRetailer({ phone, email });

    // Generate 6-digit OTP (static for development)
    //  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpCode =  "123456";
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store OTP (always keyed by the retailer's phone)
    await query(
      "INSERT INTO otps (phone, otp_code, expires_at) VALUES ($1, $2, $3)",
      [retailer.phone, otpCode, expiresAt]
    );

    // Email the OTP to the retailer. Use the email they signed in with,
    // otherwise the email on file (phone login). SMS gateway still TODO.
    const targetEmail = (email && email.trim()) || retailer.email;
    let emailed = false;
    if (targetEmail) {
      try {
        await sendOtpEmail(targetEmail, otpCode, expiryMinutes, retailer.name);
        emailed = true;
      } catch (mailErr) {
        console.error("[auth] OTP email failed:", mailErr.message);
        // If the retailer chose email login, a failed send means they have no
        // way to get the code — surface it. Phone login can still fall back.
        if (email) {
          throw new AppError("Couldn't send the OTP email. Please try again or contact admin.", 502);
        }
      }
    }

    const response = {
      message: emailed
        ? `OTP sent to ${targetEmail}.`
        : "OTP generated. Contact admin to receive it.",
    };
    if (process.env.NODE_ENV === "development") {
      response.otp = otpCode; // Remove in production!
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/verify-otp ──────────────────────
// Retailer sends phone OR email + OTP → get JWT token
router.post("/verify-otp", async (req, res, next) => {
  try {
    const { phone, email, otp } = req.body;
    if ((!phone && !email) || !otp) {
      throw new AppError("Phone (or email) and OTP are required");
    }

    // Resolve the retailer's phone — OTPs are always keyed by phone
    const { phone: retailerPhone } = await findActiveRetailer({ phone, email });

    // Find valid OTP
    const { rows: otps } = await query(
      `SELECT id FROM otps
       WHERE phone = $1 AND otp_code = $2 AND is_used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [retailerPhone, otp]
    );
    if (otps.length === 0) {
      throw new AppError("Invalid or expired OTP", 401);
    }

    // Mark OTP as used
    await query("UPDATE otps SET is_used = true WHERE id = $1", [otps[0].id]);

    // Get retailer
    const { rows: retailers } = await query(
      "SELECT id, name, phone, email, company_name, first_login FROM retailers WHERE phone = $1",
      [retailerPhone]
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

    // Audit log
    auditLog({ actorType: "retailer", actorId: retailer.id, action: "login", details: { phone: retailer.phone, method: email ? "email" : "phone", ip: req.ip } });

    // Notify admins of the login (fire-and-forget — does not block the response)
    notifyAdminOfLogin(retailer, email ? "email" : "phone", req.ip);

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
