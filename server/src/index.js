require("dotenv").config({ path: __dirname + "/../.env" });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const jwt = require("jsonwebtoken");
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
const adminAuditRoutes = require("./routes/admin.audit.routes");
const adminReportsRoutes = require("./routes/admin.reports.routes");

const app = express();
app.set("trust proxy", 1); // Required for Cloud Run / load balancers
const PORT = process.env.PORT || 5000;

// ── Static uploads (local dev only) ────────────────
if (process.env.NODE_ENV === "local") {
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
}

// ── Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());
app.use(morgan("dev"));


// Rate limiting
function getRateLimitKey(req, useIpOnly = false) {
  if (!useIpOnly) {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      try {
        const token = header.split(" ")[1];
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload?.id) {
          const actorType = payload.type === "admin" ? "admin" : "retailer";
          return `${actorType}:${payload.id}`;
        }
      } catch {
        // Fall back to IP-based limiting when auth is unavailable.
      }
    }
  }

  return `ip:${req.ip}`;
}

function createLimiter({ max, useIpOnly = false }) {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max,
    standardHeaders: "draft-6",
    legacyHeaders: false,
    keyGenerator: (req) => getRateLimitKey(req, useIpOnly),
    message: { error: "Too many requests, please try again later" },
  });
}

const authLimiter = createLimiter({ max: 30, useIpOnly: true });
const uploadLimiter = createLimiter({ max: 300 });
const apiLimiter = createLimiter({ max: 1000 });

// ── Routes ─────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/admin/auth", authLimiter, adminAuthRoutes);
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/admin/upload", uploadLimiter, uploadRoutes);
app.use("/api", apiLimiter);
app.use("/api/products", productRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/retailers", adminRetailerRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/audit", adminAuditRoutes);
app.use("/api/admin/reports", adminReportsRoutes);

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
