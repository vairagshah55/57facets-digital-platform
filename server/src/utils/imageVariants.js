const sharp = require("sharp");
const { uploadFile } = require("./gcsUpload");

// Resized WebP variants generated for every uploaded image. Widths are max
// widths (never upscaled). Served per context: thumb for gallery/nav thumbs,
// card for catalog grids, full for the detail view / zoom.
const VARIANTS = {
  thumb: { width: 240, quality: 72 },
  card: { width: 640, quality: 78 },
  full: { width: 1600, quality: 82 },
};

// products/1783-abc.jpg  ->  products/1783-abc_card.webp
function variantName(filename, suffix) {
  const dot = filename.lastIndexOf(".");
  const base = dot === -1 ? filename : filename.slice(0, dot);
  return `${base}_${suffix}.webp`;
}

// Generate all resized WebP variants + a tiny blurred LQIP placeholder for the
// given original image buffer, writing each as a sibling file (or GCS object)
// via uploadFile. `filename` is the ORIGINAL destination path.
// Throws on failure — callers should catch so a variant error never blocks the
// upload itself (the frontend falls back to the original on a missing variant).
async function generateImageVariants(buffer, filename) {
  const sized = Object.entries(VARIANTS).map(async ([suffix, cfg]) => {
    const buf = await sharp(buffer, { failOn: "none" })
      .rotate() // honour EXIF orientation
      .resize({ width: cfg.width, withoutEnlargement: true })
      .webp({ quality: cfg.quality })
      .toBuffer();
    return uploadFile(buf, variantName(filename, suffix), "image/webp");
  });

  // LQIP: 24px wide, blurred, heavily compressed — a ~1 KB instant placeholder.
  const blur = (async () => {
    const buf = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: 24, withoutEnlargement: true })
      .blur()
      .webp({ quality: 40 })
      .toBuffer();
    return uploadFile(buf, variantName(filename, "blur"), "image/webp");
  })();

  await Promise.all([...sized, blur]);
}

module.exports = { generateImageVariants, variantName, VARIANTS };
