const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const { query, getClient } = require("../config/db");
const { uploadFile } = require("../utils/gcsUpload");
const AppError = require("../utils/AppError");

// ── XLSX parsing helpers (moved verbatim from admin.product.routes.js) ──────
// Decode the XML entities that appear in shared/inline strings.
function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&amp;/g, "&"); // keep last so we don't double-decode
}

// "AB12" → 0-based column index (AB → 27).
function colRefToIndex(ref) {
  const m = /^([A-Z]+)/.exec(ref);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// Pull the text out of <t>…</t> runs inside a chunk of cell/si XML.
function extractTextRuns(xml) {
  const parts = xml.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
  return decodeXmlEntities(parts.map((p) => p.replace(/<t[^>]*>([\s\S]*?)<\/t>/, "$1")).join(""));
}

function parseXlsx(buffer) {
  const zip = new AdmZip(buffer);
  const read = (name) => {
    const e = zip.getEntry(name);
    return e ? e.getData().toString("utf-8") : "";
  };

  // Shared-strings table (most text cells reference it by index)
  const shared = [];
  const ssXml = read("xl/sharedStrings.xml");
  if (ssXml) {
    const siMatches = ssXml.match(/<si\b[^>]*?(?:\/>|>[\s\S]*?<\/si>)/g) || [];
    for (const si of siMatches) shared.push(extractTextRuns(si));
  }

  // First worksheet (prefer sheet1.xml, else any worksheet part)
  let sheetPath = "xl/worksheets/sheet1.xml";
  if (!zip.getEntry(sheetPath)) {
    const entry = zip.getEntries().find((e) => /^xl\/worksheets\/.*\.xml$/i.test(e.entryName));
    if (entry) sheetPath = entry.entryName;
  }
  const sheetXml = read(sheetPath);
  if (!sheetXml) throw new AppError("Could not read a worksheet from the .xlsx file");

  const rows = [];
  const rowMatches = sheetXml.match(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g) || [];
  for (const rowXml of rowMatches) {
    const cells = [];
    let maxIdx = -1;
    const cellMatches = rowXml.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || [];
    for (const cXml of cellMatches) {
      const refM = /\br="([A-Z]+\d+)"/.exec(cXml);
      const idx = refM ? colRefToIndex(refM[1]) : cells.length;
      const typeM = /\bt="([^"]+)"/.exec(cXml);
      const type = typeM ? typeM[1] : "n";

      let value = "";
      if (type === "inlineStr") {
        const isM = /<is>([\s\S]*?)<\/is>/.exec(cXml);
        if (isM) value = extractTextRuns(isM[1]);
      } else {
        const vM = /<v>([\s\S]*?)<\/v>/.exec(cXml);
        const raw = vM ? vM[1] : "";
        if (type === "s") value = shared[parseInt(raw, 10)] || "";
        else if (type === "b") value = raw === "1" ? "true" : "false";
        else if (type === "str") value = decodeXmlEntities(raw);
        else value = raw; // number — kept as text; the importer parses as needed
      }
      cells[idx] = value;
      if (idx > maxIdx) maxIdx = idx;
    }
    for (let i = 0; i <= maxIdx; i++) if (cells[i] === undefined) cells[i] = "";
    rows.push(cells);
  }
  return rows;
}

/**
 * Process a product-import file end-to-end. Reads the file from disk, parses
 * CSV/XLSX/ZIP, and inserts products/diamonds/stones/images inside a single
 * transaction (per-row savepoints so one bad row doesn't abort the batch).
 *
 * This is the exact logic that used to run inline in the import-csv route,
 * extracted so both the (now async) route's worker and any script can call it.
 *
 * @param {object}   opts
 * @param {string}   opts.filePath      Absolute path to the uploaded file on disk.
 * @param {string}   opts.originalName  Original filename (used to detect type).
 * @param {string}   opts.adminId       Admin id for the activity_log entry.
 * @param {function} [opts.onProgress]  Called as ({ processed, total }) during the run.
 * @returns {Promise<{imported,skipped,imagesImported,diamondsImported,stonesImported,errors,total}>}
 */
async function processImport({ filePath, originalName, adminId, onProgress }) {
  const buffer = fs.readFileSync(filePath);
  const client = await getClient();
  try {
    const imageFiles = new Map(); // filename -> Buffer
    const lowerName = (originalName || "").toLowerCase();
    const isXlsx = lowerName.endsWith(".xlsx");
    const isZip = !isXlsx && lowerName.endsWith(".zip");

    // CSV text → 2-D array of cell strings (one row per array)
    const parseCsvRow = (line) => {
      const cols = [];
      let cur = "";
      let inQuote = false;
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === "," && !inQuote) { cols.push(cur); cur = ""; continue; }
        cur += ch;
      }
      cols.push(cur);
      return cols;
    };
    const parseCsvText = (text) =>
      text
        .replace(/[﻿\xEF\xBB\xBF]/g, "")
        .trim()
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map(parseCsvRow);

    // Normalise whatever was uploaded into rows[][] + an optional image map
    let rows;
    if (isZip) {
      const zip = new AdmZip(buffer);
      let csvEntry = null;
      let xlsxEntry = null;
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        const name = entry.entryName.split("/").pop().toLowerCase();
        if (name.endsWith(".csv") && !csvEntry) csvEntry = entry;
        else if (name.endsWith(".xlsx") && !xlsxEntry) xlsxEntry = entry;
        else if (/\.(jpg|jpeg|png|webp|avif)$/i.test(name)) imageFiles.set(name, entry.getData());
      }
      if (csvEntry) rows = parseCsvText(csvEntry.getData().toString("utf-8"));
      else if (xlsxEntry) rows = parseXlsx(xlsxEntry.getData());
      else throw new AppError("ZIP must contain a CSV or XLSX file");
    } else if (isXlsx) {
      rows = parseXlsx(buffer);
    } else {
      rows = parseCsvText(buffer.toString("utf-8"));
    }

    if (!rows || rows.length < 2) {
      throw new AppError("File must have a header row and at least one data row");
    }

    // Parse header — strip BOM, quotes, whitespace aggressively
    const headers = rows[0].map((h) => {
      const cleaned = (h == null ? "" : String(h))
        .replace(/[﻿\xEF\xBB\xBF]/g, "")
        .replace(/^"|"$/g, "")
        .trim()
        .toLowerCase();
      return cleaned.split(/\s+-\s+/)[0].trim();
    });
    const col = (name) => headers.indexOf(name);
    const colNth = (name, nth) => { let c = 0; for (let k = 0; k < headers.length; k++) { if (headers[k] === name) { if (c === nth) return k; c++; } } return -1; };
    const colAny = (...names) => { for (const n of names) { const i = headers.indexOf(n); if (i !== -1) return i; } return -1; };
    const mfgIdx     = colAny("mfg_code", "mfg code", "mfg");
    const grossWtIdx = colAny("gross_weight", "gross weight");
    const netWtIdx   = colAny("net_weight", "net weight");
    const diaSizeIdx = colAny("diamond_size", "diamond size");
    const diaPcsIdx  = colAny("diamond_pcs") !== -1 ? colAny("diamond_pcs") : colNth("pcs", 0);
    const csPcsIdx   = colAny("color_stone_pcs", "cs_pcs") !== -1 ? colAny("color_stone_pcs", "cs_pcs") : colNth("pcs", 1);
    const csCaratIdx = colAny("color_stone_carat", "cs_carat") !== -1 ? colAny("color_stone_carat", "cs_carat") : colNth("carat", 1);
    const metalWtIdx = col("metal_weight") !== -1 ? col("metal_weight") : netWtIdx;
    const typeCatIdx = colAny("type_category", "type category");
    const subCatIdx  = colAny("sub_category", "sub category");

    if (col("sku") === -1) throw new AppError("File must have a 'sku' column");

    // Helpers
    const getVal = (cols, idx) => {
      if (idx < 0 || idx >= cols.length) return null;
      const v = (cols[idx] == null ? "" : String(cols[idx])).replace(/^"|"$/g, "").trim();
      return v || null;
    };
    const getNum = (cols, idx) => {
      const v = getVal(cols, idx);
      if (!v) return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };
    const normAvailability = (cols) => {
      const raw = (getVal(cols, col("availability")) || "").toLowerCase().replace(/[\s_]+/g, "-");
      if (!raw) return "in-stock";
      if (raw.includes("made") || raw === "mto" || raw.includes("order")) return "made-to-order";
      if (raw.includes("out") || raw.includes("sold") || raw === "oos" || raw.includes("unavailable")) return "out-of-stock";
      return "in-stock";
    };
    const normBool = (cols, name) => {
      const v = (getVal(cols, col(name)) || "").toLowerCase();
      return v === "true" || v === "yes" || v === "y" || v === "1";
    };

    await client.query("BEGIN");
    let imported = 0;
    let skipped = 0;
    let imagesImported = 0;
    let diamondsImported = 0;
    let stonesImported = 0;
    const errors = [];
    let currentProductId = null;
    let currentDiaOrder = 0;
    let currentStoneOrder = 0;

    // Skip the hint/example row (row 2 of the template) if present
    const startRow = rows.length > 2 && rows[1].join(" ").toLowerCase().includes("e.g.") ? 2 : 1;
    const total = rows.length - startRow;

    for (let i = startRow; i < rows.length; i++) {
      const cols = rows[i];

      const name = getVal(cols, col("name")); // optional
      const sku = getVal(cols, col("sku"));

      const dia = {
        diamond_type: getVal(cols, col("diamond_type")),
        diamond_shape: getVal(cols, col("diamond_shape")),
        diamond_color: getVal(cols, col("diamond_color")),
        diamond_clarity: getVal(cols, col("diamond_clarity")),
        diamond_certification: getVal(cols, col("diamond_certification")),
        carat: getNum(cols, col("carat")),
        diamond_size: getVal(cols, diaSizeIdx),
        diamond_pcs: getNum(cols, diaPcsIdx),
      };
      const diaHas = !!(dia.diamond_type || dia.diamond_shape || dia.diamond_color || dia.diamond_clarity || dia.diamond_certification || dia.carat != null || dia.diamond_size || dia.diamond_pcs != null);
      if (diaHas && !dia.diamond_certification) dia.diamond_certification = "GSI";

      const stone = {
        stone_name: getVal(cols, col("color_stone_name")),
        quality: getVal(cols, col("color_stone_quality")),
        carat: getNum(cols, csCaratIdx),
        pcs: getNum(cols, csPcsIdx),
      };
      const stoneHas = !!(stone.stone_name || stone.quality || stone.carat != null || stone.pcs != null);

      // No SKU → continuation row: extra diamond and/or stone for the most-recent product.
      if (!sku) {
        if (currentProductId && (diaHas || stoneHas)) {
          if (diaHas) {
            await client.query("SAVEPOINT dia_sp");
            try {
              await client.query(
                `INSERT INTO product_diamonds (product_id, diamond_type, diamond_shape, diamond_color, diamond_clarity, diamond_certification, carat, diamond_size, diamond_pcs, sort_order)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                [currentProductId, dia.diamond_type, dia.diamond_shape, dia.diamond_color, dia.diamond_clarity, dia.diamond_certification, dia.carat, dia.diamond_size, dia.diamond_pcs, currentDiaOrder++]
              );
              await client.query("RELEASE SAVEPOINT dia_sp");
              diamondsImported++;
            } catch { await client.query("ROLLBACK TO SAVEPOINT dia_sp"); }
          }
          if (stoneHas) {
            await client.query("SAVEPOINT stn_sp");
            try {
              await client.query(
                `INSERT INTO product_stones (product_id, stone_name, quality, carat, pcs, sort_order)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [currentProductId, stone.stone_name, stone.quality, stone.carat, stone.pcs, currentStoneOrder++]
              );
              await client.query("RELEASE SAVEPOINT stn_sp");
              stonesImported++;
            } catch { await client.query("ROLLBACK TO SAVEPOINT stn_sp"); }
          }
        } else {
          skipped++;
        }
        if (onProgress) await onProgress({ processed: i - startRow + 1, total });
        continue;
      }

      // Duplicate handling — active SKU conflicts are skipped; inactive ones are freed.
      const { rows: existSku } = await client.query("SELECT id, is_active FROM products WHERE sku = $1", [sku]);
      let freeInactiveId = null;
      if (existSku.length > 0) {
        if (existSku[0].is_active) {
          skipped++;
          errors.push({ row: i + 1, reason: `Duplicate SKU (${sku})` });
          if (onProgress) await onProgress({ processed: i - startRow + 1, total });
          continue;
        }
        freeInactiveId = existSku[0].id;
      }

      // Isolate each row in a savepoint so one bad row skips instead of aborting.
      await client.query("SAVEPOINT row_sp");
      try {
        if (freeInactiveId) {
          await client.query(
            "UPDATE products SET sku = sku || '_deleted_' || id, updated_at = NOW() WHERE id = $1",
            [freeInactiveId]
          );
        }

        // Resolve category name to id — create if not exists (case/plural-insensitive).
        let category_id = null;
        const catName = getVal(cols, col("category"));
        if (catName) {
          const { rows: cats } = await client.query(
            `SELECT id FROM categories
             WHERE lower(name) = lower($1)
                OR lower(name) = lower($1) || 's'
                OR lower(name) || 's' = lower($1)
             ORDER BY (lower(name) = lower($1)) DESC LIMIT 1`,
            [catName]);
          if (cats.length > 0) {
            category_id = cats[0].id;
          } else {
            const { rows: maxSort } = await client.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories");
            const { rows: newCat } = await client.query(
              "INSERT INTO categories (name, sort_order) VALUES ($1, $2) RETURNING id",
              [catName, maxSort[0].next]
            );
            category_id = newCat[0].id;
          }
        }

        const { rows: inserted } = await client.query(
          `INSERT INTO products (
            name, sku, description, category_id, base_price,
            metal_type, gold_colour, metal_weight, diamond_type, diamond_shape,
            diamond_color, diamond_clarity, diamond_certification, carat,
            color_stone_name, color_stone_quality,
            availability, max_order_qty, is_new, occasion_tags,
            mfg_code, gross_weight, net_weight, diamond_size, diamond_pcs,
            color_stone_carat, color_stone_pcs, type_category, sub_category
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
            $21,$22,$23,$24,$25,$26,$27,$28,$29
          ) RETURNING id`,
          [
            name || "", sku,
            getVal(cols, col("description")),
            category_id,
            getNum(cols, col("base_price")) || 0,
            getVal(cols, col("metal_type")),
            getVal(cols, col("gold_colour")),
            getNum(cols, metalWtIdx),
            getVal(cols, col("diamond_type")),
            getVal(cols, col("diamond_shape")),
            getVal(cols, col("diamond_color")),
            getVal(cols, col("diamond_clarity")),
            dia.diamond_certification,
            getNum(cols, col("carat")),
            getVal(cols, col("color_stone_name")),
            getVal(cols, col("color_stone_quality")),
            normAvailability(cols),
            getNum(cols, col("max_order_qty")) || 100,
            normBool(cols, "is_new"),
            getVal(cols, col("occasion_tags")) ? `{${getVal(cols, col("occasion_tags")).split(",").map((t) => `"${t.trim()}"`).join(",")}}` : "{}",
            getVal(cols, mfgIdx),
            getNum(cols, grossWtIdx),
            getNum(cols, netWtIdx),
            dia.diamond_size,
            dia.diamond_pcs,
            getNum(cols, csCaratIdx),
            getNum(cols, csPcsIdx),
            getVal(cols, typeCatIdx),
            getVal(cols, subCatIdx),
          ]
        );

        const productId = inserted[0].id;
        currentProductId = productId;
        currentDiaOrder = 0;
        currentStoneOrder = 0;

        if (diaHas) {
          await client.query(
            `INSERT INTO product_diamonds (product_id, diamond_type, diamond_shape, diamond_color, diamond_clarity, diamond_certification, carat, diamond_size, diamond_pcs, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [productId, dia.diamond_type, dia.diamond_shape, dia.diamond_color, dia.diamond_clarity, dia.diamond_certification, dia.carat, dia.diamond_size, dia.diamond_pcs, currentDiaOrder++]
          );
          diamondsImported++;
        }

        if (stoneHas) {
          await client.query(
            `INSERT INTO product_stones (product_id, stone_name, quality, carat, pcs, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [productId, stone.stone_name, stone.quality, stone.carat, stone.pcs, currentStoneOrder++]
          );
          stonesImported++;
        }

        // Handle images from ZIP — CSV column "images" has comma-separated filenames
        const imagesVal = getVal(cols, col("images"));
        let rowImages = 0;
        if (imagesVal && imageFiles.size > 0) {
          const fileNames = imagesVal.split(",").map((f) => f.trim()).filter(Boolean);
          let sortOrder = 0;
          for (const fn of fileNames) {
            const fnLower = fn.toLowerCase();
            const buf = imageFiles.get(fnLower);
            if (!buf) continue;
            const ext = path.extname(fnLower);
            const diskName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
            const imageUrl = await uploadFile(buf, `products/${diskName}`, 'image/jpeg');
            await client.query(
              `INSERT INTO product_images (product_id, image_url, is_primary, sort_order, media_type)
               VALUES ($1, $2, $3, $4, 'image')`,
              [productId, imageUrl, sortOrder === 0, sortOrder]
            );
            sortOrder++;
            rowImages++;
          }
        }

        await client.query("RELEASE SAVEPOINT row_sp");
        imported++;
        imagesImported += rowImages;
      } catch (rowErr) {
        await client.query("ROLLBACK TO SAVEPOINT row_sp");
        skipped++;
        errors.push({
          row: i + 1,
          reason: rowErr.code === "23505"
            ? `Duplicate SKU (${sku})`
            : rowErr.message || "Row failed to import",
        });
      }

      if (onProgress) await onProgress({ processed: i - startRow + 1, total });
    }

    await client.query("COMMIT");

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, details)
       VALUES ('admin', $1, 'products_csv_import', $2)`,
      [adminId, JSON.stringify({ imported, skipped, imagesImported })]
    );

    return { imported, skipped, imagesImported, diamondsImported, stonesImported, errors, total };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { processImport };
