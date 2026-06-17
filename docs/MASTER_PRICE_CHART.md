# Master Price Chart & Per‑Retailer Pricing — Design

> Goal: **every retailer can have a different price for the same product.**
> Prices are **computed dynamically** from a central *Master Rate Chart* (diamond rates, stone rates, gold rate, making charges) plus **per‑retailer adjustments**, instead of being stored as one fixed `base_price` per product.

This document analyses `MASTER RATE CHART WEBSITE.xlsx` and proposes the data model, price formula, admin UI, and rollout plan.

---

## 1. What the Excel tells us

The workbook has 5 sheets. Together they describe **how a product's price is built from its attributes**.

### 1.1 `ROUND` — round‑diamond rate matrix
A 2‑D matrix: **rate per carat = f(sieve size, grade)**.

- **Rows (sieve size):** `-2, +2, -3, -11, +11` (diamond sizing buckets).
- **Columns (grade = shade + clarity):** 20 combined grades —
  `EF-VVS, EF/VVS-VS, EF-VS, FG-VVS, FG/VVS-VS, FG-VS, FG-SI, GH-VVS, GH/VVS-VS, GH-VS, GH/VS/SI, GH-SI, HI-VS/SI, HI-VS, HI-SI, HI-I1, IJ-VS, IJ-VS/SI, IJ-SI, IJ-I1`.
- Each cell = ₹ rate per carat for that (sieve × grade).

### 1.2 `FANCY` — fancy‑shape diamond rate matrix
Same grade columns as ROUND, plus a **shape** dimension:

- **Shape groups:** `MARQUISE / BAGUETTE`, `PEAR / PRINCESS` (extendable).
- **Sieve size:** `-7, +7`.
- So **rate = f(shape group, sieve size, grade)**.

> Round vs Fancy is selected by the product's `diamond_shape`. ROUND shape → ROUND sheet; everything else → FANCY sheet (mapped to a shape group).

### 1.3 `STONES` — colour‑stone rates
**rate = f(category, stone name [, quality])**. Sample values:

| Category | Stone | Rate |
|---|---|---|
| Precious Stones | EMERALD | 125 |
| Precious Stones | Ruby / Blue Sapphire / Yellow Sapphire | 85 |
| Precious Stones | NAVRATNA | 25 |
| Semi Precious | Blue/Green/Red colour stone | 25 |
| Synthetic | Blue/Green/Red colour stone | 15 |
| Pearl | Fresh Water Pearl / Pearl | 5 |
| Kundan / Beads | — | (per piece / blank) |

### 1.4 `METAL` — gold types
`14KT, 18KT, 22KT, 24KT`. The per‑gram rate is **not fixed** — it tracks the **daily gold price** (often purity‑adjusted), so it lives in an editable table, not the spreadsheet.

### 1.5 `ALL IN ONE` — allowed values (dropdown master)
The single source of truth for valid attribute values. Use it to seed enums / validation:

| Attribute | Allowed values |
|---|---|
| Gold type | 14KT, 18KT, 22KT, 24KT |
| Gold colour | YELLOW, ROSE, WHITE, TWO TONE |
| Diamond shapes | ROUND, PRINCESS, PAN, BAGUETTE, MARQUISE, OVAL, SOLITAIRE, EMERALD, CUSHION, RADIANT |
| Diamond shade | EF, FG, GH, HI, IJ |
| Diamond quality (clarity) | VVS, VVS‑VS, VS, VS‑SI, SI |
| Colour‑stone name | Emerald, Ruby, Blue/Yellow Sapphire, Navratna, colour stones, pearls, kundan, beads |
| Colour‑stone category | Precious, Semi Precious, Synthetic, Pearl, Kundan, Beads |
| Diamond colour grade | WHITE, OFF WHITE, LIGHT, DARK LIGHT |

---

## 2. The price formula

A product is a **bill of materials**. Its price is the sum of component costs, each looked up in the rate chart from the product's stored attributes, then adjusted per retailer.

```
metal_cost    = goldRate(gold_type)            × metal_weight_g
diamond_cost  = diamondRate(shapeGroup, sieve(carat), grade(shade, clarity)) × diamond_carat
stone_cost    = stoneRate(stone_name, quality) × stone_weight_or_count
making_cost   = makingCharge(category|gold_type)        // flat ₹ or % of metal_cost
─────────────────────────────────────────────────────────
base_cost     = metal_cost + diamond_cost + stone_cost + making_cost

retailer_price = round( base_cost × retailer.price_factor + retailer.flat_markup )
```

Where:
- `grade(shade, clarity)` builds the matrix column key, e.g. `GH` + `SI` → `GH-SI`.
- `shapeGroup` maps `diamond_shape` → `ROUND` or a FANCY group (`MARQUISE/BAGUETTE`, `PEAR/PRINCESS`).
- `sieve(carat)` maps a product's carat to a sieve bucket (a small lookup table — see §4.4).
- `retailer.price_factor` is the **per‑retailer multiplier** that makes the same product cost different per retailer (the core requirement).

### Product attribute → rate lookup mapping
Everything needed already exists on `products`:

| Rate input | Product column |
|---|---|
| gold_type | `metal_type` |
| metal_weight_g | `metal_weight` |
| shapeGroup | derived from `diamond_shape` |
| grade | `diamond_color` (shade) + `diamond_clarity` |
| diamond_carat | `carat` |
| stone_name / quality | `color_stone_name` / `color_stone_quality` |

---

## 3. Per‑retailer pricing strategy

Three layers, applied in order. Pick the depth you need — **Layer 1 alone already satisfies the goal**; Layers 2–3 add granularity.

| Layer | What it does | Granularity | Effort |
|---|---|---|---|
| **1. Retailer factor** *(recommended start)* | One `price_factor` (+ optional flat markup) per retailer multiplies the computed base cost. | Whole catalog | Low |
| **2. Component factors** | Separate multipliers per retailer for *diamond / gold / stone / making*. | Per cost component | Medium |
| **3. Overrides** | Explicit price for a specific (retailer, product), bypassing the formula. | Single product | Medium |

Resolution at lookup time: **override (L3) → component factors (L2) → retailer factor (L1) → master base**.

This keeps **one master rate chart** (edit gold rate once, all retailers update) while each retailer's price differs via their factor(s).

---

## 4. Database schema

### 4.1 Master rate chart — diamonds
```sql
CREATE TABLE diamond_rates (
  id            SERIAL PRIMARY KEY,
  shape_group   TEXT NOT NULL,        -- 'ROUND' | 'MARQUISE/BAGUETTE' | 'PEAR/PRINCESS'
  sieve_size    TEXT NOT NULL,        -- '-2','+2','-3','-7','+7','-11','+11'
  shade         TEXT NOT NULL,        -- 'EF','FG','GH','HI','IJ'
  clarity       TEXT NOT NULL,        -- 'VVS','VVS-VS','VS','VS-SI','SI','I1'
  rate_per_carat NUMERIC(12,2) NOT NULL,
  UNIQUE (shape_group, sieve_size, shade, clarity)
);
```
> The Excel column `GH/VS/SI` etc. are compound grades — normalise them to a single `(shade, clarity)` pair on import, or store the raw `grade_key` column verbatim if you prefer to match the sheet 1:1.

### 4.2 Master rate chart — stones
```sql
CREATE TABLE stone_rates (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL,          -- 'Precious Stones', 'Semi Precious', ...
  stone_name  TEXT NOT NULL,          -- 'EMERALD', 'Ruby', ...
  quality     TEXT,                   -- nullable
  rate        NUMERIC(12,2) NOT NULL, -- per carat / per piece
  unit        TEXT DEFAULT 'carat',   -- 'carat' | 'piece'
  UNIQUE (category, stone_name, quality)
);
```

### 4.3 Master rate chart — metal & making
```sql
CREATE TABLE metal_rates (
  gold_type     TEXT PRIMARY KEY,     -- '14KT','18KT','22KT','24KT'
  rate_per_gram NUMERIC(12,2) NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE making_charges (
  id        SERIAL PRIMARY KEY,
  scope     TEXT NOT NULL,            -- 'default' | category name | gold_type
  mode      TEXT NOT NULL,            -- 'flat' | 'percent'
  value     NUMERIC(12,2) NOT NULL
);
```

### 4.4 Carat → sieve mapping
```sql
CREATE TABLE diamond_sieve_map (
  shape_group TEXT NOT NULL,
  carat_min   NUMERIC(6,3) NOT NULL,
  carat_max   NUMERIC(6,3) NOT NULL,
  sieve_size  TEXT NOT NULL
);
```

### 4.5 Per‑retailer pricing
```sql
-- Layer 1 + 2: factors on the retailer
ALTER TABLE retailers
  ADD COLUMN price_factor   NUMERIC(6,3) NOT NULL DEFAULT 1.000,  -- e.g. 1.15 = +15%
  ADD COLUMN flat_markup    NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN diamond_factor NUMERIC(6,3) DEFAULT NULL,            -- optional component overrides
  ADD COLUMN gold_factor    NUMERIC(6,3) DEFAULT NULL,
  ADD COLUMN stone_factor   NUMERIC(6,3) DEFAULT NULL,
  ADD COLUMN making_factor  NUMERIC(6,3) DEFAULT NULL;

-- Layer 3: explicit per‑product override
CREATE TABLE retailer_product_price (
  retailer_id INT  NOT NULL REFERENCES retailers(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  price       NUMERIC(12,2) NOT NULL,
  PRIMARY KEY (retailer_id, product_id)
);
```

> Keep `products.base_price` as a **fallback / display MRP** for products that fall outside the formula (e.g. Kundan/Beads with no per‑carat rate).

---

## 5. Computing a price (server)

```js
// pricing.service.js
async function computeRetailerPrice(product, retailer) {
  // L3 override wins
  const override = await getRetailerOverride(retailer.id, product.id);
  if (override) return override.price;

  // --- component base costs from master chart ---
  const goldRate = await metalRate(product.metal_type);
  const metalCost = goldRate * (product.metal_weight || 0);

  let diamondCost = 0;
  if (product.carat > 0 && product.diamond_shape) {
    const shapeGroup = toShapeGroup(product.diamond_shape);
    const sieve      = await sieveFor(shapeGroup, product.carat);
    const rate       = await diamondRate(shapeGroup, sieve, product.diamond_color, product.diamond_clarity);
    diamondCost = (rate || 0) * product.carat;
  }

  const stoneCost = product.color_stone_name
    ? (await stoneRate(product.color_stone_name, product.color_stone_quality) || 0) * (product.stone_weight || 1)
    : 0;

  const makingCost = await makingCharge(product, metalCost);

  // --- per‑retailer adjustment (L2 component, else L1 whole) ---
  const f = retailer; // factors
  const base =
      metalCost   * (f.gold_factor    ?? 1) +
      diamondCost * (f.diamond_factor ?? 1) +
      stoneCost   * (f.stone_factor   ?? 1) +
      makingCost  * (f.making_factor  ?? 1);

  return Math.round(base * f.price_factor + f.flat_markup);
}
```

- Catalog/list endpoints: compute per row for the logged‑in retailer (or batch‑compute + cache).
- **Order time:** snapshot the computed price into the order line (`unit_price`) so historical orders never change when the gold rate moves.

---

## 6. Admin panel UI

New **“Pricing”** section (sits beside Products/Orders), with tabs mirroring the Excel sheets:

1. **Diamond Rates (Round / Fancy)** — editable grid: rows = sieve size, columns = grade. One grid per shape group. Inline‑edit cells; bulk paste from Excel.
2. **Stone Rates** — table grouped by category, editable `rate`.
3. **Gold Rate** — `14/18/22/24KT` per‑gram inputs with “update today's rate” + last‑updated stamp.
4. **Making Charges** — flat/percent rules by scope.
5. **Retailer Pricing** — list of retailers, each with `price_factor`, optional component factors, and a “Per‑product overrides” drawer.
6. **Price Preview** — pick a product + retailer → shows the full cost breakdown (metal/diamond/stone/making → factor → final). Essential for trust/debugging.

Reuse existing UI conventions (the editable‑grid + skeleton + dialog patterns already in `AdminProducts`).

---

## 7. Seeding from the Excel

Add an **“Import Rate Chart”** action (same xlsx/zip plumbing as the product importer in `server/src/routes/admin.product.routes.js`):

1. Parse `ROUND` / `FANCY` → upsert `diamond_rates` (normalise grade columns → shade+clarity).
2. Parse `STONES` → upsert `stone_rates`.
3. Parse `METAL` → upsert `metal_rates` (rates entered by admin if blank).
4. Parse `ALL IN ONE` → seed allowed‑value lists (validation / dropdowns).
5. Wrap in a transaction with per‑row savepoints + an errors report (same pattern already used for product import).

---

## 8. API endpoints (sketch)

```
GET    /api/admin/pricing/diamond-rates?shapeGroup=ROUND
PUT    /api/admin/pricing/diamond-rates           # bulk upsert grid
GET/PUT /api/admin/pricing/stone-rates
GET/PUT /api/admin/pricing/metal-rates
GET/PUT /api/admin/pricing/making-charges
PUT    /api/admin/retailers/:id/pricing           # factors
PUT    /api/admin/retailers/:id/overrides         # per-product price
POST   /api/admin/pricing/import                   # seed from xlsx
GET    /api/admin/pricing/preview?productId&retailerId   # breakdown

# retailer-facing: product/catalog responses return the price already
# resolved for req.retailer (computed, not products.base_price)
```

---

## 9. Rollout phases

1. **Schema + master chart tables** and the Excel importer (read‑only impact).
2. **Pricing service** + Price Preview (verify numbers against the sheet before going live).
3. **Retailer `price_factor`** (Layer 1) → catalog/cart use computed price; snapshot at order time.
4. **Component factors + per‑product overrides** (Layers 2–3) as needed.
5. Migrate existing `base_price` usage; keep it as fallback for non‑formula items (Kundan/Beads).

---

### Summary
- The Excel is a **component rate chart**, not a product price list: price = metal + diamond + stone + making.
- Product attributes already map 1:1 to the rate‑chart dimensions, so prices can be **computed dynamically**.
- **Per‑retailer differences** come from a layered factor/override model on top of **one shared master chart** — change a rate once, every retailer reprices automatically, each by their own factor.
