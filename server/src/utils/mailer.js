const nodemailer = require("nodemailer");
const { query } = require("../config/db");

// ── Transporter ────────────────────────────────────
// Created lazily from env. Returns null when SMTP isn't configured,
// so email is a no-op (and never breaks the request) in that case.
let transporter;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("[mailer] SMTP not configured — emails will be skipped.");
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/**
 * Send an email. Resolves silently on success; logs and swallows errors
 * so callers can fire-and-forget without breaking the main request.
 *
 * @param {Object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} [opts.text]
 * @param {string} [opts.html]
 * @param {boolean} [opts.throwOnError]  re-throw send errors instead of swallowing
 *                                       (use for OTP/transactional mail the user is waiting on)
 */
async function sendMail({ to, subject, text, html, from, attachments, throwOnError = false }) {
  const tx = getTransporter();
  if (!tx) {
    if (throwOnError) throw new Error("Email service is not configured");
    return;
  }
  if (!to || (Array.isArray(to) && to.length === 0)) {
    if (throwOnError) throw new Error("No recipient address available");
    return;
  }

  try {
    await tx.sendMail({
      // Caller may override the From; otherwise fall back to the global default.
      from: from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      text,
      html,
      ...(attachments && attachments.length ? { attachments } : {}),
    });
  } catch (err) {
    console.error("[mailer] sendMail failed:", err.message);
    if (throwOnError) throw err;
  }
}

/**
 * Resolve the admin recipients for system notifications.
 * Prefers the ADMIN_NOTIFY_EMAIL env (comma-separated); otherwise
 * falls back to every active admin in the DB.
 *
 * @returns {Promise<string[]>}
 */
async function getAdminRecipients() {
  const configured = (process.env.ADMIN_NOTIFY_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;

  try {
    const { rows } = await query(
      "SELECT email FROM admins WHERE is_active = true AND email IS NOT NULL"
    );
    return rows.map((r) => r.email).filter(Boolean);
  } catch (err) {
    console.error("[mailer] getAdminRecipients failed:", err.message);
    return [];
  }
}

module.exports = { sendMail, getAdminRecipients };
