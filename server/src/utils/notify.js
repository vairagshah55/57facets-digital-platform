// ════════════════════════════════════════════════════════════
//  Notification emails — mirror the in-app (bell) notifications.
//  Every helper is fire-and-forget: it looks up recipients, sends
//  the branded email, and swallows any error so it can NEVER break
//  the request that triggered it. Call WITHOUT await after the DB
//  work (and after COMMIT for transactional routes).
// ════════════════════════════════════════════════════════════
const { query } = require("../config/db");
const { sendMail, getAdminRecipients } = require("./mailer");
const {
  notificationEmail, orderPlacedEmail,
  orderApprovedEmail, orderShippedEmail, orderEditUnlockedEmail, orderCancelledEmail,
} = require("./emailTemplates");

// Internal: look up a retailer's email + name and send an email built by `build(name)`.
async function sendToRetailer(retailerId, build) {
  try {
    if (!retailerId) return;
    const { rows } = await query("SELECT email, name FROM retailers WHERE id = $1", [retailerId]);
    const r = rows[0];
    if (!r || !r.email) return;
    const mail = build(r.name);
    await sendMail({ to: r.email, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (err) {
    console.error("[notify] sendToRetailer failed:", err.message);
  }
}

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

// Retailer order lifecycle emails (admin-triggered).
const emailRetailerOrderApproved = (id, data) => sendToRetailer(id, (name) => orderApprovedEmail({ name, ...data }));
const emailRetailerOrderShipped = (id, data) => sendToRetailer(id, (name) => orderShippedEmail({ name, ...data }));
const emailRetailerOrderEditUnlocked = (id, data) => sendToRetailer(id, (name) => orderEditUnlockedEmail({ name, ...data }));
const emailRetailerOrderCancelled = (id, data) => sendToRetailer(id, (name) => orderCancelledEmail({ name, ...data }));

// Email the admin recipients (ADMIN_NOTIFY_EMAIL, or active admins).
// `exclude` (email or list) is filtered out — used so the retailer who triggered
// the event never also receives the internal admin copy for the same event.
async function emailAdmins({ title, message, actionPath, ctaLabel, exclude }) {
  try {
    let to = await getAdminRecipients();
    if (exclude) {
      const ex = (Array.isArray(exclude) ? exclude : [exclude])
        .filter(Boolean).map((e) => String(e).trim().toLowerCase());
      to = to.filter((e) => !ex.includes(String(e).trim().toLowerCase()));
    }
    if (!to.length) return;
    const mail = notificationEmail({ title, message, actionPath, ctaLabel });
    await sendMail({ to, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (err) {
    console.error("[notify] emailAdmins failed:", err.message);
  }
}

module.exports = {
  emailRetailer, emailRetailers, emailAdmins, emailRetailerOrderPlaced,
  emailRetailerOrderApproved, emailRetailerOrderShipped, emailRetailerOrderEditUnlocked, emailRetailerOrderCancelled,
};
