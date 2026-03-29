require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seed() {
  console.log("Seeding database...");

  try {
    // ── Categories ─────────────────────────────────
    await pool.query(`
      INSERT INTO categories (name, sort_order) VALUES
        ('Rings', 1),
        ('Necklaces', 2),
        ('Earrings', 3),
        ('Bangles', 4),
        ('Pendants', 5),
        ('Bracelets', 6)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Get category IDs
    const { rows: cats } = await pool.query("SELECT id, name FROM categories ORDER BY sort_order");
    const catMap = {};
    cats.forEach((c) => (catMap[c.name] = c.id));

    // ── Products ───────────────────────────────────
    const products = [
      { sku: "SF-RNG-0451", name: "Solitaire Diamond Ring", cat: "Rings", price: 125000, carat: 1.5, metal: "18K White Gold", metal_weight: 3.45, diamond_type: "Natural Diamond", diamond_shape: "Round Brilliant", diamond_color: "F", diamond_clarity: "VS1", cert: "GIA Certified", setting: "Prong Setting", hallmark: "BIS 750", width: 2.2, height: 6.8, avail: "in-stock", is_new: true },
      { sku: "SF-EAR-0312", name: "Emerald Drop Earrings", cat: "Earrings", price: 85000, carat: 0.8, metal: "18K Yellow Gold", metal_weight: 2.8, diamond_type: "Natural Emerald", diamond_shape: "Pear", diamond_color: "G", diamond_clarity: "VS2", cert: "IGI Certified", setting: "Bezel Setting", hallmark: "BIS 750", width: 8.5, height: 25, avail: "in-stock", is_new: true },
      { sku: "SF-NCK-0189", name: "Pearl Chain Necklace", cat: "Necklaces", price: 150000, carat: 2.0, metal: "Platinum", metal_weight: 8.2, diamond_type: "Natural Diamond", diamond_shape: "Round", diamond_color: "E", diamond_clarity: "VVS2", cert: "GIA Certified", setting: "Prong Setting", hallmark: "PT 950", width: 3, height: 450, avail: "made-to-order", is_new: true },
      { sku: "SF-BRC-0275", name: "Sapphire Tennis Bracelet", cat: "Bracelets", price: 210000, carat: 3.5, metal: "18K White Gold", metal_weight: 12.5, diamond_type: "Natural Sapphire", diamond_shape: "Oval", diamond_color: "F", diamond_clarity: "VS1", cert: "GIA Certified", setting: "Channel Setting", hallmark: "BIS 750", width: 4.5, height: 180, avail: "in-stock", is_new: true },
      { sku: "SF-EAR-0456", name: "Diamond Stud Set", cat: "Earrings", price: 95000, carat: 1.0, metal: "18K Rose Gold", metal_weight: 2.2, diamond_type: "Natural Diamond", diamond_shape: "Round Brilliant", diamond_color: "G", diamond_clarity: "VS1", cert: "IGI Certified", setting: "Prong Setting", hallmark: "BIS 750", width: 6, height: 6, avail: "in-stock", is_new: false },
      { sku: "SF-BNG-0123", name: "Gold Bangle Pair", cat: "Bangles", price: 75000, carat: 0, metal: "22K Yellow Gold", metal_weight: 18.5, diamond_type: null, diamond_shape: null, diamond_color: null, diamond_clarity: null, cert: null, setting: null, hallmark: "BIS 916", width: 6, height: 68, avail: "in-stock", is_new: false },
      { sku: "SF-PND-0098", name: "Ruby Pendant", cat: "Pendants", price: 65000, carat: 0.6, metal: "18K Yellow Gold", metal_weight: 2.1, diamond_type: "Natural Ruby", diamond_shape: "Oval", diamond_color: null, diamond_clarity: null, cert: "IGI Certified", setting: "Halo Setting", hallmark: "BIS 750", width: 12, height: 18, avail: "in-stock", is_new: false },
      { sku: "SF-RNG-0502", name: "Platinum Band Ring", cat: "Rings", price: 180000, carat: 0.5, metal: "Platinum", metal_weight: 6.8, diamond_type: "Natural Diamond", diamond_shape: "Princess", diamond_color: "D", diamond_clarity: "IF", cert: "GIA Certified", setting: "Channel Setting", hallmark: "PT 950", width: 5, height: 2.5, avail: "made-to-order", is_new: false },
      { sku: "SF-NCK-0234", name: "Diamond Cluster Necklace", cat: "Necklaces", price: 320000, carat: 4.2, metal: "18K White Gold", metal_weight: 15.3, diamond_type: "Natural Diamond", diamond_shape: "Round Brilliant", diamond_color: "F", diamond_clarity: "VS2", cert: "GIA Certified", setting: "Cluster Setting", hallmark: "BIS 750", width: 18, height: 420, avail: "in-stock", is_new: true },
      { sku: "SF-EAR-0567", name: "Tanzanite Drop Earrings", cat: "Earrings", price: 145000, carat: 1.8, metal: "18K White Gold", metal_weight: 4.2, diamond_type: "Natural Tanzanite", diamond_shape: "Pear", diamond_color: null, diamond_clarity: null, cert: "IGI Certified", setting: "Prong Setting", hallmark: "BIS 750", width: 10, height: 30, avail: "in-stock", is_new: true },
      { sku: "SF-BNG-0156", name: "Rose Gold Bangle", cat: "Bangles", price: 55000, carat: 0, metal: "18K Rose Gold", metal_weight: 14.2, diamond_type: null, diamond_shape: null, diamond_color: null, diamond_clarity: null, cert: null, setting: null, hallmark: "BIS 750", width: 5, height: 65, avail: "out-of-stock", is_new: false },
      { sku: "SF-RNG-0601", name: "Emerald Cocktail Ring", cat: "Rings", price: 275000, carat: 2.5, metal: "18K Yellow Gold", metal_weight: 5.8, diamond_type: "Natural Emerald", diamond_shape: "Emerald Cut", diamond_color: null, diamond_clarity: null, cert: "GIA Certified", setting: "Halo Setting", hallmark: "BIS 750", width: 14, height: 8, avail: "in-stock", is_new: false },
    ];

    for (const p of products) {
      await pool.query(
        `INSERT INTO products (sku, name, category_id, base_price, carat, metal_type, metal_weight,
          diamond_type, diamond_shape, diamond_color, diamond_clarity, diamond_certification,
          setting_type, hallmark, width_mm, height_mm, availability, is_new)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (sku) DO NOTHING`,
        [p.sku, p.name, catMap[p.cat], p.price, p.carat, p.metal, p.metal_weight,
         p.diamond_type, p.diamond_shape, p.diamond_color, p.diamond_clarity, p.cert,
         p.setting, p.hallmark, p.width, p.height, p.avail, p.is_new]
      );
    }

    // ── Collections ────────────────────────────────
    const collections = [
      { name: "Summer Radiance 2026", tagline: "Light as sunbeams, bold as summer", tag: "seasonal", launch: "2026-04-01", skus: ["SF-RNG-0451", "SF-EAR-0312", "SF-NCK-0234", "SF-EAR-0567"] },
      { name: "Eternal Bonds", tagline: "For promises that last forever", tag: "bridal", launch: "2026-02-14", skus: ["SF-RNG-0451", "SF-RNG-0502", "SF-RNG-0601", "SF-NCK-0189", "SF-EAR-0456"] },
      { name: "Heritage Luxe", tagline: "Where tradition meets modern craft", tag: "themed", launch: "2026-01-26", skus: ["SF-BNG-0123", "SF-BNG-0156", "SF-PND-0098", "SF-BRC-0275"] },
      { name: "Spring Bloom 2026", tagline: "Fresh designs for the new season", tag: "new-launch", launch: "2026-04-15", skus: ["SF-EAR-0312", "SF-PND-0098", "SF-EAR-0567"] },
    ];

    for (const c of collections) {
      const { rows } = await pool.query(
        `INSERT INTO collections (name, tagline, tag, launch_date)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (name) DO NOTHING
         RETURNING id`,
        [c.name, c.tagline, c.tag, c.launch]
      );
      if (rows.length > 0) {
        const colId = rows[0].id;
        for (let i = 0; i < c.skus.length; i++) {
          const { rows: prods } = await pool.query("SELECT id FROM products WHERE sku = $1", [c.skus[i]]);
          if (prods.length > 0) {
            await pool.query(
              "INSERT INTO collection_products (collection_id, product_id, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
              [colId, prods[0].id, i]
            );
          }
        }
      }
    }

    // ── Gold Prices ────────────────────────────────
    await pool.query(`
      INSERT INTO gold_prices (metal_type, price_per_gram) VALUES
        ('18K Yellow Gold', 5250),
        ('18K White Gold', 5450),
        ('18K Rose Gold', 5350),
        ('22K Yellow Gold', 6250),
        ('Platinum', 3200)
      ON CONFLICT DO NOTHING;
    `);

    // ── Demo Retailer ──────────────────────────────
    await pool.query(`
      INSERT INTO retailers (name, phone, email, company_name)
      VALUES ('Demo Retailer', '9876543210', 'demo@57facets.com', 'Demo Jewellers')
      ON CONFLICT (phone) DO NOTHING;
    `);

    console.log("Seeding completed successfully.");
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
