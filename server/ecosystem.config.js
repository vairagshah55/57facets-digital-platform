// PM2 process definitions for 57facets.
//
// Deploy/refresh both processes on prod with:
//   cd /root/57facets-digital-platform/server
//   pm2 start ecosystem.config.js        # first time
//   pm2 reload ecosystem.config.js        # subsequent deploys (zero-downtime)
//   pm2 save                              # persist across reboots
//
// The import worker is a SEPARATE process so a long-running bulk import never
// blocks the API event loop. Both read the same server/.env.
module.exports = {
  apps: [
    {
      name: "57facets-backend",
      script: "src/index.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M",
    },
    {
      name: "57facets-import-worker",
      script: "src/worker/import.worker.js",
      instances: 1,
      exec_mode: "fork",
      // Bulk imports buffer the file + image ZIP in memory during processing;
      // restart the worker if it balloons past this on a big job.
      max_memory_restart: "600M",
    },
  ],
};
