const router = require("express").Router();
const { query } = require("../config/db");
const AppError = require("../utils/AppError");
const auditLog = require("../utils/auditLog");
const { sendMail, getAdminRecipients } = require("../utils/mailer");

// ── Enums (mirror the Tirich lead model) ────────────
const VALID_BUSINESS = ["led-showroom", "electrical-shop", "distributor", "other"];
const VALID_DESIGNATION = ["owner", "interior", "architect"];

// Human-readable labels for the notification email.
const BUSINESS_LABELS = {
  "led-showroom": "LED Showroom",
  "electrical-shop": "Electrical Shop",
  distributor: "Distributor",
  other: "Other",
};
const DESIGNATION_LABELS = {
  owner: "Owner",
  interior: "Interior Designer",
  architect: "Architect",
};

// Phone validation — same shape the Tirich frontend enforces.
const PHONE_RE = /^[+\d][\d\s\-()]{7,}$/;

// Fire-and-forget notification email for a captured lead.
async function notifyNewLead(lead) {
  try {
    const to = (process.env.TIRICH_NOTIFY_EMAIL || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const recipients = to.length > 0 ? to : await getAdminRecipients();
    if (!recipients || recipients.length === 0) return;

    const businessLabel =
      lead.business_type === "other" && lead.business_other
        ? `Other — ${lead.business_other}`
        : BUSINESS_LABELS[lead.business_type] || lead.business_type;
    const designationLabel = DESIGNATION_LABELS[lead.designation] || lead.designation;

    const lines = [
      `Name: ${lead.name}`,
      `Phone: ${lead.phone}`,
      `City: ${lead.city}`,
      `Business: ${businessLabel}`,
      `Designation: ${designationLabel}`,
    ];

    await sendMail({
      to: recipients,
      // Separate sender identity for Tirich (falls back to the global SMTP_FROM).
      from: process.env.TIRICH_SMTP_FROM || undefined,
      subject: `New Tirich Lead: ${lead.name}`,
      text: lines.join("\n"),
      html: `<h2>New Tirich Lead</h2><ul>${lines
        .map((l) => `<li>${l}</li>`)
        .join("")}</ul>`,
    });
  } catch (err) {
    // Never let notification failure break the request.
    console.error("[tirich-lead] notify failed:", err.message);
  }
}

// ── POST /sub-domain/lead/store (PUBLIC) ────────────
// Stores (upserts on phone) a Tirich lead and emails a notification.
router.post("/store", async (req, res, next) => {
  try {
    const name = (req.body.name || "").trim();
    const phone = (req.body.phone || "").trim();
    const city = (req.body.city || "").trim();
    const business_type = req.body.business_type;
    const designation = req.body.designation;
    const business_other =
      business_type === "other" ? (req.body.business_other || "").trim() : "";

    // ── Validation ──
    if (!name) throw new AppError("Name is required");
    if (!phone) throw new AppError("Mobile number is required");
    if (!PHONE_RE.test(phone)) throw new AppError("Enter a valid mobile number");
    if (!city) throw new AppError("City is required");
    if (!business_type) throw new AppError("Business type is required");
    if (!VALID_BUSINESS.includes(business_type))
      throw new AppError("Invalid business type");
    if (business_type === "other" && !business_other)
      throw new AppError("Please specify your business");
    if (!designation) throw new AppError("Designation is required");
    if (!VALID_DESIGNATION.includes(designation))
      throw new AppError("Invalid designation");

    // ── Upsert on phone ──
    const { rows } = await query(
      `INSERT INTO tirich_leads (name, phone, city, business_type, business_other, designation)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (phone) DO UPDATE SET
         name           = EXCLUDED.name,
         city           = EXCLUDED.city,
         business_type  = EXCLUDED.business_type,
         business_other = EXCLUDED.business_other,
         designation    = EXCLUDED.designation
       RETURNING *`,
      [name, phone, city, business_type, business_other || null, designation]
    );
    const lead = rows[0];

    // Fire-and-forget: email + audit, never block the response.
    notifyNewLead(lead);
    auditLog({
      actorType: "system",
      action: "tirich_lead.created",
      entityType: "tirich_lead",
      entityId: lead.id,
      details: { phone: lead.phone, city: lead.city },
    });

    res.status(201).json({ data: { lead } });
  } catch (err) {
    next(err);
  }
});

// ── GET /sub-domain/lead/verify/:phone (PUBLIC) ─────
// Returns an existing lead by phone, or 404. Matches the shape the
// Tirich frontend expects: { data: { lead } }.
router.get("/verify/:phone", async (req, res, next) => {
  try {
    const phone = (req.params.phone || "").trim();
    if (!phone) throw new AppError("Mobile number is required");

    const { rows } = await query(
      `SELECT id, name, phone, city, business_type, business_other, designation
       FROM tirich_leads WHERE phone = $1`,
      [phone]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No record found" });
    }
    res.json({ data: { lead: rows[0] } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
