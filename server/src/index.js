require("dotenv").config({ path: __dirname + "/../.env" });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");

const { errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const collectionRoutes = require("./routes/collection.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const orderRoutes = require("./routes/order.routes");
const notificationRoutes = require("./routes/notification.routes");
const uploadRoutes = require("./routes/upload.routes");
const adminAuthRoutes = require("./routes/admin.auth.routes");
const adminDashboardRoutes = require("./routes/admin.dashboard.routes");
const adminRetailerRoutes = require("./routes/admin.retailer.routes");
const adminProductRoutes = require("./routes/admin.product.routes");
const adminOrderRoutes = require("./routes/admin.order.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());
app.use(morgan("dev"));

// ── Static file serving (uploaded images) ──────────
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(path.join(__dirname, "../uploads")));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { error: "Too many requests, please try again later" },
});
app.use("/api", limiter);

// ── Routes ─────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/retailers", adminRetailerRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/orders", adminOrderRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Error handler ──────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`57Facets API running on http://localhost:${PORT}`);
});
