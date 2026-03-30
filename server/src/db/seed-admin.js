require("dotenv").config({ path: __dirname + "/../../.env" });
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seed() {
  console.log("Seeding admin data...");
  try {
    const passwordHash = await bcrypt.hash("admin123", 10);

    await pool.query(
      `INSERT INTO admins (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ["57Facets Admin", "admin@57facets.com", passwordHash, "super_admin"]
    );

    console.log("Admin seeded: admin@57facets.com / admin123");
  } catch (err) {
    console.error("Admin seed failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
