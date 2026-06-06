const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const { query, getClient } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");
const AppError = require("../utils/AppError");
const multer = require("multer");
const AdmZip = require("adm-zip");
const { uploadFile } = require("../utils/gcsUpload");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.use(adminAuth);

// ── GET /api/admin/products ────────────────────────
// List all products with filters
router.get("/", async (req, res, next) => {
  try {
    const { search, category, availability, is_new, page = 1, limit = 20 } = req.query;
    const conditions = ["p.is_active = true"];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.sku ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`c.name = $${idx++}`);
      params.push(category);
    }
    if (availability) {
      conditions.push(`p.availability = $${idx++}`);
      params.push(availability);
    }
    if (is_new === "true") {
      conditions.push("p.is_new = true");
    } else if (is_new === "false") {
      conditions.push("p.is_new = false");
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows } = await query(
      `SELECT p.id, p.name, p.sku, p.base_price, p.carat, p.metal_type,
              p.availability, p.is_new, p.is_active, p.min_order_qty, p.max_order_qty,
              p.lead_time_days, p.occasion_tags, p.created_at,
              c.name AS category,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image,
              (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS image_count,
              (SELECT COUNT(*) FROM recently_viewed rv WHERE rv.product_id = p.id) AS view_count,
              (SELECT COUNT(*) FROM wishlists w WHERE w.product_id = p.id) AS wishlist_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
      params
    );

    res.json({
      products: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countRows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/products/:id ────────────────────
// Full product detail for editing
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) throw new AppError("Product not found", 404);

    const { rows: images } = await query(
      "SELECT id, image_url AS url, is_primary, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order",
      [req.params.id]
    );

    // Collections this product belongs to
    const { rows: collections } = await query(
      `SELECT c.id, c.name FROM collection_products cp
       JOIN collections c ON c.id = cp.collection_id
       WHERE cp.product_id = $1`,
      [req.params.id]
    );

    // Stats
    const { rows: stats } = await query(
      `SELECT
        (SELECT COUNT(*) FROM recently_viewed WHERE product_id = $1) AS view_count,
        (SELECT COUNT(*) FROM wishlists WHERE product_id = $1) AS wishlist_count,
        (SELECT COUNT(*) FROM order_items WHERE product_id = $1) AS order_count`,
      [req.params.id]
    );

    res.json({ ...rows[0], images, collections, stats: stats[0] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/products ───────────────────────
// Create a new product
router.post("/", async (req, res, next) => {
  try {
    const {
      name, sku, description, category_id,
      base_price, carat, metal_type, gold_colour, metal_weight,
      diamond_type, diamond_shape, diamond_color, diamond_clarity,
      diamond_certification, setting_type, hallmark,
      width_mm, height_mm, availability,
      is_new, occasion_tags, gold_purity_options,
      carat_range_min, carat_range_max, finish_options,
      price_modifiers, lead_time_days,
      min_order_qty, max_order_qty,
      color_stone_name, color_stone_quality, carat_options,
      collection_ids,
    } = req.body;

    if (!name || !sku) throw new AppError("Name and SKU are required");

    // Check SKU uniqueness (only active products)
    const { rows: existing } = await query("SELECT id FROM products WHERE sku = $1 AND is_active = true", [sku]);
    if (existing.length > 0) throw new AppError("SKU already exists");

    const { rows } = await query(
      `INSERT INTO products (
        name, sku, description, category_id, base_price, carat,
        metal_type, gold_colour, metal_weight, diamond_type, diamond_shape,
        diamond_color, diamond_clarity, diamond_certification,
        setting_type, hallmark, width_mm, height_mm, availability,
        is_new, occasion_tags, gold_purity_options,
        carat_range_min, carat_range_max, finish_options,
        price_modifiers, lead_time_days, min_order_qty, max_order_qty,
        color_stone_name, color_stone_quality, carat_options
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
      ) RETURNING *`,
      [
        name, sku, description || null, category_id || null,
        base_price || 0, carat || 0, metal_type || null, gold_colour || null,
        metal_weight || null,
        diamond_type || null, diamond_shape || null, diamond_color || null,
        diamond_clarity || null, diamond_certification || null,
        setting_type || null, hallmark || null, width_mm || null, height_mm || null,
        availability || "in-stock", is_new || false,
        occasion_tags || [], gold_purity_options || [],
        carat_range_min || null, carat_range_max || null, finish_options || [],
        price_modifiers ? JSON.stringify(price_modifiers) : "{}",
        lead_time_days || null, min_order_qty || 1, max_order_qty || 100,
        color_stone_name || null, color_stone_quality || null,
        Array.isArray(carat_options) && carat_options.length ? JSON.stringify(carat_options) : null,
      ]
    );

    // Link to collections
    if (Array.isArray(collection_ids)) {
      for (const colId of collection_ids) {
        await query(
          "INSERT INTO collection_products (collection_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [colId, rows[0].id]
        );
      }
    }

    // Activity log
    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'product_created', 'product', $2, $3)`,
      [req.admin.id, rows[0].id, JSON.stringify({ name, sku })]
    );

    // Notify all active retailers about new product
    const { rows: retailers } = await query("SELECT id FROM retailers WHERE is_active = true");
    if (retailers.length > 0) {
      await query(
        `INSERT INTO notifications (retailer_id, type, title, message, action_path) VALUES ${
          retailers.map((_, i) => `($${i * 4 + 1},'new-collection',$${i * 4 + 2},$${i * 4 + 3},$${i * 4 + 4})`).join(",")
        }`,
        retailers.flatMap((r) => [r.id, "New Product Added", `${name} has been added to the catalog. Check it out!`, `/retailer/product/${rows[0].id}`])
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/products/:id ────────────────────
// Update product
router.put("/:id", async (req, res, next) => {
  try {
    const {
      name, description, category_id,
      base_price, carat, metal_type, gold_colour, metal_weight,
      diamond_type, diamond_shape, diamond_color, diamond_clarity,
      diamond_certification, setting_type, hallmark,
      width_mm, height_mm, availability, is_new, is_active,
      occasion_tags, gold_purity_options,
      carat_range_min, carat_range_max, finish_options,
      price_modifiers, lead_time_days,
      min_order_qty, max_order_qty,
      color_stone_name, color_stone_quality, carat_options,
      collection_ids,
    } = req.body;

    const { rows } = await query(
      `UPDATE products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category_id = COALESCE($3, category_id),
        base_price = COALESCE($4, base_price),
        carat = COALESCE($5, carat),
        metal_type = COALESCE($6, metal_type),
        gold_colour = COALESCE($7, gold_colour),
        metal_weight = COALESCE($8, metal_weight),
        diamond_type = COALESCE($9, diamond_type),
        diamond_shape = COALESCE($10, diamond_shape),
        diamond_color = COALESCE($11, diamond_color),
        diamond_clarity = COALESCE($12, diamond_clarity),
        diamond_certification = COALESCE($13, diamond_certification),
        setting_type = COALESCE($14, setting_type),
        hallmark = COALESCE($15, hallmark),
        width_mm = COALESCE($16, width_mm),
        height_mm = COALESCE($17, height_mm),
        availability = COALESCE($18, availability),
        is_new = COALESCE($19, is_new),
        is_active = COALESCE($20, is_active),
        occasion_tags = COALESCE($21, occasion_tags),
        gold_purity_options = COALESCE($22, gold_purity_options),
        carat_range_min = COALESCE($23, carat_range_min),
        carat_range_max = COALESCE($24, carat_range_max),
        finish_options = COALESCE($25, finish_options),
        price_modifiers = COALESCE($26, price_modifiers),
        lead_time_days = COALESCE($27, lead_time_days),
        min_order_qty = COALESCE($28, min_order_qty),
        max_order_qty = COALESCE($29, max_order_qty),
        color_stone_name = COALESCE($30, color_stone_name),
        color_stone_quality = COALESCE($31, color_stone_quality),
        carat_options = $32,
        updated_at = NOW()
       WHERE id = $33 RETURNING *`,
      [
        name, description, category_id,
        base_price, carat, metal_type, gold_colour, metal_weight,
        diamond_type, diamond_shape, diamond_color, diamond_clarity,
        diamond_certification, setting_type, hallmark,
        width_mm, height_mm, availability, is_new, is_active,
        occasion_tags, gold_purity_options,
        carat_range_min, carat_range_max, finish_options,
        price_modifiers ? JSON.stringify(price_modifiers) : null,
        lead_time_days, min_order_qty, max_order_qty,
        color_stone_name, color_stone_quality,
        Array.isArray(carat_options) && carat_options.length ? JSON.stringify(carat_options) : null,
        req.params.id,
      ]
    );
    if (rows.length === 0) throw new AppError("Product not found", 404);

    // Update collection links
    if (Array.isArray(collection_ids)) {
      await query("DELETE FROM collection_products WHERE product_id = $1", [req.params.id]);
      for (const colId of collection_ids) {
        await query(
          "INSERT INTO collection_products (collection_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [colId, req.params.id]
        );
      }
    }

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('admin', $1, 'product_updated', 'product', $2, $3)`,
      [req.admin.id, req.params.id, JSON.stringify({ name: rows[0].name, sku: rows[0].sku })]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/products/:id ─────────────────
// Soft delete (set is_active = false)
router.delete("/:id", async (req, res, next) => {
  try {
    await query(
      `UPDATE products SET is_active = false, sku = sku || '_deleted_' || id, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id)
       VALUES ('admin', $1, 'product_deactivated', 'product', $2)`,
      [req.admin.id, req.params.id]
    );

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/products/meta/categories ────────
router.get("/meta/categories", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT id, name FROM categories ORDER BY sort_order");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/products/meta/collections ───────
router.get("/meta/collections", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT id, name, tag FROM collections WHERE is_active = true ORDER BY name");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

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

// Minimal .xlsx reader — an .xlsx is just a zip of XML parts, so we reuse
// adm-zip (already a dependency) and read the first worksheet into a 2-D array
// of cell strings, the same shape the CSV path produces. No new dependency.
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

// ── POST /api/admin/products/import-csv ────────────
// Bulk import products from CSV, XLSX, or ZIP (CSV/XLSX + images)
router.post("/import-csv", upload.single("file"), async (req, res, next) => {
  const client = await getClient();
  try {
    if (!req.file) throw new AppError("A CSV, XLSX, or ZIP file is required");

    const imageFiles = new Map(); // filename -> Buffer
    const lowerName = (req.file.originalname || "").toLowerCase();
    const isXlsx =
      lowerName.endsWith(".xlsx") ||
      req.file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const isZip =
      !isXlsx &&
      (lowerName.endsWith(".zip") ||
        req.file.mimetype === "application/zip" ||
        req.file.mimetype === "application/x-zip-compressed");

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
      const zip = new AdmZip(req.file.buffer);
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
      rows = parseXlsx(req.file.buffer);
    } else {
      rows = parseCsvText(req.file.buffer.toString("utf-8"));
    }

    if (!rows || rows.length < 2) {
      throw new AppError("File must have a header row and at least one data row");
    }

    // Parse header — strip BOM, quotes, whitespace aggressively
    const headers = rows[0].map((h) => {
      const cleaned = (h == null ? "" : String(h))
        .replace(/[\uFEFF\xEF\xBB\xBF]/g, "")
        .replace(/^"|"$/g, "")
        .trim()
        .toLowerCase();
      // Drop any descriptive " - <note>" suffix so a header like
      // "sku - Barcode" or "base_price - Total" maps to its field name.
      return cleaned.split(/\s+-\s+/)[0].trim();
    });
    const col = (name) => headers.indexOf(name);

    // Field requirement tiers — driven by the colour-coded import template:
    //  • RED columns were removed from the template and are NOT imported
    //    (setting_type, hallmark, width_mm, height_mm, lead_time_days,
    //     min_order_qty, finish_options).
    //  • Un-coloured columns are REQUIRED — a row missing any is skipped.
    //  • Coloured columns are OPTIONAL (name, description, metal_type,
    //     gold_colour, diamond_certification, availability, occasion_tags).
    const REQUIRED_FIELDS = [
      "sku", "category", "base_price", "metal_weight",
      "diamond_type", "diamond_shape", "diamond_color", "diamond_clarity", "carat",
      "color_stone_name", "color_stone_quality",
      "max_order_qty", "is_new", "images",
    ];
    for (const r of REQUIRED_FIELDS) {
      if (col(r) === -1) throw new AppError(`File must have a '${r}' column`);
    }

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

    await client.query("BEGIN");
    let imported = 0;
    let skipped = 0;
    let imagesImported = 0;
    const errors = [];

    // Skip the hint/example row (row 2 of the template) if present
    const startRow = rows.length > 2 && rows[1].join(" ").toLowerCase().includes("e.g.") ? 2 : 1;

    for (let i = startRow; i < rows.length; i++) {
      const cols = rows[i];

      const name = getVal(cols, col("name")); // optional (coloured field)

      // Every required (un-coloured) column must carry a value on this row
      const missing = REQUIRED_FIELDS.filter((f) => getVal(cols, col(f)) === null);
      if (missing.length > 0) {
        skipped++;
        errors.push({ row: i + 1, reason: `Missing required field(s): ${missing.join(", ")}` });
        continue;
      }

      const sku = getVal(cols, col("sku"));

      // Check duplicates — the products_sku_key unique constraint spans ALL
      // rows. An ACTIVE product with this SKU is a real conflict and is
      // skipped. An INACTIVE one (deleted/deactivated) still occupies the SKU,
      // so we free it below (rename to <sku>_deleted_<id>) and import fresh.
      const { rows: existSku } = await client.query("SELECT id, is_active FROM products WHERE sku = $1", [sku]);
      let freeInactiveId = null;
      if (existSku.length > 0) {
        if (existSku[0].is_active) {
          skipped++;
          errors.push({ row: i + 1, reason: `Duplicate SKU (${sku})` });
          continue;
        }
        freeInactiveId = existSku[0].id;
      }

      // Isolate each row in a savepoint so an unexpected DB error (e.g. a
      // constraint violation) skips just this row instead of aborting the
      // whole import and surfacing as a 500 with no per-row feedback.
      await client.query("SAVEPOINT row_sp");
      try {
        // Free the SKU from the inactive product holding it, so this row can
        // import as a brand-new product. Inside the savepoint, so a later
        // failure on this row rolls the rename back too.
        if (freeInactiveId) {
          await client.query(
            "UPDATE products SET sku = sku || '_deleted_' || id, updated_at = NOW() WHERE id = $1",
            [freeInactiveId]
          );
        }

        // Resolve category name to id — create if not exists
        let category_id = null;
        const catName = getVal(cols, col("category"));
        if (catName) {
          const { rows: cats } = await client.query("SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1", [catName]);
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
            availability, max_order_qty, is_new, occasion_tags
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
          ) RETURNING id`,
          [
            name, sku,
            getVal(cols, col("description")),
            category_id,
            getNum(cols, col("base_price")) || 0,
            getVal(cols, col("metal_type")),
            getVal(cols, col("gold_colour")),
            getNum(cols, col("metal_weight")),
            getVal(cols, col("diamond_type")),
            getVal(cols, col("diamond_shape")),
            getVal(cols, col("diamond_color")),
            getVal(cols, col("diamond_clarity")),
            getVal(cols, col("diamond_certification")),
            getNum(cols, col("carat")),
            getVal(cols, col("color_stone_name")),
            getVal(cols, col("color_stone_quality")),
            getVal(cols, col("availability")) || "in-stock",
            getNum(cols, col("max_order_qty")) || 100,
            getVal(cols, col("is_new")) === "true",
            getVal(cols, col("occasion_tags")) ? `{${getVal(cols, col("occasion_tags")).split(",").map((t) => `"${t.trim()}"`).join(",")}}` : "{}",
          ]
        );

        const productId = inserted[0].id;

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
    }

    await client.query("COMMIT");

    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, details)
       VALUES ('admin', $1, 'products_csv_import', $2)`,
      [req.admin.id, JSON.stringify({ imported, skipped, imagesImported })]
    );

    res.json({ imported, skipped, imagesImported, errors: errors.slice(0, 20), total: rows.length - startRow });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
