// ════════════════════════════════════════════════════════════
//  57 Facets — branded HTML email templates
//  Table-based + inline styles for broad email-client support
//  (Gmail, Outlook, Apple Mail). No external CSS, no SVG.
// ════════════════════════════════════════════════════════════

const BRAND = {
  name: "57 Facets",
  teal: "#30B8BF",
  tealSoft: "rgba(48,184,191,0.12)",
  bgOuter: "#080A0D",
  bgCard: "#0D1118",
  bgInset: "#131A25",
  border: "#1C2535",
  textPrimary: "#FFFFFF",
  textSecondary: "#A8B0BF",
  textMuted: "#8A929F",
  serif: "'Georgia','Times New Roman',serif",
  sans: "'Helvetica Neue',Arial,sans-serif",
};

// Hosted 57 Facets logo (served by nginx from client/public → dist). Used in the
// email header instead of the plain diamond glyph.
const LOGO_URL = `${(process.env.CLIENT_ORIGIN || "https://57facets.in").replace(/\/$/, "")}/email-logo.png`;

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wrap body content in the branded shell: dark background, centered card,
 * diamond wordmark header, and footer.
 *
 * @param {Object} opts
 * @param {string} opts.preheader  hidden inbox-preview text
 * @param {string} opts.body       inner HTML (the card's content area)
 */
function baseLayout({ preheader = "", body = "" }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(BRAND.name)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bgOuter};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BRAND.bgOuter};font-size:1px;line-height:1px;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bgOuter};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;">

          <!-- Header / logo -->
          <tr>
            <td align="center" style="padding:8px 0 24px 0;">
              <img src="${LOGO_URL}" alt="57 Facets" width="170" style="display:block;width:170px;max-width:60%;height:auto;border:0;outline:none;text-decoration:none;" />
              <div style="font-family:${BRAND.sans};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.teal};margin-top:12px;">
                Retailer Portal
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${BRAND.bgCard};border:1px solid ${BRAND.border};border-radius:16px;padding:36px 32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 16px 8px 16px;">
              <p style="margin:0;font-family:${BRAND.sans};font-size:11px;line-height:1.6;color:${BRAND.textMuted};">
                Authorized retailers only. If you weren't expecting this email, you can safely ignore it.
              </p>
              <p style="margin:10px 0 0 0;font-family:${BRAND.sans};font-size:11px;color:${BRAND.textMuted};">
                &copy; ${year} 57 Facets. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * OTP login-code email.
 * @returns {{subject:string, html:string, text:string}}
 */
function otpEmail({ name, otpCode, expiryMinutes }) {
  const greeting = name ? `Hello ${escapeHtml(name)},` : "Hello,";
  const code = escapeHtml(otpCode);

  const body = `
    <h1 style="margin:0 0 8px 0;font-family:${BRAND.serif};font-size:22px;font-weight:600;color:${BRAND.textPrimary};">
      Your login code
    </h1>
    <p style="margin:0 0 24px 0;font-family:${BRAND.sans};font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">
      ${greeting} use the one-time code below to sign in to the 57 Facets retailer portal.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="background:${BRAND.bgInset};border:1px solid ${BRAND.teal};border-radius:12px;padding:22px 16px;">
          <div style="font-family:${BRAND.sans};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.textMuted};margin-bottom:10px;">
            Verification Code
          </div>
          <div style="font-family:${BRAND.sans};font-size:38px;font-weight:700;letter-spacing:10px;color:${BRAND.teal};">
            ${code}
          </div>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0 0;font-family:${BRAND.sans};font-size:13px;line-height:1.6;color:${BRAND.textMuted};">
      This code expires in <strong style="color:${BRAND.textSecondary};">${expiryMinutes} minutes</strong>.
      For your security, never share it with anyone &mdash; 57 Facets staff will never ask for it.
    </p>`;

  const text = [
    name ? `Hello ${name},` : "Hello,",
    "",
    "Your 57 Facets login code is:",
    "",
    `    ${otpCode}`,
    "",
    `This code expires in ${expiryMinutes} minutes. Never share it with anyone.`,
    "If you didn't request this, you can ignore this email.",
  ].join("\n");

  return {
    subject: `${otpCode} is your 57 Facets login code`,
    html: baseLayout({ preheader: `Your login code is ${otpCode} (expires in ${expiryMinutes} min)`, body }),
    text,
  };
}

/**
 * Admin notification when a retailer logs in.
 * @returns {{subject:string, html:string, text:string}}
 */
function loginAlertEmail({ retailer, method, ip, when, city, country }) {
  const rows = [
    ["Name", retailer.name],
    ["Company", retailer.company_name],
    ["Phone", retailer.phone],
    ["Email", retailer.email],
    ["Method", method === "email" ? "Email + OTP" : "Phone + OTP"],
    ["City", city],
    ["Country", country],
    ["IP address", ip],
    ["Time", when ? `${when} IST` : null],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:9px 16px 9px 0;font-family:${BRAND.sans};font-size:13px;color:${BRAND.textMuted};white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:9px 0;font-family:${BRAND.sans};font-size:13px;color:${BRAND.textPrimary};border-bottom:1px solid ${BRAND.border};">${escapeHtml(value) || "&mdash;"}</td>
      </tr>`
    )
    .join("");

  const body = `
    <div style="display:inline-block;background:${BRAND.tealSoft};border:1px solid ${BRAND.teal};border-radius:999px;padding:5px 12px;font-family:${BRAND.sans};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.teal};margin-bottom:16px;">
      Retailer Login
    </div>
    <h1 style="margin:0 0 8px 0;font-family:${BRAND.serif};font-size:21px;font-weight:600;color:${BRAND.textPrimary};">
      ${escapeHtml(retailer.name) || "A retailer"} just signed in
    </h1>
    <p style="margin:0 0 22px 0;font-family:${BRAND.sans};font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">
      A retailer authenticated to the 57 Facets portal. Details below.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${rowsHtml}
    </table>`;

  const text = rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

  return {
    subject: `Retailer login: ${retailer.name || retailer.phone || "unknown"}`,
    html: baseLayout({ preheader: `${retailer.name || "A retailer"} signed in to the portal`, body }),
    text: `A retailer just logged in to the 57 Facets portal.\n\n${text}`,
  };
}

/**
 * Generic branded notification email — mirrors an in-app (bell) notification.
 * Used for order updates, account changes and admin messages.
 * @returns {{subject:string, html:string, text:string}}
 */
function notificationEmail({ title, message, actionPath, ctaLabel, name }) {
  const base = (process.env.CLIENT_ORIGIN || "https://57facets.in").replace(/\/$/, "");
  const url = actionPath ? `${base}${actionPath.startsWith("/") ? "" : "/"}${actionPath}` : null;
  const greeting = name ? `Hello ${escapeHtml(name)},` : "";

  const cta = url
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0 0;">
      <tr>
        <td align="center" style="border-radius:10px;background:${BRAND.teal};">
          <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 26px;font-family:${BRAND.sans};font-size:14px;font-weight:700;color:#04121a;text-decoration:none;border-radius:10px;">
            ${escapeHtml(ctaLabel || "View Details")}
          </a>
        </td>
      </tr>
    </table>`
    : "";

  const body = `
    <div style="display:inline-block;background:${BRAND.tealSoft};border:1px solid ${BRAND.teal};border-radius:999px;padding:5px 12px;font-family:${BRAND.sans};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.teal};margin-bottom:16px;">
      Notification
    </div>
    <h1 style="margin:0 0 ${greeting ? "8" : "12"}px 0;font-family:${BRAND.serif};font-size:21px;font-weight:600;color:${BRAND.textPrimary};">
      ${escapeHtml(title)}
    </h1>
    ${greeting ? `<p style="margin:0 0 10px 0;font-family:${BRAND.sans};font-size:14px;color:${BRAND.textSecondary};">${greeting}</p>` : ""}
    <p style="margin:0;font-family:${BRAND.sans};font-size:14px;line-height:1.7;color:${BRAND.textSecondary};white-space:pre-line;">
      ${escapeHtml(message)}
    </p>
    ${cta}`;

  const text = [title, "", message, url ? `\n${ctaLabel || "View"}: ${url}` : ""].join("\n");

  return {
    subject: title,
    html: baseLayout({ preheader: String(message || "").slice(0, 120), body }),
    text,
  };
}

/**
 * Order-received confirmation email sent to the retailer when they place an order.
 * @returns {{subject:string, html:string, text:string}}
 */
function orderPlacedEmail({ name, orderNumber, orderDate, itemCount, orderAmount, orderUrl, isINR = true }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const currency = isINR ? "₹" : "$";
  const amount = `${currency}${Number(orderAmount || 0).toLocaleString(isINR ? "en-IN" : "en-US")}`;

  const summary = [
    ["Order Number", orderNumber],
    ["Order Date", orderDate],
    ["Items", itemCount != null ? String(itemCount) : null],
    ["Order Value", amount],
    ["Status", "Under Review"],
  ];
  const rowsHtml = summary
    .map(([label, value]) => `
      <tr>
        <td style="padding:9px 16px 9px 0;font-family:${BRAND.sans};font-size:13px;color:${BRAND.textMuted};white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:9px 0;font-family:${BRAND.sans};font-size:13px;color:${BRAND.textPrimary};border-bottom:1px solid ${BRAND.border};">${escapeHtml(value) || "&mdash;"}</td>
      </tr>`)
    .join("");

  const subHeading = (txt) => `<p style="margin:26px 0 8px 0;font-family:${BRAND.serif};font-size:15px;font-weight:600;color:${BRAND.textPrimary};">${txt}</p>`;

  const cta = orderUrl
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0 0;">
      <tr>
        <td align="center" style="border-radius:10px;background:${BRAND.teal};">
          <a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:12px 26px;font-family:${BRAND.sans};font-size:14px;font-weight:700;color:#04121a;text-decoration:none;border-radius:10px;">
            View Order &rarr;
          </a>
        </td>
      </tr>
    </table>`
    : "";

  const body = `
    <div style="display:inline-block;background:${BRAND.tealSoft};border:1px solid ${BRAND.teal};border-radius:999px;padding:5px 12px;font-family:${BRAND.sans};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.teal};margin-bottom:16px;">
      Order Received
    </div>
    <h1 style="margin:0 0 12px 0;font-family:${BRAND.serif};font-size:21px;font-weight:600;color:${BRAND.textPrimary};">
      Thank you for your order
    </h1>
    <p style="margin:0 0 6px 0;font-family:${BRAND.sans};font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">${greeting}</p>
    <p style="margin:0;font-family:${BRAND.sans};font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">
      We&rsquo;ve received <strong style="color:${BRAND.textPrimary};">Order #${escapeHtml(orderNumber)}</strong>, and it has been submitted for review.
    </p>

    ${subHeading("Order Summary")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${rowsHtml}
    </table>

    ${subHeading("What happens next?")}
    <p style="margin:0;font-family:${BRAND.sans};font-size:14px;line-height:1.7;color:${BRAND.textSecondary};">
      Our team will review your order and notify you once it has been approved and moved to processing.
      You can track the latest status anytime from your dashboard.
    </p>
    ${cta}

    <p style="margin:26px 0 0 0;font-family:${BRAND.sans};font-size:13px;line-height:1.6;color:${BRAND.textMuted};">
      If you have any questions, feel free to contact us or reply to this email &mdash;
      <a href="mailto:contact@57facets.in" style="color:${BRAND.teal};text-decoration:none;">contact@57facets.in</a>.
    </p>
    <p style="margin:18px 0 0 0;font-family:${BRAND.sans};font-size:14px;color:${BRAND.textSecondary};">Thank you for choosing 57 Facets.</p>
    <p style="margin:4px 0 0 0;font-family:${BRAND.sans};font-size:14px;font-weight:600;color:${BRAND.textPrimary};">Team 57 Facets</p>`;

  const text = [
    greeting,
    "",
    "Thank you for your order.",
    "",
    `We've received Order #${orderNumber}, and it has been submitted for review.`,
    "",
    "Order Summary",
    `Order Number: ${orderNumber}`,
    `Order Date: ${orderDate}`,
    `Items: ${itemCount}`,
    `Order Value: ${amount}`,
    "Status: Under Review",
    "",
    "What happens next?",
    "Our team will review your order and notify you once it has been approved and moved to processing. You can track the latest status anytime from your dashboard.",
    orderUrl ? `\nView Order: ${orderUrl}` : "",
    "",
    "If you have any questions, feel free to contact us or reply to this email — contact@57facets.in.",
    "",
    "Thank you for choosing 57 Facets.",
    "Team 57 Facets",
  ].join("\n");

  return {
    subject: `Order ${orderNumber} received — 57 Facets`,
    html: baseLayout({ preheader: `We've received order ${orderNumber} — it's under review.`, body }),
    text,
  };
}

// ── Shared builders for the transactional order emails ──────────────────────
function tplBadge(txt, color = BRAND.teal, soft = BRAND.tealSoft) {
  return `<div style="display:inline-block;background:${soft};border:1px solid ${color};border-radius:999px;padding:5px 12px;font-family:${BRAND.sans};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${color};margin-bottom:16px;">${txt}</div>`;
}
function tplH1(txt) {
  return `<h1 style="margin:0 0 12px 0;font-family:${BRAND.serif};font-size:21px;font-weight:600;color:${BRAND.textPrimary};">${txt}</h1>`;
}
function tplP(html, muted = false) {
  return `<p style="margin:0 0 12px 0;font-family:${BRAND.sans};font-size:14px;line-height:1.7;color:${muted ? BRAND.textMuted : BRAND.textSecondary};">${html}</p>`;
}
function tplSubHead(txt) {
  return `<p style="margin:26px 0 8px 0;font-family:${BRAND.serif};font-size:15px;font-weight:600;color:${BRAND.textPrimary};">${txt}</p>`;
}
function tplRows(pairs) {
  return pairs
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([label, value]) => `
      <tr>
        <td style="padding:9px 16px 9px 0;font-family:${BRAND.sans};font-size:13px;color:${BRAND.textMuted};white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:9px 0;font-family:${BRAND.sans};font-size:13px;color:${BRAND.textPrimary};border-bottom:1px solid ${BRAND.border};">${escapeHtml(value) || "&mdash;"}</td>
      </tr>`)
    .join("");
}
function tplBtn(url, label) {
  if (!url) return "";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0 0;">
      <tr><td align="center" style="border-radius:10px;background:${BRAND.teal};">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 26px;font-family:${BRAND.sans};font-size:14px;font-weight:700;color:#04121a;text-decoration:none;border-radius:10px;">${escapeHtml(label)} &rarr;</a>
      </td></tr>
    </table>`;
}
function tplContactLine() {
  return `<p style="margin:26px 0 0 0;font-family:${BRAND.sans};font-size:13px;line-height:1.6;color:${BRAND.textMuted};">If you have any questions, feel free to contact us or reply to this email &mdash; <a href="mailto:contact@57facets.in" style="color:${BRAND.teal};text-decoration:none;">contact@57facets.in</a>.</p>`;
}
function tplSignoff(withThanks) {
  const thanks = withThanks ? `<p style="margin:18px 0 0 0;font-family:${BRAND.sans};font-size:14px;color:${BRAND.textSecondary};">Thank you for choosing 57 Facets.</p>` : "";
  return `${thanks}<p style="margin:${withThanks ? "4" : "18"}px 0 0 0;font-family:${BRAND.sans};font-size:14px;font-weight:600;color:${BRAND.textPrimary};">Team 57 Facets</p>`;
}

/** Order approved (admin accepted → processing). */
function orderApprovedEmail({ name, orderNumber, orderUrl }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const body = `
    ${tplBadge("Order Approved")}
    ${tplH1("Order Approved")}
    ${tplP(greeting)}
    ${tplP(`Good news! Your <strong style="color:${BRAND.textPrimary};">Order #${escapeHtml(orderNumber)}</strong> has been approved and is now moving to the next stage.`)}
    ${tplP("Our team will begin processing your order. We'll notify you once it has been dispatched along with the shipment details.")}
    ${tplP("You can track your order status anytime from your dashboard.")}
    ${tplBtn(orderUrl, "View Order")}
    ${tplContactLine()}
    ${tplSignoff(false)}`;
  const text = [
    greeting, "", `Good news! Your Order #${orderNumber} has been approved and is now moving to the next stage.`, "",
    "Our team will begin processing your order. We'll notify you once it has been dispatched along with the shipment details.", "",
    "You can track your order status anytime from your dashboard.",
    orderUrl ? `\nView Order: ${orderUrl}` : "", "",
    "If you have any questions, contact us or reply to contact@57facets.in.", "", "Team 57 Facets",
  ].join("\n");
  return { subject: `Order ${orderNumber} approved — 57 Facets`, html: baseLayout({ preheader: `Your order ${orderNumber} has been approved.`, body }), text };
}

/** Order shipped. estimatedDelivery / trackingUrl are optional. */
function orderShippedEmail({ name, orderNumber, shipmentDate, estimatedDelivery, trackingUrl, orderUrl }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const body = `
    ${tplBadge("Order Shipped")}
    ${tplH1("Your order is on its way!")}
    ${tplP(greeting)}
    ${tplP(`We're pleased to let you know that <strong style="color:${BRAND.textPrimary};">Order #${escapeHtml(orderNumber)}</strong> has been shipped.`)}
    ${tplSubHead("Shipment Details")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${tplRows([["Order Number", orderNumber], ["Shipment Date", shipmentDate], ["Estimated Delivery", estimatedDelivery]])}
    </table>
    ${trackingUrl ? `${tplP("You can track your shipment using the link below.")}${tplBtn(trackingUrl, "Track Shipment")}` : ""}
    ${tplP("You can view your order and shipment status anytime from your dashboard.")}
    ${tplBtn(orderUrl, "View Order")}
    ${tplContactLine()}
    ${tplSignoff(true)}`;
  const text = [
    greeting, "", "Your order is on its way!", "", `Order #${orderNumber} has been shipped.`, "",
    "Shipment Details", `Order Number: ${orderNumber}`, `Shipment Date: ${shipmentDate || "—"}`,
    estimatedDelivery ? `Estimated Delivery: ${estimatedDelivery}` : "",
    trackingUrl ? `\nTrack Shipment: ${trackingUrl}` : "",
    orderUrl ? `View Order: ${orderUrl}` : "", "",
    "Questions? Contact us or reply to contact@57facets.in.", "", "Thank you for choosing 57 Facets.", "Team 57 Facets",
  ].filter((l) => l !== "").join("\n");
  return { subject: `Order ${orderNumber} shipped — 57 Facets`, html: baseLayout({ preheader: `Order ${orderNumber} is on its way.`, body }), text };
}

/** Retailer's edit request approved — order temporarily unlocked. */
function orderEditUnlockedEmail({ name, orderNumber, editOrderUrl }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const steps = ["Review and update your order.", "Submit the revised order once you're done.", "We'll continue processing your order after the updated version is received."]
    .map((s) => `<li style="margin:0 0 6px 0;font-family:${BRAND.sans};font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">${s}</li>`).join("");
  const body = `
    ${tplBadge("Edit Approved")}
    ${tplH1("You can now edit your order")}
    ${tplP(greeting)}
    ${tplP(`Your request to edit <strong style="color:${BRAND.textPrimary};">Order #${escapeHtml(orderNumber)}</strong> has been approved.`)}
    ${tplP("The order has been temporarily unlocked, and you can now make the required changes.")}
    ${tplSubHead("What's Next?")}
    <ul style="margin:0;padding:0 0 0 18px;">${steps}</ul>
    ${tplBtn(editOrderUrl, "Edit Order")}
    ${tplP(`<strong style="color:${BRAND.textSecondary};">Note:</strong> Your order will remain on hold until the revised order is submitted.`, true)}
    <p style="margin:16px 0 0 0;font-family:${BRAND.sans};font-size:13px;line-height:1.6;color:${BRAND.textMuted};">If you need any assistance, please contact your relationship manager or reply to this email.</p>
    ${tplSignoff(false)}`;
  const text = [
    greeting, "", `Your request to edit Order #${orderNumber} has been approved.`, "",
    "The order has been temporarily unlocked, and you can now make the required changes.", "",
    "What's Next?", "- Review and update your order.", "- Submit the revised order once you're done.", "- We'll continue processing your order after the updated version is received.",
    editOrderUrl ? `\nEdit Order: ${editOrderUrl}` : "", "",
    "Note: Your order will remain on hold until the revised order is submitted.", "",
    "If you need any assistance, please contact your relationship manager or reply to this email.", "", "Team 57 Facets",
  ].join("\n");
  return { subject: `Edit approved for Order ${orderNumber} — 57 Facets`, html: baseLayout({ preheader: `Order ${orderNumber} is unlocked for editing.`, body }), text };
}

/** Order cancelled by the team. reason optional. */
function orderCancelledEmail({ name, orderNumber, cancelledDate, cancellationReason, ordersUrl }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const red = "#ef4444";
  const reason = cancellationReason && String(cancellationReason).trim() ? cancellationReason : "No specific reason was provided.";
  const body = `
    ${tplBadge("Order Cancelled", red, "rgba(239,68,68,0.12)")}
    ${tplH1("Order Cancelled")}
    ${tplP(greeting)}
    ${tplP(`We're writing to let you know that <strong style="color:${BRAND.textPrimary};">Order #${escapeHtml(orderNumber)}</strong> has been cancelled by our team.`)}
    ${tplSubHead("Order Details")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${tplRows([["Order Number", orderNumber], ["Cancelled On", cancelledDate], ["Status", "Cancelled"]])}
    </table>
    ${tplSubHead("Reason for Cancellation")}
    ${tplP(escapeHtml(reason))}
    ${tplP("If you'd like to place a new order or have any questions regarding this cancellation, please contact your relationship manager or reply to this email. We'll be happy to assist you.")}
    ${tplBtn(ordersUrl, "View Orders")}
    <p style="margin:18px 0 0 0;font-family:${BRAND.sans};font-size:14px;color:${BRAND.textSecondary};">Thank you for your understanding.</p>
    ${tplSignoff(false)}`;
  const text = [
    greeting, "", `We're writing to let you know that Order #${orderNumber} has been cancelled by our team.`, "",
    "Order Details", `Order Number: ${orderNumber}`, `Cancelled On: ${cancelledDate || "—"}`, "Status: Cancelled", "",
    `Reason for Cancellation: ${reason}`, "",
    "If you'd like to place a new order or have any questions regarding this cancellation, please contact your relationship manager or reply to this email.",
    ordersUrl ? `\nView Orders: ${ordersUrl}` : "", "", "Thank you for your understanding.", "Team 57 Facets",
  ].join("\n");
  return { subject: `Order ${orderNumber} cancelled — 57 Facets`, html: baseLayout({ preheader: `Order ${orderNumber} has been cancelled.`, body }), text };
}

module.exports = {
  otpEmail, loginAlertEmail, notificationEmail, orderPlacedEmail,
  orderApprovedEmail, orderShippedEmail, orderEditUnlockedEmail, orderCancelledEmail,
};
