require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/* ════════════════════════════════════════════════════════════════
   Seed DAK / ENAMEL / LAKH into the stone chart.

   These are decorative materials rather than gemstones, so none of
   the gem categories fit — each is its own category, which is also
   how the products carry them: color_stone_name AND
   color_stone_quality are both e.g. 'LAKH'. Pricing's most specific
   lookup is stoneByCat(name, quality) -> skey('LAKH','LAKH'), and
   addStone() registers skey(category, stone_name) for every chart
   row, so category = stone_name = 'LAKH' matches on the first try
   instead of falling through to the name-only key.

   Seeded at rate 0 for BOTH countries: the rows exist so the admin
   can type the real figures in Pricing → Stone Rates, and nothing
   reprices until they do. DO NOTHING (not DO UPDATE) is deliberate —
   re-running this must never flatten a rate someone has entered.
   Fully idempotent.
   ════════════════════════════════════════════════════════════════ */
const MATERIALS = ["DAK", "ENAMEL", "LAKH"];
const COUNTRIES = ["India", "United States"];

const migration = `
INSERT INTO stone_rates (country, category, stone_name, quality, rate, rate_pc, unit)
SELECT c.country, m.name, m.name, NULL, 0, 0, 'carat'
FROM unnest($1::text[]) AS c(country)
CROSS JOIN unnest($2::text[]) AS m(name)
ON CONFLICT (country, category, stone_name, COALESCE(quality, '')) DO NOTHING;
`;

async function run() {
  console.log(`Seeding material stones (${MATERIALS.join(", ")}) for ${COUNTRIES.join(" + ")}...`);
  try {
    const res = await pool.query(migration, [COUNTRIES, MATERIALS]);
    console.log(`Material-stone seed completed (${res.rowCount} rows added, ${COUNTRIES.length * MATERIALS.length - res.rowCount} already present).`);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
