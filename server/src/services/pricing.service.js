/* ════════════════════════════════════════════════════════════════
   Pricing service — computes a product's price from the master rate
   chart and applies the per-retailer pricing layers.

     price = (metal + diamond + stone + making) + duty%   (master chart)
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
  if (s.includes("ROUND") || s.includes("SOLITAIRE")) return "ROUND";
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
const EMPTY_ROWS = { metals: [], diamonds: [], sieves: [], stones: [], makings: [], duties: [] };

let _globalRows = null;   // raw global rows (kept so overlays can be rebuilt cheaply)
let _globalChart = null;  // chart built from global rows only
let _at = 0;
const _retailerCharts = new Map(); // retailerId -> { chart, at }

async function loadGlobalRows() {
  const [metals, diamonds, sieves, stones, makings, duties] = await Promise.all([
    query("SELECT country, gold_type, rate_per_gram FROM metal_rates"),
    query("SELECT country, diamond_type, shape_group, sieve_size, shade, clarity, rate_per_carat FROM diamond_rates"),
    query("SELECT shape_group, carat_min, carat_max, sieve_size FROM diamond_sieve_map"),
    query("SELECT country, category, stone_name, quality, rate, rate_pc, unit, carat, pcs FROM stone_rates"),
    query("SELECT country, scope, mode, value FROM making_charges"),
    query("SELECT country, percent FROM duty_charges"),
  ]);
  return { metals: metals.rows, diamonds: diamonds.rows, sieves: sieves.rows, stones: stones.rows, makings: makings.rows, duties: duties.rows };
}

async function loadRetailerRows(retailerId) {
  const [metals, diamonds, sieves, stones, makings, duties] = await Promise.all([
    query("SELECT gold_type, rate_per_gram FROM retailer_metal_rates WHERE retailer_id = $1", [retailerId]),
    query("SELECT diamond_type, shape_group, sieve_size, shade, clarity, rate_per_carat FROM retailer_diamond_rates WHERE retailer_id = $1", [retailerId]),
    query("SELECT shape_group, carat_min, carat_max, sieve_size FROM retailer_sieve_map WHERE retailer_id = $1", [retailerId]),
    query("SELECT category, stone_name, quality, rate, rate_pc, unit, carat, pcs FROM retailer_stone_rates WHERE retailer_id = $1", [retailerId]),
    query("SELECT scope, mode, value FROM retailer_making_charges WHERE retailer_id = $1", [retailerId]),
    query("SELECT percent FROM retailer_duty_charges WHERE retailer_id = $1", [retailerId]),
  ]);
  return { metals: metals.rows, diamonds: diamonds.rows, sieves: sieves.rows, stones: stones.rows, makings: makings.rows, duties: duties.rows };
}

/* Build a chart from global rows (g) with retailer rows (r) overlaid on top.
   `country` selects the gold-rate set (India / United States); defaults to
   India and falls back to India when the requested country has no rows. */
function buildChart(g, r, country) {
  // Gold rates are per-COUNTRY (not per-retailer). Pick the retailer's country,
  // falling back to India.
  const wantC = up(country) || "INDIA";
  const metalMap = new Map();
  for (const row of g.metals) if (up(row.country) === wantC) metalMap.set(up(row.gold_type), num(row.rate_per_gram));
  if (metalMap.size === 0 && wantC !== "INDIA") {
    for (const row of g.metals) if (up(row.country) === "INDIA") metalMap.set(up(row.gold_type), num(row.rate_per_gram));
  }

  // Diamond base rates are per-COUNTRY (fallback India); retailer overrides on top.
  const diamondMap = new Map();
  // Cascading fallbacks (largest sieve wins) for diamonds whose exact
  // sieve/shade/clarity isn't in the matrix: group+shade+clarity → group+shade
  // → group. Ensures a diamond with a carat still prices from the shape's rates.
  const diaGSC = new Map(), diaGS = new Map(), diaG = new Map();
  const upsertBig = (m, k, mag, rate) => {
    const cur = m.get(k);
    if (!cur || mag > cur.mag || (mag === cur.mag && rate > cur.rate)) m.set(k, { mag, rate });
  };
  const setRate = (row) => diamondMap.set(dkey(row.diamond_type, row.shape_group, row.sieve_size, row.shade, row.clarity), num(row.rate_per_carat));
  // Fallbacks are built from BASE (country) rates only — never per-retailer
  // overrides, so an outlier override can't pollute a fallback price.
  const addFallback = (row) => {
    const rate = num(row.rate_per_carat);
    const tU = rateType(row.diamond_type);
    const sgU = up(row.shape_group), shU = up(row.shade), clU = up(row.clarity);
    const mag = Math.abs(parseInt(row.sieve_size, 10)) || 0;
    upsertBig(diaGSC, `${tU}|${sgU}|${shU}|${clU}`, mag, rate);
    upsertBig(diaGS, `${tU}|${sgU}|${shU}`, mag, rate);
    upsertBig(diaG, `${tU}|${sgU}`, mag, rate);
  };
  const baseDia = g.diamonds.filter((d) => up(d.country) === wantC);
  const diaRows = baseDia.length ? baseDia : g.diamonds.filter((d) => up(d.country) === "INDIA");
  for (const row of diaRows) { setRate(row); addFallback(row); }
  for (const row of r.diamonds) setRate(row); // retailer overrides → exact match only

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

  // Stone rates are GLOBAL for every retailer — no per-retailer overlay.
  // (Any legacy retailer_stone_rates rows are intentionally ignored, so the
  // price is always rate × carat × pcs from the Global stone chart.)
  const stoneMap = new Map();
  const addStone = (row, override) => {
    const rec = {
      rate: num(row.rate), ratePc: row.rate_pc == null ? null : num(row.rate_pc),
      unit: row.unit || "carat",
      carat: row.carat == null ? null : num(row.carat),
      pcs: row.pcs == null ? null : num(row.pcs),
    };
    stoneMap.set(skey(row.stone_name, row.quality), rec);
    const nameOnly = skey(row.stone_name, null);
    if (override || !stoneMap.has(nameOnly)) stoneMap.set(nameOnly, rec);
    // Category-aware key — disambiguates the same stone name across categories
    // (e.g. "RED COLOUR STONE" in Semi Precious vs Synthetic).
    if (row.category) stoneMap.set(skey(row.category, row.stone_name), rec);
  };
  // Stone rates are per-COUNTRY (fallback India).
  const baseStones = g.stones.filter((s) => up(s.country) === wantC);
  const stoneRows = baseStones.length ? baseStones : g.stones.filter((s) => up(s.country) === "INDIA");
  for (const row of stoneRows) addStone(row, false);

  // Making charges base is per-COUNTRY (fallback India); retailer overrides on top.
  const makingMap = new Map();
  const baseMk = g.makings.filter((m) => up(m.country) === wantC);
  const mkRows = baseMk.length ? baseMk : g.makings.filter((m) => up(m.country) === "INDIA");
  for (const row of mkRows) makingMap.set(up(row.scope), { mode: row.mode, value: num(row.value) });
  for (const row of r.makings) makingMap.set(up(row.scope), { mode: row.mode, value: num(row.value) });

  // Import/customs duty: a percent of the product's total value. Per-COUNTRY
  // (fallback India), and a retailer row REPLACES their country's rate.
  const baseDuty = (g.duties || []).find((d) => up(d.country) === wantC)
    || (g.duties || []).find((d) => up(d.country) === "INDIA");
  const retDuty = (r.duties || [])[0];
  const dutyPct = num(retDuty ? retDuty.percent : baseDuty && baseDuty.percent, 0);

  return {
    metalRate: (goldType) => metalMap.get(up(goldType)) ?? 0,
    diamondRate: (type, group, sieve, shade, clarity) => diamondMap.get(dkey(type, group, sieve, shade, clarity)) ?? null,
    // The BLANK-sieve ("any size") row of the matrix: a rate the admin entered
    // against no sieve at all. Used ONLY for diamonds that carry no sieve
    // themselves (solitaires, loose stones) — see computeBreakdown.
    diamondRateAnySize: (type, group, shade, clarity) => diamondMap.get(dkey(type, group, "", shade, clarity)) ?? null,
    // Cascading fallback when the exact sieve/grade isn't found: group+shade+
    // clarity → group+shade → group (each at its largest sieve).
    diamondRateFallback: (type, group, shade, clarity) => {
      const tU = rateType(type), gU = up(group), sU = up(shade), cU = up(clarity);
      const hit = diaGSC.get(`${tU}|${gU}|${sU}|${cU}`) || diaGS.get(`${tU}|${gU}|${sU}`) || diaG.get(`${tU}|${gU}`);
      return hit ? hit.rate : null;
    },
    sieveFor: (group, carat) => {
      const arr = sieveByGroup.get(up(group));
      if (!arr) return null;
      const hit = arr.find((s) => carat >= s.min && (s.max == null || carat < s.max));
      return hit ? hit.sieve : null;
    },
    stoneRate: (name) => stoneMap.get(skey(name, null)) || null,
    // Match by (category, name) — falls back to name-only via stoneRate.
    stoneByCat: (cat, name) => stoneMap.get(skey(cat, name)) || null,
    // Normalise a product's diamond_type ("Lab-grown") to a chart set ('LAB').
    rateTypeOf: (t) => rateType(t),
    // Duty % applied to the whole product value (see computeBreakdown).
    dutyPercent: () => dutyPct,
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
    _globalChart = buildChart(_globalRows, EMPTY_ROWS, "India"); // default (India) chart
    _at = now;
    _retailerCharts.clear();
  }
  if (!retailerId) return _globalChart;
  const cached = _retailerCharts.get(retailerId);
  if (cached && now - cached.at < TTL_MS) return cached.chart;
  // A retailer's gold rates depend on their country, so resolve it even when
  // they have no per-retailer diamond/making overlays.
  const { rows: cr } = await query("SELECT country FROM retailers WHERE id = $1", [retailerId]);
  const country = cr[0]?.country || "India";
  const retRows = await loadRetailerRows(retailerId);
  const chart = buildChart(_globalRows, retRows, country);
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
/* Diamond type → rate-chart set. Products store "Natural" / "Lab-grown"; the
   chart stores 'NATURAL' / 'LAB'. Anything unrecognised (or blank) is treated
   as NATURAL, which is what every pre-existing row is. */
const LAB_RE = /^(LAB|LAB[\s-]?GROWN|LABGROWN|CVD|HPHT|SYNTHETIC)$/;
function rateType(t) {
  const s = up(t).replace(/\s+/g, " ");
  return LAB_RE.test(s) ? "LAB" : "NATURAL";
}

const dkey = (t, g, s, sh, cl) => `${rateType(t)}|${up(g)}|${up(s)}|${up(sh)}|${up(cl)}`;
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
        diamond_type: product.diamond_type,
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
    // Which chart this stone prices from: 'LAB' for lab-grown, else 'NATURAL'.
    const dType = chart.rateTypeOf(dr.diamond_type);
    let rate = 0, matched = false, usedSieve = sv, usedType = dType;
    if (sv) {
      const r = chart.diamondRate(dType, grp, sv, sh, cl);
      if (r != null) { rate = r; matched = true; }
    }
    // BLANK SIEVE SIZE only. The matrix's blank-sieve row is the admin's
    // "any size" rate for this shape+grade, so a diamond entered without a
    // sieve (solitaires, loose stones) prices from it instead of guessing.
    // A diamond that HAS a sieve never comes through here — sized diamonds
    // keep the exact rate → largest-sieve path they always had, so adding a
    // blank row to the chart can never move a sized diamond's price.
    if (!matched && !sv) {
      const r = chart.diamondRateAnySize(dType, grp, sh, cl);
      if (r != null) { rate = r; matched = true; usedSieve = "any"; }
    }
    // Fallback: no sieve resolved (or that sieve has no row) → use the rate for
    // this shape+shade+clarity at the largest available sieve, so a diamond with
    // a carat but no sieve still prices.
    if (!matched) {
      const r = chart.diamondRateFallback(dType, grp, sh, cl);
      if (r != null) { rate = r; matched = true; usedSieve = sv || "~"; }
    }
    // A lab-grown stone with NO lab chart yet falls back to the natural chart,
    // so adding this feature changes no existing price. Once any lab rate is
    // entered for that shape+grade the lab chart wins and this never runs.
    if (!matched && dType === "LAB") {
      const r = chart.diamondRate("NATURAL", grp, sv, sh, cl)
        ?? (sv ? null : chart.diamondRateAnySize("NATURAL", grp, sh, cl))
        ?? chart.diamondRateFallback("NATURAL", grp, sh, cl);
      if (r != null) { rate = r; matched = true; usedType = "NATURAL (no lab rate)"; usedSieve = sv || "~"; }
    }
    // Diamond cost = rate × carat (carat is the total weight; pcs is informational).
    const lineCost = matched ? rate * (dCarat > 0 ? dCarat : 1) : 0;
    diamondCost += lineCost;
    if (matched) diamondMatched = true;
    diamondLines.push({ shape_group: grp, diamond_type: usedType, sieve: usedSieve, shade: sh, clarity: cl, rate_per_carat: rate, carat: dCarat, pcs: pcs > 0 ? pcs : 1, cost: lineCost, matched });
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
    // Quantities always come from the PRODUCT (carat / pcs). The rate chart
    // only supplies the rate + unit.
    let matched = false, rateCt = 0, ratePc = 0, unit = null, name = null;
    const sCarat = row.carat, sPcs = row.pcs;
    // The product carries (category, name) in its two stone fields. Match by
    // (category, name) first so a stone name shared across categories resolves
    // to the right rate; fall back to a name-only match.
    const [a, b] = row.cands;
    let sr = null;
    if (chart.stoneByCat(a, b)) { sr = chart.stoneByCat(a, b); name = b; }
    else if (chart.stoneByCat(b, a)) { sr = chart.stoneByCat(b, a); name = a; }
    else {
      for (const cand of row.cands) {
        if (!cand) continue;
        const r = chart.stoneRate(cand);
        if (r) { sr = r; name = cand; break; }
      }
    }
    if (sr) { rateCt = sr.rate; ratePc = sr.ratePc || 0; unit = sr.unit; matched = true; }
    // Per-carat: cost = rate(/ct) × product carat (pcs informational, like diamonds).
    // Per-piece:  cost = rate(/pc) × product pcs.
    const isCarat = (unit || "carat") === "carat";
    const rate = isCarat ? rateCt : ratePc; // the applicable rate for the unit
    const lineCost = matched
      ? (isCarat ? rate * (sCarat > 0 ? sCarat : 1) : rate * (sPcs > 0 ? sPcs : 1))
      : 0;
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

  // Duty — import/customs, charged on the product's TOTAL value (everything
  // above), not on any single component. 0% unless an admin set a rate, so it
  // adds nothing until configured.
  const dutyPercent = typeof chart.dutyPercent === "function" ? num(chart.dutyPercent()) : 0;
  const dutyCost = baseCost * (dutyPercent / 100);
  const total = baseCost + dutyCost;

  return {
    metalCost, diamondCost, stoneCost, makingCost, baseCost, dutyCost, total,
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
      duty: { percent: dutyPercent, base: baseCost, cost: dutyCost },
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
    `SELECT product_id, diamond_type, diamond_shape, diamond_size, diamond_color, diamond_clarity, carat, diamond_pcs
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
/** The retailer's country (defaults to India). Used to pick currency. */
async function getRetailerCountry(retailerId) {
  if (!retailerId) return "India";
  const { rows } = await query("SELECT country FROM retailers WHERE id = $1", [retailerId]);
  return rows[0]?.country || "India";
}

async function priceForRetailer(product, retailerId) {
  const country = await getRetailerCountry(retailerId);
  if (retailerId) {
    const ov = await query(
      "SELECT price FROM retailer_product_price WHERE retailer_id = $1 AND product_id = $2",
      [retailerId, product.id]);
    if (ov.rows.length) {
      return { price: num(ov.rows[0].price), source: "override", breakdown: null, retailer: null, country };
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
  return { price: price.value, source: price.source, breakdown: bd, retailer: null, country };
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
    // Duty rides on top of the component subtotal (0 unless configured).
    return { value: Math.round(bd.total != null ? bd.total : bd.baseCost), source: "computed" };
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
