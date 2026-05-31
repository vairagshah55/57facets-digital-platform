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

          <!-- Header / wordmark -->
          <tr>
            <td align="center" style="padding:8px 0 24px 0;">
              <div style="font-family:${BRAND.sans};font-size:26px;line-height:1;color:${BRAND.teal};">&#9670;</div>
              <div style="font-family:${BRAND.serif};font-size:22px;font-weight:600;letter-spacing:2px;color:${BRAND.textPrimary};margin-top:10px;">
                57&nbsp;FACETS
              </div>
              <div style="font-family:${BRAND.sans};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.teal};margin-top:6px;">
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
function loginAlertEmail({ retailer, method, ip, when }) {
  const rows = [
    ["Name", retailer.name],
    ["Company", retailer.company_name],
    ["Phone", retailer.phone],
    ["Email", retailer.email],
    ["Method", method === "email" ? "Email + OTP" : "Phone + OTP"],
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

module.exports = { otpEmail, loginAlertEmail };
