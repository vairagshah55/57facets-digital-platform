const router = require("express").Router();
const { query, getClient } = require("../config/db");
const { adminAuth } = require("../middleware/adminAuth");
const AppError = require("../utils/AppError");
const multer = require("multer");
const AdmZip = require("adm-zip");
const pricing = require("../services/pricing.service");
const { syncGoldRates } = require("../services/goldSync.service");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(adminAuth);

/* Run fn inside a transaction, invalidate the rate cache afterwards. */
async function tx(fn) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    pricing.invalidateRateCache();
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const asArray = (b) => (Array.isArray(b) ? b : Array.isArray(b?.rows) ? b.rows : null);

/* ════════════════════════════════════════════════════════════════
   DIAMOND RATES
   ════════════════════════════════════════════════════════════════ */
router.get("/diamond-rates", async (req, res, next) => {
  try {
    const { retailerId } = req.query;
    const country = (req.query.country || "India").trim();
    const { rows } = retailerId
      ? await query(
          `SELECT shape_group, sieve_size, shade, clarity, rate_per_carat, updated_at
           FROM retailer_diamond_rates WHERE retailer_id = $1
           ORDER BY shape_group, sieve_size, shade, clarity`, [retailerId])
      : await query(
          `SELECT id, shape_group, sieve_size, shade, clarity, rate_per_carat, updated_at
           FROM diamond_rates WHERE country = $1 ORDER BY shape_group, sieve_size, shade, clarity`, [country]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.put("/diamond-rates", async (req, res, next) => {
  try {
    const items = asArray(req.body);
    if (!items) throw new AppError("Body must be an array of diamond rates");
    const { retailerId } = req.query;
    const country = (req.query.country || "India").trim();
    const out = await tx(async (c) => {
      let n = 0;
      // Per-retailer: full replace of this retailer's rows (cleared rows drop back to the country base).
      if (retailerId) await c.query("DELETE FROM retailer_diamond_rates WHERE retailer_id = $1", [retailerId]);
      for (const it of items) {
        const { shape_group, shade, clarity, rate_per_carat } = it;
        // Sieve may be blank (a new/unnamed sieve row); only the rest are required.
        const sieve_size = it.sieve_size == null ? "" : String(it.sieve_size);
        if (!shape_group || !shade || !clarity) {
          throw new AppError("Each rate needs shape_group, shade, clarity");
        }
        if (retailerId) {
          await c.query(
            `INSERT INTO retailer_diamond_rates (retailer_id, shape_group, sieve_size, shade, clarity, rate_per_carat, updated_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [retailerId, shape_group, sieve_size, shade, clarity, Number(rate_per_carat) || 0, req.admin.id]);
        } else {
          await c.query(
            `INSERT INTO diamond_rates (country, shape_group, sieve_size, shade, clarity, rate_per_carat, updated_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (country, shape_group, sieve_size, shade, clarity)
             DO UPDATE SET rate_per_carat = EXCLUDED.rate_per_carat, updated_by = EXCLUDED.updated_by`,
            [country, shape_group, sieve_size, shade, clarity, Number(rate_per_carat) || 0, req.admin.id]);
        }
        n++;
      }
      return n;
    });
    res.json({ upserted: out });
  } catch (e) { next(e); }
});

// Delete a whole sieve row (all grade cells for a shape_group + sieve) from the
// Global chart, or from a retailer's chart when ?retailerId is supplied.
router.delete("/diamond-rates", async (req, res, next) => {
  try {
    const { retailerId, shapeGroup, sieve } = req.query;
    const country = (req.query.country || "India").trim();
    // sieve may legitimately be "" — that's the blank / "any size" row. Only a
    // MISSING param is an error.
    if (!shapeGroup || sieve == null) throw new AppError("shapeGroup and sieve are required");
    await tx((c) => retailerId
      ? c.query("DELETE FROM retailer_diamond_rates WHERE retailer_id = $1 AND shape_group = $2 AND sieve_size = $3", [retailerId, shapeGroup, sieve])
      : c.query("DELETE FROM diamond_rates WHERE country = $1 AND shape_group = $2 AND sieve_size = $3", [country, shapeGroup, sieve]));
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

router.delete("/diamond-rates/:id", async (req, res, next) => {
  try {
    await tx((c) => c.query("DELETE FROM diamond_rates WHERE id = $1", [req.params.id]));
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   SIEVE MAP (carat → sieve)
   ════════════════════════════════════════════════════════════════ */
router.get("/sieve-map", async (req, res, next) => {
  try {
    const { retailerId } = req.query;
    const { rows } = retailerId
      ? await query("SELECT shape_group, carat_min, carat_max, sieve_size FROM retailer_sieve_map WHERE retailer_id = $1 ORDER BY shape_group, carat_min", [retailerId])
      : await query("SELECT id, shape_group, carat_min, carat_max, sieve_size FROM diamond_sieve_map ORDER BY shape_group, carat_min");
    res.json(rows);
  } catch (e) { next(e); }
});

router.put("/sieve-map", async (req, res, next) => {
  try {
    const items = asArray(req.body);
    if (!items) throw new AppError("Body must be an array of sieve ranges");
    const { retailerId } = req.query;
    const out = await tx(async (c) => {
      let n = 0;
      if (retailerId) await c.query("DELETE FROM retailer_sieve_map WHERE retailer_id = $1", [retailerId]);
      for (const it of items) {
        const { shape_group, carat_min, carat_max, sieve_size } = it;
        if (!shape_group || carat_min == null || !sieve_size) {
          throw new AppError("Each range needs shape_group, carat_min, sieve_size");
        }
        if (retailerId) {
          await c.query(
            `INSERT INTO retailer_sieve_map (retailer_id, shape_group, carat_min, carat_max, sieve_size) VALUES ($1,$2,$3,$4,$5)`,
            [retailerId, shape_group, Number(carat_min), carat_max == null ? null : Number(carat_max), sieve_size]);
        } else {
          await c.query(
            `INSERT INTO diamond_sieve_map (shape_group, carat_min, carat_max, sieve_size)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (shape_group, carat_min)
             DO UPDATE SET carat_max = EXCLUDED.carat_max, sieve_size = EXCLUDED.sieve_size`,
            [shape_group, Number(carat_min), carat_max == null ? null : Number(carat_max), sieve_size]);
        }
        n++;
      }
      return n;
    });
    res.json({ upserted: out });
  } catch (e) { next(e); }
});

router.delete("/sieve-map/:id", async (req, res, next) => {
  try {
    await tx((c) => c.query("DELETE FROM diamond_sieve_map WHERE id = $1", [req.params.id]));
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   DIAMOND SIEVES (the list of sieve sizes shown as matrix rows)
   A plain per-shape list, independent of rates and the carat→sieve
   map, so a sieve row persists even before any rate is entered.
   ════════════════════════════════════════════════════════════════ */
router.get("/diamond-sieves", async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT shape_group, sieve_size FROM diamond_sieves ORDER BY shape_group, sieve_size");
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/diamond-sieves", async (req, res, next) => {
  try {
    const { shape_group, sieve_size } = req.body || {};
    // Allow any sieve label, including blank — only shape_group is required.
    if (!shape_group) throw new AppError("shape_group is required");
    await tx((c) => c.query(
      `INSERT INTO diamond_sieves (shape_group, sieve_size) VALUES ($1, $2)
       ON CONFLICT (shape_group, sieve_size) DO NOTHING`,
      [shape_group, sieve_size == null ? "" : String(sieve_size).trim()]));
    res.status(201).json({ added: true });
  } catch (e) { next(e); }
});

router.delete("/diamond-sieves", async (req, res, next) => {
  try {
    const { shapeGroup, sieve } = req.query;
    // "" is the blank / "any size" row — a valid label. Only a MISSING param fails.
    if (!shapeGroup || sieve == null) throw new AppError("shapeGroup and sieve are required");
    await tx(async (c) => {
      // Drop the sieve row and any rates entered for it (keeps the matrix consistent).
      await c.query("DELETE FROM diamond_sieves WHERE shape_group = $1 AND sieve_size = $2", [shapeGroup, sieve]);
      await c.query("DELETE FROM diamond_rates WHERE shape_group = $1 AND sieve_size = $2", [shapeGroup, sieve]);
    });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   STONE RATES
   ════════════════════════════════════════════════════════════════ */
// Stone rates are per-COUNTRY (India / United States) — no conversion.
router.get("/stone-rates", async (req, res, next) => {
  try {
    const country = (req.query.country || "India").trim();
    const { rows } = await query(
      "SELECT id, category, stone_name, quality, rate, rate_pc, unit, carat, pcs, updated_at FROM stone_rates WHERE country = $1 ORDER BY category, stone_name",
      [country]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.put("/stone-rates", async (req, res, next) => {
  try {
    const items = asArray(req.body);
    if (!items) throw new AppError("Body must be an array of stone rates");
    const country = (req.query.country || "India").trim();
    const out = await tx(async (c) => {
      let n = 0;
      for (const it of items) {
        const { category, stone_name, quality, rate, rate_pc, unit, carat, pcs } = it;
        if (!category || !stone_name) throw new AppError("Each stone needs category and stone_name");
        const caratVal = (carat === "" || carat == null) ? null : Number(carat);
        const pcsVal = (pcs === "" || pcs == null) ? null : parseInt(pcs, 10);
        const ratePcVal = (rate_pc === "" || rate_pc == null) ? null : Number(rate_pc);
        await c.query(
          `INSERT INTO stone_rates (country, category, stone_name, quality, rate, rate_pc, unit, carat, pcs, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (country, category, stone_name, COALESCE(quality, ''))
           DO UPDATE SET rate = EXCLUDED.rate, rate_pc = EXCLUDED.rate_pc, unit = EXCLUDED.unit, carat = EXCLUDED.carat, pcs = EXCLUDED.pcs, updated_by = EXCLUDED.updated_by`,
          [country, category, stone_name, quality || null, Number(rate) || 0, ratePcVal, unit || "carat", caratVal, pcsVal, req.admin.id]);
        n++;
      }
      return n;
    });
    res.json({ upserted: out });
  } catch (e) { next(e); }
});

router.delete("/stone-rates/:id", async (req, res, next) => {
  try {
    await tx((c) => c.query("DELETE FROM stone_rates WHERE id = $1", [req.params.id]));
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   METAL RATES (daily gold price)
   ════════════════════════════════════════════════════════════════ */
// Gold rates are per-COUNTRY (India / United States) — no conversion.
router.get("/metal-rates", async (req, res, next) => {
  try {
    const country = (req.query.country || "India").trim();
    const { rows } = await query(
      "SELECT gold_type, rate_per_gram, updated_at FROM metal_rates WHERE country = $1 ORDER BY gold_type",
      [country]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.put("/metal-rates", async (req, res, next) => {
  try {
    const items = asArray(req.body);
    if (!items) throw new AppError("Body must be an array of metal rates");
    const country = (req.query.country || "India").trim();
    const out = await tx(async (c) => {
      let n = 0;
      for (const it of items) {
        if (!it.gold_type) throw new AppError("Each metal rate needs gold_type");
        await c.query(
          `INSERT INTO metal_rates (country, gold_type, rate_per_gram, updated_by)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (country, gold_type) DO UPDATE SET rate_per_gram = EXCLUDED.rate_per_gram, updated_by = EXCLUDED.updated_by`,
          [country, it.gold_type, Number(it.rate_per_gram) || 0, req.admin.id]);
        n++;
      }
      return n;
    });
    res.json({ upserted: out });
  } catch (e) { next(e); }
});

// Pull a live gold rate from Nebula and update all karat rows.
router.post("/metal-rates/sync", async (req, res, next) => {
  try {
    const result = await syncGoldRates(req.admin.id);
    res.json(result);
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   MAKING CHARGES
   ════════════════════════════════════════════════════════════════ */
router.get("/making-charges", async (req, res, next) => {
  try {
    const { retailerId } = req.query;
    const country = (req.query.country || "India").trim();
    const { rows } = retailerId
      ? await query("SELECT scope, mode, value, updated_at FROM retailer_making_charges WHERE retailer_id = $1 ORDER BY scope", [retailerId])
      : await query("SELECT id, scope, mode, value, updated_at FROM making_charges WHERE country = $1 ORDER BY scope", [country]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.put("/making-charges", async (req, res, next) => {
  try {
    const items = asArray(req.body);
    if (!items) throw new AppError("Body must be an array of making charges");
    const { retailerId } = req.query;
    const country = (req.query.country || "India").trim();
    const out = await tx(async (c) => {
      let n = 0;
      if (retailerId) await c.query("DELETE FROM retailer_making_charges WHERE retailer_id = $1", [retailerId]);
      for (const it of items) {
        const { scope, mode, value } = it;
        if (!scope || !mode) throw new AppError("Each making charge needs scope and mode");
        if (!["flat", "percent", "gross", "net"].includes(mode)) throw new AppError("mode must be flat, percent, gross or net");
        if (retailerId) {
          await c.query(
            `INSERT INTO retailer_making_charges (retailer_id, scope, mode, value, updated_by) VALUES ($1,$2,$3,$4,$5)`,
            [retailerId, scope, mode, Number(value) || 0, req.admin.id]);
        } else {
          await c.query(
            `INSERT INTO making_charges (country, scope, mode, value, updated_by)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (country, scope) DO UPDATE SET mode = EXCLUDED.mode, value = EXCLUDED.value, updated_by = EXCLUDED.updated_by`,
            [country, scope, mode, Number(value) || 0, req.admin.id]);
        }
        n++;
      }
      return n;
    });
    res.json({ upserted: out });
  } catch (e) { next(e); }
});

router.delete("/making-charges/:id", async (req, res, next) => {
  try {
    await tx((c) => c.query("DELETE FROM making_charges WHERE id = $1 AND scope <> 'default'", [req.params.id]));
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   DUTY — import/customs %, charged on the product's total value.
   Per-country base; ?retailerId reads/writes that retailer's override.
   ════════════════════════════════════════════════════════════════ */
router.get("/duty-charges", async (req, res, next) => {
  try {
    const { retailerId } = req.query;
    const country = (req.query.country || "India").trim();
    // Always return the country base too, so the UI can show what an empty
    // retailer override falls back to.
    const base = await query("SELECT percent, updated_at FROM duty_charges WHERE country = $1", [country]);
    const basePercent = base.rows.length ? Number(base.rows[0].percent) : 0;
    if (!retailerId) return res.json({ country, percent: basePercent, base_percent: basePercent, inherited: false });
    const ov = await query("SELECT percent, updated_at FROM retailer_duty_charges WHERE retailer_id = $1", [retailerId]);
    res.json({
      country,
      percent: ov.rows.length ? Number(ov.rows[0].percent) : null, // null = inherits the country rate
      base_percent: basePercent,
      inherited: ov.rows.length === 0,
    });
  } catch (e) { next(e); }
});

router.put("/duty-charges", async (req, res, next) => {
  try {
    const { retailerId } = req.query;
    const country = (req.query.country || "India").trim();
    const raw = req.body?.percent;
    // Blank clears a retailer override (back to the country rate). The country
    // rate itself can't be blank — it's 0 or a number.
    const cleared = raw === "" || raw === null || raw === undefined;
    const percent = Number(raw);
    if (!cleared && (!Number.isFinite(percent) || percent < 0)) {
      throw new AppError("percent must be a number >= 0");
    }
    await tx(async (c) => {
      if (retailerId) {
        if (cleared) {
          await c.query("DELETE FROM retailer_duty_charges WHERE retailer_id = $1", [retailerId]);
        } else {
          await c.query(
            `INSERT INTO retailer_duty_charges (retailer_id, percent, updated_by) VALUES ($1,$2,$3)
             ON CONFLICT (retailer_id) DO UPDATE SET percent = EXCLUDED.percent, updated_by = EXCLUDED.updated_by`,
            [retailerId, percent, req.admin.id]);
        }
      } else {
        await c.query(
          `INSERT INTO duty_charges (country, percent, updated_by) VALUES ($1,$2,$3)
           ON CONFLICT (country) DO UPDATE SET percent = EXCLUDED.percent, updated_by = EXCLUDED.updated_by`,
          [country, cleared ? 0 : percent, req.admin.id]);
      }
    });
    res.json({ saved: true, percent: cleared ? null : percent });
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   RETAILER PRICING — factors (Layer 1/2) + overrides (Layer 3)
   ════════════════════════════════════════════════════════════════ */
router.get("/retailers", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, company_name, country, price_factor, flat_markup,
              diamond_factor, gold_factor, stone_factor, making_factor,
              (SELECT COUNT(*) FROM retailer_product_price r WHERE r.retailer_id = retailers.id) AS override_count
       FROM retailers WHERE is_active = true ORDER BY name`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.put("/retailers/:id/factors", async (req, res, next) => {
  try {
    const allowed = ["price_factor", "flat_markup", "diamond_factor", "gold_factor", "stone_factor", "making_factor"];
    const sets = [];
    const params = [];
    let idx = 1;
    for (const k of allowed) {
      if (k in req.body) {
        sets.push(`${k} = $${idx++}`);
        params.push(req.body[k] === null ? null : Number(req.body[k]));
      }
    }
    if (!sets.length) throw new AppError("No pricing factors provided");
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE retailers SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${idx}
       RETURNING id, price_factor, flat_markup, diamond_factor, gold_factor, stone_factor, making_factor`,
      params);
    if (!rows.length) throw new AppError("Retailer not found", 404);
    pricing.invalidateRateCache(); // factors live on retailers, but be safe
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.get("/retailers/:id/overrides", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT rpp.product_id, rpp.price, p.name, p.sku
       FROM retailer_product_price rpp JOIN products p ON p.id = rpp.product_id
       WHERE rpp.retailer_id = $1 ORDER BY p.name`, [req.params.id]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.put("/retailers/:id/overrides", async (req, res, next) => {
  try {
    const { product_id, price } = req.body;
    if (!product_id || price == null) throw new AppError("product_id and price are required");
    await query(
      `INSERT INTO retailer_product_price (retailer_id, product_id, price, updated_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (retailer_id, product_id) DO UPDATE SET price = EXCLUDED.price, updated_by = EXCLUDED.updated_by`,
      [req.params.id, product_id, Number(price), req.admin.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete("/retailers/:id/overrides/:productId", async (req, res, next) => {
  try {
    await query("DELETE FROM retailer_product_price WHERE retailer_id = $1 AND product_id = $2",
      [req.params.id, req.params.productId]);
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   PRICE PREVIEW — full breakdown for a product / retailer
   ════════════════════════════════════════════════════════════════ */
router.get("/preview", async (req, res, next) => {
  try {
    const { productId, retailerId } = req.query;
    if (!productId) throw new AppError("productId is required");
    const { rows } = await query(
      `SELECT p.*, c.name AS category
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`, [productId]);
    if (!rows.length) throw new AppError("Product not found", 404);
    const diamonds = await query(
      `SELECT diamond_type, diamond_shape, diamond_size, diamond_color, diamond_clarity,
              diamond_certification, carat, diamond_pcs, stone_name, stone_quality
       FROM product_diamonds WHERE product_id = $1 ORDER BY sort_order, created_at`, [productId]);
    rows[0].diamonds = diamonds.rows;
    const stones = await query(
      `SELECT stone_name, quality, carat, pcs
       FROM product_stones WHERE product_id = $1 ORDER BY sort_order, created_at`, [productId]);
    rows[0].stones = stones.rows;
    let retailer = null;
    if (retailerId) {
      const r = await query(
        `SELECT id, name, company_name, price_factor, flat_markup,
                gold_factor, diamond_factor, stone_factor, making_factor
         FROM retailers WHERE id = $1`, [retailerId]);
      retailer = r.rows[0] || null;
    }
    const result = await pricing.priceForRetailer(rows[0], retailerId || null);
    res.json({ product_id: productId, retailer_id: retailerId || null, product: rows[0], retailer_info: retailer, ...result });
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   IMPORT — seed rate chart from MASTER RATE CHART xlsx
   ════════════════════════════════════════════════════════════════ */
router.post("/import", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError("An .xlsx rate-chart file is required");
    const sheets = parseWorkbook(req.file.buffer);
    const summary = { diamondRates: 0, stoneRates: 0, metalRates: 0, errors: [] };

    await tx(async (c) => {
      // ROUND + FANCY → diamond_rates
      for (const [name, shapeFixed] of [["ROUND", "ROUND"], ["FANCY", null]]) {
        const grid = findSheet(sheets, name);
        if (!grid || grid.length < 2) continue;
        const isFancy = name === "FANCY";
        const header = grid[0];
        // FANCY: col0 = shape, col1 = sieve, grades from col2. ROUND: col0 = sieve, grades from col1.
        const sieveCol = isFancy ? 1 : 0;
        const gradeStart = isFancy ? 2 : 1;
        const grades = header.slice(gradeStart).map((h) => parseGrade(h));
        let lastShape = shapeFixed;
        for (let r = 1; r < grid.length; r++) {
          const row = grid[r];
          if (isFancy && (row[0] || "").trim()) lastShape = canonShapeGroup(row[0]);
          const sieve = (row[sieveCol] || "").trim();
          if (!sieve || !lastShape) continue;
          for (let g = 0; g < grades.length; g++) {
            const grade = grades[g];
            const rate = parseFloat(row[gradeStart + g]);
            if (!grade || !Number.isFinite(rate)) continue; // empty cells skipped
            await c.query(
              `INSERT INTO diamond_rates (country, shape_group, sieve_size, shade, clarity, rate_per_carat, updated_by)
               VALUES ('India',$1,$2,$3,$4,$5,$6)
               ON CONFLICT (country, shape_group, sieve_size, shade, clarity)
               DO UPDATE SET rate_per_carat = EXCLUDED.rate_per_carat, updated_by = EXCLUDED.updated_by`,
              [lastShape, sieve, grade.shade, grade.clarity, rate, req.admin.id]);
            summary.diamondRates++;
          }
        }
      }

      // STONES → stone_rates (col0 category, col1 stone_name, col2 rate)
      const stones = findSheet(sheets, "STONES");
      if (stones && stones.length > 1) {
        for (let r = 1; r < stones.length; r++) {
          const [category, stone_name, rateRaw] = stones[r];
          if (!category || !stone_name) continue;
          const rate = parseFloat(rateRaw);
          await c.query(
            `INSERT INTO stone_rates (country, category, stone_name, quality, rate, unit, updated_by)
             VALUES ('India',$1,$2,NULL,$3,'carat',$4)
             ON CONFLICT (country, category, stone_name, COALESCE(quality, ''))
             DO UPDATE SET rate = EXCLUDED.rate, updated_by = EXCLUDED.updated_by`,
            [category.trim(), stone_name.trim(), Number.isFinite(rate) ? rate : 0, req.admin.id]);
          summary.stoneRates++;
        }
      }

      // METAL → ensure gold_type rows exist (rates set later by admin)
      const metal = findSheet(sheets, "METAL");
      if (metal && metal.length > 1) {
        for (let r = 1; r < metal.length; r++) {
          const gt = (metal[r][0] || "").trim();
          if (!gt) continue;
          await c.query(
            `INSERT INTO metal_rates (country, gold_type, rate_per_gram) VALUES ('India', $1, 0)
             ON CONFLICT (country, gold_type) DO NOTHING`, [gt]);
          summary.metalRates++;
        }
      }
    });

    res.json(summary);
  } catch (e) { next(e); }
});

/* ── Multi-sheet .xlsx parser (reads ALL sheets by name) ──────────── */
function parseWorkbook(buffer) {
  const zip = new AdmZip(buffer);
  const read = (n) => { const e = zip.getEntry(n); return e ? e.getData().toString("utf-8") : ""; };

  // shared strings
  const shared = [];
  const ss = read("xl/sharedStrings.xml");
  if (ss) for (const si of ss.match(/<si\b[^>]*?(?:\/>|>[\s\S]*?<\/si>)/g) || []) shared.push(textRuns(si));

  // sheet name → file target (via workbook.xml + rels)
  const wb = read("xl/workbook.xml");
  const rels = read("xl/_rels/workbook.xml.rels");
  const ridToTarget = {};
  for (const m of rels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    ridToTarget[m[1]] = m[2].replace(/^\/?xl\//, "");
  }
  const out = new Map();
  for (const m of wb.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const target = ridToTarget[m[2]];
    if (target) out.set(m[1].trim().toUpperCase(), parseSheet(read("xl/" + target), shared));
  }
  return out;
}

function parseSheet(xml, shared) {
  const rows = [];
  if (!xml) return rows;
  for (const rowXml of xml.match(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g) || []) {
    const cells = [];
    let maxIdx = -1;
    for (const cXml of rowXml.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
      const refM = /\br="([A-Z]+)\d+"/.exec(cXml);
      const idx = refM ? colToIdx(refM[1]) : cells.length;
      const typeM = /\bt="([^"]+)"/.exec(cXml);
      const type = typeM ? typeM[1] : "n";
      let value = "";
      if (type === "inlineStr") {
        const isM = /<is>([\s\S]*?)<\/is>/.exec(cXml);
        if (isM) value = textRuns(isM[1]);
      } else {
        const vM = /<v>([\s\S]*?)<\/v>/.exec(cXml);
        const raw = vM ? vM[1] : "";
        value = type === "s" ? (shared[parseInt(raw, 10)] || "") : decodeEntities(raw);
      }
      cells[idx] = value;
      if (idx > maxIdx) maxIdx = idx;
    }
    for (let i = 0; i <= maxIdx; i++) if (cells[i] === undefined) cells[i] = "";
    rows.push(cells);
  }
  return rows;
}

function textRuns(xml) {
  const parts = xml.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
  return decodeEntities(parts.map((p) => p.replace(/<t[^>]*>([\s\S]*?)<\/t>/, "$1")).join(""));
}
function decodeEntities(s) {
  return String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
function colToIdx(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
function findSheet(sheets, name) { return sheets.get(name.toUpperCase()) || null; }

/* "EF-VVS" → {shade:'EF', clarity:'VVS'} ; "GH/VS/SI" → {shade:'GH', clarity:'VS-SI'} */
function parseGrade(header) {
  const h = String(header || "").replace(/\s+/g, "").toUpperCase();
  const m = /^([A-Z]{2})[\/-](.+)$/.exec(h);
  if (!m) return null;
  return { shade: m[1], clarity: m[2].replace(/\//g, "-") };
}
function canonShapeGroup(raw) {
  const s = String(raw || "").replace(/\s+/g, "").toUpperCase().replace(/BUGGEUE|BUGUETTE/g, "BAGUETTE");
  if (s.includes("MARQUISE") || s.includes("BAGUETTE")) return "MARQUISE/BAGUETTE";
  if (s.includes("PEAR") || s.includes("PRINCESS")) return "PEAR/PRINCESS";
  return s;
}

module.exports = router;
