require("dotenv").config({ path: __dirname + "/../../.env" });
const fs = require("fs");
const { pool, query, getClient } = require("../config/db");
const { processImport } = require("../services/productImport.service");

// ── Background product-import worker ───────────────────────────────────────
// Runs as its own process (pm2 process `57facets-import-worker`). It polls the
// import_jobs table, claims the oldest queued job with FOR UPDATE SKIP LOCKED
// (so multiple workers never grab the same job), runs the import off the
// request thread, and writes progress/counts back so the client can poll.
//
// Postgres IS the queue here — deliberately no Redis/BullMQ, which would add
// infrastructure + memory pressure on this single, RAM-tight VPS.

const POLL_INTERVAL_MS = 3000;
// Throttle progress writes so a big import doesn't hammer the DB every row.
const PROGRESS_STEP = 20;

let stopping = false;

// Claim the oldest queued job atomically. Returns the row or null.
async function claimNextJob() {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, file_path, original_name, admin_id
         FROM import_jobs
        WHERE status = 'queued'
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1`
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const job = rows[0];
    await client.query(
      "UPDATE import_jobs SET status = 'running', started_at = NOW() WHERE id = $1",
      [job.id]
    );
    await client.query("COMMIT");
    return job;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function runJob(job) {
  console.log(`[import-worker] processing job ${job.id} (${job.original_name || job.file_path})`);
  let lastWritten = 0;
  try {
    const result = await processImport({
      filePath: job.file_path,
      originalName: job.original_name,
      adminId: job.admin_id,
      onProgress: async ({ processed, total }) => {
        // Write on the first tick, every PROGRESS_STEP rows, and the last row.
        if (processed - lastWritten >= PROGRESS_STEP || processed === total || lastWritten === 0) {
          lastWritten = processed;
          await query(
            "UPDATE import_jobs SET processed = $1, total = $2 WHERE id = $3",
            [processed, total, job.id]
          );
        }
      },
    });

    await query(
      `UPDATE import_jobs SET
         status = 'done', processed = $1, total = $2,
         imported = $3, skipped = $4, images_imported = $5,
         diamonds_imported = $6, stones_imported = $7,
         errors = $8, finished_at = NOW()
       WHERE id = $9`,
      [
        result.total, result.total,
        result.imported, result.skipped, result.imagesImported,
        result.diamondsImported, result.stonesImported,
        JSON.stringify(result.errors || []), job.id,
      ]
    );
    console.log(`[import-worker] job ${job.id} done: ${result.imported} imported, ${result.skipped} skipped`);
  } catch (err) {
    console.error(`[import-worker] job ${job.id} FAILED:`, err.message);
    await query(
      "UPDATE import_jobs SET status = 'failed', error_message = $1, finished_at = NOW() WHERE id = $2",
      [err.message || "Import failed", job.id]
    );
  } finally {
    // The uploaded file is no longer needed once the job terminates.
    if (job.file_path) fs.unlink(job.file_path, () => {});
  }
}

async function loop() {
  while (!stopping) {
    let job = null;
    try {
      job = await claimNextJob();
    } catch (err) {
      console.error("[import-worker] claim error:", err.message);
    }
    if (job) {
      await runJob(job);
      continue; // immediately look for the next job (don't wait)
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// On startup, re-queue any job left 'running' by a previous crash/restart so it
// isn't stuck forever. (Single-worker assumption; safe because nothing else is
// processing while this worker was down.)
async function requeueStaleRunning() {
  const { rowCount } = await query(
    "UPDATE import_jobs SET status = 'queued', started_at = NULL WHERE status = 'running'"
  );
  if (rowCount > 0) console.log(`[import-worker] re-queued ${rowCount} stale running job(s)`);
}

async function main() {
  console.log("[import-worker] started");
  await requeueStaleRunning();
  await loop();
}

function shutdown(sig) {
  console.log(`[import-worker] ${sig} received, finishing current job then exiting`);
  stopping = true;
  // Give the loop a moment to notice, then close the pool.
  setTimeout(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  }, 500);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main().catch((err) => {
  console.error("[import-worker] fatal:", err);
  process.exit(1);
});
