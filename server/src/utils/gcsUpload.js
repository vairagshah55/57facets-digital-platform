const path = require("path");
const fs = require("fs");
const { Storage } = require("@google-cloud/storage");

const isLocal = process.env.NODE_ENV === "local";
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || "facets-bucket";

let bucket;
if (!isLocal) {
  const storage = new Storage();
  bucket = storage.bucket(GCS_BUCKET_NAME);
}

/**
 * Uploads a file buffer to local disk (NODE_ENV=local) or GCS (otherwise).
 * Returns the public URL of the uploaded file.
 *
 * @param {Buffer} buffer - File content
 * @param {string} filename - Destination path (e.g. "products/abc.jpg")
 * @param {string} mimetype - MIME type of the file
 * @returns {Promise<string>} Public URL
 */
const uploadFile = (buffer, filename, mimetype) => {
  if (isLocal) {
    const uploadDir = path.join(__dirname, "../../uploads", path.dirname(filename));
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(__dirname, "../../uploads", filename), buffer);
    // Return a host-relative path so the URL works on any origin: the browser
    // resolves it against the current site (e.g. https://57facets.in/uploads/...).
    // Storing an absolute http://localhost URL breaks images in production.
    return Promise.resolve(`/uploads/${filename}`);
  }

  return new Promise((resolve, reject) => {
    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: mimetype,
      metadata: { cacheControl: "public, max-age=31536000" },
    });
    blobStream.on("error", reject);
    blobStream.on("finish", () => {
      resolve(`https://storage.googleapis.com/${GCS_BUCKET_NAME}/${filename}`);
    });
    blobStream.end(buffer);
  });
};

module.exports = { uploadFile };
