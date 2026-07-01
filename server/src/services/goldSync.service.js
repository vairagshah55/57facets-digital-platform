/* ════════════════════════════════════════════════════════════════
   Gold price sync — pulls a live gold rate from the Nebula API and
   updates metal_rates (14/18/22/24KT per gram).

   Env:
     NEBULA_GOLD_URL        endpoint returning the gold price (JSON)
     NEBULA_API_TOKEN       Bearer token (NOTE: Nebula access tokens are
                            short-lived ~15 min — swap for a long-lived key)
     NEBULA_GOLD_UNIT       'gram' | 'ounce'  (how the API quotes; default gram)
     NEBULA_GOLD_BASE_KARAT karat the quote represents (default 24)

   The response parser is intentionally tolerant: it first looks for explicit
   per-karat fields (24k/22k/18k/14k), otherwise a single gold price under any
   of the common key names, then derives the other karats by purity ratio.
   ════════════════════════════════════════════════════════════════ */

const { query } = require("../config/db");
const pricing = require("./pricing.service");
const AppError = require("../utils/AppError");

// Upstream (gateway) failures use 502 so the descriptive message reaches the
// client — the global error handler masks plain 500s as "Internal server error".
const upstream = (msg) => new AppError(msg, 502);

const GRAMS_PER_TROY_OUNCE = 31.1034768;
const KARATS = [14, 18, 22, 24];

function num(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/* Fetch the raw JSON from Nebula. Throws a descriptive error on any non-JSON
   / non-200 response so the admin sees exactly what came back. */
async function fetchNebulaGold() {
  let url = process.env.NEBULA_GOLD_URL;
  const token = process.env.NEBULA_API_TOKEN;
  if (!url) throw new Error("NEBULA_GOLD_URL is not configured");

  // Nebula's gold_price requires a ?city= param.
  const city = process.env.NEBULA_GOLD_CITY || "mumbai";
  if (city && !/[?&]city=/.test(url)) url += (url.includes("?") ? "&" : "?") + "city=" + encodeURIComponent(city);

  let res;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (e) {
    throw upstream(`Could not reach gold API: ${e.message}`);
  }

  const body = await res.text();
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    throw upstream(`Gold API returned ${res.status}. ${body.slice(0, 160)}`);
  }
  if (!ct.includes("json")) {
    throw upstream(`Gold API did not return JSON (got ${ct || "unknown"}). Check NEBULA_GOLD_URL. Body: ${body.slice(0, 120)}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw upstream("Gold API returned malformed JSON");
  }
}

/* Tolerant extraction → { perGram24k, raw, matchedKey }.
   1) explicit per-karat fields, or
   2) a single gold price under a common key (treated as BASE_KARAT in the
      configured unit), converted to per-gram-24k. */
function extractPerGram24k(json) {
  const unit = (process.env.NEBULA_GOLD_UNIT || "gram").toLowerCase();
  const baseKarat = parseInt(process.env.NEBULA_GOLD_BASE_KARAT || "24", 10) || 24;
  const toGram = (v) => (unit === "ounce" ? v / GRAMS_PER_TROY_OUNCE : v);

  // Flatten the object so we can match keys regardless of nesting.
  const flat = {};
  (function walk(o, prefix) {
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      const key = (prefix ? prefix + "." : "") + k;
      if (v && typeof v === "object") walk(v, key);
      else flat[key.toLowerCase()] = v;
    }
  })(json, "");

  // 1) explicit per-karat (e.g. price_gram_24k, "24k", rates.22kt)
  const karatHit = (k) => {
    const re = new RegExp(`(^|[._])(${k}k|${k}kt|gram_?${k}k?)([._]|$)`);
    for (const [key, val] of Object.entries(flat)) {
      if (re.test(key)) { const n = num(val); if (n) return n; }
    }
    return null;
  };
  const direct = {};
  for (const k of KARATS) { const v = karatHit(k); if (v) direct[k] = toGram(v); }
  if (direct[24]) {
    return { perGram24k: direct[24], raw: direct, matchedKey: "per-karat fields" };
  }
  if (Object.keys(direct).length) {
    // derive 24k from whichever karat we found
    const anyK = Object.keys(direct)[0];
    return { perGram24k: direct[anyK] * (24 / Number(anyK)), raw: direct, matchedKey: `${anyK}k field` };
  }

  // 2) single gold price under a common key
  const PRICE_KEYS = ["gold_price", "gold", "price_gram", "price", "rate", "value", "xau", "ask", "spot", "amount"];
  for (const want of PRICE_KEYS) {
    for (const [key, val] of Object.entries(flat)) {
      if (key === want || key.endsWith("." + want)) {
        const n = num(val);
        if (n) {
          const perGramBase = toGram(n);
          return { perGram24k: perGramBase * (24 / baseKarat), raw: n, matchedKey: key };
        }
      }
    }
  }
  throw upstream("Could not find a gold price in the API response. Share a sample response so the parser can be mapped.");
}

function karatRates(perGram24k) {
  const out = {};
  for (const k of KARATS) out[`${k}KT`] = Math.round((perGram24k * k) / 24 * 100) / 100;
  return out;
}

/* Nebula shape: prices.gold{24,22,18,14}k.pricePerGram (INR, already per-karat).
   Returns { "24KT": n, ... } using the API's own per-karat values, or null. */
function extractKaratRates(json) {
  const p = json && json.prices;
  if (!p || typeof p !== "object") return null;
  const out = {};
  for (const k of KARATS) {
    const node = p[`gold${k}k`] || p[`gold${k}K`];
    const v = node ? num(node.pricePerGram ?? node.price_per_gram ?? node.perGram) : null;
    if (v && v > 0) out[`${k}KT`] = v;
  }
  return Object.keys(out).length ? out : null;
}

/* ── IBJA (ibjarates.com) — free, token-less India bullion source ──
   This is the reliable primary: gold999/916/750 = 24K/22K/18K, posted as
   INR per 10g in stable ASP.NET span ids. 14K is derived (999 × 14/24). */
async function fetchIbjaRates() {
  let res;
  try {
    res = await fetch("https://ibjarates.com/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JewelleryRates/1.0)" },
    });
  } catch (e) {
    throw upstream(`Could not reach IBJA: ${e.message}`);
  }
  const html = await res.text();
  if (!res.ok || html.length < 1000) throw upstream(`IBJA returned ${res.status}`);

  const intOf = (s) => { const n = parseInt(String(s).replace(/,/g, ""), 10); return Number.isFinite(n) && n > 0 ? n : null; };
  const firstMatch = (re) => { const m = html.match(re); return m ? intOf(m[1]) : null; };

  // fineness → karat: 999=24K, 916=22K, 750=18K, 585=14K
  // Current IBJA markup: <span id="GoldRatesCompare999">15424</span> (per GRAM).
  // Legacy fallbacks: <span id="lblGold999_PM">154190</span> and
  // <td data-label="Gold 999">154190</td> are per 10g (÷10).
  const perGram = (fine) => {
    const compare = firstMatch(new RegExp(`id="GoldRatesCompare${fine}"[^>]*>\\s*([\\d,]+)`));
    if (compare) return compare; // already per gram
    const per10g = firstMatch(new RegExp(`id="lblGold${fine}_(?:PM|AM)"[^>]*>\\s*([\\d,]+)`))
      ?? firstMatch(new RegExp(`data-label="Gold ${fine}"[^>]*>\\s*([\\d,]+)`));
    return per10g ? per10g / 10 : null; // legacy: per 10g → per gram
  };

  const g999 = perGram(999); // 24K
  const g916 = perGram(916); // 22K
  const g750 = perGram(750); // 18K
  const g585 = perGram(585); // 14K (derive if absent)
  if (!g999 || !g916 || !g750) {
    throw upstream("Could not parse IBJA gold rates (page structure may have changed)");
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  return {
    "24KT": r2(g999),
    "22KT": r2(g916),
    "18KT": r2(g750),
    "14KT": r2(g585 || g999 * (14 / 24)),
  };
}

/* Fetch live gold → upsert metal_rates → invalidate the pricing cache.
   Tries Nebula first IF it returns valid (non-zero) data — gives city-specific
   rates when a valid token is configured — otherwise uses IBJA. */
async function syncGoldRates(adminId = null) {
  let rates = null;
  let source = null;

  // Optional Nebula city rates (only if token is valid & data is non-zero).
  if (process.env.NEBULA_API_TOKEN) {
    try {
      const json = await fetchNebulaGold();
      if (json && json.success !== false) {
        rates = extractKaratRates(json);
        if (rates) source = "nebula";
      }
    } catch {
      /* Nebula unavailable (expired token / 404) — fall back to IBJA below. */
    }
  }

  // Primary / fallback: IBJA live bullion rates.
  if (!rates) {
    rates = await fetchIbjaRates();
    source = "ibja";
  }

  // IBJA/Nebula are Indian sources → these update the India gold chart.
  for (const [gold_type, rate] of Object.entries(rates)) {
    await query(
      `INSERT INTO metal_rates (country, gold_type, rate_per_gram, updated_by)
       VALUES ('India',$1,$2,$3)
       ON CONFLICT (country, gold_type) DO UPDATE SET rate_per_gram = EXCLUDED.rate_per_gram, updated_by = EXCLUDED.updated_by`,
      [gold_type, rate, adminId]);
  }
  pricing.invalidateRateCache();
  return { source, rates, perGram24k: rates["24KT"] || null, syncedAt: new Date().toISOString() };
}

module.exports = { syncGoldRates, fetchNebulaGold, fetchIbjaRates, extractPerGram24k, extractKaratRates, karatRates };
