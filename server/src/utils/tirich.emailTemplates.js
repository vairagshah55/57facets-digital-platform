// ════════════════════════════════════════════════════════════
//  Tirich LED — branded HTML email templates
//  Table-based + inline styles for broad email-client support
//  (Gmail, Outlook, Apple Mail). No external CSS.
//
//  Brand: deep indigo (#262262) + orange accent (#F7941E),
//  light theme to match the Tirich LED wordmark.
// ════════════════════════════════════════════════════════════

const BRAND = {
  name: "Tirich LED",
  navy: "#262262",
  navyDark: "#1B1848",
  orange: "#F7941E",
  orangeSoft: "rgba(247,148,30,0.12)",
  bgOuter: "#EEF0F5",
  card: "#FFFFFF",
  inset: "#F7F8FB",
  border: "#E6E8F0",
  textPrimary: "#262262",
  textSecondary: "#5B5F73",
  textMuted: "#9499AB",
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

// Hosted Tirich LED logo for the email header. Override with TIRICH_LOGO_URL.
// (TIRICH_ORIGIN is a comma-separated CORS list, so it can't be used here.)
function logoUrl() {
  return (
    process.env.TIRICH_LOGO_URL ||
    "https://tirichled.com/static/media/new-log.65854486a9cce2439cdd.webp"
  ).trim();
}

/**
 * Branded shell: light background, centered card, logo header, footer.
 *
 * @param {Object} opts
 * @param {string} opts.preheader  hidden inbox-preview text
 * @param {string} opts.body       inner HTML (the card's content area)
 */
function baseLayout({ preheader = "", body = "" }) {
  const year = new Date().getFullYear();
  const logo = logoUrl();

  // Logo as image when the origin is known, else a styled text wordmark.
  const header = logo
    ? `<img src="${logo}" alt="Tirich LED" width="150" style="display:block;width:150px;max-width:60%;height:auto;border:0;outline:none;text-decoration:none;">`
    : `<div style="font-family:${BRAND.sans};font-size:28px;font-weight:800;letter-spacing:1px;color:${BRAND.navy};">
         tiric<span style="color:${BRAND.orange};">h</span>
         <span style="font-size:13px;font-weight:700;letter-spacing:3px;color:${BRAND.orange};vertical-align:middle;">LED</span>
       </div>`;

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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">

          <!-- Header / logo -->
          <tr>
            <td align="center" style="padding:8px 0 22px 0;">
              ${header}
              <div style="font-family:${BRAND.sans};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.textMuted};margin-top:12px;">
                Precision LED Lighting
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(38,34,98,0.06);">
              <!-- Accent bar -->
              <div style="height:4px;background:${BRAND.orange};line-height:4px;font-size:0;">&nbsp;</div>
              <div style="padding:34px 32px;">
                ${body}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:22px 16px 8px 16px;">
              <p style="margin:0;font-family:${BRAND.sans};font-size:11px;line-height:1.6;color:${BRAND.textMuted};">
                Automated lead notification from the Tirich LED website.
              </p>
              <p style="margin:8px 0 0 0;font-family:${BRAND.sans};font-size:11px;color:${BRAND.textMuted};">
                &copy; ${year} Tirich LED. All rights reserved.
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
 * Lead-notification email sent to the Tirich team when a visitor
 * submits the catalogue lead-capture form.
 *
 * @param {Object} opts
 * @param {string} opts.name
 * @param {string} opts.phone
 * @param {string} opts.city
 * @param {string} opts.businessLabel    human-readable business type
 * @param {string} opts.designationLabel human-readable designation
 * @returns {{subject:string, html:string, text:string}}
 */
function leadNotificationEmail({ name, phone, city, businessLabel, designationLabel }) {
  const rows = [
    ["Name", name],
    ["Phone", phone],
    ["City", city],
    ["Business", businessLabel],
    ["Designation", designationLabel],
  ];

  const rowsHtml = rows
    .map(
      ([label, value], i) => `
      <tr>
        <td style="padding:12px 16px;font-family:${BRAND.sans};font-size:13px;color:${BRAND.textMuted};white-space:nowrap;vertical-align:top;width:120px;${i === 0 ? "" : `border-top:1px solid ${BRAND.border};`}">${label}</td>
        <td style="padding:12px 16px;font-family:${BRAND.sans};font-size:14px;font-weight:600;color:${BRAND.textPrimary};${i === 0 ? "" : `border-top:1px solid ${BRAND.border};`}">${escapeHtml(value) || "&mdash;"}</td>
      </tr>`
    )
    .join("");

  // Sanitised tel: target — digits and a leading + only.
  const telHref = `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;

  const body = `
    <div style="display:inline-block;background:${BRAND.orangeSoft};border:1px solid ${BRAND.orange};border-radius:999px;padding:5px 13px;font-family:${BRAND.sans};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.orange};margin-bottom:16px;">
      New Lead
    </div>
    <h1 style="margin:0 0 8px 0;font-family:${BRAND.sans};font-size:22px;font-weight:700;color:${BRAND.textPrimary};line-height:1.3;">
      ${escapeHtml(name) || "A new contact"} just requested the catalogue
    </h1>
    <p style="margin:0 0 24px 0;font-family:${BRAND.sans};font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">
      A visitor submitted the lead-capture form to download the Tirich LED product catalogue. Their details are below &mdash; reach out while interest is fresh.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.inset};border:1px solid ${BRAND.border};border-radius:12px;">
      ${rowsHtml}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;">
      <tr>
        <td align="center">
          <a href="${telHref}" style="display:inline-block;background:${BRAND.navy};color:#FFFFFF;font-family:${BRAND.sans};font-size:14px;font-weight:600;text-decoration:none;padding:13px 30px;border-radius:8px;">
            Call ${escapeHtml(name) || "Lead"}
          </a>
        </td>
      </tr>
    </table>`;

  const text = rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

  return {
    subject: `New Tirich Lead: ${name || phone || "Unknown"}${city ? ` (${city})` : ""}`,
    html: baseLayout({
      preheader: `${name || "A visitor"} from ${city || "—"} requested the catalogue`,
      body,
    }),
    text: `New Tirich LED lead from the website catalogue request.\n\n${text}`,
  };
}

module.exports = { leadNotificationEmail };
