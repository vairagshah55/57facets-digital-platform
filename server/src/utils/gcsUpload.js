const { Storage } = require("@google-cloud/storage");

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || "facets-bucket";

const storage = new Storage();
const bucket = storage.bucket(GCS_BUCKET_NAME);

/**
 * Uploads a file buffer to GCS and returns the public URL.
 * @param {Buffer} buffer - File content
 * @param {string} filename - Destination filename in GCS (e.g. "products/abc.jpg")
 * @param {string} mimetype - MIME type of the file
 * @returns {Promise<string>} Public URL of the uploaded file
 */
const uploadToGCS = (buffer, filename, mimetype) => {
  return new Promise((resolve, reject) => {
    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: mimetype,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    blobStream.on("error", (err) => reject(err));

    blobStream.on("finish", () => {
      const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${filename}`;
      resolve(publicUrl);
    });

    blobStream.end(buffer);
  });
};

module.exports = { uploadToGCS };
