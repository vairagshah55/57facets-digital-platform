// ════════════════════════════════════════════════════════════
//  Notification emails — mirror the in-app (bell) notifications.
//  Every helper is fire-and-forget: it looks up recipients, sends
//  the branded email, and swallows any error so it can NEVER break
//  the request that triggered it. Call WITHOUT await after the DB
//  work (and after COMMIT for transactional routes).
// ════════════════════════════════════════════════════════════
const { query } = require("../config/db");
const { sendMail, getAdminRecipients } = require("./mailer");
const { notificationEmail, orderPlacedEmail } = require("./emailTemplates");

// Email one retailer (by id) the given notification.
async function emailRetailer(retailerId, { title, message, actionPath, ctaLabel }) {
  try {
    if (!retailerId) return;
    const { rows } = await query("SELECT email, name FROM retailers WHERE id = $1", [retailerId]);
    const r = rows[0];
    if (!r || !r.email) return;
    const mail = notificationEmail({ title, message, actionPath, ctaLabel, name: r.name });
    await sendMail({ to: r.email, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (err) {
    console.error("[notify] emailRetailer failed:", err.message);
  }
}

// Email several retailers (by ids) the same notification.
async function emailRetailers(retailerIds, { title, message, actionPath, ctaLabel }) {
  try {
    if (!Array.isArray(retailerIds) || retailerIds.length === 0) return;
    const { rows } = await query(
      "SELECT email, name FROM retailers WHERE id = ANY($1::uuid[]) AND email IS NOT NULL",
      [retailerIds]
    );
    for (const r of rows) {
      if (!r.email) continue;
      const mail = notificationEmail({ title, message, actionPath, ctaLabel, name: r.name });
      await sendMail({ to: r.email, subject: mail.subject, html: mail.html, text: mail.text });
    }
  } catch (err) {
    console.error("[notify] emailRetailers failed:", err.message);
  }
}

// Email a retailer the dedicated "order received" confirmation (with the order
// summary table). Currency follows the retailer's country.
async function emailRetailerOrderPlaced(retailerId, { orderNumber, orderDate, itemCount, orderAmount, orderUrl }) {
  try {
    if (!retailerId) return;
    const { rows } = await query("SELECT email, name, country FROM retailers WHERE id = $1", [retailerId]);
    const r = rows[0];
    if (!r || !r.email) return;
    const isINR = (r.country || "India") === "India";
    const mail = orderPlacedEmail({ name: r.name, orderNumber, orderDate, itemCount, orderAmount, orderUrl, isINR });
    await sendMail({ to: r.email, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (err) {
    console.error("[notify] emailRetailerOrderPlaced failed:", err.message);
  }
}

// Email the admin recipients (ADMIN_NOTIFY_EMAIL, or active admins).
async function emailAdmins({ title, message, actionPath, ctaLabel }) {
  try {
    const to = await getAdminRecipients();
    if (!to.length) return;
    const mail = notificationEmail({ title, message, actionPath, ctaLabel });
    await sendMail({ to, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (err) {
    console.error("[notify] emailAdmins failed:", err.message);
  }
}

module.exports = { emailRetailer, emailRetailers, emailAdmins, emailRetailerOrderPlaced };
