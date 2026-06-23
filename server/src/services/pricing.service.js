/* ════════════════════════════════════════════════════════════════
   Pricing service — computes a product's price from the master rate
   chart and applies the per-retailer pricing layers.

     price = metal + diamond + stone + making        (master chart)
     A retailer is priced from its own chart scope (global rows + retailer
     overlay). No factor/markup multipliers. A retailer_product_price override,
     when present, wins over the computed price (highest precedence).

   Optimised for catalog use: the (small) rate tables are loaded once and
   cached in memory with a short TTL, so pricing a page of products costs
   ~2 queries (retailer factors + overrides) instead of N×4 lookups.
   ════════════════════════════════════════════════════════════════ */

const { query } = require("../config/db");

const num = (v, d = 0) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

/* ════════════════════════════════════════════════════════════════
   Attribute normalisation — bridges the descriptive vocabulary stored
   on products ("18K Yellow Gold", GIA grades "G"/"VS2", "Round Brilliant")
   to the rate-chart keys ("18KT", paired shades "GH", clarity buckets "SI").
   These maps are intentionally simple/editable — adjust to taste.
   ════════════════════════════════════════════════════════════════ */

/* Shape → rate group. Substring match so "Round Brilliant" → ROUND, etc.
   Unknown shapes fall through as their own group name, so an admin can add
   a matching diamond_rates group without code changes. */
function toShapeGroup(shape) {
  if (!shape) return null;
  const s = String(shape).trim().toUpperCase();
  if (s.includes("ROUND")) return "ROUND";
  if (s.includes("MARQUISE") || s.includes("BAGUETTE")) return "MARQUISE/BAGUETTE";
  if (s.includes("PEAR") || s.includes("PRINCESS")) return "PEAR/PRINCESS";
  return s.replace(/\s+/g, " ").trim();
}

/* "18K Yellow Gold" / "18kt" / "22K" → "18KT" ; "Platinum" → "PLATINUM". */
function normalizeGoldType(metalType) {
  if (!metalType) return null;
  const s = String(metalType).toUpperCase();
  const m = s.match(/(\d{2})\s*K/); // 14K, 18K, 22K, 24K, 18KT
  if (m) return m[1] + "KT";
  return s.replace(/\s+/g, " ").trim();
}

/* GIA single-letter colour → paired shade bucket (EF/FG/GH/HI/IJ).
   Already-paired values pass through unchanged. */
const SHADE_ALIAS = { D: "EF", E: "EF", F: "FG", G: "GH", H: "HI", I: "IJ", J: "IJ" };
function normalizeShade(shade) {
  if (!shade) return null;
  const s = String(shade).trim().toUpperCase();
  return SHADE_ALIAS[s] || s;
}

/* GIA clarity → chart bucket: VVS2→VVS, VS1→VS, SI2→SI, IF/FL→VVS.
   Compound buckets (VVS-VS, VS-SI) and I1 pass through. */
function normalizeClarity(clarity) {
  if (!clarity) return null;
  const s = String(clarity).trim().toUpperCase().replace(/\//g, "-");
  if (s === "IF" || s === "FL") return "VVS";
  const m = s.match(/^(VVS|VS|SI)\s*\d?$/); // strip the 1/2 suffix; I1 won't match
  return m ? m[1] : s;
}

/* ════════════════════════════════════════════════════════════════
   Rate-chart cache (global rows + per-retailer overlays)
   ----------------------------------------------------------------
   The global master chart is the default. A retailer may keep their own
   rows in the retailer_* tables; those OVERLAY the global chart (a value
   the retailer set wins; anything unset falls back to Global).
   ════════════════════════════════════════════════════════════════ */
const TTL_MS = 60_000;
const EMPTY_ROWS = { metals: [], diamonds: [], sieves: [], stones: [], makings: [] };

let _globalRows = null;   // raw global rows (kept so overlays can be rebuilt cheaply)
let _globalChart = null;  // chart built from global rows only
let _at = 0;
const _retailerCharts = new Map(); // retailerId -> { chart, at }

async function loadGlobalRows() {
  const [metals, diamonds, sieves, stones, makings] = await Promise.all([
    query("SELECT gold_type, rate_per_gram FROM metal_rates"),
    query("SELECT shape_group, sieve_size, shade, clarity, rate_per_carat FROM diamond_rates"),
    query("SELECT shape_group, carat_min, carat_max, sieve_size FROM diamond_sieve_map"),
    query("SELECT category, stone_name, quality, rate, unit, carat, pcs FROM stone_rates"),
    query("SELECT scope, mode, value FROM making_charges"),
  ]);
  return { metals: metals.rows, diamonds: diamonds.rows, sieves: sieves.rows, stones: stones.rows, makings: makings.rows };
}

async function loadRetailerRows(retailerId) {
  const [metals, diamonds, sieves, stones, makings] = await Promise.all([
    query("SELECT gold_type, rate_per_gram FROM retailer_metal_rates WHERE retailer_id = $1", [retailerId]),
    query("SELECT shape_group, sieve_size, shade, clarity, rate_per_carat FROM retailer_diamond_rates WHERE retailer_id = $1", [retailerId]),
    query("SELECT shape_group, carat_min, carat_max, sieve_size FROM retailer_sieve_map WHERE retailer_id = $1", [retailerId]),
    query("SELECT category, stone_name, quality, rate, unit, carat, pcs FROM retailer_stone_rates WHERE retailer_id = $1", [retailerId]),
    query("SELECT scope, mode, value FROM retailer_making_charges WHERE retailer_id = $1", [retailerId]),
  ]);
  return { metals: metals.rows, diamonds: diamonds.rows, sieves: sieves.rows, stones: stones.rows, makings: makings.rows };
}

/* Build a chart from global rows (g) with retailer rows (r) overlaid on top. */
function buildChart(g, r) {
  const metalMap = new Map();
  for (const row of g.metals) metalMap.set(up(row.gold_type), num(row.rate_per_gram));
  for (const row of r.metals) metalMap.set(up(row.gold_type), num(row.rate_per_gram));

  const diamondMap = new Map();
  for (const row of g.diamonds) diamondMap.set(dkey(row.shape_group, row.sieve_size, row.shade, row.clarity), num(row.rate_per_carat));
  for (const row of r.diamonds) diamondMap.set(dkey(row.shape_group, row.sieve_size, row.shade, row.clarity), num(row.rate_per_carat));

  // Sieve ranges grouped by shape_group. A retailer that defines any range for
  // a group REPLACES the global ranges for that group (avoids overlap clashes).
  const sieveByGroup = new Map();
  const pushRange = (map, row) => {
    const grp = up(row.shape_group);
    if (!map.has(grp)) map.set(grp, []);
    map.get(grp).push({ min: num(row.carat_min), max: row.carat_max == null ? null : num(row.carat_max), sieve: row.sieve_size });
  };
  for (const row of g.sieves) pushRange(sieveByGroup, row);
  const retSieve = new Map();
  for (const row of r.sieves) pushRange(retSieve, row);
  for (const [grp, arr] of retSieve) sieveByGroup.set(grp, arr);
  for (const arr of sieveByGroup.values()) arr.sort((a, b) => a.min - b.min);

  // Stone: name+quality key, plus a name-only fallback (retailer rows override).
  const stoneMap = new Map();
  const addStone = (row, override) => {
    const rec = {
      rate: num(row.rate), unit: row.unit || "carat",
      carat: row.carat == null ? null : num(row.carat),
      pcs: row.pcs == null ? null : num(row.pcs),
    };
    stoneMap.set(skey(row.stone_name, row.quality), rec);
    const nameOnly = skey(row.stone_name, null);
    if (override || !stoneMap.has(nameOnly)) stoneMap.set(nameOnly, rec);
  };
  for (const row of g.stones) addStone(row, false);
  for (const row of r.stones) addStone(row, true);

  const makingMap = new Map();
  for (const row of g.makings) makingMap.set(up(row.scope), { mode: row.mode, value: num(row.value) });
  for (const row of r.makings) makingMap.set(up(row.scope), { mode: row.mode, value: num(row.value) });

  return {
    metalRate: (goldType) => metalMap.get(up(goldType)) ?? 0,
    diamondRate: (group, sieve, shade, clarity) => diamondMap.get(dkey(group, sieve, shade, clarity)) ?? null,
    sieveFor: (group, carat) => {
      const arr = sieveByGroup.get(up(group));
      if (!arr) return null;
      const hit = arr.find((s) => carat >= s.min && (s.max == null || carat < s.max));
      return hit ? hit.sieve : null;
    },
    stoneRate: (name) => stoneMap.get(skey(name, null)) || null,
    makingFor: (product) => (
      (product.metal_type && makingMap.get(up(product.metal_type))) ||
      (product.category && makingMap.get(up(product.category))) ||
      makingMap.get("DEFAULT") ||
      { mode: "percent", value: 0 }
    ),
  };
}

/** Get the rate chart for a retailer (their overlay on Global), or the Global
 *  chart when retailerId is falsy. Cached with a short TTL. */
async function getRateChart(retailerId) {
  const now = Date.now();
  if (!_globalRows || now - _at >= TTL_MS) {
    _globalRows = await loadGlobalRows();
    _globalChart = buildChart(_globalRows, EMPTY_ROWS);
    _at = now;
    _retailerCharts.clear();
  }
  if (!retailerId) return _globalChart;
  const cached = _retailerCharts.get(retailerId);
  if (cached && now - cached.at < TTL_MS) return cached.chart;
  const retRows = await loadRetailerRows(retailerId);
  const hasAny = retRows.metals.length || retRows.diamonds.length || retRows.sieves.length ||
                 retRows.stones.length || retRows.makings.length;
  const chart = hasAny ? buildChart(_globalRows, retRows) : _globalChart;
  _retailerCharts.set(retailerId, { chart, at: now });
  return chart;
}

/** Drop cached charts (global + all retailer overlays) so the next price uses
 *  fresh rates. Call after any admin mutation of the rate tables. */
function invalidateRateCache() {
  _globalRows = null;
  _globalChart = null;
  _at = 0;
  _retailerCharts.clear();
}

const up = (v) => (v == null ? "" : String(v).trim().toUpperCase());
const dkey = (g, s, sh, cl) => `${up(g)}|${up(s)}|${up(sh)}|${up(cl)}`;
const skey = (name, q) => `${up(name)}|${up(q)}`;

/* ════════════════════════════════════════════════════════════════
   Component breakdown (master chart only — no retailer factors)
   ════════════════════════════════════════════════════════════════ */
function computeBreakdown(product, chart) {
  const carat = num(product.carat);
  // Metal cost is based on NET weight (falls back to legacy metal_weight for old rows).
  const weight = num(product.net_weight) || num(product.metal_weight);

  // Metal
  const goldType = normalizeGoldType(product.metal_type);
  const goldRate = chart.metalRate(goldType);
  const metalCost = goldRate * weight;

  // Diamonds — price EVERY diamond on the product and sum the costs. When no
  // diamond rows are attached, fall back to the bridged single diamond_* columns.
  const diamondRows = (Array.isArray(product.diamonds) && product.diamonds.length)
    ? product.diamonds
    : [{
        diamond_shape: product.diamond_shape, diamond_size: product.diamond_size,
        diamond_color: product.diamond_color, diamond_clarity: product.diamond_clarity,
        carat: product.carat, diamond_pcs: product.diamond_pcs,
      }];

  let diamondCost = 0, diamondMatched = false;
  const diamondLines = [];
  for (const dr of diamondRows) {
    const dCarat = num(dr.carat);
    if (!dr.diamond_shape || !(dCarat > 0 || dr.diamond_size)) continue;
    const grp = toShapeGroup(dr.diamond_shape);
    // Prefer the row's explicit sieve size; else derive it from carat via the map.
    const explicit = dr.diamond_size ? String(dr.diamond_size).trim() : null;
    const sv = explicit || (dCarat > 0 ? chart.sieveFor(grp, dCarat) : null);
    const sh = normalizeShade(dr.diamond_color);
    const cl = normalizeClarity(dr.diamond_clarity);
    const pcs = num(dr.diamond_pcs, 0);
    let rate = 0, matched = false;
    if (sv) {
      const r = chart.diamondRate(grp, sv, sh, cl);
      if (r != null) { rate = r; matched = true; }
    }
    // Diamond cost = rate × carat (carat is the total weight; pcs is informational).
    const lineCost = matched ? rate * (dCarat > 0 ? dCarat : 1) : 0;
    diamondCost += lineCost;
    if (matched) diamondMatched = true;
    diamondLines.push({ shape_group: grp, sieve: sv, shade: sh, clarity: cl, rate_per_carat: rate, carat: dCarat, pcs: pcs > 0 ? pcs : 1, cost: lineCost, matched });
  }
  const firstDia = diamondLines.find((l) => l.matched) || diamondLines[0] || {};

  // Stones — price EVERY stone on the product and sum. cost = rate × carat × pcs
  // (carat only when the rate is per-carat). Falls back to the single bridged
  // color_stone_* columns when no stone rows are attached.
  const stoneRows = (Array.isArray(product.stones) && product.stones.length)
    ? product.stones.map((s) => ({ cands: [s.stone_name, s.quality], carat: num(s.carat, 0), pcs: num(s.pcs, 0) }))
    : [{ cands: [product.color_stone_quality, product.color_stone_name], carat: num(product.color_stone_carat, 0), pcs: num(product.color_stone_pcs, 0) }];

  let stoneCost = 0, stoneMatched = false;
  const stoneLines = [];
  for (const row of stoneRows) {
    let matched = false, rate = 0, unit = null, name = null, sCarat = row.carat, sPcs = row.pcs;
    for (const cand of row.cands) {
      if (!cand) continue;
      const sr = chart.stoneRate(cand);
      if (sr) {
        rate = sr.rate; unit = sr.unit; name = cand; matched = true;
        if (sr.carat != null && sr.carat > 0) sCarat = sr.carat;
        if (sr.pcs != null && sr.pcs > 0) sPcs = sr.pcs;
        break;
      }
    }
    const caratMul = (unit || "carat") === "carat" ? (sCarat > 0 ? sCarat : 1) : 1;
    const lineCost = matched ? rate * caratMul * (sPcs > 0 ? sPcs : 1) : 0;
    stoneCost += lineCost;
    if (matched) stoneMatched = true;
    stoneLines.push({ name, rate, unit, carat: sCarat, pcs: sPcs > 0 ? sPcs : 1, cost: lineCost, matched });
  }
  const firstStone = stoneLines.find((l) => l.matched) || stoneLines[0] || {};

  // Making — flat ₹, percent of metal, or per-gram × NET weight.
  // Weight-based making always uses NET weight (business rule).
  const making = chart.makingFor(product);
  const makingCost =
    making.mode === "percent" ? metalCost * (making.value / 100) :
    (making.mode === "gross" || making.mode === "net") ? making.value * num(product.net_weight, 0) :
    making.value; // flat

  const baseCost = metalCost + diamondCost + stoneCost + makingCost;

  return {
    metalCost, diamondCost, stoneCost, makingCost, baseCost,
    detail: {
      gold: { gold_type: goldType, rate_per_gram: goldRate, weight, cost: metalCost },
      diamond: {
        shape_group: firstDia.shape_group ?? null, sieve: firstDia.sieve ?? null,
        shade: firstDia.shade ?? null, clarity: firstDia.clarity ?? null,
        rate_per_carat: firstDia.rate_per_carat ?? 0, carat: firstDia.carat ?? carat,
        cost: diamondCost, matched: diamondMatched,
        count: diamondLines.filter((l) => l.matched).length, lines: diamondLines,
      },
      stone: {
        name: firstStone.name ?? null, rate: firstStone.rate ?? 0, unit: firstStone.unit ?? null,
        carat: firstStone.carat ?? 0, pcs: firstStone.pcs ?? 0,
        cost: stoneCost, matched: stoneMatched,
        count: stoneLines.filter((l) => l.matched).length, lines: stoneLines,
      },
      making: { mode: making.mode, value: making.value, cost: makingCost },
    },
  };
}

/* NOTE: retailer price_factor / flat_markup / component-factor multipliers have
   been REMOVED. Price comes purely from the rate chart (global rows + the
   retailer's own chart scope). The retailer chart scope is the single mechanism
   for per-retailer pricing; a fixed retailer_product_price override still wins. */

/* ════════════════════════════════════════════════════════════════
   Public API
   ════════════════════════════════════════════════════════════════ */

/** Fetch all diamond rows for the given product ids, grouped by product_id. */
async function loadDiamonds(ids) {
  const map = new Map();
  if (!ids || !ids.length) return map;
  const { rows } = await query(
    `SELECT product_id, diamond_shape, diamond_size, diamond_color, diamond_clarity, carat, diamond_pcs
     FROM product_diamonds WHERE product_id = ANY($1) ORDER BY sort_order, created_at`, [ids]);
  for (const r of rows) {
    if (!map.has(r.product_id)) map.set(r.product_id, []);
    map.get(r.product_id).push(r);
  }
  return map;
}

/** Fetch all stone rows for the given product ids, grouped by product_id. */
async function loadStones(ids) {
  const map = new Map();
  if (!ids || !ids.length) return map;
  const { rows } = await query(
    `SELECT product_id, stone_name, quality, carat, pcs
     FROM product_stones WHERE product_id = ANY($1) ORDER BY sort_order, created_at`, [ids]);
  for (const r of rows) {
    if (!map.has(r.product_id)) map.set(r.product_id, []);
    map.get(r.product_id).push(r);
  }
  return map;
}

/** Full price + breakdown for one product / retailer (used by preview). */
async function priceForRetailer(product, retailerId) {
  if (retailerId) {
    const ov = await query(
      "SELECT price FROM retailer_product_price WHERE retailer_id = $1 AND product_id = $2",
      [retailerId, product.id]);
    if (ov.rows.length) {
      return { price: num(ov.rows[0].price), source: "override", breakdown: null, retailer: null };
    }
  }
  const chart = await getRateChart(retailerId);
  // Price every diamond/stone on the product — fetch the rows unless already attached.
  if (!Array.isArray(product.diamonds) && product.id) {
    const m = await loadDiamonds([product.id]);
    product = { ...product, diamonds: m.get(product.id) || [] };
  }
  if (!Array.isArray(product.stones) && product.id) {
    const m = await loadStones([product.id]);
    product = { ...product, stones: m.get(product.id) || [] };
  }
  const bd = computeBreakdown(product, chart);
  const price = finalize(bd, product);
  return { price: price.value, source: price.source, breakdown: bd, retailer: null };
}

/** Batch: attach `price` + `price_source` to each product for one retailer.
 *  Costs ~2 queries total regardless of how many products. */
async function priceProductsForRetailer(products, retailerId) {
  if (!products.length) return products;
  const chart = await getRateChart(retailerId);

  const ids = products.map((p) => p.id);
  const overrides = new Map();
  if (retailerId) {
    const { rows } = await query(
      "SELECT product_id, price FROM retailer_product_price WHERE retailer_id = $1 AND product_id = ANY($2)",
      [retailerId, ids]);
    for (const r of rows) overrides.set(r.product_id, num(r.price));
  }
  // One query each for diamonds + stones, then sum per product in computeBreakdown.
  const [diaMap, stoneMap] = await Promise.all([loadDiamonds(ids), loadStones(ids)]);

  return products.map((p) => {
    if (overrides.has(p.id)) return { ...p, price: overrides.get(p.id), price_source: "override" };
    const bd = computeBreakdown({ ...p, diamonds: diaMap.get(p.id) || [], stones: stoneMap.get(p.id) || [] }, chart);
    const price = finalize(bd, p);
    return { ...p, price: price.value, price_source: price.source };
  });
}

/** Price = the rate-chart total. Falls back to base_price only when the chart
 *  produced nothing (e.g. Kundan/Beads with no per-carat rate). Rounded to rupee. */
function finalize(bd, product) {
  if (bd.baseCost > 0) {
    return { value: Math.round(bd.baseCost), source: "computed" };
  }
  return { value: Math.round(num(product.base_price)), source: "base_fallback" };
}

module.exports = {
  toShapeGroup,
  getRateChart,
  invalidateRateCache,
  computeBreakdown,
  priceForRetailer,
  priceProductsForRetailer,
};
