const router = require("express").Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const AppError = require("../utils/AppError");

// ── Multer config ──────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type || "products";
    const dest = path.join(__dirname, "../../uploads", type);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|webp|avif|mp4|mov)$/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new AppError("Only image/video files are allowed (jpg, png, webp, avif, mp4, mov)"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// ── POST /api/upload/product-images/:productId ─────
// Upload one or more images for a product
router.post(
  "/product-images/:productId",
  authenticate,
  (req, res, next) => { req.params.type = "products"; next(); },
  upload.array("images", 10),
  async (req, res, next) => {
    try {
      const { productId } = req.params;
      const files = req.files;

      if (!files || files.length === 0) {
        throw new AppError("No files uploaded");
      }

      // Check product exists
      const { rows: products } = await query("SELECT id FROM products WHERE id = $1", [productId]);
      if (products.length === 0) throw new AppError("Product not found", 404);

      // Check if product already has a primary image
      const { rows: existing } = await query(
        "SELECT id FROM product_images WHERE product_id = $1 AND is_primary = true",
        [productId]
      );
      const hasPrimary = existing.length > 0;

      const inserted = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageUrl = `/uploads/products/${file.filename}`;
        const isVideo = /\.(mp4|mov)$/i.test(file.originalname);
        const mediaType = isVideo ? "video" : "image";
        const isPrimary = !hasPrimary && i === 0;

        const { rows } = await query(
          `INSERT INTO product_images (product_id, image_url, is_primary, sort_order, media_type)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [productId, imageUrl, isPrimary, i, mediaType]
        );
        inserted.push(rows[0]);
      }

      res.status(201).json({
        message: `${inserted.length} file(s) uploaded`,
        images: inserted,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/upload/product-images/:imageId/primary ─
// Set an image as the primary image
router.put("/product-images/:imageId/primary", authenticate, async (req, res, next) => {
  try {
    // Get the image to find its product
    const { rows: images } = await query(
      "SELECT product_id FROM product_images WHERE id = $1",
      [req.params.imageId]
    );
    if (images.length === 0) throw new AppError("Image not found", 404);

    const productId = images[0].product_id;

    // Unset all primary for this product
    await query(
      "UPDATE product_images SET is_primary = false WHERE product_id = $1",
      [productId]
    );

    // Set this one as primary
    await query(
      "UPDATE product_images SET is_primary = true WHERE id = $1",
      [req.params.imageId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/upload/product-images/:imageId ──────
router.delete("/product-images/:imageId", authenticate, async (req, res, next) => {
  try {
    await query("DELETE FROM product_images WHERE id = $1", [req.params.imageId]);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/upload/category-image/:categoryId ────
router.post(
  "/category-image/:categoryId",
  authenticate,
  (req, res, next) => { req.params.type = "categories"; next(); },
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError("No file uploaded");

      const imageUrl = `/uploads/categories/${req.file.filename}`;
      await query(
        "UPDATE categories SET image_url = $1 WHERE id = $2",
        [imageUrl, req.params.categoryId]
      );

      res.json({ imageUrl });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/upload/collection-cover/:collectionId ─
router.post(
  "/collection-cover/:collectionId",
  authenticate,
  (req, res, next) => { req.params.type = "collections"; next(); },
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError("No file uploaded");

      const imageUrl = `/uploads/collections/${req.file.filename}`;
      await query(
        "UPDATE collections SET cover_image = $1 WHERE id = $2",
        [imageUrl, req.params.collectionId]
      );

      res.json({ imageUrl });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/upload/product-images/:productId ───────
// List all images for a product
router.get("/product-images/:productId", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order",
      [req.params.productId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
