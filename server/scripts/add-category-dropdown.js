// One-off: regenerate the product-import template (client/public/product_import_template.xlsx)
// adding an Excel data-validation DROPDOWN on the "category" column (column E) so importers
// pick a valid category (Bangles/Rings/…) instead of free-typing "RING" / "ring" / "rings".
// Also fixes the sample rows that say "RING" -> "Rings".
// Uses only adm-zip (already a dependency) — no Excel-writing library needed.

const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const TEMPLATE = path.join(__dirname, "../../client/public/product_import_template.xlsx");

(async () => {
  // 1) Live category list from the DB (alphabetical, matches the catalog).
  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "facets57",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "root",
  });
  const { rows } = await pool.query("SELECT name FROM categories ORDER BY name");
  await pool.end();
  const categories = rows.map((r) => r.name);
  if (!categories.length) throw new Error("No categories found in DB");
  const list = categories.join(","); // inline Excel list (must be < 255 chars)
  if (list.length > 250) throw new Error("Category list too long for an inline dropdown");
  console.log("Categories:", list);

  // 2) Open the existing template.
  const zip = new AdmZip(fs.readFileSync(TEMPLATE));

  // 3) Fix sample data: shared string "RING" -> "Rings" (only used in the category column).
  const ssEntry = zip.getEntry("xl/sharedStrings.xml");
  let ss = ssEntry.getData().toString("utf-8");
  ss = ss.replace("<t>RING</t>", "<t>Rings</t>");
  zip.updateFile("xl/sharedStrings.xml", Buffer.from(ss, "utf-8"));

  // 4) Inject the category dropdown into the worksheet (column E, rows 2..1000).
  const sheetEntry = zip.getEntry("xl/worksheets/sheet1.xml");
  let sheet = sheetEntry.getData().toString("utf-8");
  if (sheet.includes("<dataValidations")) {
    console.log("Worksheet already has dataValidations — removing the old block first.");
    sheet = sheet.replace(/<dataValidations[\s\S]*?<\/dataValidations>/, "");
  }
  const dv =
    `<dataValidations count="1">` +
    `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" ` +
    `errorTitle="Invalid category" error="Pick a category from the list." ` +
    `promptTitle="Category" prompt="Choose from the dropdown." sqref="E2:E1000">` +
    `<formula1>&quot;${list}&quot;</formula1>` +
    `</dataValidation></dataValidations>`;
  // dataValidations must sit AFTER </sheetData> and BEFORE <pageMargins>.
  sheet = sheet.replace("</sheetData>", "</sheetData>" + dv);
  zip.updateFile("xl/worksheets/sheet1.xml", Buffer.from(sheet, "utf-8"));

  // 5) Write back.
  zip.writeZip(TEMPLATE);
  console.log("Updated template:", TEMPLATE);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
